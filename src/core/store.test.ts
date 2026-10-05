import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { XP, extendStreak, initialState, lessonStart, liveStreak, normalizeState, useStore, type GauntletState } from './store'
import { newCard } from './fsrs'
import { dayKey } from './dates'

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

  it('liveStreak agrees with extendStreak about whether freezes save the streak', () => {
    for (const freezes of [0, 1, 2])
      for (const gap of [1, 2, 3, 4]) {
        const st = { ...base, current: 3, best: 3, lastDay: '2026-03-01', freezes }
        const day = `2026-03-0${1 + gap}`
        const alive = liveStreak(st, day).count > 0
        const kept = extendStreak(st, day).streak.current > 1
        expect(alive, `freezes ${freezes}, gap ${gap}`).toBe(kept)
      }
  })
})

/* ------------------------------------------------------------ actions */

const T0 = new Date(2026, 9, 5, 10, 0, 0).getTime() // local 10:00
const store = () => useStore.getState()

describe('store actions', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(T0)
    useStore.setState(initialState())
  })
  afterEach(() => vi.useRealTimers())

  it('answerStep: first try 15, retry 5, revealed answer 0 and breaks the combo', () => {
    expect(store().answerStep(true)).toBe(XP.firstTry)
    expect(store().combo).toBe(1)
    expect(store().answerStep(false, true)).toBe(XP.retry)
    expect(store().combo).toBe(0)
    store().answerStep(true)
    expect(store().answerStep(false, false)).toBe(0)
    expect(store().combo).toBe(0)
    expect(store().xp).toBe(XP.firstTry * 2 + XP.retry)
    const d = store().days[dayKey(T0)]
    expect(d).toMatchObject({ answered: 4, correct: 2, xp: XP.firstTry * 2 + XP.retry })
  })

  it('answerStep: combo bonus every 5 first-try answers', () => {
    const xs = Array.from({ length: 5 }, () => store().answerStep(true))
    expect(xs).toEqual([15, 15, 15, 15, 15 + XP.comboBonus])
    expect(store().bestCombo).toBe(5)
  })

  it('finishLesson: clamps accuracy, clears the run, halves the bonus on replays', () => {
    store().checkpointLesson('l1', 3, { graded: ['a'], firstTry: 1, xp: 15, ms: 1000 })
    const first = store().finishLesson('l1', { accuracy: 1.5, cardIds: ['l1.a'], activeMs: 5000 })
    expect(first.xp).toBe(XP.lessonComplete + XP.perfectBonus)
    expect(first.streakExtended).toBe(true)
    const p = store().lessons.l1
    expect(p).toMatchObject({ bestAccuracy: 1, completions: 1, resumeStep: 0, run: null })
    expect(store().cards['l1.a']).toBeDefined()
    const again = store().finishLesson('l1', { accuracy: Number.NaN, cardIds: ['l1.a'], activeMs: 1 })
    expect(again.xp).toBe(Math.round(XP.lessonComplete / 2))
    expect(again.streakExtended).toBe(false)
    expect(store().lessons.l1.bestAccuracy).toBe(1)
  })

  it('checkpointLesson keeps the run tally and sanitises the step', () => {
    store().checkpointLesson('l1', 2, { graded: ['a', 'b'], firstTry: 1, xp: 20, ms: 3000 })
    store().checkpointLesson('l1', Number.NaN)
    expect(store().lessons.l1.resumeStep).toBe(0)
    expect(store().lessons.l1.run).toEqual({ graded: ['a', 'b'], firstTry: 1, xp: 20, ms: 3000 })
  })

  it('a third story rehearsal counts toward the streak like a third card review', () => {
    store().saveStory('failure', { layers: { 0: 'x'.repeat(40) } })
    store().reviewCard('c1', 3, 1000)
    store().reviewCard('c2', 3, 1000)
    expect(store().streak.lastDay).toBeNull()
    store().rehearseStory('failure', 3)
    expect(store().days[dayKey(T0)].reviews).toBe(3)
    expect(store().streak).toMatchObject({ current: 1, lastDay: dayKey(T0) })
  })

  it('a second look at a missed card reschedules it without paying or counting another review', () => {
    expect(store().reviewCard('c1', 1, 1000)).toBe(XP.review[1])
    const missed = store().cards.c1
    vi.setSystemTime(T0 + 5 * 60_000)
    expect(store().reviewCard('c1', 3, 1000, true)).toBe(0)
    expect(store().cards.c1.due).toBeGreaterThan(missed.due) // rescheduled past the 10-minute retry
    expect(store().cards.c1.reps).toBe(2)
    expect(store().days[dayKey(T0)]).toMatchObject({ reviews: 1, answered: 1, xp: XP.review[1], activeMs: 2000 })
    expect(store().xp).toBe(XP.review[1])
  })

  it('passLabLevel: bestMs is the total time to clear every level', () => {
    store().passLabLevel('kv', 0, 60_000, 4)
    expect(store().labs.kv).toMatchObject({ levelsPassed: 1, bestMs: null, activeMs: 60_000 })
    store().passLabLevel('kv', 1, 150_000, 4)
    store().passLabLevel('kv', 2, 300_000, 4)
    expect(store().labs.kv.bestMs).toBeNull()
    store().passLabLevel('kv', 3, 420_000, 4)
    expect(store().labs.kv).toMatchObject({ levelsPassed: 4, bestMs: 420_000, activeMs: 420_000 })
    expect(store().xp).toBe(4 * XP.labLevel)
  })

  it('passLabLevel: each level passes once, in order', () => {
    store().passLabLevel('kv', 0, 1000, 4)
    store().passLabLevel('kv', 0, 2000, 4) // again
    store().passLabLevel('kv', 2, 3000, 4) // skipping level 1
    store().passLabLevel('kv', 4, 3000, 4) // out of range
    expect(store().labs.kv.levelsPassed).toBe(1)
    expect(store().xp).toBe(XP.labLevel)
  })

  it('saveLab keeps the active time and fills defaults', () => {
    store().saveLab('kv', { activeMs: 1234 })
    expect(store().labs.kv).toEqual({ code: '', levelsPassed: 0, bestMs: null, startedAt: null, activeMs: 1234 })
  })

  it('unlockAchievements never repeats an unlock', () => {
    store().unlockAchievements(['a', 'a', 'b'])
    store().unlockAchievements(['a'])
    expect(store().unseenAchievements).toEqual(['a', 'b'])
    expect(Object.keys(store().achievements)).toEqual(['a', 'b'])
  })

  it('importState repairs malformed input and cannot clobber actions', () => {
    const bad = {
      version: 1,
      importState: 'gotcha',
      reviewCard: 42,
      xp: 'lots',
      lessons: { l1: { completedAt: 'yesterday', resumeStep: -3 }, l2: null },
      cards: { c1: { due: 'soon', stability: Number.NaN, history: [{ t: 1, g: 9 }, { t: 2, g: 3 }] } },
      days: { '2026-10-04': { xp: '10', lessons: 1 } },
      streak: { current: 3, lastDay: '2026-10-04' },
      settings: { retention: 5, sessionSize: -1, theme: 'neon' },
      labs: { kv: { levelsPassed: 2 } },
      unseenAchievements: 'x',
    }
    store().importState(bad as unknown as GauntletState)
    const s = store()
    expect(typeof s.importState).toBe('function')
    expect(typeof s.reviewCard).toBe('function')
    expect(s.xp).toBe(0)
    expect(s.lessons.l1).toMatchObject({ completedAt: null, resumeStep: 0, completions: 0 })
    expect(s.lessons.l2).toBeUndefined()
    expect(s.cards.c1).toMatchObject({ phase: 'new', due: T0, stability: 0, history: [{ t: 2, g: 3 }] })
    expect(s.days['2026-10-04']).toEqual({ xp: 0, lessons: 1, reviews: 0, correct: 0, answered: 0, activeMs: 0 })
    expect(s.streak).toEqual({ current: 3, best: 3, lastDay: '2026-10-04', freezes: 0, frozenDays: [] })
    expect(s.settings).toMatchObject({ retention: 0.97, sessionSize: 15, theme: 'system' })
    expect(s.labs.kv).toEqual({ code: '', levelsPassed: 2, bestMs: null, startedAt: null, activeMs: 0 })
    expect(s.unseenAchievements).toEqual([])
    // and the repaired state keeps working
    expect(() => store().reviewCard('c1', 3, 0)).not.toThrow()
    expect(store().streak.current).toBe(3) // only one review today: no extension yet
    store().finishLesson('l1', { accuracy: 1, cardIds: [], activeMs: 0 })
    expect(store().streak.current).toBe(4)
  })

  it('importState rejects non-objects and other versions', () => {
    expect(() => store().importState(null as unknown as GauntletState)).toThrow()
    expect(() => store().importState({ version: 2 } as unknown as GauntletState)).toThrow()
  })

  it('rehydrating persisted state from an older build fills new fields', () => {
    const merge = useStore.persist.getOptions().merge!
    const persisted = {
      version: 1,
      profile: { onboarded: true, name: 'Ada' },
      streak: { current: 2, best: 2, lastDay: '2026-10-04', freezes: 0 }, // no frozenDays
      labs: { kv: { code: 'x', levelsPassed: 1, bestMs: 5000, startedAt: 1 } }, // old bestMs = level-1 time
      days: { '2026-10-05': { xp: 5, lessons: 0, reviews: 2 } }, // missing counters
    }
    const merged = merge(persisted, store())
    useStore.setState(merged, true)
    expect(store().profile).toMatchObject({ onboarded: true, name: 'Ada', role: 'swe' })
    expect(store().labs.kv).toMatchObject({ bestMs: null, activeMs: 0, levelsPassed: 1 })
    expect(typeof store().reviewCard).toBe('function')
    // a third review today extends the streak; the legacy streak lacked frozenDays
    store().reviewCard('c1', 3, 0)
    expect(store().days['2026-10-05']).toMatchObject({ reviews: 3, answered: 1, correct: 1 })
    expect(store().streak).toMatchObject({ current: 3, lastDay: '2026-10-05' })
  })

  it('merge leaves the state alone when nothing is persisted', () => {
    const merge = useStore.persist.getOptions().merge!
    const cur = store()
    expect(merge(undefined, cur)).toBe(cur)
  })
})

