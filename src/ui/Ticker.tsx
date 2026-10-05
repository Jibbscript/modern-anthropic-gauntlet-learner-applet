import { animate, useMotionValue, useTransform, motion } from 'motion/react'
import { useEffect } from 'react'

/** Number that counts up/down to its value. */
export function Ticker({
  value,
  from,
  duration = 0.8,
  format = (n: number) => String(Math.round(n)),
}: {
  value: number
  /** start value on mount (defaults to value, i.e. no initial count) */
  from?: number
  duration?: number
  format?: (n: number) => string
}) {
  const mv = useMotionValue(from ?? value)
  const text = useTransform(mv, (v) => format(v))
  useEffect(() => {
    const c = animate(mv, value, { duration, ease: [0.22, 1, 0.36, 1] })
    return () => c.stop()
  }, [value, duration, mv])
  return <motion.span className="tabular">{text}</motion.span>
}
