/**
 * Back-of-envelope capacity model: five inputs, five derived numbers,
 * human-scale formatting, log-scale slider stops and a forgiving parser
 * for typed answers ("70", "1.2k", "2M", "2 GB").
 */

export interface Inputs {
  dau: number
  reqPerUser: number
  tokensPerReq: number
  peak: number
  bytesPerVersion: number
}

export type InputKey = keyof Inputs

export interface Derived {
  avgQps: number
  peakQps: number
  tokensPerSec: number
  storagePerDay: number
  storagePerYear: number
}

export type MetricKey = keyof Derived

export const SECONDS_PER_DAY = 86_400

export function derive(i: Inputs): Derived {
  const perDay = i.dau * i.reqPerUser
  const avgQps = perDay / SECONDS_PER_DAY
  const storagePerDay = perDay * i.bytesPerVersion
  return {
    avgQps,
    peakQps: avgQps * i.peak,
    tokensPerSec: avgQps * i.tokensPerReq,
    storagePerDay,
    storagePerYear: storagePerDay * 365,
  }
}

export const DEFAULT_INPUTS: Inputs = {
  dau: 50_000,
  reqPerUser: 10,
  tokensPerReq: 2_000,
  peak: 2,
  bytesPerVersion: 4_000,
}

export const RANGES: Record<InputKey, [number, number]> = {
  dau: [1e3, 1e8],
  reqPerUser: [1, 200],
  tokensPerReq: [100, 1e5],
  peak: [1, 10],
  bytesPerVersion: [1e3, 1e6],
}

/** 1-1.5-2-2.5-3-4-...-9 per decade: even-ish steps on a log scale, every value a round number */
const MANTISSAS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 9]

const roundSig = (n: number) => Number(n.toPrecision(6))

export function logStops(min: number, max: number, extra: number[] = []): number[] {
  const out = new Set<number>()
  const d0 = Math.floor(Math.log10(min))
  const d1 = Math.ceil(Math.log10(max))
  for (let d = d0; d <= d1; d++) {
    for (const m of MANTISSAS) {
      const v = roundSig(m * 10 ** d)
      if (v >= min * 0.9999 && v <= max * 1.0001) out.add(v)
    }
  }
  for (const v of extra) if (Number.isFinite(v) && v > 0) out.add(roundSig(v))
  return [...out].sort((a, b) => a - b)
}

/** index of the stop closest to v on a log scale */
export function nearestStop(stops: number[], v: number): number {
  let best = 0
  let bestD = Infinity
  const lv = Math.log(Math.max(v, 1e-12))
  stops.forEach((s, i) => {
    const d = Math.abs(Math.log(s) - lv)
    if (d < bestD) {
      bestD = d
      best = i
    }
  })
  return best
}

// ---------------------------------------------------------- formatting

function trim(n: number, digits: number): string {
  // 3 significant digits, no trailing zeros: 69.4, 2.31, 120
  const s = n >= 100 ? Math.round(n).toString() : n.toPrecision(digits)
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s
}

/** 1234 → 1.23k, 69.44 → 69.4, 2.3e6 → 2.3M, 4e9 → 4B, 5e12 → 5T */
export function formatCount(n: number): string {
  if (!Number.isFinite(n)) return '–'
  const a = Math.abs(n)
  if (a === 0) return '0'
  if (a < 0.01) return n.toExponential(1)
  const units: [number, string][] = [
    [1e12, 'T'],
    [1e9, 'B'],
    [1e6, 'M'],
    [1e3, 'k'],
  ]
  for (const [v, u] of units) {
    // promote 999.6k to 1M rather than show 1000k
    if (a >= v * 0.9995) return trim(n / v, 3) + u
  }
  return trim(n, 3)
}

/** decimal bytes, as capacity estimates use them: 4 KB = 4,000 bytes */
export function formatBytes(n: number): string {
  if (!Number.isFinite(n)) return '–'
  const units: [number, string][] = [
    [1e15, 'PB'],
    [1e12, 'TB'],
    [1e9, 'GB'],
    [1e6, 'MB'],
    [1e3, 'KB'],
  ]
  for (const [v, u] of units) if (Math.abs(n) >= v * 0.9995) return `${trim(n / v, 3)} ${u}`
  return `${Math.round(n)} B`
}

/** slider label for a raw input value */
export function formatInput(key: InputKey, v: number): string {
  if (key === 'bytesPerVersion') return formatBytes(v)
  if (key === 'peak') return `${trim(v, 3)}×`
  return formatCount(v)
}

// ------------------------------------------------------------- answers

const SUFFIX: Record<string, number> = {
  '': 1,
  k: 1e3,
  thousand: 1e3,
  m: 1e6,
  mm: 1e6,
  million: 1e6,
  b: 1e9,
  bn: 1e9,
  billion: 1e9,
  g: 1e9,
  t: 1e12,
  trillion: 1e12,
  kb: 1e3,
  mb: 1e6,
  gb: 1e9,
  tb: 1e12,
  pb: 1e15,
  bytes: 1,
  byte: 1,
}

export interface Parsed {
  value: number
  /** the answer carried a byte unit (KB, MB, GB, TB) */
  bytes: boolean
  /** the answer carried any suffix */
  suffixed: boolean
}

/**
 * Parse a typed estimate. Accepts commas/underscores/spaces as separators,
 * scientific notation, k/M/B/T and KB/MB/GB/TB suffixes, and trailing unit
 * words ("70 req/s", "2 GB/day").
 */
export function parseAnswer(raw: string): Parsed | null {
  let s = raw.trim().toLowerCase()
  if (!s) return null
  s = s.replace(/[≈~]/g, '').replace(/,(?=\d{3}\b)/g, '').replace(/_/g, '')
  // drop rate words: "/s", "per second", "/day", "qps", "tokens", "req"
  s = s.replace(/\s*(\/\s*(s|sec|second|day|d)|per\s+(second|sec|day)|qps|rps|tokens?|reqs?|requests?|runs?)\b/g, ' ').trim()
  const m = /^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)\s*([a-z]*)\s*$/.exec(s.replace(/\s+(?=\d)/g, ''))
  if (!m) return null
  const unit = m[2]
  const mult = SUFFIX[unit]
  if (mult === undefined) return null
  const value = Number(m[1]) * mult
  if (!Number.isFinite(value)) return null
  return { value, bytes: /^(kb|mb|gb|tb|pb|bytes?)$/.test(unit), suffixed: unit !== '' }
}

export function within(answer: number, target: number, tol = 0.25): boolean {
  if (!Number.isFinite(answer) || !Number.isFinite(target)) return false
  if (target === 0) return Math.abs(answer) < 1e-9
  return Math.abs(answer - target) / Math.abs(target) <= tol + 1e-9
}

export function formatMetric(key: MetricKey, v: number): string {
  return key === 'storagePerDay' || key === 'storagePerYear' ? formatBytes(v) : formatCount(v)
}
