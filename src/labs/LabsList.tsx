import { motion } from 'motion/react'
import { Check, ChevronRight, Clock, TerminalSquare, Trophy } from 'lucide-react'
import type { Lab } from '../core/types'
import { useStore, type LabProgress } from '../core/store'
import { COURSES } from '../content'
import { courseStyle } from '../ui/course'
import { renderInline } from '../ui/Rich'
import { sfx, haptic } from '../ui/fx'
import { LABS } from './data'
import './LabsList.css'

/**
 * Cards for the code labs with per-lab level progress. Used by the Practice
 * screen; tapping a card calls onOpen(labId).
 */
export default function LabsList({ onOpen, labs = LABS }: { onOpen: (labId: string) => void; labs?: Lab[] }) {
  const progress = useStore((s) => s.labs)
  if (!labs.length) {
    return (
      <div className="labs-empty">
        <TerminalSquare size={22} strokeWidth={2.6} />
        <span>Code labs are on their way.</span>
      </div>
    )
  }
  return (
    <ul className="labs" aria-label="Code labs">
      {labs.map((lab, i) => (
        <motion.li key={lab.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 32, delay: Math.min(i, 8) * 0.04 }}>
          <LabCard lab={lab} p={progress[lab.id]} onOpen={onOpen} />
        </motion.li>
      ))}
    </ul>
  )
}

function LabCard({ lab, p, onOpen }: { lab: Lab; p: LabProgress | undefined; onOpen: (labId: string) => void }) {
  const n = lab.levels.length
  const passed = Math.min(p?.levelsPassed ?? 0, n)
  const done = n > 0 && passed >= n
  const started = passed > 0 || !!p?.code
  const color = COURSES.find((c) => c.id === lab.area)?.color ?? 'blue'
  const status = done ? 'Complete' : started ? `Level ${passed + 1} of ${n}` : `${n} levels`
  return (
    <motion.button
      type="button"
      className={['labs-card', done && 'labs-card--done'].filter(Boolean).join(' ')}
      style={courseStyle(color)}
      whileTap={{ y: 2 }}
      onClick={() => {
        sfx('tap')
        haptic('light')
        onOpen(lab.id)
      }}
      aria-label={`${lab.title}. ${status}.`}
    >
      <span className="labs-card__icon" aria-hidden>
        {done ? <Trophy size={22} strokeWidth={2.6} /> : <TerminalSquare size={22} strokeWidth={2.6} />}
      </span>
      <span className="labs-card__body">
        <span className="labs-card__title">{lab.title}</span>
        {lab.summary && <span className="labs-card__summary">{renderInline(lab.summary.split('\n\n')[0])}</span>}
        <span className="labs-card__levels" aria-hidden>
          {lab.levels.map((_, i) => (
            <span key={i} className={['labs-card__seg', i < passed && 'labs-card__seg--done', i === passed && !done && started && 'labs-card__seg--now'].filter(Boolean).join(' ')} />
          ))}
        </span>
        <span className="labs-card__meta">
          <span className={['labs-card__status', done && 'labs-card__status--done'].filter(Boolean).join(' ')}>
            {done && <Check size={12} strokeWidth={3.2} />}
            {status}
          </span>
          <span className="labs-card__min">
            <Clock size={12} strokeWidth={2.8} /> {lab.minutes} min
          </span>
        </span>
      </span>
      <ChevronRight className="labs-card__chev" size={20} strokeWidth={2.6} aria-hidden />
    </motion.button>
  )
}
