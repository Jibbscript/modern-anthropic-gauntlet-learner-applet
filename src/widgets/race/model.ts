/**
 * Pure model for the race widget: N threads each run
 *   [ACQUIRE L]  LOAD x → r   ADD 1 → r   STORE r → x  [RELEASE L]
 * `increments` times on one shared counter. The learner picks which thread
 * executes its next instruction.
 *
 * To explain *why* the counter ends low, every write carries the set of
 * increments it contains (a thread's STORE writes what it loaded plus its
 * own +1). An increment is lost when it is missing from the final write;
 * the thread whose write first dropped it "overwrote" it.
 */

export type Op = 'ACQUIRE' | 'LOAD' | 'ADD' | 'STORE' | 'RELEASE'

export interface RaceSetup {
  threads: number
  increments: number
  lock: boolean
}

export interface ThreadState {
  pc: number
  /** register r, null until the first LOAD */
  reg: number | null
  /** increments contained in the value this thread loaded */
  loaded: string[]
  /** value of x when this thread last loaded */
  loadedValue: number | null
}

export interface Write {
  thread: number
  value: number
  /** increment ids contained in this write, e.g. ["A1", "B1"] */
  set: string[]
  /** increments that were in x just before this write and are not in it */
  dropped: string[]
}

export interface ScheduleEntry {
  thread: number
  op: Op
  pc: number
}

export interface RaceState {
  x: number
  /** increment ids contained in x */
  xSet: string[]
  threads: ThreadState[]
  /** owner of lock L, or null */
  lock: number | null
  writes: Write[]
  schedule: ScheduleEntry[]
}

export interface LostUpdate {
  /** id of the lost increment, e.g. "A1" */
  id: string
  /** thread whose increment was lost */
  victim: number
  /** thread whose write overwrote it */
  by: number
  /** the stale value the overwriting thread had loaded */
  staleValue: number
  /** the value it stored */
  storedValue: number
}

export const THREAD_NAMES = ['A', 'B', 'C'] as const

export function threadName(t: number): string {
  return THREAD_NAMES[t] ?? String(t)
}

export function buildProgram(increments: number, lock: boolean): Op[] {
  const one: Op[] = lock ? ['ACQUIRE', 'LOAD', 'ADD', 'STORE', 'RELEASE'] : ['LOAD', 'ADD', 'STORE']
  const out: Op[] = []
  for (let i = 0; i < increments; i++) out.push(...one)
  return out
}

export function initRace(setup: RaceSetup): RaceState {
  return {
    x: 0,
    xSet: [],
    threads: Array.from({ length: setup.threads }, () => ({ pc: 0, reg: null, loaded: [], loadedValue: null })),
    lock: null,
    writes: [],
    schedule: [],
  }
}

export function expectedValue(setup: RaceSetup): number {
  return setup.threads * setup.increments
}

export function isThreadDone(state: RaceState, program: Op[], t: number): boolean {
  return state.threads[t].pc >= program.length
}

export function isAllDone(state: RaceState, program: Op[]): boolean {
  return state.threads.every((th) => th.pc >= program.length)
}

/** a thread whose next instruction is ACQUIRE while another thread holds L */
export function isBlocked(state: RaceState, program: Op[], t: number): boolean {
  const op = program[state.threads[t].pc]
  return op === 'ACQUIRE' && state.lock !== null && state.lock !== t
}

export function canStep(state: RaceState, program: Op[], t: number): boolean {
  return !isThreadDone(state, program, t) && !isBlocked(state, program, t)
}

/** which increment (1-based) the thread is on at program counter pc */
export function incrementIndex(program: Op[], pc: number, lock: boolean): number {
  const per = lock ? 5 : 3
  return Math.min(Math.floor(pc / per), Math.ceil(program.length / per) - 1) + 1
}

/**
 * Execute thread t's next instruction. Returns the same state object when
 * the thread cannot run (finished or blocked on the lock).
 */
export function step(state: RaceState, program: Op[], t: number, lock: boolean): RaceState {
  if (!canStep(state, program, t)) return state
  const th = state.threads[t]
  const op = program[th.pc]
  const threads = state.threads.slice()
  const next: RaceState = { ...state, threads, schedule: [...state.schedule, { thread: t, op, pc: th.pc }] }
  switch (op) {
    case 'ACQUIRE':
      next.lock = t
      threads[t] = { ...th, pc: th.pc + 1 }
      break
    case 'RELEASE':
      next.lock = null
      threads[t] = { ...th, pc: th.pc + 1 }
      break
    case 'LOAD':
      threads[t] = { ...th, pc: th.pc + 1, reg: state.x, loaded: state.xSet.slice(), loadedValue: state.x }
      break
    case 'ADD':
      threads[t] = { ...th, pc: th.pc + 1, reg: (th.reg ?? 0) + 1 }
      break
    case 'STORE': {
      const id = `${threadName(t)}${incrementIndex(program, th.pc, lock)}`
      const set = [...th.loaded, id]
      const dropped = state.xSet.filter((s) => !set.includes(s))
      const value = th.reg ?? 0
      next.x = value
      next.xSet = set
      next.writes = [...state.writes, { thread: t, value, set, dropped }]
      threads[t] = { ...th, pc: th.pc + 1 }
      break
    }
  }
  return next
}

function victimOf(id: string): number {
  return THREAD_NAMES.indexOf(id[0] as (typeof THREAD_NAMES)[number])
}

/**
 * Increments missing from the final value, each attributed to the write
 * that dropped it (the write right after the last write that contained it).
 */
export function lostUpdates(state: RaceState, setup: RaceSetup): LostUpdate[] {
  const all: string[] = []
  for (let t = 0; t < setup.threads; t++) for (let i = 1; i <= setup.increments; i++) all.push(`${threadName(t)}${i}`)
  const out: LostUpdate[] = []
  for (const id of all) {
    if (state.xSet.includes(id)) continue
    let last = -1
    state.writes.forEach((w, i) => {
      if (w.set.includes(id)) last = i
    })
    if (last < 0) continue // never written (thread not finished)
    const over = state.writes[last + 1]
    if (!over) continue
    out.push({ id, victim: victimOf(id), by: over.thread, staleValue: over.value - 1, storedValue: over.value })
  }
  return out
}

/** "A"-style labels for the increments a write dropped */
export function droppedOwners(w: Write): number[] {
  return [...new Set(w.dropped.map(victimOf))]
}
