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

export const useNav = create<Nav>((set) => ({
  tab: 'learn',
  stack: [],
  setTab: (tab) => set({ tab, stack: [] }),
  push: (o) => set((s) => ({ stack: [...s.stack, o] })),
  pop: () => set((s) => ({ stack: s.stack.slice(0, -1) })),
  replace: (o) => set((s) => ({ stack: [...s.stack.slice(0, -1), o] })),
  reset: () => set({ stack: [] }),
}))

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
