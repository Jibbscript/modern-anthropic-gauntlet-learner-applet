import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import type { AreaId, StorySlotId } from './types'
import { newCard, review, type CardPhase, type CardState, type Grade, type ScheduleOptions } from './fsrs'
import { addDays, dayKey, daysBetween, parseDayKey } from './dates'

/* ----------------------------------------------------------------- state */

export type ThemePref = 'system' | 'light' | 'dark'

export interface Settings {
  sound: boolean
  haptics: boolean
  theme: ThemePref
  /** XP needed to hit the daily goal ring */
  dailyXpGoal: number
  /** FSRS desired retention */
  retention: number
  reduceMotion: boolean
  /** max cards per review session */
  sessionSize: number
}

export interface Profile {
  onboarded: boolean
  name: string
  role: 'swe' | 'research-eng' | 'infra' | 'other'
  /** YYYY-MM-DD local, empty if unknown */
  interviewDate: string
  /** self-rated 1..5 per area from onboarding */
  confidence: Partial<Record<AreaId, number>>
  createdAt: number
}

export interface LessonProgress {
  completedAt: number | null
  /** 0..1 */
  bestAccuracy: number
  completions: number
  /** resume point for an unfinished lesson */
  resumeStep: number
  /** tally of the run in progress, so a resumed lesson keeps its accuracy and never pays a step twice */
  run?: LessonRun | null
  /** when the lesson last saved a resume point (ms), so the most recent unfinished lesson resumes first */
  updatedAt?: number | null
}

export interface LessonRun {
  /** ids of graded steps already answered (and paid XP) in this run */
  graded: string[]
  /** how many of those were right on the first try */
  firstTry: number
  /** XP earned from steps in this run */
  xp: number
  /** active ms spent in earlier sittings of this run */
  ms: number
}

export interface DayLog {
  xp: number
  lessons: number
  reviews: number
  correct: number
  answered: number
  /** ms of active time, approximate */
  activeMs: number
}

export interface StoryEntry {
  /** layer index -> text */
  layers: Record<number, string>
  notes: string
  updatedAt: number
  /** rehearsal schedule (FSRS) once the story has content */
  rehearsal: CardState | null
  rehearsals: number
}

export interface Streak {
  current: number
  best: number
  /** last local day the streak was extended */
  lastDay: string | null
  freezes: number
  frozenDays: string[]
}

export interface LabProgress {
  code: string
  levelsPassed: number
  /** total active time it took to pass every level (null until the lab is finished) */
  bestMs: number | null
  startedAt: number | null
  /** accumulated active time on this lab (the lab timer), ms */
  activeMs: number
}

export interface GauntletState {
  version: 1
  profile: Profile
  settings: Settings
  lessons: Record<string, LessonProgress>
  cards: Record<string, CardState>
  stories: Partial<Record<StorySlotId, StoryEntry>>
  /** `${lessonId}/${stepId}` -> free text */
  reflections: Record<string, string>
  days: Record<string, DayLog>
  streak: Streak
  xp: number
  /** achievement id -> unlocked at */
  achievements: Record<string, number>
  /** achievements unlocked but not yet celebrated */
  unseenAchievements: string[]
  labs: Record<string, LabProgress>
  /** consecutive first-try correct answers (combo) */
  combo: number
  bestCombo: number
}

export interface GauntletActions {
  completeOnboarding(p: Partial<Profile>): void
  setProfile(p: Partial<Profile>): void
  setSettings(s: Partial<Settings>): void
  /** save the resume point (and the run tally) of an unfinished lesson */
  checkpointLesson(lessonId: string, step: number, run?: LessonRun): void
  /**
   * registers an answered graded step; returns XP awarded. `solved` is false
   * when the learner gave up and revealed the answer (no XP, combo breaks).
   */
  answerStep(correctFirstTry: boolean, solved?: boolean): number
  finishLesson(lessonId: string, r: { accuracy: number; cardIds: string[]; activeMs: number }): { xp: number; streakExtended: boolean }
  /**
   * grade a review card; returns XP awarded. `repeat` marks a second look in
   * the same session: it reschedules the card but is not another review (no
   * XP, not counted toward the day's reviews)
   */
  reviewCard(cardId: string, grade: Grade, activeMs: number, repeat?: boolean): number
  saveReflection(key: string, text: string): void
  saveStory(slot: StorySlotId, patch: { layers?: Record<number, string>; notes?: string }): void
  rehearseStory(slot: StorySlotId, grade: Grade): void
  saveLab(labId: string, patch: Partial<LabProgress>): void
  /**
   * record passing `level` (0-based) of a lab with `totalLevels` levels;
   * `elapsedMs` is the lab's cumulative active time at that moment
   */
  passLabLevel(labId: string, level: number, elapsedMs: number, totalLevels: number): void
  /** add review cards for completed lessons that gained cards after completion */
  syncCards(cardsByLesson: Record<string, string[]>): void
  unlockAchievements(ids: string[]): void
  markAchievementsSeen(): void
  resetAll(): void
  /** replace all progress with an export; malformed fields are repaired or dropped */
  importState(s: GauntletState): void
}

