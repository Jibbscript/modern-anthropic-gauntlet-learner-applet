import { describe, expect, it } from 'vitest'
import { DEFAULT_SAMPLES, allEvents, checkMarks, commonPrefix, diff, eventText, normalize, spansUpTo, transitions, type Stack } from './model'

describe('sampler model', () => {
  it('diffs by position from the root', () => {
    expect(commonPrefix(['main', 'a', 'b'], ['main', 'a', 'c'])).toBe(2)
    expect(diff(['main', 'parse', 'lex'], ['main', 'render'])).toEqual({ prefix: 1, ends: [2, 1], begins: [1] })
    // identical samples produce nothing
    expect(diff(['main', 'x'], ['main', 'x'])).toEqual({ prefix: 2, ends: [], begins: [] })
    // recursion at a new depth is a new frame
    expect(diff(['main', 'render'], ['main', 'render', 'render'])).toEqual({ prefix: 2, ends: [], begins: [2] })
    // same name at a different depth does not match
    expect(diff(['main', 'a', 'b'], ['main', 'b'])).toEqual({ prefix: 1, ends: [2, 1], begins: [1] })
    expect(diff([], ['main'])).toEqual({ prefix: 0, ends: [], begins: [0] })
  })

  it('emits the expected events for the default samples', () => {
    expect(allEvents(DEFAULT_SAMPLES).map(eventText)).toEqual([
      'B main @0',
      'B load @1',
      'B parse @2',
      'E parse @4',
      'E load @4',
      'B render @4',
      'B draw @5',
      'B draw @6',
      'E draw @7',
      'E draw @7',
      'E render @8',
      'E main @8',
    ])
  })

  it('closes everything after the last sample', () => {
    const s: Stack[] = [['main'], ['main', 'parse'], ['main']]
    expect(allEvents(s).map(eventText)).toEqual(['B main @0', 'B parse @1', 'E parse @2', 'E main @3'])
  })

  it('B/E events nest properly and spans tile every sample', () => {
    let seed = 3
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
    for (let trial = 0; trial < 80; trial++) {
      const n = 2 + Math.floor(rnd() * 9)
      const samples: Stack[] = Array.from({ length: n }, () => Array.from({ length: Math.floor(rnd() * 5) }, (_, d) => (d === 0 ? 'main' : 'abc'[Math.floor(rnd() * 3)])))
      // events form a well-nested sequence
      const stack: string[] = []
      for (const e of allEvents(samples)) {
        if (e.ph === 'B') {
          expect(e.depth).toBe(stack.length)
          stack.push(e.name)
        } else {
          expect(stack.length - 1).toBe(e.depth)
          expect(stack.pop()).toBe(e.name)
        }
      }
      expect(stack).toEqual([])
      // every (sample, depth) is covered by exactly one span with the right name
      const spans = spansUpTo(samples, n, true)
      for (const sp of spans) expect(sp.end).not.toBeNull()
      for (let t = 0; t < n; t++) {
        for (let d = 0; d < 6; d++) {
          const cover = spans.filter((sp) => sp.depth === d && sp.start <= t && t < sp.end!)
          if (d < samples[t].length) {
            expect(cover).toHaveLength(1)
            expect(cover[0].name).toBe(samples[t][d])
          } else expect(cover).toHaveLength(0)
        }
      }
    }
  })

  it('keeps frames open until they end', () => {
    const sp = spansUpTo(DEFAULT_SAMPLES, 3)
    expect(sp.map((s) => `${s.name}:${s.start}-${s.end}`)).toEqual(['main:0-null', 'load:1-null', 'parse:2-null'])
    const sp5 = spansUpTo(DEFAULT_SAMPLES, 5)
    expect(sp5.map((s) => `${s.name}:${s.start}-${s.end}`)).toEqual(['main:0-null', 'load:1-4', 'parse:2-4', 'render:4-null'])
  })

  it('checks learner marks against the diff', () => {
    const d = diff(['main', 'parse', 'lex'], ['main', 'render'])
    expect(checkMarks(d, [1, 2], [1]).ok).toBe(true)
    const r = checkMarks(d, [0, 2], [])
    expect(r.ok).toBe(false)
    expect(r.extraEnds).toEqual([0])
    expect(r.missingEnds).toEqual([1])
    expect(r.missingBegins).toEqual([1])
    expect(checkMarks(diff(['a'], ['a']), [], []).ok).toBe(true)
  })

  it('normalizes config input', () => {
    expect(normalize(undefined)).toBe(DEFAULT_SAMPLES)
    expect(normalize([])).toBe(DEFAULT_SAMPLES)
    expect(normalize([['main', ' x '], 'junk', ['main', '']])).toEqual([['main', 'x'], ['main']])
    expect(transitions([['a']])[0].prev).toEqual([])
  })
})
