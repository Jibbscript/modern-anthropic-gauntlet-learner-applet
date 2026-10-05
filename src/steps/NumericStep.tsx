import { AnimatePresence, motion } from 'motion/react'
import { ArrowDown, ArrowUp, Check, Equal } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { NumericStep as T } from '../core/types'
import { Rich } from '../ui/Rich'
import { haptic, sfx } from '../ui/fx'
import type { StepProps } from './types'
import { Hint } from './Hint'
import './steps.css'
import './NumericStep.css'

/* ------------------------------------------------------------- parsing */

const MULT: Record<string, number> = {
  k: 1e3,
  thousand: 1e3,
  m: 1e6,
  mm: 1e6,
  mn: 1e6,
  mil: 1e6,
  million: 1e6,
  b: 1e9,
  bn: 1e9,
  g: 1e9,
  billion: 1e9,
  t: 1e12,
  tn: 1e12,
  trillion: 1e12,
}
const BYTE_MULT: Record<string, number> = { kb: 1e3, mb: 1e6, gb: 1e9, tb: 1e12, pb: 1e15 }

const NUM = String.raw`[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?`
const RE_POW = new RegExp(String.raw`^(${NUM})(?:\^|\*\*)([+-]?\d+(?:\.\d+)?)$`)
const RE_FRAC = new RegExp(String.raw`^(${NUM})/(${NUM})$`)
const RE_NUM = new RegExp(String.raw`^(${NUM})(?:[x*]10(?:\^|\*\*)([+-]?\d+))?([a-z]+)?$`)

/**
 * Lenient number reader for estimates: "1,200", "1 200", "1.2k", "3M",
 * "4e6", "2.5b", "1.5 million", "2^20", "10**6", "1/16", "25%", "~800",
 * and the step's own unit typed after the number ("500 ms").
 */
export function parseNumber(input: string, unit?: string): number | null {
  let s = input.trim().toLowerCase().replace(/[−–—]/g, '-').replace(/[×✕]/g, 'x')
  if (!s) return null
  const u = unit?.trim().toLowerCase()
  if (u && u !== '%' && s.length > u.length && s.endsWith(u)) s = s.slice(0, -u.length)
  s = s
    .replace(/^(?:~|≈|about|approx\.?|roughly)/, '')
    .replace(/[$€£¥]/g, '')
    .replace(/\s+/g, '')
    .replace(/[_'’]/g, '')
  let pct = false
  if (s.endsWith('%')) {
    s = s.slice(0, -1)
    pct = u !== '%' // "25%" means 0.25 unless the answer is itself in percent
  }
  if (s.includes(',')) {
    const head = /^[+-]?[\d,]+/.exec(s)?.[0] ?? ''
    if (/^[+-]?\d{1,3}(,\d{3})+$/.test(head)) s = s.replace(/,/g, '')
    else if (/^[+-]?\d+,\d+$/.test(head) && !s.includes('.')) s = s.replace(',', '.') // decimal comma
    else return null
  }
  let v: number
  let m: RegExpExecArray | null
  if ((m = RE_POW.exec(s))) v = Math.pow(Number(m[1]), Number(m[2]))
  else if ((m = RE_FRAC.exec(s))) v = Number(m[1]) / Number(m[2])
  else if ((m = RE_NUM.exec(s))) {
    v = Number(m[1])
    if (m[2]) v *= Math.pow(10, Number(m[2]))
    if (m[3]) {
      const k = MULT[m[3]] ?? (u && /byte|^b$/.test(u) ? BYTE_MULT[m[3]] : undefined)
      if (k == null) return null
      v *= k
    }
  } else return null
  if (pct) v /= 100
  return Number.isFinite(v) ? v : null
}

/* ---------------------------------------------------------- formatting */

const trimZeros = (s: string) => s.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')

/** thousands separators, sensible decimals, scientific only for extremes */
export function fmtNum(n: number): string {
  const abs = Math.abs(n)
  if (abs !== 0 && (abs < 1e-6 || abs >= 1e21)) return n.toExponential(2).replace(/\.?0+e/, 'e')
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: abs >= 100 ? 2 : abs >= 1 ? 4 : 8 }).format(n)
}

/** n rounded to `sig` significant digits, then formatted */
const fmtSig = (n: number, sig = 3) => fmtNum(Number(n.toPrecision(sig)))

export function fmtPct(p: number): string {
  if (p < 0.1) return '0.1%'
  if (p < 10) return `${trimZeros(p.toFixed(1))}%`
  return `${Math.round(p)}%`
}

