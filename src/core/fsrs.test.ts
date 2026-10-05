import { describe, expect, it } from 'vitest'
import { capForInterview, gradeFromAnswer, intervalFor, newCard, recallNow, retrievability, review } from './fsrs'

const DAY = 86_400_000
const T0 = Date.UTC(2026, 0, 1)

describe('fsrs', () => {
  it('retrievability is 0.9 at t = S', () => {
    expect(retrievability(10, 10)).toBeCloseTo(0.9, 6)
    expect(intervalFor(10, 0.9)).toBeCloseTo(10, 6)
  })

  it('higher retention gives shorter intervals', () => {
    expect(intervalFor(10, 0.95)).toBeLessThan(intervalFor(10, 0.9))
  })

  it('first review sets initial stability by grade', () => {
    const c = newCard(T0)
    const again = review(c, 1, T0)
    const good = review(c, 3, T0)
    const easy = review(c, 4, T0)
    expect(again.phase).toBe('learning')
    expect(again.due - T0).toBe(10 * 60_000)
    expect(good.stability).toBeGreaterThan(again.stability)
    expect(easy.stability).toBeGreaterThan(good.stability)
    expect(good.due - T0).toBeGreaterThanOrEqual(DAY)
  })

  it('successful reviews grow intervals; lapses shrink stability and count', () => {
    let c = review(newCard(T0), 3, T0)
    const s1 = c.stability
    let t = c.due
    c = review(c, 3, t)
    expect(c.stability).toBeGreaterThan(s1)
    const s2 = c.stability
    t = c.due
    c = review(c, 1, t)
    expect(c.stability).toBeLessThan(s2)
    expect(c.lapses).toBe(1)
    expect(c.phase).toBe('relearning')
  })

  it('difficulty stays within 1..10', () => {
    let c = newCard(T0)
    let t = T0
    for (let i = 0; i < 30; i++) {
      c = review(c, 1, t)
      t += DAY
    }
    expect(c.difficulty).toBeLessThanOrEqual(10)
    for (let i = 0; i < 30; i++) {
      c = review(c, 4, t)
      t = c.due
    }
    expect(c.difficulty).toBeGreaterThanOrEqual(1)
  })

  it('caps intervals before the interview date', () => {
    expect(capForInterview(30, T0, T0 + 10 * DAY)).toBe(4)
    expect(capForInterview(3, T0, T0 + 10 * DAY)).toBe(3)
    expect(capForInterview(30, T0, T0 + DAY)).toBe(1)
    expect(capForInterview(30, T0, null)).toBe(30)
    const c = review(review(newCard(T0), 4, T0), 4, T0 + 5 * DAY, { interviewAt: T0 + 12 * DAY })
    expect(c.due).toBeLessThanOrEqual(T0 + 12 * DAY)
  })

  it('recallNow is 0 for unseen cards and decays over time', () => {
    const c = newCard(T0)
    expect(recallNow(c, T0)).toBe(0)
    const r = review(c, 3, T0)
    expect(recallNow(r, T0 + DAY)).toBeGreaterThan(recallNow(r, T0 + 20 * DAY))
  })

  it('grades interactive answers', () => {
    const base = { correct: true, attempts: 1, usedHint: false, ms: 8000, expectedMs: 10000, previouslySeen: false }
    expect(gradeFromAnswer(base)).toBe(3)
    expect(gradeFromAnswer({ ...base, correct: false })).toBe(1)
    expect(gradeFromAnswer({ ...base, attempts: 2 })).toBe(2)
    expect(gradeFromAnswer({ ...base, usedHint: true })).toBe(2)
    expect(gradeFromAnswer({ ...base, ms: 3000, previouslySeen: true })).toBe(4)
    expect(gradeFromAnswer({ ...base, ms: 40000 })).toBe(2)
  })

  it('counts a lapse only when a graduated card is forgotten', () => {
    // failing a brand-new card, then failing it again while learning: no lapses
    let c = review(newCard(T0), 1, T0)
    expect(c).toMatchObject({ phase: 'learning', lapses: 0 })
    c = review(c, 1, T0 + 10 * 60_000)
    expect(c).toMatchObject({ phase: 'learning', lapses: 0 })
    // graduate, then forget: one lapse; forgetting again during relearning is not another
    c = review(c, 3, T0 + 20 * 60_000)
    expect(c.phase).toBe('review')
    c = review(c, 1, c.due)
    expect(c).toMatchObject({ phase: 'relearning', lapses: 1 })
    c = review(c, 1, c.due)
    expect(c).toMatchObject({ phase: 'relearning', lapses: 1 })
    c = review(c, 3, c.due)
    expect(c.phase).toBe('review')
    c = review(c, 1, c.due)
    expect(c.lapses).toBe(2)
  })

  it('does not cap intervals once the interview day has arrived or passed', () => {
    const graduated = review(review(newCard(T0), 3, T0), 3, T0 + 3 * DAY)
    const t = graduated.due
    const free = review(graduated, 4, t)
    // interview at local midnight today / last week: plain FSRS intervals
    expect(capForInterview(30, t, t - 3_600_000)).toBe(30)
    expect(capForInterview(30, t, t - 7 * DAY)).toBe(30)
    expect(review(graduated, 4, t, { interviewAt: t - 3_600_000 }).due).toBe(free.due)
    // interview tomorrow: never more than a day out
    expect(review(graduated, 4, t, { interviewAt: t + DAY / 2 }).due - t).toBe(DAY)
  })

  it('a capped schedule converges on the interview instead of overshooting it', () => {
    const interview = T0 + 20 * DAY
    let c = review(newCard(T0), 4, T0, { interviewAt: interview })
    let t = c.due
    const dues: number[] = [c.due]
    while (t < interview - DAY) {
      c = review(c, 4, t, { interviewAt: interview })
      dues.push(c.due)
      t = c.due
    }
    // every review before the last lands before the interview, and the last touch is within a day of it
    expect(dues.slice(0, -1).every((d) => d < interview)).toBe(true)
    expect(interview - dues[dues.length - 2]).toBeLessThanOrEqual(2 * DAY)
  })
})

