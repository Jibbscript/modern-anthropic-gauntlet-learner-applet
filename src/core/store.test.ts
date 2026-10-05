import { describe, expect, it } from 'vitest'
import { extendStreak, liveStreak } from './store'

const base = { current: 0, best: 0, lastDay: null, freezes: 0, frozenDays: [] as string[] }

describe('streaks', () => {
  it('starts, extends, and is idempotent within a day', () => {
    let { streak } = extendStreak(base, '2026-03-01')
    expect(streak.current).toBe(1)
    ;({ streak } = extendStreak(streak, '2026-03-02'))
    expect(streak.current).toBe(2)
    const again = extendStreak(streak, '2026-03-02')
    expect(again.extended).toBe(false)
    expect(again.streak.current).toBe(2)
  })

  it('resets after a missed day without freezes', () => {
    const { streak } = extendStreak({ ...base, current: 5, best: 5, lastDay: '2026-03-01' }, '2026-03-03')
    expect(streak.current).toBe(1)
    expect(streak.best).toBe(5)
  })

  it('bridges missed days with freezes and earns freezes at 7', () => {
    const { streak } = extendStreak({ ...base, current: 6, best: 6, lastDay: '2026-03-01', freezes: 1 }, '2026-03-03')
    expect(streak.current).toBe(7)
    expect(streak.frozenDays).toEqual(['2026-03-02'])
    expect(streak.freezes).toBe(1) // used one, earned one at 7
  })

  it('reports a live streak and risk', () => {
    const st = { ...base, current: 4, best: 4, lastDay: '2026-03-01' }
    expect(liveStreak(st, '2026-03-01')).toEqual({ count: 4, doneToday: true, atRisk: false })
    expect(liveStreak(st, '2026-03-02')).toEqual({ count: 4, doneToday: false, atRisk: true })
    expect(liveStreak(st, '2026-03-04').count).toBe(0)
  })
})