function fmtRatio(r: number): string {
  if (r < 10) return trimZeros(r.toFixed(1))
  if (r < 1000) return String(Math.round(r))
  return fmtNum(Number(r.toPrecision(2)))
}

/** "8 billion" style gloss for big numbers */
function compactWords(n: number): string | null {
  if (Math.abs(n) < 1e6) return null
  return new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'long', maximumSignificantDigits: 3 }).format(n)
}

/* ------------------------------------------------------------- grading */

export interface NumericVerdict {
  correct: boolean
  /** relative error (absolute error when the answer is 0) */
  err: number
  dir: 'high' | 'low' | 'exact'
  /** "about 3×" / "about 40%" */
  far: string | null
}

export function judge(x: number, answer: number, tolerance = 0.01): NumericVerdict {
  const err = answer === 0 ? Math.abs(x) : Math.abs(x - answer) / Math.abs(answer)
  const correct = err <= tolerance + 1e-9
  const dir = x === answer ? 'exact' : x > answer ? 'high' : 'low'
  let far: string | null = null
  if (answer !== 0 && x !== 0 && Math.sign(x) === Math.sign(answer)) {
    const r = Math.abs(x / answer)
    const big = r >= 1 ? r : 1 / r
    far = big < 1.95 ? `about ${fmtPct(err * 100)}` : `about ${fmtRatio(big)}×`
  }
  return { correct, err, dir, far }
}

/* ---------------------------------------------------------------- view */

const MAGS = [
  { s: 'K', word: 'thousand' },
  { s: 'M', word: 'million' },
  { s: 'B', word: 'billion' },
] as const
const SUFFIX = /\s*([kmbt])$/i