export type Store = GauntletState & GauntletActions

/* ------------------------------------------------------------- defaults */

const now = () => Date.now()

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  haptics: true,
  theme: 'system',
  dailyXpGoal: 60,
  retention: 0.9,
  reduceMotion: false,
  sessionSize: 15,
}

export function initialState(): GauntletState {
  return {
    version: 1,
    profile: { onboarded: false, name: '', role: 'swe', interviewDate: '', confidence: {}, createdAt: now() },
    settings: { ...DEFAULT_SETTINGS },
    lessons: {},
    cards: {},
    stories: {},
    reflections: {},
    days: {},
    streak: { current: 0, best: 0, lastDay: null, freezes: 0, frozenDays: [] },
    xp: 0,
    achievements: {},
    unseenAchievements: [],
    labs: {},
    combo: 0,
    bestCombo: 0,
  }
}

export const XP = {
  firstTry: 15,
  retry: 5,
  lessonComplete: 20,
  perfectBonus: 15,
  comboEvery: 5,
  comboBonus: 10,
  review: { 1: 1, 2: 3, 3: 5, 4: 6 } as Record<Grade, number>,
  story: 8,
  labLevel: 40,
}

/* -------------------------------------------------------------- helpers */

export function interviewAt(p: Profile): number | null {
  if (!p.interviewDate) return null
  const t = parseDayKey(p.interviewDate)
  return Number.isFinite(t) ? t : null
}

export function scheduleOptions(s: GauntletState): ScheduleOptions {
  const at = interviewAt(s.profile)
  let retention = s.settings.retention
  // inside the final two weeks, hold material a little tighter
  if (at && at > now() && at - now() < 14 * 86_400_000) retention = Math.max(retention, 0.92)
  return { retention, interviewAt: at }
}

function emptyDay(): DayLog {
  return { xp: 0, lessons: 0, reviews: 0, correct: 0, answered: 0, activeMs: 0 }
}

function emptyLesson(): LessonProgress {
  return { completedAt: null, bestAccuracy: 0, completions: 0, resumeStep: 0, run: null }
}

function emptyLab(): LabProgress {
  return { code: '', levelsPassed: 0, bestMs: null, startedAt: null, activeMs: 0 }
}

function bumpDay(days: Record<string, DayLog>, key: string, patch: Partial<DayLog>): Record<string, DayLog> {
  const d = { ...emptyDay(), ...days[key] }
  for (const k of Object.keys(patch) as (keyof DayLog)[]) d[k] = (Number.isFinite(d[k]) ? d[k] : 0) + (patch[k] ?? 0)
  return { ...days, [key]: d }
}

/** extend the streak if `today`'s log now qualifies */
function maybeExtend(st: Streak, days: Record<string, DayLog>, today: string): { streak: Streak; extended: boolean } {
  return qualifies(days[today]) ? extendStreak(st, today) : { streak: st, extended: false }
}

/**
 * Extend the streak for `today`. Missed days are bridged by streak freezes
 * when available; one freeze is earned per 7-day milestone (max 2 banked).
 */
export function extendStreak(st: Streak, today: string): { streak: Streak; extended: boolean } {
  if (st.lastDay === today) return { streak: st, extended: false }
  let { current, best, freezes } = st
  let frozenDays = st.frozenDays
  if (st.lastDay == null) {
    current = 1
  } else {
    const gap = daysBetween(st.lastDay, today)
    if (gap <= 0) return { streak: st, extended: false }
    const missed = gap - 1
    if (missed === 0) current += 1
    else if (missed <= freezes) {
      freezes -= missed
      frozenDays = [...frozenDays, ...Array.from({ length: missed }, (_, i) => addDays(st.lastDay as string, i + 1))].slice(-30)
      current += 1
    } else current = 1
  }
  if (current > 0 && current % 7 === 0) freezes = Math.min(2, freezes + 1)
  best = Math.max(best, current)
  return { streak: { current, best, lastDay: today, freezes, frozenDays }, extended: true }
}

