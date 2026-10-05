import { motion } from 'motion/react'
import { useEffect } from 'react'
import { Sparkles, Target, Timer, Zap, Layers } from 'lucide-react'
import type { Course, Lesson } from '../core/types'
import { courseStyle } from '../ui/course'
import { CourseIcon } from '../ui/Icon'
import { Button } from '../ui/Button'
import { Ticker } from '../ui/Ticker'
import { celebrate, haptic, sfx } from '../ui/fx'
import './lesson.css'

export interface LessonSummary {
  xp: number
  accuracy: number
  ms: number
  cards: number
  streakExtended: boolean
  streakBefore: number
  streakAfter: number
}

export function LessonComplete({ lesson, course, summary, onDone }: { lesson: Lesson; course: Course; summary: LessonSummary; onDone: () => void }) {
  useEffect(() => {
    sfx('complete')
    haptic('success')
    const t = setTimeout(() => celebrate('big'), 250)
    const t2 = summary.streakExtended ? setTimeout(() => sfx('streak'), 1300) : undefined
    return () => {
      clearTimeout(t)
      if (t2) clearTimeout(t2)
    }
  }, [summary.streakExtended])

  const mins = Math.max(1, Math.round(summary.ms / 60000))
  const perfect = summary.accuracy >= 0.999

  const tiles = [
    { icon: <Sparkles size={18} strokeWidth={2.6} />, label: 'XP earned', value: <Ticker from={0} value={summary.xp} duration={1.1} />, tone: 'xp' },
    {
      icon: <Target size={18} strokeWidth={2.8} />,
      label: 'First-try accuracy',
      value: <Ticker from={0} value={Math.round(summary.accuracy * 100)} duration={1.1} format={(n) => `${Math.round(n)}%`} />,
      tone: 'good',
    },
    { icon: <Timer size={18} strokeWidth={2.8} />, label: 'Time', value: `${mins} min`, tone: 'select' },
  ]

  return (
    <div className="screen complete safe-top" style={courseStyle(course.color)}>
      <div className="complete__body scroll">
        <motion.div
          className="complete__badge"
          initial={{ scale: 0.2, rotate: -30, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.05 }}
        >
          <div className="complete__badge-face">
            <CourseIcon name={course.icon} size={56} />
          </div>
          <motion.div
            className="complete__rays"
            initial={{ rotate: 0, opacity: 0 }}
            animate={{ rotate: 90, opacity: 1 }}
            transition={{ duration: 6, ease: 'linear', opacity: { duration: 0.6 } }}
          />
        </motion.div>
        <motion.div className="complete__titles" initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}>
          <div className="eyebrow">{perfect ? 'Perfect lesson' : 'Lesson complete'}</div>
          <h1>{lesson.title}</h1>
        </motion.div>
        <div className="complete__tiles">
          {tiles.map((t, i) => (
            <motion.div
              key={t.label}
              className={`stat-tile stat-tile--${t.tone}`}
              initial={{ y: 24, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 380, damping: 22, delay: 0.4 + i * 0.12 }}
            >
              <div className="stat-tile__label">
                {t.icon}
                {t.label}
              </div>
              <div className="stat-tile__value">{t.value}</div>
            </motion.div>
          ))}
        </div>
        {summary.streakExtended && (
          <motion.div
            className="complete__streak"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 420, damping: 16, delay: 1.1 }}
          >
            <motion.span
              className="complete__flame"
              animate={{ scale: [1, 1.2, 0.9, 1.05, 1] }}
              transition={{ delay: 1.3, duration: 0.7 }}
            >
              <Zap size={30} strokeWidth={2.2} fill="currentColor" />
            </motion.span>
            <div>
              <div className="complete__streak-n tabular">
                <Ticker from={summary.streakBefore} value={summary.streakAfter} duration={0.6} /> day streak
              </div>
              <div className="complete__streak-sub">Come back tomorrow to keep it going.</div>
            </div>
          </motion.div>
        )}
        {summary.cards > 0 && (
          <motion.div className="complete__cards" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}>
            <Layers size={18} strokeWidth={2.6} />
            <span>
              <b>{summary.cards} review cards</b> added. They’ll come back right before you’d forget them.
            </span>
          </motion.div>
        )}
      </div>
      <div className="complete__footer safe-bottom">
        <Button block variant="course" onClick={onDone}>
          Continue
        </Button>
      </div>
    </div>
  )
}