export default function NumericStep({ step, phase, attempt, setController, onHint }: StepProps<T>) {
  const [raw, setRaw] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const locked = phase !== 'answer'
  const tol = step.tolerance ?? 0.01
  const unit = step.unit?.trim() || undefined
  const value = useMemo(() => parseNumber(raw, unit), [raw, unit])
  const verdict = useMemo(() => (value == null ? null : judge(value, step.answer, tol)), [value, step.answer, tol])
  const withUnit = (n: string) => (unit ? `${n} ${unit}` : n)

  useEffect(() => {
    setController({
      ready: value != null,
      check: () => {
        const v = judge(value ?? NaN, step.answer, tol)
        const target = unit ? `${fmtNum(step.answer)} ${unit}` : fmtNum(step.answer)
        if (v.correct) return { correct: true, feedback: v.err < 1e-9 ? `Exactly ${target}.` : `Within ${fmtPct(v.err * 100)} of ${target}.` }
        const dir = v.dir === 'high' ? 'high' : 'low'
        return { correct: false, feedback: v.far ? `${v.far[0].toUpperCase()}${v.far.slice(1)} too ${dir}.` : `Too ${dir}.` }
      },
    })
  }, [value, step.answer, tol, unit, setController])

  const suffix = SUFFIX.exec(raw)?.[1]?.toUpperCase()
  const base = raw.replace(SUFFIX, '')
  const baseOk = base.trim() !== '' && parseNumber(base) != null
  const applyMag = (s: string) => {
    if (locked || !baseOk) return
    sfx('select')
    haptic('light')
    setRaw(suffix === s ? base : `${base}${s}`)
    input.current?.focus({ preventScroll: true })
  }

  const len = (raw || '0').length + (unit ? Math.ceil(unit.length * 0.45) : 0)
  const size = len <= 7 ? 'xl' : len <= 10 ? 'lg' : len <= 14 ? 'md' : 'sm'
  const fieldState = phase === 'answer' ? 'answer' : phase === 'correct' ? 'correct' : 'incorrect'
  const plain = value != null && /^[+-]?\d+(\.\d+)?$/.test(raw.trim())
  const words = compactWords(step.answer)

  let status: React.ReactNode
  if (phase === 'answer') {
    status = !raw.trim() ? (
      <span className="numeric__help">
        Shorthand works: <b>1.2k</b>, <b>3M</b>, <b>4e6</b>, <b>1/16</b>
      </span>
    ) : value == null ? (
      <span className="numeric__help numeric__help--warn">Can’t read that as a number yet</span>
    ) : plain ? (
      <span className="numeric__help">{compactWords(value) ? `≈ ${compactWords(value)}` : ' '}</span>
    ) : (
      <span className="numeric__help numeric__help--eq">
        <Equal size={14} strokeWidth={3} />
        <span className="tabular">{withUnit(fmtNum(value))}</span>
      </span>
    )
  } else if (phase === 'correct' && verdict) {
    status = (
      <span className="chip chip--good numeric__verdict">
        <Check size={14} strokeWidth={3.2} />
        {verdict.err < 1e-9 ? 'Exact' : `Within ${fmtPct(verdict.err * 100)}`}
      </span>
    )
  } else if (verdict) {
    const Up = verdict.dir === 'high' ? ArrowUp : ArrowDown
    status = (
      <span className="chip chip--bad numeric__verdict">
        <Up size={14} strokeWidth={3.2} />
        Too {verdict.dir === 'high' ? 'high' : 'low'}
        {verdict.far && <span className="numeric__far">{verdict.far}</span>}
      </span>
    )
  }

  return (
    <div className="step numeric">
      {step.eyebrow && <div className="eyebrow step__eyebrow">{step.eyebrow}</div>}
      <Rich text={step.prompt} className="step__prompt" />

      <div className="numeric__stack">
        <motion.div
          className={`numeric__field numeric__field--${fieldState} numeric__field--${size}`}
          animate={phase === 'incorrect' ? { x: [0, -8, 8, -6, 6, -2, 0] } : phase === 'correct' ? { scale: [1, 1.04, 1] } : { x: 0, scale: 1 }}
          transition={{ duration: phase === 'incorrect' ? 0.42 : 0.34 }}
          onClick={() => !locked && input.current?.focus()}
        >
          <span className="numeric__grow" data-value={raw || '0'}>
            <input
              ref={input}
              id={`numeric-${step.id}`}
              className="numeric__input tabular"
              type="text"
              inputMode="decimal"
              enterKeyHint="done"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="0"
              value={raw}
              readOnly={locked}
              onChange={(e) => setRaw(e.target.value)}
              aria-label={unit ? `Your answer, in ${unit}` : 'Your answer'}
              aria-invalid={raw.trim() !== '' && value == null}
              aria-describedby={`numeric-${step.id}-status`}
            />
          </span>
          {unit && <span className="numeric__unit">{unit}</span>}
        </motion.div>

        <div id={`numeric-${step.id}-status`} className="numeric__status" aria-live="polite">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={phase === 'answer' ? `a:${!raw.trim() ? 'empty' : value == null ? 'bad' : plain ? 'plain' : 'eq'}` : phase}
              className="numeric__status-inner"
              initial={{ opacity: 0, y: 6, scale: phase === 'answer' ? 1 : 0.7 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.08 } }}
              transition={{ type: 'spring', stiffness: 560, damping: phase === 'answer' ? 36 : 20 }}
            >
              {status}
            </motion.span>
          </AnimatePresence>
        </div>

        {phase === 'answer' && (
          <div className="numeric__mags" role="group" aria-label="Multiply by">
            {MAGS.map((m) => (
              <motion.button
                key={m.s}
                type="button"
                className={['numeric__mag', suffix === m.s && 'numeric__mag--on'].filter(Boolean).join(' ')}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => applyMag(m.s)}
                disabled={!baseOk}
                aria-pressed={suffix === m.s}
                aria-label={`Times one ${m.word}`}
                whileTap={baseOk ? { y: 2 } : undefined}
              >
                <b>{m.s}</b>
                <span>{m.word}</span>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {phase === 'revealed' && (
        <motion.div
          className="numeric__answer"
          initial={{ opacity: 0, y: 14, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 420, damping: 28, delay: 0.08 }}
        >
          <span className="eyebrow numeric__answer-label">Answer</span>
          <span className="numeric__answer-val tabular">
            {fmtNum(step.answer)}
            {unit && <span className="numeric__unit numeric__unit--good">{unit}</span>}
          </span>
          {words && <span className="numeric__answer-sub">≈ {words}</span>}
          {tol > 0 && (
            <span className="numeric__answer-sub">
              Anything from <b className="tabular">{fmtSig(step.answer * (1 - tol))}</b> to <b className="tabular">{fmtSig(step.answer * (1 + tol))}</b> counts
            </span>
          )}
        </motion.div>
      )}

      {phase === 'correct' && verdict && verdict.err >= 1e-9 && (
        <motion.div className="numeric__exact" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          Exact answer: <b className="tabular">{withUnit(fmtNum(step.answer))}</b>
        </motion.div>
      )}

      {step.hint && phase === 'answer' && <Hint text={step.hint} attempt={attempt} onOpen={onHint} />}
    </div>
  )
}
