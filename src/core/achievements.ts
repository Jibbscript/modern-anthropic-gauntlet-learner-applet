import type { GauntletState } from './store'
import type { Catalog } from './adaptive'

export interface Achievement {
  id: string
  title: string
  desc: string
  /** lucide icon name used by the achievements screen */
  icon: 'flame' | 'zap' | 'target' | 'brain' | 'book' | 'trophy' | 'star' | 'pen' | 'code' | 'shield' | 'clock' | 'layers'
  test: (s: GauntletState, cat: Catalog) => boolean
}

const completed = (s: GauntletState) => Object.values(s.lessons).filter((l) => l.completedAt).length
const reviews = (s: GauntletState) => Object.values(s.days).reduce((a, d) => a + d.reviews, 0)
const courseDone = (s: GauntletState, cat: Catalog, id: string) => {
  const c = cat.courses.find((x) => x.id === id)
  return !!c && c.lessons.length > 0 && c.lessons.every((l) => s.lessons[l.id]?.completedAt)
}
const storiesWritten = (s: GauntletState) =>
  Object.values(s.stories).filter((e) => e && Object.values(e.layers).filter((v) => v.trim().length > 20).length >= 2).length

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-step', title: 'First step', desc: 'Finish your first lesson', icon: 'star', test: (s) => completed(s) >= 1 },
  { id: 'five-lessons', title: 'Warmed up', desc: 'Finish 5 lessons', icon: 'book', test: (s) => completed(s) >= 5 },
  { id: 'twenty-lessons', title: 'Deep in it', desc: 'Finish 20 lessons', icon: 'layers', test: (s) => completed(s) >= 20 },
  { id: 'streak-3', title: 'Habit forming', desc: 'Reach a 3-day streak', icon: 'flame', test: (s) => s.streak.best >= 3 },
  { id: 'streak-7', title: 'One full week', desc: 'Reach a 7-day streak', icon: 'flame', test: (s) => s.streak.best >= 7 },
  { id: 'streak-30', title: 'Unshakeable', desc: 'Reach a 30-day streak', icon: 'flame', test: (s) => s.streak.best >= 30 },
  { id: 'combo-10', title: 'On a roll', desc: '10 first-try answers in a row', icon: 'zap', test: (s) => s.bestCombo >= 10 },
  { id: 'perfect', title: 'Flawless', desc: 'Finish a lesson with 100% first-try accuracy', icon: 'target', test: (s) => Object.values(s.lessons).some((l) => l.completedAt && l.bestAccuracy >= 0.999) },
  { id: 'reviews-50', title: 'Memory keeper', desc: 'Complete 50 reviews', icon: 'brain', test: (s) => reviews(s) >= 50 },
  { id: 'reviews-250', title: 'Long-term', desc: 'Complete 250 reviews', icon: 'brain', test: (s) => reviews(s) >= 250 },
  { id: 'story-1', title: 'On the record', desc: 'Write your first Story Bank story', icon: 'pen', test: (s) => storiesWritten(s) >= 1 },
  { id: 'story-6', title: 'Ready for anything', desc: 'Write 6 Story Bank stories', icon: 'pen', test: (s) => storiesWritten(s) >= 6 },
  { id: 'why-done', title: 'Know the mission', desc: 'Finish the Why Anthropic course', icon: 'shield', test: (s, c) => courseDone(s, c, 'why') },
  { id: 'values-done', title: 'Judgment call', desc: 'Finish the Values & Judgment course', icon: 'target', test: (s, c) => courseDone(s, c, 'values') },
  { id: 'concurrency-done', title: 'Thread safe', desc: 'Finish the Concurrency course', icon: 'code', test: (s, c) => courseDone(s, c, 'concurrency') },
  { id: 'builds-done', title: 'Builder', desc: 'Finish the Build Rounds course', icon: 'code', test: (s, c) => courseDone(s, c, 'builds') },
  { id: 'lab-1', title: 'Shipped it', desc: 'Pass every level of a code lab', icon: 'trophy', test: (s) => Object.values(s.labs).some((l) => l.levelsPassed >= 3) },
  { id: 'xp-1000', title: 'Four digits', desc: 'Earn 1,000 XP', icon: 'zap', test: (s) => s.xp >= 1000 },
  { id: 'night-owl', title: 'Every day counts', desc: 'Hit your daily goal 5 times', icon: 'clock', test: (s) => Object.values(s.days).filter((d) => d.xp >= s.settings.dailyXpGoal).length >= 5 },
]

export function newlyEarned(s: GauntletState, cat: Catalog): string[] {
  return ACHIEVEMENTS.filter((a) => !s.achievements[a.id] && a.test(s, cat)).map((a) => a.id)
}
