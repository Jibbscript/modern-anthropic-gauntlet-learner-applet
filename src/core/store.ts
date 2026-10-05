import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import type { AreaId, StorySlotId } from './types'
import { newCard, review, type CardState, type Grade, type ScheduleOptions } from './fsrs'
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
  bestMs: number | null
  startedAt: number | null
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
  checkpointLesson(lessonId: string, step: number): void
  /** registers an answered graded step; returns XP awarded */
  answerStep(correctFirstTry: boolean): number
  finishLesson(lessonId: string, r: { accuracy: number; cardIds: string[]; activeMs: number }): { xp: number; streakExtended: boolean }
  reviewCard(cardId: string, grade: Grade, activeMs: number): number
  saveReflection(key: string, text: string): void
  saveStory(slot: StorySlotId, patch: { layers?: Record<number, string>; notes?: string }): void
  rehearseStory(slot: StorySlotId, grade: Grade): void
  saveLab(labId: string, patch: Partial<LabProgress>): void
  passLabLevel(labId: string, level: number, elapsedMs: number): void
  unlockAchievements(ids: string[]): void
  markAchievementsSeen(): void
  resetAll(): void
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
  firstTry: 10,
  retry: 4,
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

function bumpDay(days: Record<string, DayLog>, key: string, patch: Partial<DayLog>): Record<string, DayLog> {
  const d = { ...(days[key] ?? emptyDay()) }
  for (const k of Object.keys(patch) as (keyof DayLog)[]) d[k] += patch[k] ?? 0
  return { ...days, [key]: d }
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

/** a day counts for the streak after a lesson, a lab level, or 5 reviews */
function qualifies(d: DayLog | undefined): boolean {
  return !!d && (d.lessons > 0 || d.reviews >= 5)
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

      checkpointLesson: (lessonId, step) =>
        set((s) => {
          const prev = s.lessons[lessonId] ?? { completedAt: null, bestAccuracy: 0, completions: 0, resumeStep: 0 }
          return { lessons: { ...s.lessons, [lessonId]: { ...prev, resumeStep: step } } }
        }),

      answerStep: (correctFirstTry) => {
        const s = get()
        const today = dayKey(now())
        const combo = correctFirstTry ? s.combo + 1 : 0
        let xp = correctFirstTry ? XP.firstTry : XP.retry
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
        const prev = s.lessons[lessonId] ?? { completedAt: null, bestAccuracy: 0, completions: 0, resumeStep: 0 }
        const first = prev.completedAt == null
        let xp = XP.lessonComplete
        if (r.accuracy >= 0.999) xp += XP.perfectBonus
        if (!first) xp = Math.round(xp / 2)
        const cards = { ...s.cards }
        for (const id of r.cardIds) if (!cards[id]) cards[id] = newCard(t)
        const days = bumpDay(s.days, today, { xp, lessons: 1, activeMs: r.activeMs })
        const { streak, extended } = qualifies(days[today]) ? extendStreak(s.streak, today) : { streak: s.streak, extended: false }
        set({
          lessons: {
            ...s.lessons,
            [lessonId]: {
              completedAt: prev.completedAt ?? t,
              bestAccuracy: Math.max(prev.bestAccuracy, r.accuracy),
              completions: prev.completions + 1,
              resumeStep: 0,
            },
          },
          cards,
          xp: s.xp + xp,
          days,
          streak,
        })
        return { xp, streakExtended: extended }
      },

      reviewCard: (cardId, grade, activeMs) => {
        const s = get()
        const t = now()
        const today = dayKey(t)
        const card = s.cards[cardId] ?? newCard(t, 0)
        const next = review(card, grade, t, scheduleOptions(s))
        const xp = XP.review[grade]
        const days = bumpDay(s.days, today, { xp, reviews: 1, answered: 1, correct: grade >= 3 ? 1 : 0, activeMs })
        const { streak } = qualifies(days[today]) ? extendStreak(s.streak, today) : { streak: s.streak }
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
        set({
          stories: { ...s.stories, [slot]: { ...prev, rehearsal, rehearsals: prev.rehearsals + 1 } },
          xp: s.xp + XP.story,
          days: bumpDay(s.days, today, { xp: XP.story, reviews: 1 }),
        })
      },

      saveLab: (labId, patch) =>
        set((s) => {
          const prev = s.labs[labId] ?? { code: '', levelsPassed: 0, bestMs: null, startedAt: null }
          return { labs: { ...s.labs, [labId]: { ...prev, ...patch } } }
        }),

      passLabLevel: (labId, level, elapsedMs) => {
        const s = get()
        const prev = s.labs[labId] ?? { code: '', levelsPassed: 0, bestMs: null, startedAt: null }
        if (level < prev.levelsPassed) return
        const today = dayKey(now())
        const days = bumpDay(s.days, today, { xp: XP.labLevel, lessons: 1 })
        const { streak } = extendStreak(s.streak, today)
        set({
          labs: { ...s.labs, [labId]: { ...prev, levelsPassed: level + 1, bestMs: prev.bestMs == null ? elapsedMs : Math.min(prev.bestMs, elapsedMs) } },
          xp: s.xp + XP.labLevel,
          days,
          streak,
        })
      },

      unlockAchievements: (ids) =>
        set((s) => {
          const fresh = ids.filter((id) => !s.achievements[id])
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
        if (!incoming || incoming.version !== 1) throw new Error('This file is not a Gauntlet progress export.')
        set({ ...initialState(), ...incoming })
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
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<GauntletState>
        return {
          ...current,
          ...p,
          settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) },
          profile: { ...current.profile, ...(p.profile ?? {}) },
        }
      },
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
