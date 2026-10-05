import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { X, Flame } from 'lucide-react'
import { CATALOG } from '../content'
import { useStore } from '../core/store'
import { courseStyle } from '../ui/course'
import { ProgressBar } from '../ui/ProgressBar'
import { IconButton, Button } from '../ui/Button'
import { Sheet } from '../ui/Sheet'
import { sfx } from '../ui/fx'
import { StepRunner, type StepOutcome } from './StepRunner'
import { LessonComplete, type LessonSummary } from './LessonComplete'
import './lesson.css'

/** Full-screen lesson: header with progress, one step at a time, completion screen. */
export function LessonPlayer({ lessonId, onExit }: { lessonId: string; onExit: () => void }) {
  const lesson = CATALOG.lessons[lessonId]
  const course = CATALOG.courses.find((c) => c.id === lesson?.courseId)
  const store = useStore()
  const resume = store.lessons[lessonId]?.completedAt ? 0 : (store.lessons[lessonId]?.resumeStep ?? 0)
  const [index, setIndex] = useState(Math.min(resume, Math.max(0, (lesson?.steps.length ?? 1) - 1)))
  const [summary, setSummary] = useState<LessonSummary | null>(null)
  const [confirmExit, setConfirmExit] = useState(false)
  const [xpPops, setXpPops] = useState<{ id: number; xp: number }[]>([])
  const [comboFlash, setComboFlash] = useState<number | null>(null)
  const stats = useRef({ graded: 0, firstTry: 0, xp: 0, started: performance.now() })
  const popId = useRef(0)

  const steps = lesson?.steps ?? []
  const step = steps[index]

  const onResolved = useCallback(
    (o: StepOutcome) => {
      if (!o.graded) return
      stats.current.graded++
      if (o.firstTry) stats.current.firstTry++
      const xp = useStore.getState().answerStep(o.firstTry)
      stats.current.xp += xp
      const id = ++popId.current
      setXpPops((p) => [...p, { id, xp }])
      setTimeout(() => setXpPops((p) => p.filter((x) => x.id !== id)), 1100)
      const combo = useStore.getState().combo
      if (o.firstTry && combo >= 3) {
        setComboFlash(combo)
        if (combo % 5 === 0) sfx('combo')
      } else setComboFlash(null)
    },
    [],
  )

  const finish = useCallback(() => {
    const accuracy = stats.current.graded ? stats.current.firstTry / stats.current.graded : 1
    const activeMs = performance.now() - stats.current.started
    const before = useStore.getState().streak.current
    const r = useStore.getState().finishLesson(lessonId, { accuracy, cardIds: lesson.cards.map((c) => c.id), activeMs })
    setSummary({
      xp: stats.current.xp + r.xp,
      accuracy,
      ms: activeMs,
      cards: lesson.cards.length,
      streakExtended: r.streakExtended,
      streakBefore: before,
      streakAfter: useStore.getState().streak.current,
    })
  }, [lessonId, lesson])

  const onNext = useCallback(() => {
    if (index + 1 >= steps.length) finish()
    else {
      setIndex(index + 1)
      useStore.getState().checkpointLesson(lessonId, index + 1)
    }
  }, [index, steps.length, finish, lessonId])

  const style = useMemo(() => (course ? courseStyle(course.color) : {}), [course])

  if (!lesson || !course) {
    return (
      <div className="screen lesson">
        <div className="step">That lesson could not be found.</div>
        <Button onClick={onExit}>Back</Button>
      </div>
    )
  }

  if (summary) return <LessonComplete lesson={lesson} course={course} summary={summary} onDone={onExit} />

  return (
    <div className="screen lesson safe-top" style={style}>
      <header className="lesson__head">
        <IconButton label="Close lesson" onClick={() => (index > 0 ? setConfirmExit(true) : onExit())}>
          <X size={24} strokeWidth={2.6} />
        </IconButton>
        <div className="lesson__progress">
          <ProgressBar value={(index + (step ? 0 : 1)) / steps.length} tone="course" label="Lesson progress" />
        </div>
        <AnimatePresence>
          {comboFlash != null && (
            <motion.div
              key={comboFlash}
              className="lesson__combo"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 600, damping: 18 }}
              aria-label={`${comboFlash} in a row`}
            >
              <Flame size={16} strokeWidth={2.8} />
              <span className="tabular">{comboFlash}</span>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="lesson__pops" aria-hidden>
          <AnimatePresence>
            {xpPops.map((p) => (
              <motion.span
                key={p.id}
                className="xp-pop"
                initial={{ y: 8, opacity: 0, scale: 0.8 }}
                animate={{ y: -18, opacity: 1, scale: 1 }}
                exit={{ y: -34, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 20 }}
              >
                +{p.xp} XP
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      </header>

      <div className="lesson__stage">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={step.id}
            className="lesson__slide"
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
          >
            <StepRunner step={step} mode="lesson" lessonId={lessonId} onResolved={onResolved} onNext={onNext} />
          </motion.div>
        </AnimatePresence>
      </div>

      <Sheet open={confirmExit} onClose={() => setConfirmExit(false)} label="Leave lesson">
        <div className="confirm">
          <h3>Take a break?</h3>
          <p>Your place in “{lesson.title}” is saved. You can pick up from step {index + 1}.</p>
          <div className="confirm__actions">
            <Button block onClick={() => setConfirmExit(false)}>
              Keep going
            </Button>
            <Button block variant="ghost" onClick={onExit}>
              Leave lesson
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  )
}
