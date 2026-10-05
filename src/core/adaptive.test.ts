import { describe, expect, it } from 'vitest'
import type { Course, Lesson, ReviewCard } from './types'
import { areaMastery, buildCatalog, buildSession, dueCardIds, forecast, recommendedLesson, skillMastery } from './adaptive'
import { initialState, type GauntletState } from './store'
import { newCard, review } from './fsrs'
import { addDays, dayKey } from './dates'

const DAY = 86_400_000
const NOW = new Date(2026, 9, 5, 12, 0, 0).getTime()

const card = (lessonId: string, slug: string, skill: string): ReviewCard => ({ id: `${lessonId}.${slug}`, skill, kind: 'flash', front: 'f', back: 'b' })
const lesson = (id: string, cards: ReviewCard[]): Lesson => ({
  id,
  title: id,
  summary: '',
  minutes: 5,
  skills: [],
  steps: [{ id: 's', kind: 'concept', body: 'x' }],
  cards,
})
const course = (id: Course['id'], lessons: Lesson[]): Course => ({ id, title: id, subtitle: '', color: 'blue', icon: 'code', why: '', lessons })

const CAT = buildCatalog([
  course('python', [
    lesson('py-1', [card('py-1', 'a', 'idioms'), card('py-1', 'b', 'idioms'), card('py-1', 'c', 'idioms'), card('py-1', 'd', 'testing')]),
    lesson('py-2', [card('py-2', 'a', 'debugging'), card('py-2', 'b', 'debugging')]),
  ]),
  course('concurrency', [lesson('conc-1', [card('conc-1', 'a', 'locks'), card('conc-1', 'b', 'locks')])]),
  course('design', [lesson('design-1', [])]), // a course without cards
])

function stateWith(cards: Record<string, ReturnType<typeof newCard>>): GauntletState {
  return { ...initialState(), cards }
}
const due = (offsetMs = -1000) => ({ ...newCard(NOW), due: NOW + offsetMs })

describe('buildSession', () => {
  it('returns every due card once, interleaving skills without dropping any', () => {
    const ids = ['py-1.a', 'py-1.b', 'py-1.c', 'py-1.d', 'py-2.a', 'conc-1.a']
    const s = stateWith(Object.fromEntries(ids.map((id) => [id, due()])))
    const plan = buildSession(s, CAT, NOW, { size: 50 })
    expect(plan.cardIds.slice().sort()).toEqual(ids.slice().sort())
    expect(new Set(plan.cardIds).size).toBe(plan.cardIds.length)
    expect(plan.due).toBe(6)
    // the three idioms cards are not back to back
    const skills = plan.cardIds.map((id) => CAT.cards[id].skill)
    expect(skills.slice(0, 4)).toEqual(expect.arrayContaining(['idioms', 'testing', 'debugging', 'locks']))
  })

  it('caps at the session size, most-forgotten first', () => {
    const fresh = review(newCard(NOW - 10 * DAY), 3, NOW - 10 * DAY) // reviewed, decayed
    const recent = review(newCard(NOW - DAY), 4, NOW - DAY) // reviewed yesterday, still strong
    const s = stateWith({ 'py-1.a': { ...recent, due: NOW - 1 }, 'conc-1.a': { ...fresh, due: NOW - 1 } })
    const plan = buildSession(s, CAT, NOW, { size: 1 })
    expect(plan.cardIds).toEqual(['conc-1.a'])
    expect(plan.due).toBe(2)
  })

  it('tops up with reviewed, not-yet-due cards without duplicates and skips unknown cards', () => {
    const reviewed = review(newCard(NOW - DAY), 3, NOW - DAY)
    const s = stateWith({ 'py-1.a': due(), 'py-1.b': reviewed, 'py-1.c': newCard(NOW), 'gone.x': due() })
    const plan = buildSession(s, CAT, NOW, { size: 10, topUp: true })
    expect(plan.cardIds.slice().sort()).toEqual(['py-1.a', 'py-1.b'])
    expect(plan.boosted).toBe(1)
  })

  it('filters by area and skill', () => {
    const s = stateWith({ 'py-1.a': due(), 'conc-1.a': due(), 'py-2.a': due() })
    expect(buildSession(s, CAT, NOW, { area: 'concurrency' }).cardIds).toEqual(['conc-1.a'])
    expect(buildSession(s, CAT, NOW, { skill: 'debugging' }).cardIds).toEqual(['py-2.a'])
  })
})

