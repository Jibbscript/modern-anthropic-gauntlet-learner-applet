import { AnimatePresence, motion, useIsPresent } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, RotateCcw, Eye, ArrowRight } from 'lucide-react'
import type { Step, WidgetStep } from '../core/types'
import { STEP_VIEWS, SELF_GRADED, UNGRADED } from '../steps'
import type { CheckResult, StepController, StepPhase } from '../steps/types'
import { Button } from '../ui/Button'
import { haptic, sfx } from '../ui/fx'
import { FeedbackPanel } from './FeedbackPanel'
import { XP } from '../core/store'
import './lesson.css'

export interface StepOutcome {
  correct: boolean
  firstTry: boolean
  attempts: number
  usedHint: boolean
  ms: number
  graded: boolean
  grade?: 1 | 2 | 3 | 4
}

type RunnableStep = Step | (Record<string, unknown> & { kind: string; id: string })

/**
 * Runs one step: renders the view, owns phase/attempt state, and renders the
 * footer (Check / Continue / feedback panel). Calls onResolved exactly once
 * when the step's outcome is known (it may return the XP it awarded, shown on
 * the feedback banner) and onNext when the learner moves on.
 */
export function StepRunner({
  step,
  mode,
  lessonId,
  onResolved,
  onNext,
}: {
  step: RunnableStep
  mode: 'lesson' | 'review'
  lessonId?: string
  onResolved: (o: StepOutcome) => number | void
  onNext: () => void
}) {
  const kind = step.kind
  const View = STEP_VIEWS[kind]
  const ungraded = UNGRADED.has(kind)
  const selfGraded = SELF_GRADED.has(kind)
  const isFlash = kind === 'flash'
  const widgetOptional = kind === 'widget' && (step as WidgetStep).requireComplete === false

  const [phase, setPhase] = useState<StepPhase>('answer')
  /**
   * the committed phase, for handlers that may fire from a stale render (a
   * double click on a button that is animating out still runs its old onClick)
   */
  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const [attempt, setAttempt] = useState(0)
  const [ready, setReady] = useState(false)
  const [result, setResult] = useState<CheckResult | null>(null)
  /** XP the driver reported for this step, if any */
  const [awarded, setAwarded] = useState<number | null>(null)
  const ctl = useRef<StepController | null>(null)
  const usedHint = useRef(false)
  const t0 = useRef(performance.now())
  const resolved = useRef(false)

  const setController = useCallback((c: StepController) => {
    ctl.current = c
    setReady(c.ready)
  }, [])

  const resolve = useCallback(
    (correct: boolean, firstTry: boolean, graded: boolean, grade?: 1 | 2 | 3 | 4) => {
      if (resolved.current) return
      resolved.current = true
      const xp = onResolved({
        correct,
        firstTry,
        attempts: attempt + 1,
        usedHint: usedHint.current,
        ms: performance.now() - t0.current,
        graded,
        grade,
      })
      if (typeof xp === 'number') setAwarded(xp)
    },
    [attempt, onResolved],
  )

  const markCorrect = useCallback(
    (r: CheckResult) => {
      setResult(r)
      setPhase('correct')
      sfx('correct')
      haptic('success')
      resolve(true, attempt === 0, true)
    },
    [attempt, resolve],
  )

  const markWrong = useCallback((r: CheckResult) => {
    setResult(r)
    setPhase('incorrect')
    sfx('wrong')
    haptic('error')
  }, [])

  const complete = useCallback(
    (r: CheckResult) => {
      if (isFlash) {
        // a second grade (double tap, key + click) must not advance twice
        if (resolved.current) return
        resolve(r.correct, r.correct, true, r.grade)
        onNext()
        return
      }
      if (phaseRef.current !== 'answer') return
      phaseRef.current = r.correct ? 'correct' : 'incorrect'
      if (r.correct) markCorrect(r)
      else markWrong(r)
    },
    [isFlash, resolve, onNext, markCorrect, markWrong],
  )

  const check = () => {
    const c = ctl.current
    if (!c || !c.ready || phaseRef.current !== 'answer') return
    phaseRef.current = 'correct' // provisional: blocks a second check before the re-render
    const r = c.check()
    if (r.correct) markCorrect(r)
    else markWrong(r)
  }

  const advanceUngraded = () => {
    ctl.current?.check() // reflect steps persist on check
    resolve(true, true, false)
    onNext()
  }

  const retry = () => {
    if (phaseRef.current !== 'incorrect') return
    phaseRef.current = 'answer'
    setAttempt((a) => a + 1)
    setPhase('answer')
    setResult(null)
    setReady(false)
  }

  const reveal = () => {
    setPhase('revealed')
    resolve(false, false, true)
  }

  const next = () => {
    if (widgetOptional && phase === 'answer') resolve(true, true, false)
    onNext()
  }

  // Enter = primary action on desktop
  const primary = useRef<(() => void) | null>(null)
  // a step sliding out (AnimatePresence exit) stays mounted for a moment: it must not react to keys
  const present = useIsPresent()
  const presentRef = useRef(present)
  presentRef.current = present
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return
      // held key, IME composition, or a control that already handled it
      if (e.repeat || e.isComposing || e.defaultPrevented || !presentRef.current) return
      const el = e.target instanceof HTMLElement ? e.target : null
      if (el) {
        const tag = el.tagName
        // these activate themselves (or insert a newline) on Enter
        if (tag === 'TEXTAREA' || tag === 'BUTTON' || tag === 'SELECT' || tag === 'A' || el.isContentEditable) return
        // a field inside a <form> (e.g. a widget's answer box) submits that form
        if (tag === 'INPUT' && (el as HTMLInputElement).form) return
        // keys typed in an open dialog belong to the dialog
        if (el.closest('[role="dialog"]')) return
      }
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return
      const action = primary.current
      if (!action) return
      e.preventDefault()
      action()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  let footer: React.ReactNode = null
  if (phase === 'answer') {
    if (isFlash || kind === 'interview') {
      footer = null
      primary.current = null
    } else if (ungraded) {
      const label = kind === 'reflect' ? (ready ? 'Save & continue' : 'Skip for now') : 'Continue'
      primary.current = advanceUngraded
      footer = (
        <Button block onClick={advanceUngraded} iconRight={<ArrowRight size={20} strokeWidth={3} />}>
          {label}
        </Button>
      )
    } else if (selfGraded) {
      primary.current = widgetOptional ? next : null
      footer = (
        <Button block disabled={!widgetOptional} onClick={next}>
          {widgetOptional ? 'Continue' : 'Reach the goal to continue'}
        </Button>
      )
    } else {
      primary.current = ready ? check : null
      footer = (
        <Button block disabled={!ready} onClick={check} icon={<Check size={20} strokeWidth={3} />}>
          Check
        </Button>
      )
    }
  } else {
    primary.current = phase === 'incorrect' ? retry : next
  }

  const explanation = (step as { explanation?: string; wrapUp?: string }).explanation ?? (step as { wrapUp?: string }).wrapUp

  return (
    <div className="runner">
      <div className="runner__body scroll">
        <motion.div
          key={`${step.id}:${attempt}`}
          initial={attempt === 0 ? false : { opacity: 0.4 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {View ? (
            <View
              step={step}
              phase={phase}
              attempt={attempt}
              setController={setController}
              complete={complete}
              mode={mode}
              lessonId={lessonId}
              onHint={() => (usedHint.current = true)}
            />
          ) : (
            <div className="step">Unsupported step “{kind}”.</div>
          )}
        </motion.div>
      </div>
      <div className="runner__footer safe-bottom">
        <AnimatePresence mode="wait" initial={false}>
          {phase === 'answer' ? (
            footer && (
              <motion.div key="cta" className="runner__cta" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {footer}
              </motion.div>
            )
          ) : (
            <FeedbackPanel
              key={`fb-${phase}`}
              phase={phase}
              feedback={result?.feedback}
              explanation={explanation}
              xp={mode === 'lesson' && !ungraded ? (awarded ?? (attempt === 0 ? XP.firstTry : XP.retry)) : undefined}
              actions={
                phase === 'incorrect' ? (
                  <div className="fb__actions">
                    <Button variant="secondary" size="lg" onClick={reveal} icon={<Eye size={18} strokeWidth={2.6} />}>
                      Show answer
                    </Button>
                    <Button variant="retry" size="lg" onClick={retry} icon={<RotateCcw size={18} strokeWidth={2.8} />} className="fb__grow">
                      Try again
                    </Button>
                  </div>
                ) : (
                  <Button block variant={phase === 'correct' ? 'good' : 'primary'} onClick={next} iconRight={<ArrowRight size={20} strokeWidth={3} />}>
                    Continue
                  </Button>
                )
              }
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
