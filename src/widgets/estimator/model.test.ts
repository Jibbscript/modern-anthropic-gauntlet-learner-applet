import { describe, expect, it } from 'vitest'
import { RANGES, derive, formatBytes, formatCount, formatInput, logStops, nearestStop, parseAnswer, within } from './model'

describe('derive', () => {
  it('matches the lesson scenario: 100k DAU × 20 runs, 3× peak ≈ 69.4 QPS', () => {
    const d = derive({ dau: 100_000, reqPerUser: 20, tokensPerReq: 3_000, peak: 3, bytesPerVersion: 4_000 })
    expect(d.avgQps).toBeCloseTo(23.148, 2)
    expect(d.peakQps).toBeCloseTo(69.44, 1)
    expect(d.tokensPerSec).toBeCloseTo(69_444, 0)
    expect(d.storagePerDay).toBe(8e9)
    expect(d.storagePerYear).toBe(8e9 * 365)
  })
})

describe('formatting', () => {
  it('counts', () => {
    expect(formatCount(0)).toBe('0')
    expect(formatCount(0.5)).toBe('0.5')
    expect(formatCount(69.444)).toBe('69.4')
    expect(formatCount(23.148)).toBe('23.1')
    expect(formatCount(999)).toBe('999')
    expect(formatCount(1234)).toBe('1.23k')
    expect(formatCount(208_333)).toBe('208k')
    expect(formatCount(999_700)).toBe('1M')
    expect(formatCount(2_000_000)).toBe('2M')
    expect(formatCount(1.5e9)).toBe('1.5B')
    expect(formatCount(4e12)).toBe('4T')
  })
  it('bytes (decimal units)', () => {
    expect(formatBytes(500)).toBe('500 B')
    expect(formatBytes(4_000)).toBe('4 KB')
    expect(formatBytes(2e9)).toBe('2 GB')
    expect(formatBytes(730e9)).toBe('730 GB')
    expect(formatBytes(2.92e12)).toBe('2.92 TB')
    expect(formatBytes(1.2e15)).toBe('1.2 PB')
  })
  it('inputs', () => {
    expect(formatInput('peak', 2.5)).toBe('2.5×')
    expect(formatInput('dau', 100_000)).toBe('100k')
    expect(formatInput('bytesPerVersion', 1e6)).toBe('1 MB')
  })
})

describe('slider stops', () => {
  it('cover each range with round numbers on a log scale', () => {
    const dau = logStops(...RANGES.dau)
    expect(dau[0]).toBe(1e3)
    expect(dau[dau.length - 1]).toBe(1e8)
    for (const v of [100_000, 2_000_000, 300_000, 1e6]) expect(dau).toContain(v)
    const req = logStops(...RANGES.reqPerUser)
    expect(req[0]).toBe(1)
    expect(req[req.length - 1]).toBe(200)
    expect(req).toContain(20)
    expect(logStops(...RANGES.peak)).toEqual([1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(logStops(...RANGES.tokensPerReq)).toContain(3_000)
    expect(logStops(...RANGES.bytesPerVersion)).toContain(4_000)
  })
  it('add off-grid preset values and find the nearest stop', () => {
    const s = logStops(1, 10, [3.3])
    expect(s).toContain(3.3)
    expect(s[nearestStop(s, 3.3)]).toBe(3.3)
    expect(s[nearestStop(s, 2.4)]).toBe(2.5)
    expect(s[nearestStop(s, 1000)]).toBe(10)
  })
  it('stops are strictly increasing', () => {
    for (const r of Object.values(RANGES)) {
      const s = logStops(...r)
      for (let i = 1; i < s.length; i++) expect(s[i]).toBeGreaterThan(s[i - 1])
    }
  })
})

describe('parseAnswer', () => {
  const v = (s: string) => parseAnswer(s)?.value
  it('reads plain numbers and separators', () => {
    expect(v('70')).toBe(70)
    expect(v('69.4')).toBe(69.4)
    expect(v('2,000')).toBe(2000)
    expect(v('1,000,000')).toBe(1e6)
    expect(v('100 000')).toBe(1e5)
    expect(v('.5')).toBe(0.5)
    expect(v('2e6')).toBe(2e6)
    expect(v('~70')).toBe(70)
  })
  it('reads suffixes and units', () => {
    expect(v('1.2k')).toBe(1200)
    expect(v('1.2K')).toBe(1200)
    expect(v('2M')).toBe(2e6)
    expect(v('2 million')).toBe(2e6)
    expect(v('208k tokens/s')).toBe(208_000)
    expect(v('70 req/s')).toBe(70)
    expect(v('70/s')).toBe(70)
    expect(v('70 qps')).toBe(70)
    expect(v('2 GB')).toBe(2e9)
    expect(v('2gb/day')).toBe(2e9)
    expect(v('1.5B')).toBe(1.5e9)
    expect(parseAnswer('2 GB')?.bytes).toBe(true)
    expect(parseAnswer('2k')?.bytes).toBe(false)
  })
  it('rejects junk', () => {
    expect(parseAnswer('')).toBeNull()
    expect(parseAnswer('abc')).toBeNull()
    expect(parseAnswer('7 apples')).toBeNull()
    expect(parseAnswer('1..2')).toBeNull()
  })
})

describe('within', () => {
  it('accepts answers within 25%', () => {
    expect(within(70, 69.4)).toBe(true)
    expect(within(60, 69.4)).toBe(true)
    expect(within(86.75, 69.4)).toBe(true)
    expect(within(87, 69.4)).toBe(false)
    expect(within(23, 69.4)).toBe(false)
    expect(within(52, 69.4)).toBe(false)
  })
})
