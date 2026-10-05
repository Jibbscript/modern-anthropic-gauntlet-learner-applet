import { describe, expect, it } from 'vitest'
import { bestWall, simulatePool, type Executor, type PoolParams } from './model'

const base: PoolParams = { executor: 'thread', workers: 4, kind: 'cpu', tasks: 8, cores: 4 }
const run = (o: Partial<PoolParams>) => simulatePool({ ...base, ...o })

function overlaps(bars: { start: number; end: number }[]) {
  const s = bars.slice().sort((a, b) => a.start - b.start)
  for (let i = 1; i < s.length; i++) if (s[i].start < s[i - 1].end - 1e-9) return true
  return false
}

describe('pool model', () => {
  it('sequential baseline', () => {
    expect(run({}).sequential).toBe(8)
    expect(run({ kind: 'io' }).sequential).toBeCloseTo(9.6)
  })

  it('threads cannot speed up CPU-bound work: the GIL serialises it', () => {
    for (let w = 1; w <= 8; w++) {
      const r = run({ workers: w })
      expect(r.wall).toBeCloseTo(8)
      const cpu = r.rows.flatMap((row) => row.bars.filter((b) => b.kind === 'cpu'))
      expect(overlaps(cpu)).toBe(false)
      // GIL lane covers exactly the CPU time
      const held = r.token.reduce((a, t) => a + t.end - t.start, 0)
      expect(held).toBeCloseTo(8)
    }
    // with several threads the GIL is passed around (time slicing)
    expect(run({ workers: 2 }).token.length).toBeGreaterThan(8)
  })

  it('processes run CPU work in parallel up to the core count, after paying startup', () => {
    const one = run({ executor: 'process', workers: 1 })
    expect(one.wall).toBeCloseTo(0.3 + 8 * 1.05)
    const four = run({ executor: 'process', workers: 4 })
    expect(four.wall).toBeLessThan(3.5)
    const eight = run({ executor: 'process', workers: 8 })
    // never more than `cores` CPU bars at the same instant
    for (let t = 0; t < eight.wall; t += 0.05) {
      const busy = eight.rows.filter((r) => r.bars.some((b) => b.kind === 'cpu' && b.start <= t + 1e-9 && b.end > t + 1e-9)).length
      expect(busy).toBeLessThanOrEqual(4)
    }
    // cores = 1: processes cannot beat a plain loop
    expect(run({ executor: 'process', workers: 4, cores: 1 }).wall).toBeGreaterThan(8)
  })

  it('async interleaves I/O on one thread but cannot speed up CPU work', () => {
    expect(run({ executor: 'async', kind: 'cpu' }).wall).toBeCloseTo(8)
    const io = run({ executor: 'async', kind: 'io' })
    expect(io.wall).toBeCloseTo(1.9)
    expect(io.rows.length).toBe(8)
    const cpu = io.rows.flatMap((row) => row.bars.filter((b) => b.kind === 'cpu'))
    expect(overlaps(cpu)).toBe(false)
    const waits = io.rows.flatMap((row) => row.bars.filter((b) => b.kind === 'wait'))
    expect(overlaps(waits)).toBe(true)
  })

  it('threads overlap I/O waits', () => {
    expect(run({ kind: 'io', workers: 1 }).wall).toBeCloseTo(9.6)
    expect(run({ kind: 'io', workers: 8 }).wall).toBeCloseTo(1.9)
  })

  it('best achievable wall time per kind, respecting locks', () => {
    const cpu = bestWall(base, {})
    expect(cpu.executor).toBe('process')
    expect(cpu.wall).toBeLessThan(3.5)
    const io = bestWall({ ...base, kind: 'io' }, {})
    expect(io.wall).toBeCloseTo(1.9)
    // executor locked to thread: best is any thread count for cpu
    expect(bestWall(base, { executor: true }).wall).toBeCloseTo(8)
    // workers locked to 2: process(2) is the best for cpu
    const w2 = bestWall({ ...base, workers: 2 }, { workers: true })
    expect(w2.executor).toBe('process')
    expect(w2.wall).toBeCloseTo(4.8)
  })

  it('default config is not already within 10% of the best', () => {
    for (const kind of ['cpu', 'io'] as const) {
      const cur = run({ kind })
      const best = bestWall({ ...base, kind }, {})
      expect(cur.wall).toBeGreaterThan(best.wall * 1.1)
    }
  })

  it('every task runs to completion exactly once', () => {
    for (const executor of ['thread', 'process', 'async'] as Executor[])
      for (const kind of ['cpu', 'io'] as const)
        for (let w = 1; w <= 8; w++) {
          const r = run({ executor, kind, workers: w })
          const cpuPerTask = new Map<number, number>()
          for (const row of r.rows) for (const b of row.bars) if (b.kind === 'cpu') cpuPerTask.set(b.task, (cpuPerTask.get(b.task) ?? 0) + b.end - b.start)
          expect(cpuPerTask.size).toBe(8)
          for (const v of cpuPerTask.values()) expect(v).toBeCloseTo(kind === 'cpu' ? 1 : 0.2)
          const end = Math.max(...r.rows.flatMap((row) => row.bars.map((b) => b.end)))
          expect(end).toBeCloseTo(r.wall)
        }
  })
})
