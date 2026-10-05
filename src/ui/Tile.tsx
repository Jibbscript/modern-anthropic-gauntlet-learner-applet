import { motion, type HTMLMotionProps } from 'motion/react'
import type { ReactNode } from 'react'
import { haptic, sfx } from './fx'
import './ui.css'

export type TileState = 'idle' | 'selected' | 'correct' | 'incorrect' | 'dimmed' | 'reveal'

interface TileProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  state?: TileState
  children: ReactNode
  /** leading badge, e.g. "A" or an icon */
  badge?: ReactNode
  compact?: boolean
}

/**
 * Answer tile: white card on a grey bottom edge. Selected = blue,
 * correct = green, incorrect = red (with a shake), reveal = dashed green
 * outline for "this was the right one".
 */
export function Tile({ state = 'idle', children, badge, compact, className, onClick, disabled, ...rest }: TileProps) {
  const interactive = !disabled && (state === 'idle' || state === 'selected')
  return (
    <motion.button
      type="button"
      className={['tile', `tile--${state}`, compact && 'tile--compact', className].filter(Boolean).join(' ')}
      disabled={disabled}
      aria-pressed={state === 'selected'}
      animate={state === 'incorrect' ? { x: [0, -7, 7, -5, 5, -2, 0] } : state === 'correct' ? { scale: [1, 1.025, 1] } : { x: 0, scale: 1 }}
      transition={{ duration: state === 'incorrect' ? 0.42 : 0.3 }}
      whileTap={interactive ? { y: 2 } : undefined}
      onClick={(e) => {
        if (interactive) {
          sfx('select')
          haptic('light')
        }
        onClick?.(e)
      }}
      {...rest}
    >
      {badge != null && <span className="tile__badge">{badge}</span>}
      <span className="tile__body">{children}</span>
    </motion.button>
  )
}
