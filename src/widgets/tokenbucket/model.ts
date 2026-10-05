/**
 * Pure model for the rate-limiter widget. Times are seconds of simulation
 * time (the widget advances it with requestAnimationFrame while visible).
 *
 * Token bucket: holds up to `capacity` tokens, refills continuously at
 * `rate` tokens/sec; each request takes one whole token or is rejected.
 *
 * Fixed window: at most `limit` requests per window of `window` seconds,
 * counter resets at each window edge (windows aligned to t = 0). With
 * limit = capacity and window = capacity / rate it has the same long-run
 * rate as the bucket, but up to 2 x limit can pass around a window edge.
 */

export interface Bucket {
  capacity: number
  rate: number
  tokens: number
  /** time of the last refill */
  t: number
}

export function makeBucket(capacity: number, rate: number, t = 0): Bucket {
  return { capacity, rate, tokens: capacity, t }
}

export function refill(b: Bucket, now: number): Bucket {
  if (now <= b.t) return b
  return { ...b, tokens: Math.min(b.capacity, b.tokens + b.rate * (now - b.t)), t: now }
}

/** tokens at time `now` without mutating anything */
export function tokensAt(b: Bucket, now: number): number {
  return refill(b, now).tokens
}

export function bucketTake(b: Bucket, now: number): { bucket: Bucket; ok: boolean } {
  const r = refill(b, now)
  // tolerate float dust so a token that is "just" full counts
  if (r.tokens >= 1 - 1e-9) return { bucket: { ...r, tokens: Math.max(0, r.tokens - 1) }, ok: true }
  return { bucket: r, ok: false }
}

/** seconds until the next whole token is available (0 if one is) */
export function nextTokenIn(b: Bucket, now: number): number {
  const tokens = tokensAt(b, now)
  if (tokens >= 1) return 0
  return (1 - tokens) / b.rate
}

export interface FixedWindow {
  limit: number
  window: number
  /** start of the current window */
  start: number
  count: number
}

export function makeWindow(limit: number, window: number, t = 0): FixedWindow {
  return { limit, window, start: Math.floor(t / window) * window, count: 0 }
}

export function windowAt(w: FixedWindow, now: number): FixedWindow {
  if (now < w.start + w.window) return w
  return { ...w, start: Math.floor(now / w.window) * w.window, count: 0 }
}

export function windowTake(w: FixedWindow, now: number): { win: FixedWindow; ok: boolean } {
  const cur = windowAt(w, now)
  if (cur.count < cur.limit) return { win: { ...cur, count: cur.count + 1 }, ok: true }
  return { win: cur, ok: false }
}

export interface ReqEvent {
  t: number
  ok: boolean
}

/**
 * The burst goal: within one burst (consecutive requests less than `gap`
 * seconds apart) at least `capacity` requests were accepted and a later one
 * in the same burst was rejected.
 */
export function burstObserved(events: ReqEvent[], capacity: number, gap = BURST_GAP): boolean {
  let st = newBurst()
  for (const e of events) {
    const r = trackBurst(st, e, capacity, gap)
    if (r.hit) return true
    st = r.state
  }
  return false
}

/** consecutive requests closer than this (seconds) count as one burst */
export const BURST_GAP = 1.2

export interface BurstState {
  last: number
  accepted: number
}

export function newBurst(): BurstState {
  return { last: -Infinity, accepted: 0 }
}

/** incremental form of burstObserved, for a live stream of requests */
export function trackBurst(st: BurstState, e: ReqEvent, capacity: number, gap = BURST_GAP): { state: BurstState; hit: boolean } {
  const accepted = e.t - st.last > gap ? 0 : st.accepted
  if (e.ok) return { state: { last: e.t, accepted: accepted + 1 }, hit: false }
  return { state: { last: e.t, accepted }, hit: accepted >= capacity }
}

/**
 * Most events that fit in any interval [s, s + span] (events sorted by t).
 * Returns the count and the first/last event times of that interval.
 */
export function densest(times: number[], span: number): { count: number; from: number; to: number } {
  let best = { count: 0, from: 0, to: 0 }
  let i = 0
  for (let j = 0; j < times.length; j++) {
    while (times[j] - times[i] > span + 1e-9) i++
    const count = j - i + 1
    if (count > best.count) best = { count, from: times[i], to: times[j] }
  }
  return best
}

/**
 * Hold-to-burst rate: about 8 req/s, but always well above the refill so a
 * hold can both drain the bucket and push 2 x limit through a window edge.
 */
export function burstRate(rate: number): number {
  return Math.max(8, Math.ceil(rate * 4))
}

/**
 * Span for the "peak" metric: long enough for a hold to send 2 x capacity,
 * shorter than a window. In that span a bucket can pass at most
 * capacity + rate * span; a fixed window can pass up to 2 x capacity.
 */
export function peakSpan(capacity: number, rate: number): number {
  return Math.min((2 * capacity) / burstRate(rate), capacity / rate / 2)
}

/** the most a full token bucket can accept in any interval of length `span` */
export function bucketMaxIn(capacity: number, rate: number, span: number): number {
  return Math.floor(capacity + rate * span + 1e-9)
}
