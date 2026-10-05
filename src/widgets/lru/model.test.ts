import { describe, expect, it } from 'vitest'
import { apply, clampCapacity, hitRate, initLru, parseOp, parseSequence, simulate, wouldEvict, type LruState, type Op } from './model'

const keys = (s: LruState) => s.entries.map((e) => e.key).join('')

/** reference implementation: a Map keeps insertion order like OrderedDict */
function reference(ops: Op[], capacity: number) {
  const m = new Map<string, number>()
  const evictions: (string | null)[] = []
  let hits = 0
  let misses = 0
  for (const op of ops) {
    let ev: string | null = null
    if (op.kind === 'get') {
      if (m.has(op.key)) {
        const v = m.get(op.key)!
        m.delete(op.key)
        m.set(op.key, v)
        hits++
      } else misses++
    } else {
      const v = (m.get(op.key) ?? 0) + 1
      m.delete(op.key)
      m.set(op.key, v)
      if (m.size > capacity) {
        ev = m.keys().next().value!
        m.delete(ev)
      }
    }
    evictions.push(ev)
  }
  // Map is oldest-first; the model is MRU-first
  return { order: [...m.keys()].reverse().join(''), evictions, hits, misses }
}

describe('lru model', () => {
  it('parses ops leniently', () => {
    expect(parseOp('put A')).toEqual({ kind: 'put', key: 'A' })
    expect(parseOp(' GET b ')).toEqual({ kind: 'get', key: 'B' })
    expect(parseOp('get(C)')).toEqual({ kind: 'get', key: 'C' })
    expect(parseOp('delete A')).toBeNull()
    expect(parseSequence(['put A', 'nope', 'get A'])).toHaveLength(2)
    expect(clampCapacity(undefined)).toBe(3)
    expect(clampCapacity(0)).toBe(1)
    expect(clampCapacity(99)).toBe(6)
  })

  it('get hit moves to MRU, get miss changes nothing', () => {
    let s = initLru()
    for (const k of 'ABC') s = apply(s, { kind: 'put', key: k }, 3).state
    expect(keys(s)).toBe('CBA')
    const hit = apply(s, { kind: 'get', key: 'A' }, 3)
    expect(hit.outcome).toBe('hit')
    expect(keys(hit.state)).toBe('ACB')
    expect(hit.state.hits).toBe(1)
    const miss = apply(hit.state, { kind: 'get', key: 'Z' }, 3)
    expect(miss.outcome).toBe('miss')
    expect(miss.state.entries).toEqual(hit.state.entries)
    expect(miss.state.misses).toBe(1)
  })

  it('put of an existing key updates and moves to MRU without evicting', () => {
    let s = initLru()
    for (const k of 'ABC') s = apply(s, { kind: 'put', key: k }, 3).state
    const r = apply(s, { kind: 'put', key: 'A' }, 3)
    expect(r.outcome).toBe('update')
    expect(r.evicted).toBeNull()
    expect(keys(r.state)).toBe('ACB')
    expect(r.state.entries[0].version).toBe(2)
  })

  it('put of a new key evicts the LRU entry when full', () => {
    let s = initLru()
    for (const k of 'ABC') s = apply(s, { kind: 'put', key: k }, 3).state
    expect(wouldEvict(s, { kind: 'put', key: 'D' }, 3)).toBe('A')
    expect(wouldEvict(s, { kind: 'put', key: 'B' }, 3)).toBeNull()
    expect(wouldEvict(s, { kind: 'get', key: 'D' }, 3)).toBeNull()
    const r = apply(s, { kind: 'put', key: 'D' }, 3)
    expect(r.evicted?.key).toBe('A')
    expect(keys(r.state)).toBe('DCB')
  })

  it('matches the lesson sequences (evictions B, A, C)', () => {
    const seq = parseSequence(['put A', 'put B', 'put C', 'get A', 'put D', 'get C', 'put E', 'get D', 'put F'])
    const ev = simulate(seq, 3)
      .map((r) => r.evicted?.key)
      .filter(Boolean)
    expect(ev).toEqual(['B', 'A', 'C'])
  })

  it('agrees with a Map-based reference on pseudo-random workloads', () => {
    let seed = 7
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
    for (let trial = 0; trial < 60; trial++) {
      const cap = 1 + (trial % 5)
      const ops: Op[] = Array.from({ length: 40 }, () => ({ kind: rnd() < 0.5 ? 'get' : 'put', key: 'ABCDEFGH'[Math.floor(rnd() * 6)] }))
      const res = simulate(ops, cap)
      const ref = reference(ops, cap)
      const last = res[res.length - 1].state
      expect(keys(last)).toBe(ref.order)
      expect(res.map((r) => r.evicted?.key ?? null)).toEqual(ref.evictions)
      expect(last.hits).toBe(ref.hits)
      expect(last.misses).toBe(ref.misses)
      expect(last.entries.length).toBeLessThanOrEqual(cap)
      // recency stamps are strictly decreasing from MRU to LRU
      for (let i = 1; i < last.entries.length; i++) expect(last.entries[i - 1].used).toBeGreaterThan(last.entries[i].used)
    }
  })

  it('computes hit rate', () => {
    expect(hitRate(initLru())).toBe(0)
    expect(hitRate({ ...initLru(), hits: 3, misses: 1 })).toBe(0.75)
  })
})
