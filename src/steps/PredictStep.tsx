import { motion } from 'motion/react'
import { Check, SquareTerminal, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { PredictStep as T } from '../core/types'
import { Rich } from '../ui/Rich'
import { Code } from '../ui/code/Code'
import type { StepProps } from './types'
import { Hint } from './Hint'
import './steps.css'
import './PredictStep.css'

/* ------------------------------------------------------------ grading */

const lines = (s: string) => s.replace(/\r\n?/g, '\n').trim().split('\n')

/** strict-ish: trim, unify line endings, trim each line, collapse runs of spaces, case-insensitive */
export function normalizeOutput(s: string): string {
  return lines(s)
    .map((l) => l.trim().replace(/[ \t ]+/g, ' '))
    .join('\n')
    .toLowerCase()
}

const QUOTED = /^(['"`])(.*)\1$/

/**
 * lenient: also forgives surrounding quotes on a line, quote style ("a" vs 'a')
 * and spacing around punctuation ([1,2] vs [1, 2]).
 */
function loose(s: string): string {
  return normalizeOutput(s)
    .split('\n')
    .map((l) =>
      l
        .replace(QUOTED, '$2')
        .replace(/"/g, "'")
        .replace(/\s*([,:;()[\]{}])\s*/g, '$1'),
    )
    .join('\n')
}

export type PredictGrade = 'exact' | 'loose' | 'wrong'

export function gradeOutput(input: string, answers: string[]): PredictGrade {
  const n = normalizeOutput(input)
  if (answers.some((a) => normalizeOutput(a) === n)) return 'exact'
  // "differ only by surrounding quotes" on the whole answer
  const unq = (s: string) => s.replace(QUOTED, '$2')
  if (answers.some((a) => unq(normalizeOutput(a)) === unq(n))) return 'exact'
  const l = loose(input)
  if (answers.some((a) => loose(a) === l)) return 'loose'
  return 'wrong'
}

/* ---------------------------------------------------------------- view */

/** last answer per step, so "Try again" lets the learner edit instead of retyping */
const memory = new Map<string, string>()

export default function PredictStep({ step, phase, attempt, setController, onHint, lessonId, mode }: StepProps<T>) {
  const memKey = `${lessonId ?? mode}:${step.id}`
  const [text, setText] = useState(() => (attempt > 0 ? (memory.get(memKey) ?? '') : ''))
  const ta = useRef<HTMLTextAreaElement>(null)
  const locked = phase !== 'answer'

  useEffect(() => {
    memory.set(memKey, text)
  }, [memKey, text])

  // retry: put the caret back at the end of the previous answer
  useEffect(() => {
    const el = ta.current
    if (attempt === 0 || !el) return
    el.focus({ preventScroll: true })
    el.setSelectionRange(el.value.length, el.value.length)
  }, [attempt])

  // drop the keyboard once graded so the feedback panel is visible
  useEffect(() => {
    if (locked) ta.current?.blur()
  }, [locked])
  const grade = useMemo(() => gradeOutput(text, step.answers), [text, step.answers])
  const expected = step.answers[0] ?? ''
  const expectedLines = lines(expected).length

  useEffect(() => {
    setController({
      ready: text.trim().length > 0,
      check: () => {
        if (grade === 'exact') return { correct: true }
        if (grade === 'loose') return { correct: true, feedback: 'Close enough. The exact output is below.' }
        const got = lines(text).length
        if (got !== expectedLines)
          return { correct: false, feedback: `It prints ${expectedLines === 1 ? 'one line' : `${expectedLines} lines`}, not ${got}.` }
        return { correct: false }
      },
    })
  }, [text, grade, expectedLines, setController])

  // grow with content (and re-measure when the width changes, e.g. rotation)
  useLayoutEffect(() => {
    const el = ta.current
    if (!el) return
    const fit = () => {
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [text])

  const state = phase === 'answer' ? 'answer' : phase === 'correct' ? 'correct' : 'incorrect'
  const showExpected = phase === 'revealed' || (phase === 'correct' && grade === 'loose')
  const label = phase === 'revealed' ? 'Your answer' : 'Output'

  return (
    <div className="step predict">
      {step.eyebrow && <div className="eyebrow step__eyebrow">{step.eyebrow}</div>}
      <Rich text={step.prompt} className="step__prompt" />
      <Code code={step.code} lang={step.lang} />

      <motion.div
        className={`predict__term predict__term--${state}`}
        animate={phase === 'incorrect' ? { x: [0, -7, 7, -5, 5, -2, 0] } : phase === 'correct' ? { scale: [1, 1.02, 1] } : { x: 0, scale: 1 }}
        transition={{ duration: phase === 'incorrect' ? 0.42 : 0.3 }}
        onClick={() => !locked && ta.current?.focus()}
      >
        <div className="predict__bar">
          <SquareTerminal size={15} strokeWidth={2.4} />
          <label htmlFor={`predict-${step.id}`} className="predict__label">
            {label}
          </label>
          {phase === 'answer' && (
            <span id={`predict-${step.id}-tip`} className="predict__keys">
              <kbd>return</kbd> new line
            </span>
          )}
          {phase !== 'answer' && (
            <motion.span
              className={`predict__badge predict__badge--${state}`}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 600, damping: 18 }}
            >
              {phase === 'correct' ? <Check size={13} strokeWidth={3.4} /> : <X size={13} strokeWidth={3.4} />}
            </motion.span>
          )}
        </div>
        <textarea
          id={`predict-${step.id}`}
          ref={ta}
          className="predict__input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          readOnly={locked}
          rows={1}
          placeholder="Type what it prints"
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="enter"
          aria-describedby={phase === 'answer' ? `predict-${step.id}-tip` : undefined}
        />
      </motion.div>

      {showExpected && (
        <motion.div
          className="predict__term predict__term--expected"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32, delay: 0.1 }}
        >
          <div className="predict__bar">
            <SquareTerminal size={15} strokeWidth={2.4} />
            <span className="predict__label">{phase === 'revealed' ? 'Expected output' : 'Exact output'}</span>
            <span className="predict__badge predict__badge--correct">
              <Check size={13} strokeWidth={3.4} />
            </span>
          </div>
          <pre className="predict__out">{expected.replace(/\r\n?/g, '\n').replace(/^\n+|\s+$/g, '')}</pre>
        </motion.div>
      )}

      {step.hint && phase === 'answer' && <Hint text={step.hint} attempt={attempt} onOpen={onHint} />}
    </div>
  )
}
