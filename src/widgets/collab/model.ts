/**
 * Two concurrent inserts into one base text, merged three ways:
 *  - last-write-wins: the server keeps whichever full copy arrived last;
 *  - operational transform: the later op's position is shifted past the
 *    earlier insert (ties: user A goes first);
 *  - CRDT (RGA-style): every character has a permanent id and each insert
 *    hangs off its left neighbour's id, so no position ever needs fixing.
 * Pure functions; the widget only renders what these return.
 */

export type User = 'A' | 'B'
export type Who = 'base' | User
export type Strategy = 'lww' | 'ot' | 'crdt'

export interface Edit {
  at: number
  insert: string
}

export interface Seg {
  text: string
  who: Who
  /** LWW only: an insert that the merge threw away (drawn as a ghost) */
  lost?: boolean
}

export const other = (u: User): User => (u === 'A' ? 'B' : 'A')

export function clampEdit(base: string, e: Edit): Edit {
  const at = Math.max(0, Math.min(base.length, Math.round(Number.isFinite(e.at) ? e.at : 0)))
  return { at, insert: e.insert ?? '' }
}

/** group per-character authors into runs */
function toSegs(chars: { ch: string; who: Who; lost?: boolean }[]): Seg[] {
  const out: Seg[] = []
  for (const c of chars) {
    const last = out[out.length - 1]
    if (last && last.who === c.who && !!last.lost === !!c.lost) last.text += c.ch
    else out.push({ text: c.ch, who: c.who, ...(c.lost ? { lost: true } : {}) })
  }
  return out
}

export const textOf = (segs: Seg[]) =>
  segs
    .filter((s) => !s.lost)
    .map((s) => s.text)
    .join('')

/** a user's local copy: the base with only their own insert applied */
export function localCopy(base: string, edit: Edit, who: User): Seg[] {
  const e = clampEdit(base, edit)
  return [
    { text: base.slice(0, e.at), who: 'base' as Who },
    { text: e.insert, who },
    { text: base.slice(e.at), who: 'base' as Who },
  ].filter((s) => s.text.length > 0)
}

// ------------------------------------------------------------------ OT

export interface Transform {
  /** whose op is being transformed */
  user: User
  from: number
  to: number
  /** length of the other insert it was shifted past (0 when it stays) */
  shift: number
  /** why it moved or stayed, e.g. "A inserted at 0 ≤ 21" */
  reason: 'before' | 'tie' | 'after'
}

/**
 * Transform `op` (by `user`) so it applies after `against` (by the other
 * user) already ran. An insert strictly before us pushes us right; at the
 * same position, A wins the tie and goes first.
 */
export function transformInsert(op: Edit, user: User, against: Edit): Transform {
  const before = against.at < op.at
  const tie = against.at === op.at
  const shifts = before || (tie && user === 'B')
  return {
    user,
    from: op.at,
    to: shifts ? op.at + against.insert.length : op.at,
    shift: shifts ? against.insert.length : 0,
    reason: before ? 'before' : tie ? 'tie' : 'after',
  }
}

function applyInsert(chars: { ch: string; who: Who }[], at: number, text: string, who: Who) {
  chars.splice(at, 0, ...Array.from(text, (ch) => ({ ch, who })))
}

export interface OtResult {
  segs: Seg[]
  /** B's op as applied on A's copy (after A's insert) */
  bOnA: Transform
  /** A's op as applied on B's copy (after B's insert) */
  aOnB: Transform
  /** both sites end with the same text */
  converged: boolean
}

export function otMerge(base: string, editA: Edit, editB: Edit): OtResult {
  const a = clampEdit(base, editA)
  const b = clampEdit(base, editB)
  const bOnA = transformInsert(b, 'B', a)
  const aOnB = transformInsert(a, 'A', b)
  // site A: own insert, then B's transformed op
  const siteA = Array.from(base, (ch) => ({ ch, who: 'base' as Who }))
  applyInsert(siteA, a.at, a.insert, 'A')
  applyInsert(siteA, bOnA.to, b.insert, 'B')
  // site B: own insert, then A's transformed op
  const siteB = Array.from(base, (ch) => ({ ch, who: 'base' as Who }))
  applyInsert(siteB, b.at, b.insert, 'B')
  applyInsert(siteB, aOnB.to, a.insert, 'A')
  const ta = siteA.map((c) => c.ch).join('')
  const tb = siteB.map((c) => c.ch).join('')
  return { segs: toSegs(siteA), bOnA, aOnB, converged: ta === tb }
}

// ---------------------------------------------------------------- CRDT

export interface CharId {
  /** 'o' for the original text, 'a' / 'b' for the users */
  site: 'o' | 'a' | 'b'
  /** per-site counter, 1-based (what the UI shows: a3, o21) */
  n: number
  /** Lamport clock used to order siblings */
  clock: number
}

export interface CrdtChar {
  id: CharId
  ch: string
  who: Who
  /** id of the character this one was inserted after; null = document start */
  after: CharId | null
}

export const idLabel = (id: CharId | null) => (id ? `${id.site}${id.n}` : '⊢')
const sameId = (x: CharId | null, y: CharId | null) => (x === null || y === null ? x === y : x.site === y.site && x.n === y.n)

/** the characters a user creates when inserting `text` after `anchor` */
function insertRun(site: 'a' | 'b', text: string, anchor: CharId | null, clock0: number): CrdtChar[] {
  const out: CrdtChar[] = []
  let prev = anchor
  Array.from(text).forEach((ch, i) => {
    const id: CharId = { site, n: i + 1, clock: clock0 + i + 1 }
    out.push({ id, ch, who: site === 'a' ? 'A' : 'B', after: prev })
    prev = id
  })
  return out
}

