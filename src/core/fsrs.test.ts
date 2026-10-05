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
})