/** streak as it should be displayed today (0 if it has lapsed) */
export function liveStreak(st: Streak, today: string): { count: number; doneToday: boolean; atRisk: boolean } {
  if (!st.lastDay) return { count: 0, doneToday: false, atRisk: false }
  const gap = daysBetween(st.lastDay, today)
  if (gap <= 0) return { count: st.current, doneToday: true, atRisk: false }
  if (gap - 1 <= st.freezes) return { count: st.current, doneToday: false, atRisk: true }
  return { count: 0, doneToday: false, atRisk: false }
}

/**
 * Where a lesson opens and what its run has earned so far. A finished lesson
 * replays from the top with a fresh run; an unfinished one resumes at its
 * checkpoint (clamped, in case the lesson got shorter) and keeps its tally,
 * so accuracy spans every sitting and no step pays XP twice.
 */
export function lessonStart(prog: LessonProgress | undefined, stepCount: number) {
  const fresh = !prog || prog.completedAt != null
  const last = Math.max(0, stepCount - 1)
  const index = fresh ? 0 : Math.min(last, Math.max(0, Math.floor(prog.resumeStep) || 0))
  const run = !fresh && prog.run ? prog.run : null
  return {
    index,
    graded: new Set(run?.graded ?? []),
    firstTry: run?.firstTry ?? 0,
    xp: run?.xp ?? 0,
    msBefore: run?.ms ?? 0,
  }
}

/** a day counts for the streak after a lesson, a lab level, or 3 reviews (Brilliant: 1 lesson or 3 problems) */
export function qualifies(d: DayLog | undefined): boolean {
  return !!d && (d.lessons > 0 || d.reviews >= 3)
}

/* ------------------------------------------------------- normalisation */

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const fin = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const num = (v: unknown, d: number, lo = -Infinity, hi = Infinity) => (fin(v) ? Math.min(hi, Math.max(lo, v)) : d)
const count = (v: unknown) => (fin(v) ? Math.max(0, Math.floor(v)) : 0)
const numOrNull = (v: unknown) => (fin(v) ? v : null)
const str = (v: unknown, d = '') => (typeof v === 'string' ? v : d)
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d)
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/
const PHASES: CardPhase[] = ['new', 'learning', 'review', 'relearning']

function record<T>(v: unknown, f: (x: unknown) => T | null): Record<string, T> {
  const out: Record<string, T> = {}
  if (!isObj(v)) return out
  for (const [k, x] of Object.entries(v)) {
    if (k === '__proto__') continue
    const y = f(x)
    if (y != null) out[k] = y
  }
  return out
}

function normCard(v: unknown): CardState | null {
  if (!isObj(v)) return null
  const last = numOrNull(v.last)
  return {
    phase: PHASES.includes(v.phase as CardPhase) ? (v.phase as CardPhase) : last == null ? 'new' : 'review',
    due: num(v.due, now()),
    stability: num(v.stability, 0, 0),
    difficulty: num(v.difficulty, 0, 0, 10),
    reps: count(v.reps),
    lapses: count(v.lapses),
    last,
    history: Array.isArray(v.history)
      ? v.history.filter((h): h is { t: number; g: Grade } => isObj(h) && fin(h.t) && [1, 2, 3, 4].includes(h.g as number))
      : [],
  }
}

function normLesson(v: unknown): LessonProgress | null {
  if (!isObj(v)) return null
  const run = isObj(v.run)
    ? {
        graded: Array.isArray(v.run.graded) ? [...new Set(v.run.graded.filter((x): x is string => typeof x === 'string'))] : [],
        firstTry: count(v.run.firstTry),
        xp: count(v.run.xp),
        ms: num(v.run.ms, 0, 0),
      }
    : null
  if (run) run.firstTry = Math.min(run.firstTry, run.graded.length)
  return {
    completedAt: numOrNull(v.completedAt),
    bestAccuracy: num(v.bestAccuracy, 0, 0, 1),
    completions: count(v.completions),
    resumeStep: count(v.resumeStep),
    run,
    ...(fin(v.updatedAt) ? { updatedAt: v.updatedAt } : {}),
  }
}

function normDay(v: unknown): DayLog | null {
  if (!isObj(v)) return null
  const d = emptyDay()
  for (const k of Object.keys(d) as (keyof DayLog)[]) d[k] = num(v[k], 0, 0)
  return d
}

