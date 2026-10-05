import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Check, Target } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { WidgetStep as T } from '../core/types'
import { Button } from '../ui/Button'
import { Rich } from '../ui/Rich'
import { haptic, sfx } from '../ui/fx'
import { WidgetHost } from '../widgets/WidgetHost'
import type { StepProps } from './types'
import './steps.css'
import './WidgetStep.css'

/** pause between "Goal reached" and the feedback panel, so the learner sees the chip flip */
const SETTLE_MS = 500

/**
 * An interactive simulation with a goal. The goal chip flips green the first
 * time the widget reports success; for required goals the step then grades
 * itself correct. Optional widgets (requireComplete: false) just render and
 * the runner offers Continue straight away.
 */
export default function WidgetStep({ step, phase, attempt, complete }: StepProps<T & { id: string }>) {
  const required = step.requireComplete !== false
  const failed = useWidgetFailed()
  const [reached, setReached] = useState(phase === 'correct')
  const reachedRef = useRef(reached)
  const completeRef = useRef(complete)
  completeRef.current = complete
  const timer = useRef<number | null>(null)
  useEffect(
    () => () => {
      if (timer.current != null) clearTimeout(timer.current)
    },
    [],
  )

  const onWidget = useCallback(
    (ok: boolean) => {
      if (!ok || reachedRef.current) return
      reachedRef.current = true
      setReached(true)
      // lands on the same beat as the widget's own success chime (widgets that have one), so it reads as one sound
      sfx('correct')
      haptic('success')
      if (required) timer.current = window.setTimeout(() => completeRef.current({ correct: true }), SETTLE_MS)
    },
    [required],
  )

  return (
    <div className="step widget-step">
      {step.eyebrow && <div className="eyebrow step__eyebrow">{step.eyebrow}</div>}
      <Rich text={step.prompt} className="step__prompt" />
      {step.goal && <GoalChip goal={step.goal} reached={reached} animate={attempt === 0 || reached} />}
      <div className="widget-step__host" ref={failed.ref}>
        <WidgetHost widget={step.widget} onComplete={onWidget} />
      </div>
      {/* a simulation that cannot load (unknown id, a lazy chunk failing offline) must not strand a required step */}
      {failed.value && required && phase === 'answer' && !reached && (
        <Button
          variant="secondary"
          size="md"
          className="widget-step__skip"
          iconRight={<ArrowRight size={18} strokeWidth={2.8} />}
          onClick={() => complete({ correct: true, feedback: 'Skipped: the simulation did not load.' })}
        >
          Continue without it
        </Button>
      )}
    </div>
  )
}

/** watches the widget host for its error state (WidgetHost renders .widget-error instead of throwing) */
function useWidgetFailed() {
  const [value, setValue] = useState(false)
  const mo = useRef<MutationObserver | null>(null)
  const ref = useCallback((el: HTMLDivElement | null) => {
    mo.current?.disconnect()
    mo.current = null
    if (!el) return
    const check = () => {
      if (!el.querySelector(':scope > .widget-error, :scope > .widget-stage > .widget-error')) return
      setValue(true)
      mo.current?.disconnect()
    }
    check()
    if (typeof MutationObserver === 'undefined') return
    const obs = new MutationObserver(() => {
      // the stage can appear after a Suspense swap; watch its direct children too (not the whole widget subtree)
      const stage = el.querySelector(':scope > .widget-stage')
      if (stage) obs.observe(stage, { childList: true })
      check()
    })
    obs.observe(el, { childList: true })
    const stage = el.querySelector(':scope > .widget-stage')
    if (stage) obs.observe(stage, { childList: true })
    mo.current = obs
  }, [])
  return { value, ref }
}

function GoalChip({ goal, reached, animate }: { goal: string; reached: boolean; animate: boolean }) {
  return (
    <motion.div
      className={`widget-goal${reached ? ' widget-goal--reached' : ''}`}
      role="status"
      aria-live="polite"
      animate={reached && animate ? { scale: [1, 1.06, 0.98, 1] } : { scale: 1 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      <span className="widget-goal__icon" aria-hidden>
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={reached ? 'done' : 'goal'}
            className="widget-goal__glyph"
            initial={{ scale: 0.2, rotate: -90, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0.2, rotate: 90, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 600, damping: 18 }}
          >
            {reached ? <Check size={16} strokeWidth={3.4} /> : <Target size={16} strokeWidth={2.6} />}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="widget-goal__body">
        <span className="widget-goal__label">{reached ? 'Goal reached' : 'Goal'}</span>
        <span className="widget-goal__text">{goal}</span>
      </span>
    </motion.div>
  )
}
