/**
 * Discrete-time model of running a batch of Python tasks on an executor.
 *
 * Time is simulated in ticks of 0.05 s. A task is a list of segments:
 *   cpu   needs a CPU token. Threads share ONE token (the GIL); processes
 *         share `cores` tokens; async has one token (the event loop).
 *   wait  blocking I/O; needs no token, so waits overlap freely.
 *   over  overhead (process startup, pickling); needs no token.
 *
 * cpu kind: 1 s of CPU.  io kind: 0.1 s CPU, 1 s wait, 0.1 s CPU.
 *
 * Token holders are pre-empted after a quantum (0.25 s, the visual stand-in
 * for the GIL switch interval / an OS time slice) when someone is waiting.
 * Async is cooperative: a coroutine keeps the loop until its CPU segment
 * ends (no pre-emption).
 *
 * thread   W threads pull tasks from a shared queue.
 * process  W processes, spawned one after another (0.3 s each), pull tasks;
 *          each task pays 0.05 s to pickle its arguments.
 * async    one thread; every task is a coroutine started at t=0.
 */
export type Executor = 'thread' | 'process' | 'async'
export type TaskKind = 'cpu' | 'io'
export type SegKind = 'cpu' | 'wait' | 'over' | 'ready'

export const TICK = 0.05
const T = (s: number) => Math.round(s / TICK)
export const COST = {
  cpuTask: T(1),
  ioCpu: T(0.1),
  ioWait: T(1),
  startup: T(0.3),
  pickle: T(0.05),
  quantum: T(0.25),
}

export interface Bar {
  /** start/end in seconds */
  start: number
  end: number
  kind: SegKind
  /** task index (0-based) */
  task: number
}

export interface PoolResult {
  executor: Executor
  kind: TaskKind
  /** rows actually drawn (threads, processes or coroutines) */
  rows: { label: string; bars: Bar[] }[]
  /** who holds the GIL / event loop over time (thread + async only) */
  token: { start: number; end: number; row: number }[]
  wall: number
  /** one worker, plain sequential loop, no overhead */
  sequential: number
}

export interface PoolParams {
  executor: Executor
  workers: number
  kind: TaskKind
  tasks: number
  cores: number
}

type Seg = { kind: 'cpu' | 'wait' | 'over'; left: number }

function taskSegs(kind: TaskKind, executor: Executor): Seg[] {
  const segs: Seg[] =
    kind === 'cpu'
      ? [{ kind: 'cpu', left: COST.cpuTask }]
      : [
          { kind: 'cpu', left: COST.ioCpu },
          { kind: 'wait', left: COST.ioWait },
          { kind: 'cpu', left: COST.ioCpu },
        ]
  if (executor === 'process') segs.unshift({ kind: 'over', left: COST.pickle })
  return segs
}

export function sequentialTime(kind: TaskKind, tasks: number): number {
  const per = kind === 'cpu' ? COST.cpuTask : 2 * COST.ioCpu + COST.ioWait
  return round(per * tasks * TICK)
}

function round(x: number) {
  return Math.round(x * 1000) / 1000
}

export function clampWorkers(n: number) {
  return Math.max(1, Math.min(8, Math.round(n)))
}