describe('mastery', () => {
  it('is finite for skills and courses with nothing unlocked or no cards', () => {
    const s = initialState()
    const sk = skillMastery(s, CAT, NOW)
    for (const m of Object.values(sk)) for (const v of Object.values(m)) expect(Number.isFinite(v)).toBe(true)
    const ar = areaMastery(s, CAT, NOW)
    expect(ar.design).toEqual({ mastery: 0, recall: 0, coverage: 0, unlocked: 0, total: 0, due: 0 })
    expect(ar.python.coverage).toBe(0)
  })

  it('counts only a course\'s own cards when a skill spans courses', () => {
    const shared = buildCatalog([
      course('concurrency', [lesson('conc-1', [card('conc-1', 'a', 'conc.locks'), card('conc-1', 'b', 'conc.locks')])]),
      course('builds', [lesson('builds-1', [card('builds-1', 'a', 'conc.locks'), card('builds-1', 'b', 'conc.locks')])]),
    ])
    // the concurrency course is finished; the builds course has not been started
    const s = stateWith({ 'conc-1.a': newCard(NOW), 'conc-1.b': newCard(NOW) })
    const ar = areaMastery(s, shared, NOW)
    expect(ar.concurrency).toMatchObject({ coverage: 1, unlocked: 2, total: 2 })
    expect(ar.builds).toMatchObject({ coverage: 0, unlocked: 0, total: 2, mastery: 0 })
  })

  it('weights coverage by unlocked cards', () => {
    const s = stateWith({ 'conc-1.a': newCard(NOW) })
    const m = skillMastery(s, CAT, NOW).locks
    expect(m).toMatchObject({ unlocked: 1, total: 2, coverage: 0.5, recall: 0.5, mastery: 0.25 })
  })

  it('recommends a lesson in progress, else the next lesson somewhere', () => {
    const s = initialState()
    expect(recommendedLesson(s, CAT, NOW)).not.toBeNull()
    s.lessons['py-2'] = { completedAt: null, bestAccuracy: 0, completions: 0, resumeStep: 3 }
    expect(recommendedLesson(s, CAT, NOW)).toBe('py-2')
  })

  it('resumes the unfinished lesson saved most recently, not the first one listed', () => {
    const s = initialState()
    s.lessons['py-1'] = { completedAt: null, bestAccuracy: 0, completions: 0, resumeStep: 2, updatedAt: NOW - 3_600_000 }
    s.lessons['conc-1'] = { completedAt: null, bestAccuracy: 0, completions: 0, resumeStep: 1, updatedAt: NOW - 60_000 }
    s.lessons['py-2'] = { completedAt: null, bestAccuracy: 0, completions: 0, resumeStep: 4 }
    expect(recommendedLesson(s, CAT, NOW)).toBe('conc-1')
    // a lesson whose content was removed is skipped, however recent
    s.lessons['gone'] = { completedAt: null, bestAccuracy: 0, completions: 0, resumeStep: 1, updatedAt: NOW }
    expect(recommendedLesson(s, CAT, NOW)).toBe('conc-1')
    // a finished lesson is never resumed
    s.lessons['conc-1'] = { ...s.lessons['conc-1'], completedAt: NOW - 1000 }
    expect(recommendedLesson(s, CAT, NOW)).toBe('py-1')
  })
})

describe('due counts and forecast', () => {
  it('ignores cards whose content is gone when given the catalog', () => {
    const s = stateWith({ 'py-1.a': due(), 'gone.x': due() })
    expect(dueCardIds(s, NOW)).toHaveLength(2)
    expect(dueCardIds(s, NOW, CAT)).toEqual(['py-1.a'])
    expect(forecast(s, NOW, 7, CAT)[0].count).toBe(1)
  })

  it('buckets cards by local calendar day', () => {
    const at = (days: number, h: number, m = 0) => {
      const d = new Date(NOW)
      d.setDate(d.getDate() + days)
      d.setHours(h, m, 0, 0)
      return d.getTime()
    }
    const s = stateWith({
      a: { ...newCard(NOW), due: NOW - 5 * DAY }, // overdue: today
      b: { ...newCard(NOW), due: at(0, 23, 59) }, // later today
      c: { ...newCard(NOW), due: at(1, 0, 1) }, // just after midnight
      d: { ...newCard(NOW), due: at(6, 23, 30) }, // last column
      e: { ...newCard(NOW), due: at(7, 0, 30) }, // beyond the window
    })
    const fc = forecast(s, NOW, 7)
    expect(fc.map((x) => x.day)).toEqual(Array.from({ length: 7 }, (_, i) => addDays(dayKey(NOW), i)))
    expect(fc.map((x) => x.count)).toEqual([2, 1, 0, 0, 0, 0, 1])
  })
})
