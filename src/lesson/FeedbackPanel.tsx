import { motion } from 'motion/react'
import { useMemo, useState, type ReactNode } from 'react'
import { CircleCheck, CircleX, BookOpen, ChevronDown } from 'lucide-react'
import type { StepPhase } from '../steps/types'
import { Rich } from '../ui/Rich'

const PRAISE = ['Correct!', 'Nice!', 'Exactly.', 'Nailed it.', 'Spot on.', 'Yes!', 'Sharp.']
const NUDGE = ['Not quite.', 'Close, but no.', 'Not this time.', 'Hmm, not quite.']

/**
 * The panel that rises from the bottom after Check. Green for correct, red
 * for incorrect, neutral for a revealed answer. Long explanations collapse
 * behind "Why?".
 */
export function FeedbackPanel({
  phase,
  feedback,
  explanation,
  actions,
}: {
  phase: StepPhase
  feedback?: string
  explanation?: string
  actions: ReactNode
}) {
  const title = useMemo(() => {
    const list = phase === 'correct' ? PRAISE : phase === 'incorrect' ? NUDGE : ['Here’s the answer.']
    return list[Math.floor(Math.random() * list.length)]
  }, [phase])
  const long = (explanation?.length ?? 0) > 220
  const [open, setOpen] = useState(phase !== 'incorrect' && !long)
  const tone = phase === 'correct' ? 'good' : phase === 'incorrect' ? 'bad' : 'neutral'
  const Icon = phase === 'correct' ? CircleCheck : phase === 'incorrect' ? CircleX : BookOpen
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
