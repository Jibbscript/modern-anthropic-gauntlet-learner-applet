import type { AreaId, Course, Lesson, ReviewCard, SkillId } from './types'
import { recallNow, type CardState } from './fsrs'
import type { GauntletState } from './store'
import { addDays, dayKey, daysBetween } from './dates'

/** Indexed view of all content, built once in content/index.ts */
export interface Catalog {
  courses: Course[]
  lessons: Record<string, Lesson & { courseId: AreaId; index: number }>
  cards: Record<string, ReviewCard & { lessonId: string }>
  /** all skill ids that have at least one card */
  cardsBySkill: Record<SkillId, string[]>
}

export function buildCatalog(courses: Course[]): Catalog {
  const lessons: Catalog['lessons'] = {}
  const cards: Catalog['cards'] = {}
  const cardsBySkill: Catalog['cardsBySkill'] = {}
  for (const c of courses) {
    c.lessons.forEach((l, index) => {
      lessons[l.id] = { ...l, courseId: c.id, index }
      for (const card of l.cards) {
        cards[card.id] = { ...card, lessonId: l.id }
        ;(cardsBySkill[card.skill] ??= []).push(card.id)
      }
    })
  }
  return { courses, lessons, cards, cardsBySkill }
}

/* ------------------------------------------------------------- lessons */

export type LessonStatus = 'locked' | 'available' | 'current' | 'done'

/** lessons unlock in order within a course; every course's first lesson is open */
export function lessonStatus(s: GauntletState, course: Course, index: number, current: string | null): LessonStatus {
  const l = course.lessons[index]
  if (s.lessons[l.id]?.completedAt) return 'done'
  const prevDone = index === 0 || !!s.lessons[course.lessons[index - 1].id]?.completedAt
  if (!prevDone) return 'locked'
  return l.id === current ? 'current' : 'available'
}

export function courseProgress(s: GauntletState, course: Course): { done: number; total: number } {
  const done = course.lessons.filter((l) => s.lessons[l.id]?.completedAt).length
  return { done, total: course.lessons.length }
}

/**
 * The single "continue here" lesson. Unfinished lessons in progress first,
 * then the next lesson in the area the learner is weakest at (blending
 * self-rated confidence with measured mastery), falling back to path order.
 */
export function recommendedLesson(s: GauntletState, cat: Catalog, now: number): string | null {
  const inProgress = Object.entries(s.lessons).find(([, p]) => !p.completedAt && p.resumeStep > 0)
  if (inProgress && cat.lessons[inProgress[0]]) return inProgress[0]

  const mastery = areaMastery(s, cat, now)
  const candidates = cat.courses
    .map((c, order) => {
      const next = c.lessons.find((l) => !s.lessons[l.id]?.completedAt)
      if (!next) return null
      const conf = (s.profile.confidence[c.id] ?? 3) / 5
      const m = mastery[c.id]?.coverage ? mastery[c.id].mastery : conf
      // lower score = more urgent; small path-order bias keeps early units early
      const score = 0.6 * m + 0.4 * conf + order * 0.02
      return { id: next.id, score }
    })
    .filter((x): x is { id: string; score: number } => !!x)
    .sort((a, b) => a.score - b.score)
  return candidates[0]?.id ?? null
}

/* --------------------------------------------------------------- review */

/** due card ids; pass the catalog to skip cards whose content no longer exists (they can never be reviewed) */
export function dueCardIds(s: GauntletState, now: number, cat?: Catalog): string[] {
  return Object.entries(s.cards)
    .filter(([id, c]) => c.due <= now && (!cat || !!cat.cards[id]))
    .map(([id]) => id)
}

export interface SessionPlan {
  cardIds: string[]
  due: number
  /** cards included early because their skill is weak */
  boosted: number
}

/**
 * Build a review session: due cards first (most-forgotten first, weak
 * skills first among ties), then optionally top up with not-yet-due cards
 * from the weakest skills ("weak spot" practice).
 */
export function buildSession(
  s: GauntletState,
  cat: Catalog,
  now: number,
  opts: { size?: number; topUp?: boolean; skill?: SkillId; area?: AreaId } = {},
): SessionPlan {
  const size = opts.size ?? s.settings.sessionSize
  const skillM = skillMastery(s, cat, now)
  const inScope = (id: string) => {
    const card = cat.cards[id]
    if (!card) return false
    if (opts.skill && card.skill !== opts.skill) return false
    if (opts.area && cat.lessons[card.lessonId]?.courseId !== opts.area) return false
    return true
  }
  const priority = (id: string, c: CardState) => {
    const card = cat.cards[id]
    const weak = 1 - (skillM[card.skill]?.mastery ?? 0)
    const leech = Math.min(c.lapses, 4) * 0.05
    return recallNow(c, now) - 0.25 * weak - leech
  }
  const entries = Object.entries(s.cards).filter(([id]) => inScope(id))
  const due = entries.filter(([, c]) => c.due <= now).sort((a, b) => priority(a[0], a[1]) - priority(b[0], b[1]))
  const ids = due.slice(0, size).map(([id]) => id)
  let boosted = 0
  if (opts.topUp && ids.length < size) {
    const rest = entries
      .filter(([, c]) => c.due > now && c.last != null)
      .sort((a, b) => priority(a[0], a[1]) - priority(b[0], b[1]))
    for (const [id] of rest) {
      if (ids.length >= size) break
      ids.push(id)
      boosted++
    }
  }
  return { cardIds: interleave(ids, cat), due: due.length, boosted }
}