function normStory(v: unknown): StoryEntry | null {
  if (!isObj(v)) return null
  return {
    layers: record(v.layers, (x) => (typeof x === 'string' ? x : null)),
    notes: str(v.notes),
    updatedAt: num(v.updatedAt, 0),
    rehearsal: normCard(v.rehearsal),
    rehearsals: count(v.rehearsals),
  }
}

function normLab(v: unknown): LabProgress | null {
  if (!isObj(v)) return null
  return {
    code: str(v.code),
    levelsPassed: count(v.levelsPassed),
    // before `activeMs` existed, bestMs held the time of the first level, not of the whole lab
    bestMs: 'activeMs' in v ? numOrNull(v.bestMs) : null,
    startedAt: numOrNull(v.startedAt),
    activeMs: num(v.activeMs, 0, 0),
  }
}

/**
 * Build a complete, well-typed state from untrusted input (persisted state
 * from an older build, or an imported export). Unknown keys are dropped,
 * missing fields get defaults, and malformed entries are repaired or skipped.
 */
export function normalizeState(raw: unknown): GauntletState {
  const base = initialState()
  if (!isObj(raw)) return base
  const p = isObj(raw.profile) ? raw.profile : {}
  const st = isObj(raw.settings) ? raw.settings : {}
  const sk = isObj(raw.streak) ? raw.streak : {}
  const roles: Profile['role'][] = ['swe', 'research-eng', 'infra', 'other']
  const themes: ThemePref[] = ['system', 'light', 'dark']
  const current = count(sk.current)
  const lastDay = typeof sk.lastDay === 'string' && DAY_KEY.test(sk.lastDay) ? sk.lastDay : null
  // fields added after this was written keep their persisted value when the type matches the default
  const known: Record<string, unknown> = {}
  for (const [k, d] of Object.entries(base)) if (k in raw && typeof raw[k] === typeof d && Array.isArray(raw[k]) === Array.isArray(d)) known[k] = raw[k]
  return {
    ...(known as Partial<GauntletState>),
    version: 1,
    profile: {
      ...p,
      onboarded: bool(p.onboarded, base.profile.onboarded),
      name: str(p.name),
      role: roles.includes(p.role as Profile['role']) ? (p.role as Profile['role']) : base.profile.role,
      interviewDate: typeof p.interviewDate === 'string' && DAY_KEY.test(p.interviewDate) ? p.interviewDate : '',
      confidence: record(p.confidence, (x) => (fin(x) ? Math.min(5, Math.max(1, x)) : null)),
      createdAt: num(p.createdAt, base.profile.createdAt),
    },
    settings: {
      ...st,
      sound: bool(st.sound, DEFAULT_SETTINGS.sound),
      haptics: bool(st.haptics, DEFAULT_SETTINGS.haptics),
      theme: themes.includes(st.theme as ThemePref) ? (st.theme as ThemePref) : DEFAULT_SETTINGS.theme,
      dailyXpGoal: fin(st.dailyXpGoal) && st.dailyXpGoal > 0 ? st.dailyXpGoal : DEFAULT_SETTINGS.dailyXpGoal,
      retention: num(st.retention, DEFAULT_SETTINGS.retention, 0.7, 0.97),
      reduceMotion: bool(st.reduceMotion, DEFAULT_SETTINGS.reduceMotion),
      sessionSize: fin(st.sessionSize) && st.sessionSize >= 1 ? Math.floor(st.sessionSize) : DEFAULT_SETTINGS.sessionSize,
    },
    lessons: record(raw.lessons, normLesson),
    cards: record(raw.cards, normCard),
    stories: record(raw.stories, normStory) as GauntletState['stories'],
    reflections: record(raw.reflections, (x) => (typeof x === 'string' ? x : null)),
    days: record(raw.days, normDay),
    streak: {
      current: lastDay ? current : 0,
      best: Math.max(count(sk.best), lastDay ? current : 0),
      lastDay,
      freezes: Math.min(2, count(sk.freezes)),
      frozenDays: Array.isArray(sk.frozenDays) ? sk.frozenDays.filter((d): d is string => typeof d === 'string' && DAY_KEY.test(d)) : [],
    },
    xp: num(raw.xp, 0, 0),
    achievements: record(raw.achievements, (x) => (fin(x) ? x : null)),
    unseenAchievements: Array.isArray(raw.unseenAchievements)
      ? [...new Set(raw.unseenAchievements.filter((x): x is string => typeof x === 'string'))]
      : [],
    labs: record(raw.labs, normLab),
    combo: count(raw.combo),
    bestCombo: Math.max(count(raw.bestCombo), count(raw.combo)),
  }
}

