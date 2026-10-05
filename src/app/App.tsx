import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { Suspense, lazy, useEffect, useMemo } from 'react'
import { useClock } from './clock'
import { useHistorySync } from './nav'
import { Trophy } from 'lucide-react'
import { useStore } from '../core/store'
import { CATALOG } from '../content'
import { dueCardIds } from '../core/adaptive'
import { rehearsalsDue } from '../screens/StoriesScreen'
import { ACHIEVEMENTS, newlyEarned } from '../core/achievements'
import { COVERS, useNav, type Overlay } from './nav'
import { TabBar } from '../ui/TabBar'
import { sfx } from '../ui/fx'
import { LessonPlayer } from '../lesson/LessonPlayer'
import { ReviewSession } from '../lesson/ReviewSession'
import LearnScreen from '../screens/LearnScreen'
import PracticeScreen from '../screens/PracticeScreen'
import StoriesScreen from '../screens/StoriesScreen'
import MeScreen from '../screens/MeScreen'
import CourseScreen from '../screens/CourseScreen'
import StoryEditor from '../screens/StoryEditor'
import StoryDrill from '../screens/StoryDrill'
import SettingsScreen from '../screens/SettingsScreen'
import AchievementsScreen from '../screens/AchievementsScreen'
import Onboarding from '../screens/Onboarding'
import './app.css'

const LabScreen = lazy(() => import('../labs/LabScreen'))

function useTheme() {
  const theme = useStore((s) => s.settings.theme)
  const reduce = useStore((s) => s.settings.reduceMotion)
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') delete root.dataset.theme
    else root.dataset.theme = theme
    root.dataset.reduceMotion = String(reduce)
  }, [theme, reduce])
  return reduce
}

function OverlayView({ o }: { o: Overlay }) {
  const pop = useNav((s) => s.pop)
  switch (o.kind) {
    case 'lesson':
      return <LessonPlayer lessonId={o.lessonId} onExit={pop} />
    case 'review':
      return <ReviewSession cardIds={o.cardIds} title={o.title} onExit={pop} />
    case 'course':
      return <CourseScreen courseId={o.courseId} />
    case 'story':
      return <StoryEditor slot={o.slot} />
    case 'drill':
      return <StoryDrill slots={o.slots} onExit={pop} />
    case 'lab':
      return (
        <Suspense fallback={<div className="screen" />}>
          <LabScreen labId={o.labId} onExit={pop} />
        </Suspense>
      )
    case 'settings':
      return <SettingsScreen />
    case 'achievements':
      return <AchievementsScreen />
  }
}

function AchievementToast() {
  const unseen = useStore((s) => s.unseenAchievements)
  const markSeen = useStore((s) => s.markAchievementsSeen)
  // hold the toast while a lesson/review/lab cover is open; it shows once the learner is back
  const covered = useNav((n) => n.stack.some((o) => COVERS.has(o.kind)))
  const first = !covered && unseen[0] ? ACHIEVEMENTS.find((a) => a.id === unseen[0]) : undefined
  useEffect(() => {
    if (!first) return
    sfx('unlock')
    const t = setTimeout(markSeen, 3200)
    return () => clearTimeout(t)
  }, [first, markSeen])
  return (
    <AnimatePresence>
      {first && (
        <motion.button
          type="button"
          key={first.id}
          className="toast"
          onClick={markSeen}
          initial={{ y: -16, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -16, opacity: 0, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 460, damping: 28 }}
        >
          <span className="toast__icon">
            <Trophy size={20} strokeWidth={2.6} />
          </span>
          <span className="toast__text">
            <b>Achievement unlocked</b>
            <span>
              {first.title}
              {unseen.length > 1 ? ` +${unseen.length - 1} more` : ''}
            </span>
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  )
}

export function App() {
  const reduce = useTheme()
  const now = useClock()
  useHistorySync()
  const onboarded = useStore((s) => s.profile.onboarded)
  const tab = useNav((s) => s.tab)
  const stack = useNav((s) => s.stack)
  const state = useStore()

  // lessons can gain cards in content updates; give finished lessons their new cards
  useEffect(() => {
    useStore.getState().syncCards(Object.fromEntries(CATALOG.courses.flatMap((c) => c.lessons.map((l) => [l.id, l.cards.map((k) => k.id)]))))
  }, [])

  // award achievements whenever progress changes
  useEffect(() => {
    const fresh = newlyEarned(useStore.getState(), CATALOG)
    if (fresh.length) useStore.getState().unlockAchievements(fresh)
  }, [state.lessons, state.days, state.streak, state.stories, state.labs, state.xp])

  const badges = useMemo(
    () => ({ practice: dueCardIds(state, now, CATALOG).length, stories: rehearsalsDue(state, now).length }),
    [state, now],
  )

  if (!onboarded) {
    return (
      <MotionConfig reducedMotion={reduce ? 'always' : 'user'}>
        <div className="app-frame">
          <Onboarding />
        </div>
      </MotionConfig>
    )
  }

  const Tab = { learn: LearnScreen, practice: PracticeScreen, stories: StoriesScreen, me: MeScreen }[tab]

  return (
    <MotionConfig reducedMotion={reduce ? 'always' : 'user'}>
      <div className="app-frame">
        <div className="app-main">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              className="tab-screen"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
            >
              <Tab />
            </motion.div>
          </AnimatePresence>
        </div>
        <TabBar badges={badges} />
        <AnimatePresence>
          {stack.map((o, i) => {
            const cover = COVERS.has(o.kind)
            return (
              <motion.div
                key={`${i}:${o.kind}`}
                className={`overlay ${cover ? 'overlay--cover' : 'overlay--page'}`}
                style={{ zIndex: 30 + i }}
                initial={cover ? { y: '100%' } : { x: '100%' }}
                animate={cover ? { y: 0 } : { x: 0 }}
                exit={cover ? { y: '100%' } : { x: '100%' }}
                transition={{ type: 'spring', stiffness: 380, damping: 40 }}
              >
                <OverlayView o={o} />
              </motion.div>
            )
          })}
        </AnimatePresence>
        <AchievementToast />
      </div>
    </MotionConfig>
  )
}
