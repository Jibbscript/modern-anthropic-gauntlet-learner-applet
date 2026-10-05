import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { addDays, dayKey, daysBetween, parseDayKey, weekOf } from './dates'
import { extendStreak, initialState, liveStreak } from './store'
import { forecast } from './adaptive'
import { newCard } from './fsrs'

/*
 * Day boundaries follow the learner's local calendar. Run these in a zone
 * with daylight saving so 23h and 25h days are exercised (US clocks spring
 * forward on 2026-03-08 and fall back on 2026-11-01).
 */
const savedTz = process.env.TZ
beforeAll(() => {
  process.env.TZ = 'America/New_York'
})
afterAll(() => {
  if (savedTz === undefined) delete process.env.TZ
  else process.env.TZ = savedTz
})

const local = (y: number, mo: number, d: number, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi).getTime()

describe('local days across DST', () => {
  it('runs in a zone with DST', () => {
    expect(new Date(local(2026, 3, 7)).getTimezoneOffset()).not.toBe(new Date(local(2026, 3, 9)).getTimezoneOffset())
  })

  it('counts whole calendar days over short and long days', () => {
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2)
    expect(daysBetween('2026-10-31', '2026-11-02')).toBe(2)
    expect(addDays('2026-03-07', 1)).toBe('2026-03-08')
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09')
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02')
    expect(addDays('2026-11-02', -1)).toBe('2026-11-01')
    expect(dayKey(parseDayKey('2026-11-01'))).toBe('2026-11-01')
    expect(weekOf('2026-11-01')).toEqual(['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01'])
  })

  it('keeps a streak going over the DST change', () => {
    const st = { ...initialState().streak, current: 5, best: 5, lastDay: '2026-03-07' }
    expect(extendStreak(st, '2026-03-08').streak.current).toBe(6)
    expect(liveStreak({ ...st, lastDay: '2026-10-31' }, '2026-11-01')).toMatchObject({ count: 5, atRisk: true })
    expect(extendStreak({ ...st, lastDay: '2026-10-31' }, '2026-11-01').streak.current).toBe(6)
  })

  it('forecasts cards into the right column on 23h and 25h days', () => {
    // spring forward: 2026-03-08 is 23h long
    const springNow = local(2026, 3, 7, 12)
    const spring = {
      ...initialState(),
      cards: {
        a: { ...newCard(0), due: local(2026, 3, 8, 23, 30) }, // tomorrow, late
        b: { ...newCard(0), due: local(2026, 3, 9, 0, 30) }, // the day after, just past midnight
      },
    }
    expect(forecast(spring, springNow, 4).map((d) => d.count)).toEqual([0, 1, 1, 0])
    // fall back: 2026-11-01 is 25h long
    const fallNow = local(2026, 10, 31, 12)
    const fall = { ...initialState(), cards: { a: { ...newCard(0), due: local(2026, 11, 1, 23, 30) } } }
    expect(forecast(fall, fallNow, 4).map((d) => d.count)).toEqual([0, 1, 0, 0])
  })
})
