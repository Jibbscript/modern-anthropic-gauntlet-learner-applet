import { describe, expect, it } from 'vitest'
import { buildProgram, canStep, expectedValue, initRace, isAllDone, isBlocked, lostUpdates, step, type RaceSetup, type RaceState } from './model'

function run(setup: RaceSetup, order: number[]): RaceState {
  const prog = buildProgram(setup.increments, setup.lock)
  let s = initRace(setup)
  for (const t of order) s = step(s, prog, t, setup.lock)
  return s
}

/** every complete schedule (DFS over runnable threads) */
function allFinals(setup: RaceSetup): number[] {
  const prog = buildProgram(setup.increments, setup.lock)
  const out: number[] = []
  const go = (s: RaceState) => {
    if (isAllDone(s, prog)) {
      out.push(s.x)
      expect(expectedValue(setup) - s.x).toBe(lostUpdates(s, setup).length)
      return
    }
    let moved = false
    for (let t = 0; t < setup.threads; t++) {
      if (!canStep(s, prog, t)) continue
      moved = true
      go(step(s, prog, t, setup.lock))
    }
    expect(moved).toBe(true) // never stuck: one lock cannot deadlock
  }
  go(initRace(setup))
  return out
}

describe('race model', () => {
  it('runs serially to the expected value', () => {
    const setup = { threads: 2, increments: 1, lock: false }
    const s = run(setup, [0, 0, 0, 1, 1, 1])
    expect(s.x).toBe(2)
    expect(lostUpdates(s, setup)).toEqual([])
  })

  it('loses an update when both threads load before either stores', () => {
    const setup = { threads: 2, increments: 1, lock: false }
    const s = run(setup, [0, 1, 0, 0, 1, 1])
    expect(s.x).toBe(1)
    const lost = lostUpdates(s, setup)
    expect(lost).toHaveLength(1)
    // A stored first, B's stale write overwrote it
    expect(lost[0]).toMatchObject({ id: 'A1', victim: 0, by: 1, staleValue: 0, storedValue: 1 })
    expect(s.writes[1].dropped).toEqual(['A1'])
  })

  it('attributes a revived increment correctly with three threads', () => {
    // A L, C L, A ADD STORE (x={A1}), B L (sees A1), C ADD STORE (drops A1), B ADD STORE (restores A1, drops C1)
    const setup = { threads: 3, increments: 1, lock: false }
    const s = run(setup, [0, 2, 0, 0, 1, 2, 2, 1, 1])
    expect(s.x).toBe(2)
    const lost = lostUpdates(s, setup)
    expect(lost.map((l) => l.id)).toEqual(['C1'])
    expect(lost[0].by).toBe(1)
  })

  it('blocks ACQUIRE while another thread holds the lock', () => {
    const setup = { threads: 2, increments: 1, lock: true }
    const prog = buildProgram(1, true)
    let s = initRace(setup)
    s = step(s, prog, 0, true)
    expect(s.lock).toBe(0)
    expect(isBlocked(s, prog, 1)).toBe(true)
    expect(step(s, prog, 1, true)).toBe(s)
    s = step(s, prog, 0, true) // LOAD
    s = step(s, prog, 0, true) // ADD
    s = step(s, prog, 0, true) // STORE
    s = step(s, prog, 0, true) // RELEASE
    expect(s.lock).toBe(null)
    expect(isBlocked(s, prog, 1)).toBe(false)
  })

  it('without a lock some interleavings lose updates', () => {
    const finals = allFinals({ threads: 2, increments: 1, lock: false })
    expect(Math.min(...finals)).toBe(1)
    expect(Math.max(...finals)).toBe(2)
    const finals22 = allFinals({ threads: 2, increments: 2, lock: false })
    expect(Math.min(...finals22)).toBe(2)
    expect(Math.max(...finals22)).toBe(4)
  })

  it('with the lock every interleaving is correct', () => {
    for (const setup of [
      { threads: 2, increments: 1, lock: true },
      { threads: 2, increments: 2, lock: true },
      { threads: 3, increments: 1, lock: true },
    ]) {
      const finals = allFinals(setup)
      expect(finals.length).toBeGreaterThan(0)
      expect(new Set(finals)).toEqual(new Set([expectedValue(setup)]))
    }
  })

  it('three threads can lose two updates', () => {
    const finals = allFinals({ threads: 3, increments: 1, lock: false })
    expect(Math.min(...finals)).toBe(1)
  })
})
