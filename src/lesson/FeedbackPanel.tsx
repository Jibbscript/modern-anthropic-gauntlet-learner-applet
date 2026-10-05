import { motion } from 'motion/react'
import { useMemo, useState, type ReactNode } from 'react'
import { PartyPopper, RotateCcw, BookOpen, ChevronDown } from 'lucide-react'
import type { StepPhase } from '../steps/types'
import { Rich } from '../ui/Rich'

const PRAISE = ['Correct!', 'Correct!', 'Nice!', 'Exactly.', 'Nailed it.', 'Spot on.']
const NUDGE = ['Not quite.', 'Not quite.', 'Try again!', 'Close, but not quite.']

/**
 * The banner that rises from the bottom after Check, following Brilliant:
 * green "Correct!" with an XP chip and a "Why?" pill; yellow "Not quite."
 * for a retryable miss; neutral grey (deliberately not red) once the answer
 * is revealed. Long explanations collapse behind "Why?".
 */
export function FeedbackPanel({
  phase,
  feedback,
  explanation,
  actions,
  xp,
}: {
  phase: StepPhase
  feedback?: string
  explanation?: string
  actions: ReactNode
  /** XP earned, shown as a chip on correct */
  xp?: number
}) {
  const title = useMemo(() => {
    const list = phase === 'correct' ? PRAISE : phase === 'incorrect' ? NUDGE : ['Here’s the answer.']
    return list[Math.floor(Math.random() * list.length)]
  }, [phase])
  const long = (explanation?.length ?? 0) > 160
  const [open, setOpen] = useState(phase === 'revealed' || !long)
  const tone = phase === 'correct' ? 'good' : phase === 'incorrect' ? 'retry' : 'neutral'
  const Icon = phase === 'correct' ? PartyPopper : phase === 'incorrect' ? RotateCcw : BookOpen
  const showExplanation = phase !== 'incorrect' && !!explanation

  return (
    <motion.div
      className={`fb fb--${tone}`}
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 30, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 520, damping: 34 }}
      role="status"
      aria-live="polite"
    >
      <div className="fb__head">
        <motion.span
          className="fb__icon"
          initial={{ scale: 0.4, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 600, damping: 14 }}
        >
          <Icon size={28} strokeWidth={2.6} />
        </motion.span>
        <div className="fb__title">{title}</div>
        {phase === 'correct' && !!xp && (
          <motion.span
            className="fb__xp tabular"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: [0.5, 1.15, 1], opacity: 1 }}
            transition={{ duration: 0.45, delay: 0.1 }}
          >
            +{xp} XP
          </motion.span>
        )}
        {showExplanation && long && (
          <button type="button" className="fb__why" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            Why? <ChevronDown size={16} strokeWidth={3} style={{ transform: open ? 'rotate(180deg)' : undefined }} />
          </button>
        )}
      </div>
      {feedback && <Rich text={feedback} className="fb__text" />}
      {showExplanation && open && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="fb__explain">
          <Rich text={explanation} />
        </motion.div>
      )}
      <div className="fb__cta">{actions}</div>
    </motion.div>
  )
}
