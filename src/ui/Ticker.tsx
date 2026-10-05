import { animate, useMotionValue, useReducedMotion, useTransform, motion } from 'motion/react'
import { useStore } from '../core/store'
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
  // call both hooks unconditionally (no short-circuit) to keep hook order stable
  const osReduce = useReducedMotion()
  const appReduce = useStore((s) => s.settings.reduceMotion)
  const reduce = !!osReduce || appReduce
  const mv = useMotionValue(reduce ? value : (from ?? value))
  const text = useTransform(mv, (v) => format(v))
  useEffect(() => {
    if (reduce) {
      mv.set(value)
      return
    }
    const c = animate(mv, value, { duration, ease: [0.22, 1, 0.36, 1] })
    return () => c.stop()
  }, [value, duration, mv, reduce])
  return <motion.span className="tabular">{text}</motion.span>
}
