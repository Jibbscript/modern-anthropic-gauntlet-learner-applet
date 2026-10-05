import { useEffect } from 'react'
import { create } from 'zustand'
import type { AreaId, StorySlotId } from '../core/types'

export type Tab = 'learn' | 'practice' | 'stories' | 'me'

/**
 * Screens stacked over the tab screens. Full-screen "covers" (lesson,
 * review, drill, lab) slide up; "pages" (course, story, settings,
 * achievements) push in from the right.
 */
export type Overlay =
  | { kind: 'course'; courseId: AreaId }
  | { kind: 'lesson'; lessonId: string }
  | { kind: 'review'; cardIds: string[]; title?: string }
  | { kind: 'story'; slot: StorySlotId }
  | { kind: 'drill'; slots?: StorySlotId[] }
  | { kind: 'lab'; labId: string }
  | { kind: 'settings' }
  | { kind: 'achievements' }

export const COVERS = new Set<Overlay['kind']>(['lesson', 'review', 'drill', 'lab'])

interface Nav {
  tab: Tab
  stack: Overlay[]
  setTab: (t: Tab) => void
  push: (o: Overlay) => void
  pop: () => void
  /** replace the top overlay */
  replace: (o: Overlay) => void
  reset: () => void
}

declare const __ARTIFACT__: boolean

/**
 * Browser history mirrors the overlay stack so the Android / browser Back
 * button closes the top page instead of leaving the app. Each pushed overlay
 * adds a history entry tagged with its depth; popstate trims the stack to the
 * depth of the entry we land on. Disabled inside sandboxed artifact frames.
 */
const historyOn = () => typeof window !== 'undefined' && typeof history !== 'undefined' && !__ARTIFACT__
const depthOf = (st: unknown) => (st && typeof st === 'object' && typeof (st as { g?: unknown }).g === 'number' ? (st as { g: number }).g : 0)

export const useNav = create<Nav>((set, get) => ({
  tab: 'learn',
  stack: [],
  setTab: (tab) => {
    const depth = historyOn() ? depthOf(history.state) : 0
    set({ tab, stack: [] })
    if (depth > 0) history.go(-depth)
  },
  push: (o) => {
    const stack = [...get().stack, o]
    set({ stack })
    if (historyOn()) {
      try {
        history.pushState({ g: stack.length }, '')
      } catch {
        /* history unavailable */
      }
    }
  },
  pop: () => {
    const { stack } = get()
    if (!stack.length) return
    if (historyOn() && depthOf(history.state) === stack.length) {
      // let popstate do the trim so history and stack stay in step
      history.back()
      return
    }
    set({ stack: stack.slice(0, -1) })
  },
  replace: (o) => set((s) => ({ stack: [...s.stack.slice(0, -1), o] })),
  reset: () => {
    const depth = historyOn() ? depthOf(history.state) : 0
    set({ stack: [] })
    if (depth > 0) history.go(-depth)
  },
}))

/** install the popstate listener once (App) */
export function useHistorySync() {
  useEffect(() => {
    if (!historyOn()) return
    const onPop = (e: PopStateEvent) => {
      const depth = depthOf(e.state)
      const { stack } = useNav.getState()
      if (stack.length > depth) useNav.setState({ stack: stack.slice(0, depth) })
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
}

/** shorthand helpers for screens */
export const nav = {
  openCourse: (courseId: AreaId) => useNav.getState().push({ kind: 'course', courseId }),
  openLesson: (lessonId: string) => useNav.getState().push({ kind: 'lesson', lessonId }),
  openReview: (cardIds: string[], title?: string) => useNav.getState().push({ kind: 'review', cardIds, title }),
  openStory: (slot: StorySlotId) => useNav.getState().push({ kind: 'story', slot }),
  openDrill: (slots?: StorySlotId[]) => useNav.getState().push({ kind: 'drill', slots }),
  openLab: (labId: string) => useNav.getState().push({ kind: 'lab', labId }),
  openSettings: () => useNav.getState().push({ kind: 'settings' }),
  openAchievements: () => useNav.getState().push({ kind: 'achievements' }),
  back: () => useNav.getState().pop(),
}