/* --------------------------------------------------------------- storage */

const memory = new Map<string, string>()
const safeStorage: StateStorage = {
  getItem: (k) => {
    try {
      return localStorage.getItem(k)
    } catch {
      return memory.get(k) ?? null
    }
  },
  setItem: (k, v) => {
    try {
      localStorage.setItem(k, v)
    } catch {
      memory.set(k, v)
    }
  },
  removeItem: (k) => {
    try {
      localStorage.removeItem(k)
    } catch {
      memory.delete(k)
    }
  },
}

/* ----------------------------------------------------------------- store */

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...initialState(),

      completeOnboarding: (p) =>
        set((s) => ({ profile: { ...s.profile, ...p, onboarded: true, createdAt: s.profile.createdAt || now() } })),

      setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),

      setSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),

      checkpointLesson: (lessonId, step, run) =>
        set((s) => {
          const prev = s.lessons[lessonId] ?? emptyLesson()
          const resumeStep = Number.isFinite(step) ? Math.max(0, Math.floor(step)) : 0
          return { lessons: { ...s.lessons, [lessonId]: { ...prev, resumeStep, run: run ?? prev.run ?? null, updatedAt: now() } } }
        }),

      answerStep: (correctFirstTry, solved = true) => {
        const s = get()
        const today = dayKey(now())
        const combo = correctFirstTry ? s.combo + 1 : 0
        // revealing the answer earns nothing; a later correct try earns the retry XP
        let xp = correctFirstTry ? XP.firstTry : solved ? XP.retry : 0
        if (correctFirstTry && combo > 0 && combo % XP.comboEvery === 0) xp += XP.comboBonus
        set({
          combo,
          bestCombo: Math.max(s.bestCombo, combo),
          xp: s.xp + xp,
          days: bumpDay(s.days, today, { xp, answered: 1, correct: correctFirstTry ? 1 : 0 }),
        })
        return xp
      },

      finishLesson: (lessonId, r) => {
        const s = get()
        const t = now()
        const today = dayKey(t)
        const prev = s.lessons[lessonId] ?? emptyLesson()
        const first = prev.completedAt == null
        const accuracy = Number.isFinite(r.accuracy) ? Math.min(1, Math.max(0, r.accuracy)) : 0
        let xp = XP.lessonComplete
        if (accuracy >= 0.999) xp += XP.perfectBonus
        if (!first) xp = Math.round(xp / 2)
        const cards = { ...s.cards }
        for (const id of r.cardIds) if (!cards[id]) cards[id] = newCard(t)
        const days = bumpDay(s.days, today, { xp, lessons: 1, activeMs: Math.max(0, r.activeMs || 0) })
        const { streak, extended } = maybeExtend(s.streak, days, today)
        set({
          lessons: {
            ...s.lessons,
            [lessonId]: {
              completedAt: prev.completedAt ?? t,
              bestAccuracy: Math.max(prev.bestAccuracy, accuracy),
              completions: prev.completions + 1,
              resumeStep: 0,
              run: null,
              updatedAt: t,
            },
          },
          cards,
          xp: s.xp + xp,
          days,
          streak,
        })
        return { xp, streakExtended: extended }
      },

      reviewCard: (cardId, grade, activeMs, repeat = false) => {
        const s = get()
        const t = now()
        const today = dayKey(t)
        const card = s.cards[cardId] ?? newCard(t, 0)
        const next = review(card, grade, t, scheduleOptions(s))
        const xp = repeat ? 0 : XP.review[grade]
        const ms = Math.max(0, activeMs || 0)
        const days = repeat
          ? bumpDay(s.days, today, { activeMs: ms })
          : bumpDay(s.days, today, { xp, reviews: 1, answered: 1, correct: grade >= 3 ? 1 : 0, activeMs: ms })
        const { streak } = maybeExtend(s.streak, days, today)
        set({ cards: { ...s.cards, [cardId]: next }, xp: s.xp + xp, days, streak })
        return xp
      },

      saveReflection: (key, text) => set((s) => ({ reflections: { ...s.reflections, [key]: text } })),

      saveStory: (slot, patch) =>
        set((s) => {
          const prev: StoryEntry = s.stories[slot] ?? { layers: {}, notes: '', updatedAt: 0, rehearsal: null, rehearsals: 0 }
          const next: StoryEntry = {
            ...prev,
            layers: { ...prev.layers, ...(patch.layers ?? {}) },
            notes: patch.notes ?? prev.notes,
            updatedAt: now(),
          }
          const hasContent = Object.values(next.layers).some((v) => v.trim().length > 20)
          if (hasContent && !next.rehearsal) next.rehearsal = newCard(now(), 12 * 3_600_000)
          return { stories: { ...s.stories, [slot]: next } }
        }),

      rehearseStory: (slot, grade) => {
        const s = get()
        const prev = s.stories[slot]
        if (!prev) return
        const t = now()
        const rehearsal = review(prev.rehearsal ?? newCard(t, 0), grade, t, scheduleOptions(s))
        const today = dayKey(t)
        // a rehearsal counts as a review, so it can complete the day's 3 reviews
        const days = bumpDay(s.days, today, { xp: XP.story, reviews: 1 })
        const { streak } = maybeExtend(s.streak, days, today)
        set({
          stories: { ...s.stories, [slot]: { ...prev, rehearsal, rehearsals: prev.rehearsals + 1 } },
          xp: s.xp + XP.story,
          days,
          streak,
        })
      },

      saveLab: (labId, patch) =>
        set((s) => {
          const prev = { ...emptyLab(), ...s.labs[labId] }
          return { labs: { ...s.labs, [labId]: { ...prev, ...patch } } }
        }),

      passLabLevel: (labId, level, elapsedMs, totalLevels) => {
        const s = get()
        const prev = { ...emptyLab(), ...s.labs[labId] }
        // levels pass strictly in order, each exactly once
        if (level !== prev.levelsPassed || level >= totalLevels) return
        const today = dayKey(now())
        const days = bumpDay(s.days, today, { xp: XP.labLevel, lessons: 1 })
        const { streak } = extendStreak(s.streak, today)
        const ms = Math.max(0, elapsedMs || 0)
        const finished = level + 1 >= totalLevels
        set({
          labs: {
            ...s.labs,
            [labId]: {
              ...prev,
              levelsPassed: level + 1,
              activeMs: Math.max(prev.activeMs, ms),
              // the time to clear the whole lab, recorded when the last level passes
              bestMs: finished ? (prev.bestMs == null ? ms : Math.min(prev.bestMs, ms)) : prev.bestMs,
            },
          },
          xp: s.xp + XP.labLevel,
          days,
          streak,
        })
      },

      syncCards: (cardsByLesson) =>
        set((s) => {
          const t = now()
          let added = 0
          const cards = { ...s.cards }
          for (const [lessonId, ids] of Object.entries(cardsByLesson)) {
            if (!s.lessons[lessonId]?.completedAt) continue
            for (const id of ids)
              if (!cards[id]) {
                cards[id] = newCard(t)
                added++
              }
          }
          return added ? { cards } : {}
        }),

      unlockAchievements: (ids) =>
        set((s) => {
          const fresh = [...new Set(ids)].filter((id) => !s.achievements[id])
          if (!fresh.length) return {}
          const t = now()
          return {
            achievements: { ...s.achievements, ...Object.fromEntries(fresh.map((id) => [id, t])) },
            unseenAchievements: [...s.unseenAchievements, ...fresh],
          }
        }),

      markAchievementsSeen: () => set({ unseenAchievements: [] }),

      resetAll: () => set({ ...initialState() }),

      importState: (incoming) => {
        const raw = incoming as unknown
        if (!isObj(raw) || ('version' in raw && raw.version !== 1)) throw new Error('This file is not a Gauntlet progress export.')
        set({ ...normalizeState(raw), unseenAchievements: [] })
      },
    }),
    {
      name: 'gauntlet:v1',
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => {
        const out: Partial<Store> = { ...s }
        for (const k of Object.keys(out) as (keyof Store)[]) if (typeof out[k] === 'function') delete out[k]
        return out as GauntletState
      },
      // persisted state may predate newer fields (or be hand-edited): repair it field by field
      merge: (persisted, current) => (isObj(persisted) ? { ...current, ...normalizeState(persisted) } : current),
    },
  ),
)

/** a snapshot suitable for export / import */
export function exportState(): GauntletState {
  const s = useStore.getState()
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(s)) if (typeof v !== 'function') out[k] = v
  return out as unknown as GauntletState
}

export const today = () => dayKey(now())