/** avoid runs of the same skill: round-robin by skill, preserving priority */
function interleave(ids: string[], cat: Catalog): string[] {
  const buckets = new Map<string, string[]>()
  for (const id of ids) {
    const k = cat.cards[id]?.skill ?? '?'
    if (!buckets.has(k)) buckets.set(k, [])
    buckets.get(k)!.push(id)
  }
  const out: string[] = []
  // one card per non-empty bucket per round; always terminates (every round empties at least one slot)
  for (let left = ids.length; left > 0; ) {
    for (const list of buckets.values()) {
      if (!list.length) continue
      out.push(list.shift() as string)
      left--
    }
  }
  return out
}

/* -------------------------------------------------------------- mastery */

export interface Mastery {
  /** 0..1 blended memory strength x coverage */
  mastery: number
  /** mean current recall probability over reviewed cards */
  recall: number
  /** fraction of the skill's cards unlocked */
  coverage: number
  unlocked: number
  total: number
  due: number
}

export function skillMastery(s: GauntletState, cat: Catalog, now: number): Record<SkillId, Mastery> {
  const out: Record<SkillId, Mastery> = {}
  for (const [skill, ids] of Object.entries(cat.cardsBySkill)) {
    let unlocked = 0
    let reviewed = 0
    let recallSum = 0
    let due = 0
    for (const id of ids) {
      const c = s.cards[id]
      if (!c) continue
      unlocked++
      if (c.due <= now) due++
      if (c.last != null) {
        reviewed++
        recallSum += recallNow(c, now)
      } else {
        // unlocked by finishing the lesson but never reviewed: partial credit
        recallSum += 0.5
        reviewed++
      }
    }
    const recall = reviewed ? recallSum / reviewed : 0
    const coverage = ids.length ? unlocked / ids.length : 0
    out[skill] = { mastery: recall * coverage, recall, coverage, unlocked, total: ids.length, due }
  }
  return out
}

/**
 * Mastery per course over the course's OWN cards. (Skills can span courses;
 * aggregating whole skills would count other courses' cards, so finishing one
 * course could never reach full coverage and would move another's ring.)
 * Same blend as skillMastery: unreviewed unlocked cards get half credit.
 */
export function areaMastery(s: GauntletState, cat: Catalog, now: number): Record<string, Mastery> {
  const out: Record<string, Mastery> = {}
  for (const course of cat.courses) {
    let total = 0
    let unlocked = 0
    let due = 0
    let recallSum = 0
    for (const l of course.lessons)
      for (const card of l.cards) {
        total++
        const c = s.cards[card.id]
        if (!c) continue
        unlocked++
        if (c.due <= now) due++
        recallSum += c.last != null ? recallNow(c, now) : 0.5
      }
    const recall = unlocked ? recallSum / unlocked : 0
    const coverage = total ? unlocked / total : 0
    out[course.id] = { mastery: recall * coverage, recall, coverage, unlocked, total, due }
  }
  return out
}

/**
 * number of cards falling due on each of the next `days` days (index 0 =
 * today, incl. overdue). Offsets are local calendar days, so 23h/25h DST days
 * don't shift cards due near midnight into the wrong column. Pass the catalog
 * to skip cards whose content no longer exists.
 */
export function forecast(s: GauntletState, now: number, days = 7, cat?: Catalog): { day: string; count: number }[] {
  const start = dayKey(now)
  const out = Array.from({ length: days }, (_, i) => ({ day: addDays(start, i), count: 0 }))
  for (const [id, c] of Object.entries(s.cards)) {
    if (cat && !cat.cards[id]) continue
    const offset = c.due <= now ? 0 : daysBetween(start, dayKey(c.due))
    if (offset >= 0 && offset < days) out[offset].count++
  }
  return out
}

/** cards the learner keeps forgetting */
export function leeches(s: GauntletState, min = 3): string[] {
  return Object.entries(s.cards)
    .filter(([, c]) => c.lapses >= min)
    .sort((a, b) => b[1].lapses - a[1].lapses)
    .map(([id]) => id)
}

/** stories whose rehearsal is due */
export function dueStories(s: GauntletState, now: number): string[] {
  return Object.entries(s.stories)
    .filter(([, e]) => e?.rehearsal && e.rehearsal.due <= now)
    .map(([id]) => id)
}
