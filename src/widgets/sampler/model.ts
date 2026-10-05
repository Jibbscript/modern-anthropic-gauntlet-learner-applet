/**
 * Turning periodic stack samples into begin/end trace events.
 *
 * Each sample is a stack, root first, taken at t = its index. Between two
 * consecutive samples, find the longest common prefix by position (frame
 * names equal at the same depth). Frames of the previous stack past that
 * prefix END (innermost first); frames of the next stack past it BEGIN
 * (outermost first). After the last sample everything still open ends at
 * t = samples.length. A recursive call at a new depth is a new frame.
 */

export type Stack = string[]

export interface TraceEvent {
  ph: 'B' | 'E'
  name: string
  depth: number
  t: number
}

export interface Diff {
  /** length of the common prefix */
  prefix: number
  /** depths in prev that end, innermost first */
  ends: number[]
  /** depths in next that begin, outermost first */
  begins: number[]
}

export interface Transition {
  /** index of the sample being added (its time) */
  t: number
  prev: Stack
  next: Stack
  diff: Diff
}

export interface Span {
  name: string
  depth: number
  start: number
  /** null while the frame is still open */
  end: number | null
}

export const DEFAULT_SAMPLES: Stack[] = [
  ['main'],
  ['main', 'load'],
  ['main', 'load', 'parse'],
  ['main', 'load', 'parse'],
  ['main', 'render'],
  ['main', 'render', 'draw'],
  ['main', 'render', 'draw', 'draw'],
  ['main', 'render'],
  [],
]

/** keep only arrays of non-empty strings; fall back to the default set */
export function normalize(samples: unknown): Stack[] {
  if (!Array.isArray(samples)) return DEFAULT_SAMPLES
  const out = samples.filter(Array.isArray).map((s) => (s as unknown[]).map((f) => String(f ?? '').trim()).filter((f) => f.length > 0))
  return out.length ? out : DEFAULT_SAMPLES
}

export function commonPrefix(a: Stack, b: Stack): number {
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  return i
}

export function diff(prev: Stack, next: Stack): Diff {
  const prefix = commonPrefix(prev, next)
  const ends: number[] = []
  for (let d = prev.length - 1; d >= prefix; d--) ends.push(d)
  const begins: number[] = []
  for (let d = prefix; d < next.length; d++) begins.push(d)
  return { prefix, ends, begins }
}

/** one transition per sample; the first compares against an empty stack */
export function transitions(samples: Stack[]): Transition[] {
  return samples.map((next, t) => {
    const prev = t === 0 ? [] : samples[t - 1]
    return { t, prev, next, diff: diff(prev, next) }
  })
}

export function eventsOf(tr: Transition): TraceEvent[] {
  return [
    ...tr.diff.ends.map((d): TraceEvent => ({ ph: 'E', name: tr.prev[d], depth: d, t: tr.t })),
    ...tr.diff.begins.map((d): TraceEvent => ({ ph: 'B', name: tr.next[d], depth: d, t: tr.t })),
  ]
}

/** the closing events once the trace ends after the last sample */
export function finalEvents(samples: Stack[]): TraceEvent[] {
  const last = samples[samples.length - 1] ?? []
  const t = samples.length
  return last.map((_, i) => last.length - 1 - i).map((d) => ({ ph: 'E', name: last[d], depth: d, t }))
}

export function allEvents(samples: Stack[]): TraceEvent[] {
  return [...transitions(samples).flatMap(eventsOf), ...finalEvents(samples)]
}

/**
 * Flame-chart spans after the first `upTo` samples have been turned into
 * events. With `closed`, the final end-of-trace events are applied too.
 */
export function spansUpTo(samples: Stack[], upTo: number, closed = false): Span[] {
  const done: Span[] = []
  const open: Span[] = []
  const trs = transitions(samples).slice(0, upTo)
  const apply = (evs: TraceEvent[]) => {
    for (const e of evs) {
      if (e.ph === 'E') {
        const s = open.pop()
        if (s) done.push({ ...s, end: e.t })
      } else open.push({ name: e.name, depth: e.depth, start: e.t, end: null })
    }
  }
  for (const tr of trs) apply(eventsOf(tr))
  if (closed && upTo >= samples.length) apply(finalEvents(samples))
  return [...done, ...open].sort((a, b) => a.start - b.start || a.depth - b.depth)
}

export interface MarkCheck {
  ok: boolean
  /** depths marked END that keep running */
  extraEnds: number[]
  /** depths that end but weren't marked */
  missingEnds: number[]
  extraBegins: number[]
  missingBegins: number[]
}

export function checkMarks(d: Diff, endMarks: Iterable<number>, beginMarks: Iterable<number>): MarkCheck {
  const em = new Set(endMarks)
  const bm = new Set(beginMarks)
  const es = new Set(d.ends)
  const bs = new Set(d.begins)
  const extraEnds = [...em].filter((x) => !es.has(x)).sort((a, b) => a - b)
  const missingEnds = d.ends.filter((x) => !em.has(x))
  const extraBegins = [...bm].filter((x) => !bs.has(x)).sort((a, b) => a - b)
  const missingBegins = d.begins.filter((x) => !bm.has(x))
  return { ok: !extraEnds.length && !missingEnds.length && !extraBegins.length && !missingBegins.length, extraEnds, missingEnds, extraBegins, missingBegins }
}

export function eventText(e: TraceEvent): string {
  return `${e.ph} ${e.name} @${e.t}`
}

/** stable color slot per function name, by order of first appearance */
export function colorSlots(samples: Stack[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const s of samples) for (const f of s) if (!m.has(f)) m.set(f, m.size)
  return m
}
