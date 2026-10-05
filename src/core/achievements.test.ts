import { describe, expect, it } from 'vitest'
import { ACHIEVEMENTS, newlyEarned } from './achievements'
import { buildCatalog } from './adaptive'
import { initialState, type GauntletState } from './store'

const CAT = buildCatalog([])
const lab = (levelsPassed: number, bestMs: number | null) => ({ code: '', levelsPassed, bestMs, startedAt: 1, activeMs: bestMs ?? 1000 })

describe('achievements', () => {
  it('ids are unique', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length)
  })

  it('awards "pass every level of a lab" only once the last level passes', () => {
    const s: GauntletState = { ...initialState(), labs: { kv: lab(3, null) } }
    expect(newlyEarned(s, CAT)).not.toContain('lab-1')
    s.labs.kv = lab(4, 420_000)
    expect(newlyEarned(s, CAT)).toContain('lab-1')
  })

  it('never re-awards an unlocked achievement', () => {
    const s: GauntletState = { ...initialState(), xp: 5000 }
    expect(newlyEarned(s, CAT)).toEqual(['xp-1000'])
    s.achievements['xp-1000'] = 1
    expect(newlyEarned(s, CAT)).toEqual([])
  })

  it('a course with no lessons is never "done"', () => {
    const s = initialState()
    const cat = buildCatalog([{ id: 'why', title: 'Why', subtitle: '', color: 'blue', icon: 'compass', why: '', lessons: [] }])
    expect(newlyEarned(s, cat)).not.toContain('why-done')
  })
})