/**
 * Sibling order for characters inserted after the same id: newer clock first
 * (so a fresh insert sits right after its anchor, before older text), then
 * user A before user B, matching the OT tie-break.
 */
function siblingOrder(x: CrdtChar, y: CrdtChar): number {
  if (x.id.clock !== y.id.clock) return y.id.clock - x.id.clock
  return x.id.site.localeCompare(y.id.site)
}

/** RGA traversal: depth-first from the document start, children in sibling order */
export function crdtOrder(chars: CrdtChar[]): CrdtChar[] {
  const kids = new Map<string, CrdtChar[]>()
  const key = (id: CharId | null) => idLabel(id)
  for (const c of chars) {
    const k = key(c.after)
    if (!kids.has(k)) kids.set(k, [])
    kids.get(k)!.push(c)
  }
  for (const list of kids.values()) list.sort(siblingOrder)
  const out: CrdtChar[] = []
  // iterative DFS so long texts cannot blow the call stack
  const stack: CrdtChar[] = [...(kids.get(key(null)) ?? [])].reverse()
  while (stack.length) {
    const c = stack.pop()!
    out.push(c)
    const ch = kids.get(key(c.id))
    if (ch) for (let i = ch.length - 1; i >= 0; i--) stack.push(ch[i])
  }
  return out
}

export interface ChainLink {
  who: Who
  text: string
  /** first and last id of the run, e.g. a1 … a9 */
  first: string
  last: string
  /** for inserted runs: the id they hang off */
  after?: string
}

export interface CrdtResult {
  segs: Seg[]
  chars: CrdtChar[]
  chain: ChainLink[]
  anchorA: string
  anchorB: string
  /** one id per character */
  ids: number
}

export function crdtMerge(base: string, editA: Edit, editB: Edit): CrdtResult {
  const a = clampEdit(base, editA)
  const b = clampEdit(base, editB)
  const baseChars: CrdtChar[] = []
  let prev: CharId | null = null
  Array.from(base).forEach((ch, i) => {
    const id: CharId = { site: 'o', n: i + 1, clock: i + 1 }
    baseChars.push({ id, ch, who: 'base', after: prev })
    prev = id
  })
  const n = baseChars.length
  // each user anchors on the character to the left of their cursor, in the copy they saw
  const anchorOf = (at: number): CharId | null => (at === 0 ? null : baseChars[at - 1].id)
  const runA = insertRun('a', a.insert, anchorOf(a.at), n)
  const runB = insertRun('b', b.insert, anchorOf(b.at), n)
  const all = crdtOrder([...baseChars, ...runA, ...runB])
  const segs = toSegs(all.map((c) => ({ ch: c.ch, who: c.who })))

  // collapse into runs for display: consecutive chars from one site whose ids follow each other
  const chain: ChainLink[] = []
  let cur: { link: ChainLink; lastId: CharId } | null = null
  for (const c of all) {
    const continues = cur && cur.lastId.site === c.id.site && sameId(c.after, cur.lastId)
    if (cur && continues) {
      cur.link.text += c.ch
      cur.link.last = idLabel(c.id)
      cur.lastId = c.id
    } else {
      const link: ChainLink = { who: c.who, text: c.ch, first: idLabel(c.id), last: idLabel(c.id) }
      if (c.who !== 'base') link.after = idLabel(c.after)
      chain.push(link)
      cur = { link, lastId: c.id }
    }
  }
  return {
    segs,
    chars: all,
    chain,
    anchorA: idLabel(anchorOf(a.at)),
    anchorB: idLabel(anchorOf(b.at)),
    ids: all.length,
  }
}

// ----------------------------------------------------------------- LWW

export interface LwwResult {
  segs: Seg[]
  winner: User
  loser: User
}

/** the server keeps the copy that synced last; the other insert is drawn where it would have been */
export function lwwMerge(base: string, editA: Edit, editB: Edit, last: User): LwwResult {
  const edits = { A: clampEdit(base, editA), B: clampEdit(base, editB) }
  const winner = last
  const loser = other(last)
  const ghostAt = transformInsert(edits[loser], loser, edits[winner]).to
  const chars: { ch: string; who: Who; lost?: boolean }[] = Array.from(base, (ch) => ({ ch, who: 'base' as Who }))
  applyInsert(chars, edits[winner].at, edits[winner].insert, winner)
  chars.splice(ghostAt, 0, ...Array.from(edits[loser].insert, (ch) => ({ ch, who: loser as Who, lost: true })))
  return { segs: toSegs(chars), winner, loser }
}

// ------------------------------------------------------------- summary

export interface Merge {
  strategy: Strategy
  segs: Seg[]
  text: string
  /** how many of the two edits survive */
  kept: 0 | 1 | 2
  ot?: OtResult
  crdt?: CrdtResult
  lww?: LwwResult
}

export function merge(strategy: Strategy, base: string, a: Edit, b: Edit, last: User = 'B'): Merge {
  if (strategy === 'lww') {
    const lww = lwwMerge(base, a, b, last)
    const lostLen = clampEdit(base, last === 'A' ? b : a).insert.length
    return { strategy, segs: lww.segs, text: textOf(lww.segs), kept: lostLen > 0 ? 1 : 2, lww }
  }
  if (strategy === 'ot') {
    const ot = otMerge(base, a, b)
    return { strategy, segs: ot.segs, text: textOf(ot.segs), kept: 2, ot }
  }
  const crdt = crdtMerge(base, a, b)
  return { strategy, segs: crdt.segs, text: textOf(crdt.segs), kept: 2, crdt }
}

export const DEFAULT_BASE = 'Summarize the report.'
export const DEFAULT_A: Edit = { at: 0, insert: 'Briefly: ' }
export const DEFAULT_B: Edit = { at: 21, insert: ' Cite sources.' }
