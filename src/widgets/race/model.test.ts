import { describe, expect, it } from 'vitest'
import { buildProgram, canStep, expectedValue, incrementsLabel, initRace, isAllDone, isBlocked, lostUpdates, overwrites, step, type RaceSetup, type RaceState } from './model'

function run(setup: RaceSetup, order: number[]): RaceState {
  const prog = buildProgram(setup.increments, setup.lock)
  let s = initRace(setup)
  for (const t of order) s = step(s, prog, t, setup.lock)
  return s
}

/** what the verdict claims about every overwrite must hold for this finished run */
function checkVerdict(s: RaceState, setup: RaceSetup) {
  const ows = overwrites(s, setup)
  expect(ows.reduce((n, o) => n + o.lost.length, 0)).toBe(expectedValue(setup) - s.x)
  const storeAt = s.schedule.flatMap((e, i) => (e.op === 'STORE' ? [i] : []))
  for (const o of ows) {
    expect(o.by).not.toBe(o.over)
    expect(s.writes[o.write].thread).toBe(o.by)
    // `by` loaded before `over`'s STORE landed, and that load saw staleValue
    const store = storeAt[o.write]
    const prevStore = storeAt[o.write - 1]
    let load = -1
    for (let i = store - 1; i >= 0; i--) {
      if (s.schedule[i].thread === o.by && s.schedule[i].op === 'LOAD') {
        load = i
        break
      }
    }
    expect(load).toBeGreaterThanOrEqual(0)
    expect(load).toBeLessThan(prevStore)
    expect(o.storedValue).toBe(o.staleValue + 1)
    expect(s.writes[o.write - 1].value).toBe(o.overValue)
  }
}

/** every complete schedule (DFS over runnable threads) */
function allFinals(setup: RaceSetup): number[] {
  const prog = buildProgram(setup.increments, setup.lock)
  const out: number[] = []
  const go = (s: RaceState) => {
    if (isAllDone(s, prog)) {
      out.push(s.x)
      expect(expectedValue(setup) - s.x).toBe(lostUpdates(s, setup).length)
      checkVerdict(s, setup)
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

  it('groups increments lost to one stale write', () => {
    // B loads 0, A runs both increments (x = 2), B stores 1 over both
    const setup = { threads: 2, increments: 2, lock: false }
    const s = run(setup, [1, 0, 0, 0, 0, 0, 0, 1, 1])
    expect(s.x).toBe(1)
    const ows = overwrites(s, setup)
    expect(ows).toHaveLength(1)
    expect(ows[0]).toMatchObject({ by: 1, over: 0, overValue: 2, staleValue: 0, storedValue: 1, lost: ['A1', 'A2'] })
    expect(incrementsLabel(ows[0].lost)).toBe('both of A’s +1s')
    expect(incrementsLabel(['C1', 'A1'])).toBe('A’s +1 and C’s +1')
  })

  it('names the overwritten writer, not just the victim', () => {
    // B loads 0; A stores 1; C loads 1, stores 2; B stores 1 over C's write (losing A1 and C1)
    const setup = { threads: 3, increments: 1, lock: false }
    const s = run(setup, [1, 0, 0, 0, 2, 2, 2, 1, 1])
    expect(s.x).toBe(1)
    expect(overwrites(s, setup)).toEqual([{ write: 2, by: 1, over: 2, overValue: 2, staleValue: 0, storedValue: 1, lost: ['A1', 'C1'] }])
  })

  it('verdict claims hold for every schedule', () => {
    for (const setup of [
      { threads: 2, increments: 1, lock: false },
      { threads: 2, increments: 2, lock: false },
      { threads: 3, increments: 1, lock: false },
    ])
      allFinals(setup)
  })

  it('verdict claims hold for random 3 x 2 schedules (seeded)', () => {
    const setup = { threads: 3, increments: 2, lock: false }
    const prog = buildProgram(2, false)
    let seed = 12345
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31)
    for (let k = 0; k < 3000; k++) {
      let s = initRace(setup)
      while (!isAllDone(s, prog)) {
        const ready = [0, 1, 2].filter((t) => canStep(s, prog, t))
        s = step(s, prog, ready[Math.floor(rnd() * ready.length)], false)
      }
      checkVerdict(s, setup)
    }
  })

  it('three threads can lose two updates', () => {
    const finals = allFinals({ threads: 3, increments: 1, lock: false })
    expect(Math.min(...finals)).toBe(1)
  })
})
