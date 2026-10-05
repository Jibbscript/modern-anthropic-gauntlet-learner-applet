import { AnimatePresence, motion, useReducedMotion, useReducedMotionConfig } from 'motion/react'
import { Brain, RotateCw } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { FlashCard as T } from '../core/types'
import { formatInterval, newCard, previewIntervals, type Grade } from '../core/fsrs'
import { scheduleOptions, useStore } from '../core/store'
import { Button, type ButtonVariant } from '../ui/Button'
import { CodeFromBlock } from '../ui/code/Code'
import { Rich } from '../ui/Rich'
import { haptic, sfx } from '../ui/fx'
import type { StepProps } from './types'
import './steps.css'
import './FlashStep.css'

const GRADES: { g: Grade; label: string; variant: ButtonVariant }[] = [
  { g: 1, label: 'Forgot', variant: 'bad' },
  { g: 2, label: 'Hazy', variant: 'retry' },
  { g: 3, label: 'Got it', variant: 'good' },
  { g: 4, label: 'Easy', variant: 'select' },
]

const FLIP = {
  type: 'spring',
  stiffness: 260,
  damping: 26,
  mass: 0.9,
} as const

function useReduce(): boolean {
  const cfg = useReducedMotionConfig()
  const os = useReducedMotion()
  return !!cfg || !!os || (typeof document !== 'undefined' && document.documentElement.dataset.reduceMotion === 'true')
}

/**
 * Review flashcard: recall, flip, self-grade. Each grade button previews the
 * interval FSRS would schedule next. Keyboard: Space flips, 1-4 grade.
 */
export default function FlashStep({ step, complete }: StepProps<T & { id: string }>) {
  const reduce = useReduce()
  const [flipped, setFlipped] = useState(false)
  const graded = useRef(false)
  const backRef = useRef<HTMLDivElement>(null)

  // ReviewSession appends "~n" to vary shuffles; the memory model is keyed by the real card id
  const cardId = step.id.replace(/~.*$/, '')
  const intervals = useMemo(() => {
    const s = useStore.getState()
    const now = Date.now()
    return previewIntervals(s.cards[cardId] ?? newCard(now, 0), now, scheduleOptions(s))
  }, [cardId])

  const flip = () => {
    if (flipped) return
    setFlipped(true)
    sfx('flip')
    haptic('light')
  }
  useEffect(() => {
    if (flipped) backRef.current?.focus({ preventScroll: true })
  }, [flipped])

  const grade = (g: Grade) => {
    if (!flipped || graded.current) return
    graded.current = true
    complete({ correct: g >= 3, grade: g })
  }

  // keyboard: Space / Enter flips, 1-4 grades
  const live = useRef({ flipped, flip, grade })
  live.current = { flipped, flip, grade }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      const { flipped: f, flip: doFlip, grade: doGrade } = live.current
      // a focused button activates itself on Space/Enter; flipping here too would double the flip
      if (!f && (e.key === ' ' || e.key === 'Enter') && tag !== 'BUTTON') {
        e.preventDefault()
        doFlip()
      } else if (f && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault()
        doGrade(Number(e.key) as Grade)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const front = (
    <>
      <div className="flash-face__label">
        <Brain size={15} strokeWidth={2.6} /> Recall
      </div>
      <div className="flash-face__main">
        <Rich text={step.front} className="flash-front" />
        {step.code && <CodeFromBlock block={step.code} />}
      </div>
      <div className="flash-face__foot" aria-hidden>
        <RotateCw size={14} strokeWidth={2.6} /> Tap to reveal
      </div>
    </>
  )
  const back = (
    <>
      <div className="flash-face__label flash-face__label--back">Answer</div>
      <div className="flash-face__main flash-face__main--back">
        <Rich text={step.front} className="flash-context" />
        {step.code && (
          <div className="flash-context-code">
            <CodeFromBlock block={step.code} />
          </div>
        )}
        <div className="flash-rule" aria-hidden />
        <Rich text={step.back} className="flash-back" />
      </div>
    </>
  )

  return (
    <div className="step flash">
      <div className="flash-stage">
        <div className={`flash-card${flipped ? ' flash-card--flipped' : ''}${reduce ? ' flash-card--fade' : ''}`} onClick={flipped ? undefined : flip}>
          <motion.div className="flash-card__inner" initial={false} animate={reduce ? { rotateY: 0 } : { rotateY: flipped ? 180 : 0 }} transition={FLIP}>
            <motion.div
              className="flash-face flash-face--front"
              aria-hidden={flipped}
              initial={false}
              animate={reduce ? { opacity: flipped ? 0 : 1 } : { opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              {front}
            </motion.div>
            <motion.div
              ref={backRef}
              className="flash-face flash-face--back"
              role="region"
              aria-label="Answer"
              aria-hidden={!flipped}
              tabIndex={-1}
              initial={false}
              animate={reduce ? { opacity: flipped ? 1 : 0 } : { opacity: 1 }}
              transition={{
                duration: 0.2,
                delay: reduce && flipped ? 0.08 : 0,
              }}
            >
              {back}
            </motion.div>
          </motion.div>
        </div>
      </div>

      <div className="flash-controls">
        <AnimatePresence mode="wait" initial={false}>
          {!flipped ? (
            <motion.div key="show" className="flash-show" exit={{ opacity: 0, y: 6, transition: { duration: 0.12 } }}>
              <Button block feedback={false} onClick={flip} icon={<RotateCw size={19} strokeWidth={2.8} />} aria-keyshortcuts="Space">
                Show answer
              </Button>
              <div className="flash-keys">
                <kbd>Space</kbd> to flip
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="grade"
              className="flash-grades"
              initial="hidden"
              animate="shown"
              variants={{
                hidden: {},
                shown: {
                  transition: { staggerChildren: 0.04, delayChildren: 0.12 },
                },
              }}
            >
              <div className="step__instructions flash-grades__how" id={`${step.id}-how`}>
                How well did you remember it?
              </div>
              <div className="flash-grades__row" role="group" aria-labelledby={`${step.id}-how`}>
                {GRADES.map(({ g, label, variant }) => (
                  <motion.div
                    key={g}
                    className="flash-grades__cell"
                    variants={{
                      hidden: { opacity: 0, y: 14 },
                      shown: {
                        opacity: 1,
                        y: 0,
                        transition: {
                          type: 'spring',
                          stiffness: 520,
                          damping: 30,
                        },
                      },
                    }}
                  >
                    <Button
                      block
                      size="md"
                      variant={variant}
                      className="flash-grade"
                      onClick={() => grade(g)}
                      aria-label={`${label}, next review in ${formatInterval(intervals[g])}`}
                      aria-keyshortcuts={String(g)}
                    >
                      <span className="flash-grade__label">{label}</span>
                      <span className="flash-grade__when tabular">{formatInterval(intervals[g])}</span>
                    </Button>
                  </motion.div>
                ))}
              </div>
              <div className="flash-keys">
                <kbd>1</kbd>–<kbd>4</kbd> to grade
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
