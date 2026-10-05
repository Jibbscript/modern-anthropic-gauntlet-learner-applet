import { describe, expect, it } from 'vitest'
import {
  bestThroughput,
  bottlenecks,
  defaultAllocation,
  measuredThroughput,
  peakBuffered,
  simulatePipeline,
  throughput,
  utilization,
  type Loc,
} from './model'

const costs = [1, 2, 4, 1]

function allocations(budget: number) {
  const out: number[][] = []
  const r = [1, 2, 3, 4]
  for (const a of r) for (const b of r) for (const c of r) for (const d of r) if (a + b + c + d <= budget) out.push([a, b, c, d])
  return out
}

describe('pipeline model', () => {
  it('long-run simulated throughput equals the bottleneck rate for every allocation and queue size', () => {
    for (const cs of [costs, [1, 1, 1, 1], [0.5, 1.5, 3, 2]])
      for (const workers of allocations(8))
        for (const queue of [1, 2, 5, 8]) {
          const run = simulatePipeline({ workers, costs: cs, queue, images: 300 }, false)
          expect(run.completions.length).toBe(300)
          expect(measuredThroughput(run, 100)).toBeCloseTo(throughput({ workers, costs: cs }), 2)
        }
  })

  it('default target 0.75 needs filter >= 3 workers; best is a balanced 1/2/4/1', () => {
    expect(defaultAllocation(8)).toEqual([2, 2, 2, 2])
    expect(throughput({ workers: [2, 2, 2, 2], costs })).toBe(0.5)
    for (const w of allocations(8)) if (throughput({ workers: w, costs }) >= 0.75) expect(w[2]).toBeGreaterThanOrEqual(3)
    expect(bestThroughput(8, costs)).toBe(1)
    expect(bottlenecks({ workers: [1, 2, 4, 1], costs })).toEqual([])
    expect(bottlenecks({ workers: [2, 2, 2, 2], costs })).toEqual([2])
    expect(utilization({ workers: [2, 2, 2, 2], costs }, 0.5)).toEqual([0.25, 0.5, 1, 0.25])
  })

  it('a full queue blocks upstream workers (backpressure) and never overflows', () => {
    const run = simulatePipeline({ workers: [2, 2, 2, 2], costs, queue: 2, images: 24 })
    let sawBlocked = false
    for (const f of run.frames) {
      const perQ = [0, 0, 0]
      for (const l of f.locs) {
        if (l.at === 'queue') perQ[l.q]++
        if (l.at === 'work' && l.blocked) {
          sawBlocked = true
          // a blocked worker always faces a full queue
          const full = f.locs.filter((x): x is Extract<Loc, { at: 'queue' }> => x.at === 'queue' && x.q === l.stage).length
          expect(full).toBe(2)
        }
      }
      perQ.forEach((c) => expect(c).toBeLessThanOrEqual(2))
    }
    expect(sawBlocked).toBe(true)
  })

  it('images keep their order through FIFO queues and all get saved', () => {
    const run = simulatePipeline({ workers: [1, 1, 1, 1], costs, queue: 3, images: 12 })
    const last = run.frames[run.frames.length - 1]
    const order = last.locs.map((l) => (l.at === 'done' ? l.order : -1))
    expect(order).toEqual(Array.from({ length: 12 }, (_, i) => i))
    expect(run.total).toBe(run.completions[11])
  })

  it('bigger queues buffer more images but do not raise throughput', () => {
    const small = simulatePipeline({ workers: [2, 2, 2, 2], costs, queue: 1, images: 24 })
    const big = simulatePipeline({ workers: [2, 2, 2, 2], costs, queue: 8, images: 24 })
    expect(peakBuffered(big)).toBeGreaterThan(peakBuffered(small))
    expect(big.total).toBe(small.total)
  })

  it('more filter workers shorten the batch', () => {
    const a = simulatePipeline({ workers: [2, 2, 2, 2], costs, queue: 3, images: 24 }).total
    const b = simulatePipeline({ workers: [1, 2, 4, 1], costs, queue: 3, images: 24 }).total
    expect(b).toBeLessThan(a)
  })
})
