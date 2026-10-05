/**
 * LRU cache model with OrderedDict semantics (most recently used first):
 * - get hit: count a hit and move the key to MRU
 * - get miss: count a miss, the cache is unchanged
 * - put existing key: update its value and move it to MRU
 * - put new key: insert at MRU, then evict the LRU entry if over capacity
 */

export const KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const

export type OpKind = 'get' | 'put'
export interface Op {
  kind: OpKind
  key: string
}

export interface Entry {
  key: string
  /** value version: 1 on insert, +1 on every put that updates it */
  version: number
  /** tick (1-based op number) of the last get/put that touched this key */
  used: number
}

export interface LruState {
  /** most recently used first */
  entries: Entry[]
  hits: number
  misses: number
  /** operations applied so far */
  tick: number
}

export type Outcome = 'hit' | 'miss' | 'insert' | 'update'

export interface StepResult {
  state: LruState
  op: Op
  outcome: Outcome
  evicted: Entry | null
}

export const MIN_CAPACITY = 1
export const MAX_CAPACITY = 6

export function clampCapacity(c: unknown): number {
  const n = typeof c === 'number' && Number.isFinite(c) ? Math.round(c) : 3
  return Math.max(MIN_CAPACITY, Math.min(MAX_CAPACITY, n))
}

/** "put A", "GET b", "get(A)" -> Op. Returns null for anything else. */
export function parseOp(raw: string): Op | null {
  const m = /^\s*(get|put)\s*\(?\s*([A-Za-z])\s*\)?\s*$/i.exec(raw)
  if (!m) return null
  return { kind: m[1].toLowerCase() as OpKind, key: m[2].toUpperCase() }
}

export function parseSequence(seq: readonly string[] | undefined): Op[] {
  if (!Array.isArray(seq)) return []
  return seq.map((s) => (typeof s === 'string' ? parseOp(s) : null)).filter((o): o is Op => o !== null)
}

export function opText(op: Op): string {
  return `${op.kind} ${op.key}`
}

export function initLru(): LruState {
  return { entries: [], hits: 0, misses: 0, tick: 0 }
}

export function has(s: LruState, key: string): boolean {
  return s.entries.some((e) => e.key === key)
}

/** the key this op would evict, or null */
export function wouldEvict(s: LruState, op: Op, capacity: number): string | null {
  if (op.kind !== 'put' || has(s, op.key)) return null
  return s.entries.length + 1 > capacity ? s.entries[s.entries.length - 1].key : null
}

export function apply(s: LruState, op: Op, capacity: number): StepResult {
  const tick = s.tick + 1
  const idx = s.entries.findIndex((e) => e.key === op.key)
  if (op.kind === 'get') {
    if (idx < 0) return { state: { ...s, misses: s.misses + 1, tick }, op, outcome: 'miss', evicted: null }
    const e = s.entries[idx]
    const rest = s.entries.filter((_, i) => i !== idx)
    return { state: { ...s, entries: [{ ...e, used: tick }, ...rest], hits: s.hits + 1, tick }, op, outcome: 'hit', evicted: null }
  }
  if (idx >= 0) {
    const e = s.entries[idx]
    const rest = s.entries.filter((_, i) => i !== idx)
    return { state: { ...s, entries: [{ ...e, version: e.version + 1, used: tick }, ...rest], tick }, op, outcome: 'update', evicted: null }
  }
  let entries: Entry[] = [{ key: op.key, version: 1, used: tick }, ...s.entries]
  let evicted: Entry | null = null
  if (entries.length > capacity) {
    evicted = entries[entries.length - 1]
    entries = entries.slice(0, -1)
  }
  return { state: { ...s, entries, tick }, op, outcome: 'insert', evicted }
}

/** run a whole sequence from empty; one result per op */
export function simulate(ops: readonly Op[], capacity: number): StepResult[] {
  const out: StepResult[] = []
  let s = initLru()
  for (const op of ops) {
    const r = apply(s, op, capacity)
    out.push(r)
    s = r.state
  }
  return out
}

export function hitRate(s: LruState): number {
  const n = s.hits + s.misses
  return n === 0 ? 0 : s.hits / n
}
