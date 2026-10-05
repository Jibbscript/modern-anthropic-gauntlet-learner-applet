import { describe, expect, it } from 'vitest'
import { bucketTake, burstObserved, burstRate, densest, makeBucket, makeWindow, nextTokenIn, tokensAt, windowTake, type Bucket, type FixedWindow, type ReqEvent } from './model'

function sendBucket(b: Bucket, times: number[]): { b: Bucket; events: ReqEvent[] } {
  const events: ReqEvent[] = []
  for (const t of times) {
    const r = bucketTake(b, t)
    b = r.bucket
    events.push({ t, ok: r.ok })
  }
  return { b, events }
}

function sendWindow(w: FixedWindow, times: number[]): ReqEvent[] {
  return times.map((t) => {
    const r = windowTake(w, t)
    w = r.win
    return { t, ok: r.ok }
  })
}

describe('token bucket', () => {
  it('starts full and refills continuously up to capacity', () => {
    const b = makeBucket(5, 1)
    expect(tokensAt(b, 0)).toBe(5)
    const { b: after } = sendBucket(b, [0, 0, 0])
    expect(after.tokens).toBe(2)
    expect(tokensAt(after, 1.5)).toBeCloseTo(3.5)
    expect(tokensAt(after, 100)).toBe(5)
  })

  it('absorbs a burst of `capacity`, then rejects', () => {
    const times = Array.from({ length: 10 }, (_, i) => i * 0.05) // 20 req/s for 0.5s
    const { events } = sendBucket(makeBucket(5, 1), times)
    expect(events.slice(0, 5).every((e) => e.ok)).toBe(true)
    expect(events[5].ok).toBe(false)
    expect(burstObserved(events, 5)).toBe(true)
  })

  it('a hold at burstRate drains the bucket for any rate', () => {
    for (const rate of [0.5, 1, 2, 5, 10]) {
      const r = burstRate(rate)
      expect(r).toBeGreaterThan(rate)
      const times = Array.from({ length: 200 }, (_, i) => i / r)
      const { events } = sendBucket(makeBucket(5, rate), times)
      expect(burstObserved(events, 5)).toBe(true)
    }
  })

  it('a slow trickle is never throttled and never counts as a burst', () => {
    const times = Array.from({ length: 20 }, (_, i) => i * 1.5)
    const { events } = sendBucket(makeBucket(5, 1), times)
    expect(events.every((e) => e.ok)).toBe(true)
    expect(burstObserved(events, 5)).toBe(false)
  })

  it('a reject without a preceding burst does not count', () => {
    // drain slowly, pause less than a full refill, then a few quick requests
    const events: ReqEvent[] = [
      { t: 0, ok: true },
      { t: 2, ok: true },
      { t: 2.3, ok: true },
      { t: 2.5, ok: false },
    ]
    expect(burstObserved(events, 5)).toBe(false)
  })

  it('reports time to the next token', () => {
    const { b } = sendBucket(makeBucket(1, 2), [0])
    expect(nextTokenIn(b, 0)).toBeCloseTo(0.5)
    expect(nextTokenIn(b, 0.5)).toBe(0)
  })
})

describe('fixed window', () => {
  it('allows `limit` per window and resets at the edge', () => {
    const ev = sendWindow(makeWindow(5, 5), [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 5.0])
    expect(ev.map((e) => e.ok)).toEqual([true, true, true, true, true, false, true])
  })

  it('lets up to 2 x limit through around a window edge', () => {
    const before = [4.6, 4.7, 4.8, 4.9, 4.95]
    const after = [5.0, 5.05, 5.1, 5.2, 5.3]
    const ev = sendWindow(makeWindow(5, 5), [...before, ...after])
    expect(ev.every((e) => e.ok)).toBe(true)
    const accepted = ev.filter((e) => e.ok).map((e) => e.t)
    expect(densest(accepted, 5).count).toBe(10)
    // the same pattern through a bucket with equal long-run rate passes ~5
    const { events } = sendBucket(makeBucket(5, 1), [...before, ...after])
    expect(events.filter((e) => e.ok).length).toBe(5)
  })
})

describe('densest', () => {
  it('finds the busiest interval', () => {
    expect(densest([], 1).count).toBe(0)
    expect(densest([0, 0.5, 2, 2.1, 2.2, 5], 1)).toEqual({ count: 3, from: 2, to: 2.2 })
  })
})