describe('normalizeState', () => {
  it('round-trips a valid state', () => {
    const s = initialState()
    s.cards.c = newCard(T0)
    s.lessons.l = { completedAt: 5, bestAccuracy: 0.5, completions: 1, resumeStep: 0, run: null }
    s.labs.kv = { code: 'x', levelsPassed: 4, bestMs: 9000, startedAt: 1, activeMs: 9000 }
    expect(normalizeState(JSON.parse(JSON.stringify(s)))).toEqual(s)
  })

  it('keeps the run tally consistent', () => {
    const s = normalizeState({ lessons: { l: { resumeStep: 2, run: { graded: ['a', 'a', 3], firstTry: 5, xp: 30, ms: -1 } } } })
    expect(s.lessons.l.run).toEqual({ graded: ['a'], firstTry: 1, xp: 30, ms: 0 })
  })
})

describe('lessonStart', () => {
  it('starts fresh for new and finished lessons', () => {
    expect(lessonStart(undefined, 10)).toMatchObject({ index: 0, firstTry: 0, xp: 0 })
    const done = { completedAt: 1, bestAccuracy: 1, completions: 1, resumeStep: 4, run: { graded: ['a'], firstTry: 1, xp: 15, ms: 9 } }
    const s = lessonStart(done, 10)
    expect(s.index).toBe(0)
    expect(s.graded.size).toBe(0)
  })

  it('resumes an unfinished lesson with its tally, clamped to the lesson', () => {
    const prog = { completedAt: null, bestAccuracy: 0, completions: 0, resumeStep: 7, run: { graded: ['a', 'b'], firstTry: 1, xp: 20, ms: 4000 } }
    const s = lessonStart(prog, 10)
    expect(s).toMatchObject({ index: 7, firstTry: 1, xp: 20, msBefore: 4000 })
    expect(s.graded.has('b')).toBe(true)
    expect(lessonStart(prog, 5).index).toBe(4) // the lesson got shorter
    expect(lessonStart({ ...prog, resumeStep: Number.NaN }, 5).index).toBe(0)
    expect(lessonStart({ ...prog, resumeStep: -2 }, 5).index).toBe(0)
  })
})
