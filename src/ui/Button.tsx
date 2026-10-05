import { motion, type HTMLMotionProps } from 'motion/react'
import type { ReactNode } from 'react'
import { haptic, sfx } from './fx'
import './ui.css'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'good' | 'bad' | 'course' | 'select'

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: ButtonVariant
  size?: 'sm' | 'md' | 'lg'
  block?: boolean
  icon?: ReactNode
  iconRight?: ReactNode
  children?: ReactNode
  /** play the tap sound/haptic (default true) */
  feedback?: boolean
}

/**
 * The chunky, pressable button. It sits on a darker bottom edge and sinks
 * into it while pressed.
 */
export function Button({
  variant = 'primary',
  size = 'lg',
  block,
  icon,
  iconRight,
  children,
  className,
  feedback = true,
  onClick,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <motion.button
      type="button"
      className={['btn', `btn--${variant}`, `btn--${size}`, block && 'btn--block', className].filter(Boolean).join(' ')}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 700, damping: 30 }}
      onClick={(e) => {
        if (feedback) {
          sfx('tap')
          haptic('light')
        }
        onClick?.(e)
      }}
      {...rest}
    >
      <span className="btn__face">
        {icon && <span className="btn__icon">{icon}</span>}
        {children && <span className="btn__label">{children}</span>}
        {iconRight && <span className="btn__icon">{iconRight}</span>}
      </span>
    </motion.button>
  )
}

export function IconButton({
  label,
  children,
  className,
  ...rest
}: { label: string; children: ReactNode } & Omit<HTMLMotionProps<'button'>, 'children'>) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      className={['icon-btn', className].filter(Boolean).join(' ')}
      whileTap={{ scale: 0.88 }}
      transition={{ type: 'spring', stiffness: 600, damping: 26 }}
      {...rest}
    >
      {children}
    </motion.button>
  )
}
