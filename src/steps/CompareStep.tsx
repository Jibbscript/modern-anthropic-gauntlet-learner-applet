import { AnimatePresence, motion } from 'motion/react'
import { Check, ThumbsUp, UserRound, X } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { CompareStep as T } from '../core/types'
import { Rich } from '../ui/Rich'
import { Tile, type TileState } from '../ui/Tile'
import type { StepProps } from './types'
import './steps.css'
import './CompareStep.css'

type Pick = 'a' | 'b'
const SPRING = { type: 'spring', stiffness: 520, damping: 32 } as const

/**
 * The interviewer asks a question (chat bubble); the learner picks the
 * stronger of two candidate answers.
 */
export default function CompareStep({ step, phase, attempt, setController }: StepProps<T>) {
  const [picked, setPicked] = useState<Pick | null>(null)
  const groupRef = useRef<HTMLDivElement>(null)
  const locked = phase !== 'answer'
  const enter = attempt === 0

  // radio-group keyboard model: arrows move the selection (and focus) between the two answers
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (locked) return
    const dir = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0
    if (!dir) return
    e.preventDefault()
    const cur = picked === 'b' ? 1 : picked === 'a' ? 0 : dir > 0 ? -1 : 2
    const next = (((cur + dir) % 2) + 2) % 2
    setPicked(next === 0 ? 'a' : 'b')
    groupRef.current?.querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus()
  }

  useEffect(() => {
    setController({
      ready: picked != null,
      check: () => ({ correct: picked === step.better }),
    })
  }, [picked, step.better, setController])

  const stateOf = (k: Pick): TileState => {
    const better = k === step.better
    const sel = picked === k
    if (phase === 'answer') return sel ? 'selected' : 'idle'
    if (phase === 'correct') return better ? 'correct' : 'dimmed'
    if (phase === 'incorrect') return sel ? 'incorrect' : 'idle'
    return better ? 'reveal' : sel ? 'incorrect' : 'dimmed'
  }

  const showStronger = phase === 'correct' || phase === 'revealed'

  return (
    <div className="step compare">
      {step.eyebrow && <div className="eyebrow step__eyebrow">{step.eyebrow}</div>}

      <motion.div
        className="compare-chat"
        initial={enter ? { opacity: 0, y: 8 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING}
      >
        <div className="compare-chat__avatar" aria-hidden>
          <UserRound size={22} strokeWidth={2.4} />
        </div>
        <div className="compare-chat__col">
          <div className="compare-chat__name">Interviewer</div>
          <motion.div
            className="compare-chat__bubble"
            initial={enter ? { opacity: 0, scale: 0.9 } : false}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...SPRING, delay: enter ? 0.08 : 0 }}
          >
            <Rich text={step.question} />
          </motion.div>
        </div>
      </motion.div>

      <div className="step__instructions compare__how">
        {phase === 'answer' ? 'Which answer is stronger?' : phase === 'incorrect' ? 'That one is weaker' : 'The stronger answer'}
      </div>

      <div className="choices compare__answers" role="radiogroup" aria-label="Candidate answers" ref={groupRef} onKeyDown={onKeyDown}>
        {(['a', 'b'] as const).map((k, i) => {
          const state = stateOf(k)
          const stronger = showStronger && k === step.better
          return (
            <motion.div
              key={k}
              initial={enter ? { opacity: 0, y: 14 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING, delay: enter ? 0.16 + i * 0.07 : 0 }}
            >
              <Tile
                state={state}
                disabled={locked}
                onClick={() => !locked && setPicked(k)}
                className="compare-card"
                role="radio"
                aria-checked={picked === k}
                aria-pressed={undefined}
                tabIndex={locked ? undefined : picked == null ? (k === 'a' ? 0 : -1) : picked === k ? 0 : -1}
              >
                <span className="compare-card__head">
                  <span className="compare-card__label">Answer {k.toUpperCase()}</span>
                  <AnimatePresence initial={false}>
                    {stronger && (
                      <motion.span
                        key="stronger"
                        className="chip chip--good compare-card__stronger"
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 600, damping: 20, delay: 0.1 }}
                      >
                        <ThumbsUp size={13} strokeWidth={2.6} /> Stronger
                      </motion.span>
                    )}
                  </AnimatePresence>
                  <Radio state={state} />
                </span>
                <Rich text={k === 'a' ? step.a : step.b} className="compare-card__text" />
              </Tile>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

/** Round indicator in the card's corner: empty ring, filled blue when picked, then check / cross once graded. */
function Radio({ state }: { state: TileState }) {
  const icon =
    state === 'selected' || state === 'correct' || state === 'reveal' ? (
      <Check size={14} strokeWidth={3.4} />
    ) : state === 'incorrect' ? (
      <X size={14} strokeWidth={3.4} />
    ) : null
  return (
    <span className={`compare-radio compare-radio--${state}`} aria-hidden>
      <AnimatePresence initial={false}>
        {icon && (
          <motion.span
            key={state}
            className="compare-radio__icon"
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.3, opacity: 0, transition: { duration: 0.08 } }}
            transition={{ type: 'spring', stiffness: 700, damping: 22 }}
          >
            {icon}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}
