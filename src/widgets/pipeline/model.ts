/**
 * Discrete-event model of a 4-stage image pipeline with bounded queues.
 *
 *   inbox → load → [q1] → resize → [q2] → filter → [q3] → save → done
 *
 * Each stage has `workers[s]` workers; a worker takes the next image from its
 * input (the inbox, or the upstream queue), works on it for `costs[s]` time
 * units, then puts it on its output queue. If that queue is full the worker
 * BLOCKS holding the image (backpressure) until a downstream worker makes
 * room. Everything is deterministic.
 */
export const STAGES = ['load', 'resize', 'filter', 'save'] as const
export type StageName = (typeof STAGES)[number]

export interface PipeParams {
  workers: number[]
  costs: number[]
  /** capacity of each of the three queues between stages */
  queue: number
  images: number
}

export type Loc =
  | { at: 'src' }
  | { at: 'work'; stage: number; worker: number; start: number; end: number; blocked: boolean }
  | { at: 'queue'; q: number; slot: number }
  | { at: 'done'; order: number }

export interface Frame {
  t: number
  locs: Loc[]
}

export interface PipeRun {
  frames: Frame[]
  /** time the last image is saved */
  total: number
  /** completion time of each saved image, in order */
  completions: number[]
}

const EPS = 1e-9

interface W {
  img: number
  start: number
  end: number
}

export function simulatePipeline(p: PipeParams, record = true): PipeRun {
  const n = Math.max(1, Math.round(p.images))
  const cap = Math.max(1, Math.round(p.queue))
  const src: number[] = Array.from({ length: n }, (_, i) => i)
  const queues: number[][] = [[], [], []]
  const workers: W[][] = p.workers.map((k) => Array.from({ length: Math.max(1, Math.round(k)) }, () => ({ img: -1, start: 0, end: 0 })))
  const done: number[] = []
  const completions: number[] = []
  const frames: Frame[] = []
  let t = 0

  const snapshot = () => {
    const locs: Loc[] = Array.from({ length: n }, () => ({ at: 'src' }) as Loc)
    workers.forEach((ws, stage) =>
      ws.forEach((w, worker) => {
        if (w.img >= 0) locs[w.img] = { at: 'work', stage, worker, start: w.start, end: w.end, blocked: w.end <= t + EPS }
      }),
    )
    queues.forEach((qq, q) => qq.forEach((img, slot) => (locs[img] = { at: 'queue', q, slot })))
    done.forEach((img, order) => (locs[img] = { at: 'done', order }))
    frames.push({ t, locs })
  }

  for (let guard = 0; guard < 100000; guard++) {
    let changed = true
    while (changed) {
      changed = false
      for (let s = 3; s >= 0; s--) {
        // finished workers push downstream, earliest finisher first
        const finished = workers[s]
          .map((w, i) => ({ w, i }))
          .filter(({ w }) => w.img >= 0 && w.end <= t + EPS)
          .sort((a, b) => a.w.end - b.w.end || a.i - b.i)
        for (const { w } of finished) {
          if (s === 3) {
            done.push(w.img)
            completions.push(t)
          } else if (queues[s].length < cap) {
            queues[s].push(w.img)
          } else continue
          w.img = -1
          changed = true
        }
        // idle workers pull from upstream
        for (const w of workers[s]) {
          if (w.img >= 0) continue
          const input = s === 0 ? src : queues[s - 1]
          if (!input.length) break
          w.img = input.shift()!
          w.start = t
          w.end = t + p.costs[s]
          changed = true
        }
      }
    }
    if (record) snapshot()
    if (done.length === n) break
    let next = Infinity
    for (const ws of workers) for (const w of ws) if (w.img >= 0 && w.end > t + EPS) next = Math.min(next, w.end)
    if (!Number.isFinite(next)) break // deadlock guard (cannot happen with cap >= 1)
    t = next
  }
  return { frames, total: t, completions }
}

/** rate of each stage in images per time unit */
export function stageRates(p: Pick<PipeParams, 'workers' | 'costs'>): number[] {
  return p.workers.map((w, s) => w / p.costs[s])
}

/** stages that limit throughput; empty when the line is perfectly balanced */
export function bottlenecks(p: Pick<PipeParams, 'workers' | 'costs'>): number[] {
  const r = stageRates(p)
  const min = Math.min(...r)
  const at = r.map((x, i) => (Math.abs(x - min) < 1e-9 ? i : -1)).filter((i) => i >= 0)
  return at.length === r.length ? [] : at
}

/**
 * Steady-state throughput, measured on a long run (independent of the batch
 * size): saved images per time unit once the pipeline is full.
 */
export function steadyThroughput(p: Omit<PipeParams, 'images'>): number {
  const N = 240
  const run = simulatePipeline({ ...p, images: N }, false)
  const c = run.completions
  const a = 80
  const b = N - 1
  // align the window to whole "bursts" so equal timestamps don't skew it
  let i = a
  while (i > 0 && Math.abs(c[i - 1] - c[a]) < EPS) i--
  let j = b
  while (j > i && Math.abs(c[j] - c[b]) < EPS && j + 1 < N && Math.abs(c[j + 1] - c[b]) < EPS) j++
  const span = c[j] - c[i]
  return span > 0 ? (j - i) / span : Infinity
}

/** fraction of each stage's worker time spent working, in steady state */
export function utilization(p: Pick<PipeParams, 'workers' | 'costs'>, throughput: number): number[] {
  return p.workers.map((w, s) => Math.min(1, (throughput * p.costs[s]) / w))
}
