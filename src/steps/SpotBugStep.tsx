import { motion } from 'motion/react'
import { Wrench } from 'lucide-react'
import { useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import type { SpotBugStep as T } from '../core/types'
import { Rich } from '../ui/Rich'
import { Code } from '../ui/code/Code'
import { haptic, sfx } from '../ui/fx'
import type { StepProps } from './types'
import { Hint } from './Hint'
import './steps.css'
import './SpotBugStep.css'

type LineState = 'idle' | 'selected' | 'correct' | 'incorrect' | 'reveal' | 'dim'

/** 1-based line numbers in `b` that are not part of the longest common subsequence with `a` */
export function changedLines(a: string[], b: string[]): Set<number> {
  const A = a.map((l) => l.trimEnd())
  const B = b.map((l) => l.trimEnd())
  const n = A.length
  const m = B.length
  const dp = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
  const out = new Set<number>()
  let i = 0
  let j = 0
  while (j < m) {
    if (i < n && A[i] === B[j]) {
      i++
      j++
    } else if (i < n && dp[i + 1][j] >= dp[i][j + 1]) i++
    else out.add(++j)
  }
  return out
}

/** remembered selection, so "Try again" keeps the lines that were right */
const memory = new Map<string, number[]>()

const list = (ns: number[]) => (ns.length === 1 ? String(ns[0]) : `${ns.slice(0, -1).join(', ')} and ${ns[ns.length - 1]}`)

export default function SpotBugStep({ step, phase, attempt, setController, onHint, lessonId, mode }: StepProps<T>) {
  const memKey = `${lessonId ?? mode}:${step.id}`
  const [sel, setSel] = useState<number[]>(() => (attempt > 0 ? (memory.get(memKey) ?? []).filter((n) => step.bugLines.includes(n)) : []))
  const locked = phase !== 'answer'
  const lines = useMemo(() => step.code.replace(/\s+$/, '').split('\n'), [step.code])
  const bugs = useMemo(() => new Set(step.bugLines), [step.bugLines])
  const need = bugs.size
  const multi = need > 1
  // blank lines can't hold a bug, so they aren't targets (unless the author marked one)
  const blankTargets = useMemo(() => step.bugLines.some((n) => !lines[n - 1]?.trim()), [step.bugLines, lines])
  const tappable = (n: number) => blankTargets || !!lines[n - 1]?.trim()

  useEffect(() => {
    memory.set(memKey, sel)
  }, [memKey, sel])

  useEffect(() => {
    setController({
      ready: sel.length > 0,
      check: () => {
        const wrong = sel.filter((n) => !bugs.has(n)).sort((a, b) => a - b)
        const found = sel.filter((n) => bugs.has(n)).length
        if (!wrong.length && found === need) return { correct: true }
        const parts: string[] = []
        if (wrong.length) parts.push(wrong.length === 1 ? `Line ${wrong[0]} is fine.` : `Lines ${list(wrong)} are fine.`)
        if (multi && found < need) parts.push(`You found ${found} of ${need}.`)
        return { correct: false, feedback: parts.join(' ') || undefined }
      },
    })
  }, [sel, bugs, need, multi, setController])

  const toggle = (n: number) => {
    if (locked || !tappable(n)) return
    sfx('select')
    haptic('light')
    setSel((s) => (s.includes(n) ? s.filter((x) => x !== n) : multi ? [...s, n] : [n]))
  }

  const stateOf = (n: number): LineState => {
    const on = sel.includes(n)
    const bug = bugs.has(n)
    if (phase === 'answer') return on ? 'selected' : 'idle'
    if (phase === 'correct') return bug ? 'correct' : 'dim'
    if (phase === 'incorrect') return on ? (bug ? 'correct' : 'incorrect') : 'idle'
    return bug ? 'reveal' : on ? 'incorrect' : 'dim'
  }

  const lineProps = (n: number) => {
    const state = stateOf(n)
    const tap = !locked && tappable(n)
    const cls = ['spotbug__line', `spotbug__line--${state}`, tap && 'spotbug__line--tap'].filter(Boolean).join(' ')
    if (!tap) return { className: cls }
    return {
      className: cls,
      role: 'button',
      tabIndex: 0,
      'aria-pressed': state === 'selected',
      'aria-label': `Line ${n}: ${lines[n - 1].trim()}`,
      onClick: () => toggle(n),
      onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key !== 'Enter' && e.key !== ' ') return
        // keep Enter from also reaching the runner's global "Check" shortcut
        e.preventDefault()
        e.stopPropagation()
        toggle(n)
      },
    }
  }

  const fixChanged = useMemo(() => {
    if (!step.fix) return new Set<number>()
    if (step.fix.highlight?.length) return new Set(step.fix.highlight)
    return changedLines(lines, step.fix.code.replace(/\s+$/, '').split('\n'))
  }, [step.fix, lines])

  const showFix = !!step.fix && (phase === 'revealed' || phase === 'correct')
  const instr = multi ? `Tap the ${need} lines with the bug` : 'Tap the line with the bug'

  return (
    <div className="step spotbug">
      {step.eyebrow && <div className="eyebrow step__eyebrow">{step.eyebrow}</div>}
      <Rich text={step.prompt} className="step__prompt" />

      <div className="spotbug__instr">
        <span className="step__instructions">{instr}</span>
        {multi && phase === 'answer' && (
          <motion.span
            key={sel.length}
            className={['chip', 'spotbug__count', sel.length === need && 'spotbug__count--full'].filter(Boolean).join(' ')}
            initial={{ scale: 0.85 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 600, damping: 20 }}
            aria-live="polite"
          >
            {sel.length} of {need} selected
          </motion.span>
        )}
      </div>

      <motion.div
        className="spotbug__frame"
        animate={phase === 'incorrect' ? { x: [0, -7, 7, -5, 5, -2, 0] } : phase === 'correct' ? { scale: [1, 1.015, 1] } : { x: 0, scale: 1 }}
        transition={{ duration: phase === 'incorrect' ? 0.42 : 0.3 }}
      >
        <Code code={step.code} lang={step.lang} className="spotbug__code" lineProps={lineProps} />
      </motion.div>

      {showFix && step.fix && (
        <motion.section
          className="spotbug__fix"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32, delay: 0.12 }}
          aria-label="Fixed code"
        >
          <div className="spotbug__fix-label">
            <span className="spotbug__fix-icon">
              <Wrench size={13} strokeWidth={2.8} />
            </span>
            <span className="eyebrow">Fixed</span>
          </div>
          <Code
            code={step.fix.code}
            lang={step.fix.lang ?? step.lang}
            caption={step.fix.caption}
            className="spotbug__fixcode"
            lineProps={(n) => (fixChanged.has(n) ? { className: 'spotbug__fixline' } : {})}
          />
        </motion.section>
      )}

      {step.hint && phase === 'answer' && <Hint text={step.hint} attempt={attempt} onOpen={onHint} />}
    </div>
  )
}
