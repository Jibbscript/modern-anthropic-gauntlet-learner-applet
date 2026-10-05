import { motion } from 'motion/react'
import './ui.css'

/** Thick rounded progress bar with a glossy highlight and a springy fill. */
export function ProgressBar({
  value,
  tone = 'good',
  height = 14,
  label,
}: {
  /** 0..1 */
  value: number
  tone?: 'good' | 'course' | 'xp' | 'streak' | 'select'
  height?: number
  label?: string
}) {
  const v = Math.max(0, Math.min(1, value))
  return (
    <div
      className={`pbar pbar--${tone}`}
      style={{ height }}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
    >
      <motion.div
        className="pbar__fill"
        initial={false}
        animate={{ width: `${v * 100}%` }}
        transition={{ type: 'spring', stiffness: 140, damping: 22 }}
      >
        <span className="pbar__gloss" />
      </motion.div>
    </div>
  )
}
