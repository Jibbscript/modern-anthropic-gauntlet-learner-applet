import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { X, Brain, Target, Sparkles, CalendarClock } from 'lucide-react'
import { CATALOG } from '../content'
import { SKILL_BY_ID } from '../content/skills'
import { useStore } from '../core/store'
import { gradeFromAnswer, recallNow, formatInterval, type Grade } from '../core/fsrs'
import { ProgressBar } from '../ui/ProgressBar'
import { Button, IconButton } from '../ui/Button'
import { Ticker } from '../ui/Ticker'
import { celebrate, sfx } from '../ui/fx'
import { courseStyle } from '../ui/course'
import { StepRunner, type StepOutcome } from './StepRunner'
import './lesson.css'

/** typical seconds to answer each card kind, used to grade speed */
const EXPECTED_MS: Record<string, number> = {
  flash: 8000,
  mcq: 12000,
  order: 20000,
  sort: 20000,
  cloze: 18000,
  spotbug: 18000,
  predict: 20000,
  numeric: 20000,
  match: 20000,
  compare: 25000,
}

/**
 * Spaced-repetition session. Cards answered wrong come back once at the end
 * of the session; every answer updates the FSRS memory model.
 */
export function ReviewSession({ cardIds, title = 'Review', onExit }: { cardIds: string[]; title?: string; onExit: () => void }) {
  const [queue, setQueue] = useState<string[]>(() => cardIds.filter((id) => CATALOG.cards[id]))
  const [pos, setPos] = useState(0)
  const [done, setDone] = useState(false)
  const requeued = useRef(new Set<string>())
  /** cards in the session before any second looks */
  const firstPass = useRef(queue.length)
  /**
   * live queue length: a flashcard grades and advances in one handler, before
   * a requeue re-renders, so onNext must not read a stale `queue.length`
   */
  const queueLen = useRef(queue.length)
  const finished = useRef(false)
  const tally = useRef({ answered: 0, correct: 0, xp: 0, recallBefore: 0, recallAfter: 0 })
  const before = useMemo(() => {
    const s = useStore.getState()
    const now = Date.now()
    const ids = cardIds.filter((id) => s.cards[id])
    return ids.length ? ids.reduce((a, id) => a + recallNow(s.cards[id], now), 0) / ids.length : 0
  }, [cardIds])

  const id = queue[pos]
  const card = id ? CATALOG.cards[id] : undefined
  const lesson = card ? CATALOG.lessons[card.lessonId] : undefined
  const course = lesson ? CATALOG.courses.find((c) => c.id === lesson.courseId) : undefined

  const onResolved = useCallback(
    (o: StepOutcome) => {
      if (!id || !card) return
      const s = useStore.getState()
      const prev = s.cards[id]
      const grade: Grade =
        o.grade ??
        gradeFromAnswer({
          correct: o.correct && o.firstTry,
          attempts: o.attempts,
          usedHint: o.usedHint,
          ms: o.ms,
          expectedMs: EXPECTED_MS[card.kind] ?? 15000,
          previouslySeen: !!prev && prev.reps > 0 && prev.lapses === 0,
        })
      tally.current.answered++
      if (grade >= 3) tally.current.correct++
      tally.current.xp += s.reviewCard(id, grade, o.ms)
      if (grade === 1 && !requeued.current.has(id)) {
        requeued.current.add(id)
        queueLen.current++
        setQueue((q) => [...q, id])
      }
    },
    [id, card],
  )

  const onNext = useCallback(() => {
    if (finished.current) return
    if (pos + 1 >= queueLen.current) {
      finished.current = true
      const s = useStore.getState()
      const now = Date.now()
      const ids = cardIds.filter((x) => s.cards[x])
      tally.current.recallAfter = ids.length ? ids.reduce((a, x) => a + recallNow(s.cards[x], now), 0) / ids.length : 0
      tally.current.recallBefore = before
      setDone(true)
      sfx('complete')
      setTimeout(() => celebrate('small'), 200)
    } else setPos(pos + 1)
  }, [pos, cardIds, before])

  // vary the shuffle seed per review so choices don't settle into a memorisable order, but
  // fix it per position: grading bumps `reps`, and a new seed would reshuffle the answered card
  const seed = useMemo(() => (id ? (useStore.getState().cards[id]?.reps ?? 0) : 0), [id, pos])

  if (done || !card) {
    const t = tally.current
    const s = useStore.getState()
    const nextDue = Object.values(s.cards)
      .map((c) => c.due)
      .filter((d) => d > Date.now())
      .sort((a, b) => a - b)[0]
    return (
      <div className="screen complete safe-top">
        <div className="complete__body scroll">
          <motion.div className="complete__badge complete__badge--brain" initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }}>
            <div className="complete__badge-face">
              <Brain size={56} strokeWidth={2.2} />
            </div>
          </motion.div>
          <div className="complete__titles">
            <div className="eyebrow">{t.answered ? 'Session complete' : 'Nothing to review'}</div>
            <h1>{t.answered ? 'Memory topped up' : 'You’re all caught up'}</h1>
          </div>
          {t.answered > 0 && (
            <div className="complete__tiles">
              <div className="stat-tile stat-tile--xp">
                <div className="stat-tile__label">
                  <Sparkles size={18} strokeWidth={2.6} />
                  XP earned
                </div>
                <div className="stat-tile__value">
                  <Ticker from={0} value={t.xp} />
                </div>
              </div>
              <div className="stat-tile stat-tile--good">
                <div className="stat-tile__label">
                  <Target size={18} strokeWidth={2.8} />
                  Recalled
                </div>
                <div className="stat-tile__value">
                  {t.correct}/{t.answered}
                </div>
              </div>
              <div className="stat-tile stat-tile--select">
                <div className="stat-tile__label">
                  <Brain size={18} strokeWidth={2.8} />
                  Memory strength
                </div>
                <div className="stat-tile__value">
                  <Ticker from={Math.round(t.recallBefore * 100)} value={Math.round(t.recallAfter * 100)} format={(n) => `${Math.round(n)}%`} />
                </div>
              </div>
            </div>
          )}
          {nextDue && (
            <div className="complete__cards">
              <CalendarClock size={18} strokeWidth={2.6} />
              <span>
                Next card due in <b>{formatInterval((nextDue - Date.now()) / 86_400_000)}</b>.
              </span>
            </div>
          )}
        </div>
        <div className="complete__footer safe-bottom">
          <Button block onClick={onExit}>
            Done
          </Button>
        </div>
      </div>
    )
  }

  const stepLike = { ...card, id: `${card.id}~${seed}` }
  return (
    <div className="screen lesson safe-top" style={course ? courseStyle(course.color) : undefined}>
      <header className="lesson__head">
        <IconButton label="End review" onClick={onExit}>
          <X size={24} strokeWidth={2.6} />
        </IconButton>
        <div className="lesson__progress">
          <ProgressBar value={pos / queue.length} tone="select" label="Review progress" />
        </div>
        <span className="lesson__count tabular">
          {pos + 1}/{queue.length}
        </span>
      </header>
      <div className="review__meta">
        <span className="chip chip--course">{SKILL_BY_ID[card.skill]?.name ?? title}</span>
        {requeued.current.has(card.id) && pos >= firstPass.current && <span className="chip chip--warn">Second look</span>}
      </div>
      <div className="lesson__stage">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={`${card.id}:${pos}`}
            className="lesson__slide"
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
          >
            <StepRunner step={stepLike} mode="review" onResolved={onResolved} onNext={onNext} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