export function simulatePool(p: PoolParams): PoolResult {
  const tasks = Math.max(1, Math.min(16, Math.round(p.tasks)))
  const cores = Math.max(1, Math.min(16, Math.round(p.cores)))
  const isAsync = p.executor === 'async'
  const nRows = isAsync ? tasks : clampWorkers(p.workers)
  const capacity = p.executor === 'process' ? cores : 1
  // only the GIL is time-sliced in this model; a process keeps its core until its CPU burst ends
  const quantum = p.executor === 'thread' ? COST.quantum : Infinity

  interface Row {
    segs: Seg[]
    task: number
    /** ticks before this row exists (process spawn order) */
    delay: number
    holding: boolean
    held: number
    ready: boolean
    marks: { kind: SegKind; task: number }[]
  }
  const rows: Row[] = Array.from({ length: nRows }, (_, i) => ({
    segs: [],
    task: -1,
    delay: p.executor === 'process' ? i * COST.startup : 0,
    holding: false,
    held: 0,
    ready: false,
    marks: [],
  }))
  if (p.executor === 'process') rows.forEach((r) => r.segs.push({ kind: 'over', left: COST.startup }))
  let next = 0
  if (isAsync) {
    rows.forEach((r, i) => {
      r.segs = taskSegs(p.kind, p.executor)
      r.task = i
    })
    next = tasks
  }

  const readyQ: number[] = []
  const tokenMarks: number[] = []
  let free = capacity
  let tick = 0
  const LIMIT = 20000

  const busy = (r: Row) => r.segs.length > 0
  while (tick < LIMIT) {
    // 1. idle rows pick up tasks
    rows.forEach((r) => {
      if (tick < r.delay || busy(r) || isAsync || next >= tasks) return
      r.segs = taskSegs(p.kind, p.executor)
      r.task = next++
    })
    // done once every task has finished (spare processes still spawning don't count)
    if (next >= tasks && rows.every((r) => r.task < 0)) break

    // 2. token scheduling: pre-empt holders past their quantum, then grant FIFO
    rows.forEach((r, i) => {
      if (tick < r.delay || !busy(r)) return
      if (r.segs[0].kind === 'cpu' && !r.holding && !r.ready) {
        r.ready = true
        readyQ.push(i)
      }
    })
    rows.forEach((r, i) => {
      if (r.holding && r.held >= quantum && readyQ.length) {
        r.holding = false
        r.held = 0
        free++
        r.ready = true
        readyQ.push(i)
      }
    })
    while (free > 0 && readyQ.length) {
      const i = readyQ.shift()!
      rows[i].ready = false
      rows[i].holding = true
      rows[i].held = 0
      free--
    }

    // 3. run one tick
    let holder = -1
    rows.forEach((r, i) => {
      if (tick < r.delay) {
        r.marks.push({ kind: 'ready', task: -2 }) // not spawned yet (not drawn)
        return
      }
      if (!busy(r)) {
        r.marks.push({ kind: 'ready', task: -1 }) // idle (not drawn)
        return
      }
      const seg = r.segs[0]
      if (seg.kind === 'cpu' && !r.holding) {
        r.marks.push({ kind: 'ready', task: r.task })
        return
      }
      r.marks.push({ kind: seg.kind, task: seg.kind === 'over' && r.task < 0 ? -3 : r.task })
      if (seg.kind === 'cpu') {
        r.held++
        if (holder < 0) holder = i
      }
      seg.left--
      if (seg.left <= 0) {
        r.segs.shift()
        if (r.holding && (r.segs.length === 0 || r.segs[0].kind !== 'cpu')) {
          r.holding = false
          r.held = 0
          free++
        }
        if (r.segs.length === 0) r.task = -1
      }
    })
    tokenMarks.push(capacity === 1 ? holder : -1)
    tick++
  }

  // compress tick marks into bars
  const outRows = rows.map((r, i) => {
    const bars: Bar[] = []
    let cur: Bar | null = null
    r.marks.forEach((m, t) => {
      const visible = m.task >= 0 || m.task === -3
      if (cur && visible && cur.kind === m.kind && cur.task === m.task && cur.end === round(t * TICK)) {
        cur.end = round((t + 1) * TICK)
        return
      }
      if (!visible) {
        cur = null
        return
      }
      cur = { start: round(t * TICK), end: round((t + 1) * TICK), kind: m.kind, task: m.task }
      bars.push(cur)
    })
    const label = p.executor === 'thread' ? `T${i + 1}` : p.executor === 'process' ? `P${i + 1}` : `c${i + 1}`
    return { label, bars }
  })
  const token: PoolResult['token'] = []
  if (p.executor !== 'process')
    tokenMarks.forEach((h, t) => {
      if (h < 0) return
      const last = token[token.length - 1]
      if (last && last.row === h && last.end === round(t * TICK)) last.end = round((t + 1) * TICK)
      else token.push({ start: round(t * TICK), end: round((t + 1) * TICK), row: h })
    })

  return {
    executor: p.executor,
    kind: p.kind,
    rows: outRows,
    token,
    wall: round(tick * TICK),
    sequential: sequentialTime(p.kind, tasks),
  }
}

export interface Best {
  wall: number
  executor: Executor
  workers: number
}

/** best wall time for this task kind over every executor/worker combo the learner may change */
export function bestWall(base: PoolParams, lock: { executor?: boolean; workers?: boolean }): Best {
  let best: Best | null = null
  const executors: Executor[] = lock.executor ? [base.executor] : ['thread', 'process', 'async']
  for (const executor of executors) {
    const ws = executor === 'async' ? [base.workers] : lock.workers ? [base.workers] : [1, 2, 3, 4, 5, 6, 7, 8]
    for (const workers of ws) {
      const r = simulatePool({ ...base, executor, workers })
      if (!best || r.wall < best.wall - 1e-9) best = { wall: r.wall, executor, workers }
    }
  }
  return best!
}
