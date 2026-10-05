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
 * Steady-state throughput: images saved per time unit once the pipeline is
 * full. With deterministic costs and queues of capacity >= 1 this is exactly
 * the slowest stage's rate (verified against long simulated runs in
 * model.test.ts), independent of batch size and queue capacity.
 */
export function throughput(p: Pick<PipeParams, 'workers' | 'costs'>): number {
  return Math.min(...stageRates(p))
}

/** least-squares slope of completions over time, skipping the warm-up */
export function measuredThroughput(run: PipeRun, warmup: number): number {
  const xs = run.completions.slice(warmup)
  const n = xs.length
  if (n < 2) return NaN
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = (n - 1) / 2
  let num = 0
  let den = 0
  xs.forEach((x, i) => {
    num += (x - mx) * (i - my)
    den += (x - mx) ** 2
  })
  return den > 0 ? num / den : Infinity
}

/** most images sitting in queues at any moment of the run */
export function peakBuffered(run: PipeRun): number {
  let peak = 0
  for (const f of run.frames) peak = Math.max(peak, f.locs.filter((l) => l.at === 'queue').length)
  return peak
}

/** fraction of each stage's worker time spent working, in steady state */
export function utilization(p: Pick<PipeParams, 'workers' | 'costs'>, throughput: number): number[] {
  return p.workers.map((w, s) => Math.min(1, (throughput * p.costs[s]) / w))
}

export const MAX_PER_STAGE = 4

/** an even split of the budget (each stage gets 1..4 workers) */
export function defaultAllocation(budget: number): number[] {
  const b = Math.max(4, Math.min(4 * MAX_PER_STAGE, Math.round(budget)))
  const base = Math.floor(b / 4)
  return [0, 1, 2, 3].map((i) => Math.min(MAX_PER_STAGE, base + (i < b % 4 ? 1 : 0)))
}

/** best steady-state throughput any allocation within the budget can reach */
export function bestThroughput(budget: number, costs: number[]): number {
  let best = 0
  const r = [1, 2, 3, 4]
  for (const a of r) for (const b of r) for (const c of r) for (const d of r) {
    if (a + b + c + d > budget) continue
    best = Math.max(best, throughput({ workers: [a, b, c, d], costs }))
  }
  return best
}
