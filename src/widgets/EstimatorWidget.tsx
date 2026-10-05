import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { CircleCheck, ClipboardList, Eye, Lightbulb, Minus, Plus, RotateCcw, Target } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { Button } from '../ui/Button'
import { Ticker } from '../ui/Ticker'
import { haptic, sfx } from '../ui/fx'
import type { EstimatorConfig, WidgetProps } from './specs'
import {
  DEFAULT_INPUTS,
  RANGES,
  derive,
  formatBytes,
  formatCount,
  formatInput,
  logStops,
  nearestStop,
  parseAnswer,
  within,
  type InputKey,
  type Inputs,
  type MetricKey,
} from './estimator/model'
import './EstimatorWidget.css'

const KEYS: InputKey[] = ['dau', 'reqPerUser', 'tokensPerReq', 'peak', 'bytesPerVersion']
const INPUT_LABEL: Record<InputKey, string> = {
  dau: 'Daily active users',
  reqPerUser: 'Requests per user / day',
  tokensPerReq: 'Tokens per request',
  peak: 'Peak factor',
  bytesPerVersion: 'Bytes per stored version',
}

const METRICS: { key: MetricKey; label: string; unit: string; formula: string; wide?: boolean }[] = [
  { key: 'avgQps', label: 'Avg QPS', unit: 'req/s', formula: 'DAU × req ÷ 86,400' },
  { key: 'peakQps', label: 'Peak QPS', unit: 'req/s', formula: 'avg × peak' },
  { key: 'tokensPerSec', label: 'Tokens/sec', unit: 'tok/s, avg', formula: 'avg QPS × tokens per request', wide: true },
  { key: 'storagePerDay', label: 'Storage/day', unit: '', formula: 'DAU × req × bytes' },
  { key: 'storagePerYear', label: 'Storage/year', unit: '', formula: 'per day × 365' },
]

// placeholders show the accepted formats only; a plausible-looking number here would give answers away
const QUESTION: Record<MetricKey, { goal: string; q: string; unit: string; hint: string; placeholder: string }> = {
  avgQps: { goal: 'find the average QPS', q: 'What’s the average QPS?', unit: 'req/s', hint: 'Average QPS = DAU × requests per user ÷ 86,400 seconds.', placeholder: 'a number, or 1.2k' },
  peakQps: { goal: 'find the peak QPS', q: 'What’s the peak QPS?', unit: 'req/s', hint: 'Peak QPS = average QPS × the peak factor.', placeholder: 'a number, or 1.2k' },
  tokensPerSec: { goal: 'find tokens per second', q: 'How many tokens per second, on average?', unit: 'tok/s', hint: 'Tokens per second = average QPS × tokens per request.', placeholder: 'a number, or 1.2M' },
  storagePerDay: { goal: 'find storage per day', q: 'How much new storage per day?', unit: 'per day', hint: 'Storage per day = DAU × requests per user × bytes per version.', placeholder: 'with a unit: KB, MB, GB…' },
  storagePerYear: { goal: 'find storage per year', q: 'How much storage per year?', unit: 'per year', hint: 'Storage per year = storage per day × 365.', placeholder: 'with a unit: GB, TB…' },
}

const isBytes = (k: MetricKey) => k === 'storagePerDay' || k === 'storagePerYear'
const fmtMetric = (k: MetricKey) => (isBytes(k) ? formatBytes : formatCount)

function useReduced(): boolean {
  const pref = useReducedMotion()
  return !!pref || (typeof document !== 'undefined' && document.documentElement.dataset.reduceMotion === 'true')
}

type Feedback = { tone: 'good' | 'retry' | 'neutral'; text: string } | null

export default function EstimatorWidget({ config, onComplete }: WidgetProps<EstimatorConfig>) {
  const reduce = useReduced()
  const uid = useId()
  const presetKey = JSON.stringify(config.preset ?? null)
  const preset = useMemo(() => {
    const p = (JSON.parse(presetKey) ?? {}) as Partial<Inputs>
    const out = { ...DEFAULT_INPUTS }
    for (const k of KEYS) if (Number.isFinite(p[k]) && (p[k] as number) > 0) out[k] = p[k] as number
    return out
  }, [presetKey])
  // log-scale stops per slider; an off-grid preset value becomes a stop of its own
  const stops = useMemo(() => Object.fromEntries(KEYS.map((k) => [k, logStops(RANGES[k][0], RANGES[k][1], [preset[k]])])) as Record<InputKey, number[]>, [preset])
  const initialIdx = useMemo(() => Object.fromEntries(KEYS.map((k) => [k, nearestStop(stops[k], preset[k])])) as Record<InputKey, number>, [stops, preset])

  const target = config.target && Number.isFinite(config.target.value) && METRICS.some((m) => m.key === config.target!.metric) ? config.target : undefined
  const goal: 'answer' | 'explore' = target && config.goal !== 'explore' ? 'answer' : 'explore'

  const [idx, setIdx] = useState(initialIdx)
  const [touched, setTouched] = useState<InputKey[]>([])
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [misses, setMisses] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [reached, setReached] = useState(false)
  const [shake, setShake] = useState(0)
  const firedRef = useRef(false)

  // new preset from config: start over
  useEffect(() => {
    setIdx(initialIdx)
  }, [initialIdx])

  const inputs = useMemo(() => Object.fromEntries(KEYS.map((k) => [k, stops[k][idx[k]]])) as unknown as Inputs, [idx, stops])
  const d = useMemo(() => derive(inputs), [inputs])
  const matches = target ? within(d[target.metric], target.value) : false

  function complete() {
    if (firedRef.current) return
    firedRef.current = true
    setReached(true)
    sfx('correct')
    haptic('success')
    onComplete(true)
  }

  function set(k: InputKey, i: number) {
    const n = Math.max(0, Math.min(stops[k].length - 1, i))
    if (n === idx[k]) return
    setIdx((cur) => ({ ...cur, [k]: n }))
    if (!touched.includes(k)) {
      const t = [...touched, k]
      setTouched(t)
      // explore: playing with two different sliders is the point
      if (goal === 'explore' && t.length >= 2) complete()
    }
  }

  function check(e?: FormEvent) {
    e?.preventDefault()
    if (!target || reached) return
    const p = parseAnswer(answer)
    if (!p) {
      setFeedback({ tone: 'retry', text: 'Type a number, like 450, 1.2k or 3M.' })
      setShake((n) => n + 1)
      return
    }
    const m = target.metric
    // a bare number is ambiguous for storage (2 what?): ask for a unit without counting a miss
    if (isBytes(m) && !p.bytes) {
      setFeedback({ tone: 'retry', text: 'Add a unit: KB, MB, GB or TB.' })
      setShake((n) => n + 1)
      return
    }
    if (within(p.value, target.value)) {
      setFeedback({ tone: 'good', text: `Correct. About ${fmtMetric(m)(target.value)} ${QUESTION[m].unit}.` })
      complete()
      return
    }
    const nextMisses = misses + 1
    setMisses(nextMisses)
    setShake((n) => n + 1)
    sfx('wrong')
    haptic('error')
    let nudge: string
    const off = p.value / target.value
    if (isBytes(m) && [1e3, 1e6, 1e-3, 1e-6].some((k) => within(off * k, 1))) nudge = 'Right digits, wrong unit. 1 KB = 1,000 bytes, 1 MB = 1,000 KB, 1 GB = 1,000 MB.'
    else if (m === 'peakQps' && within(p.value, d.avgQps) && matches) nudge = 'That’s the average. Peak QPS = average × the peak factor.'
    else if (!matches) nudge = 'First set every slider to the scenario’s numbers, then follow the chain.'
    else nudge = QUESTION[m].hint
    setFeedback({ tone: 'retry', text: `Not quite. ${nudge}` })
  }

  function reveal() {
    if (!target) return
    setRevealed(true)
    setFeedback({ tone: 'neutral', text: `${QUESTION[target.metric].hint} For the scenario that’s about ${fmtMetric(target.metric)(target.value)}. Type it in to finish.` })
  }

  function reset() {
    setIdx(initialIdx)
    if (!reached) {
      setAnswer('')
      setFeedback(null)
    }
  }

  const changed = KEYS.some((k) => idx[k] !== initialIdx[k]) || (!reached && answer !== '')
  const goalText = goal === 'answer' ? `Goal: ${QUESTION[target!.metric].goal} for the scenario` : 'Goal: move two sliders and watch the chain'
  const reachedText = goal === 'answer' ? 'Goal reached: estimate within 25%' : 'Goal reached: you moved the model'

  return (
    <div className="est">
      <AnimatePresence mode="wait" initial={false}>
        {reached ? (
          <motion.div key="done" className="w-goal est-goal" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 520, damping: 18 }}>
            <CircleCheck size={18} strokeWidth={2.6} />
            {reachedText}
          </motion.div>
        ) : (
          <motion.div key="todo" className="w-goal est-goal est-goal--todo" exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.12 }}>
            <Target size={16} strokeWidth={2.6} />
            {goalText}
          </motion.div>
        )}
      </AnimatePresence>

      {config.scenario && (
        <section className="est-scenario">
          <ClipboardList size={18} strokeWidth={2.4} />
          <p>{config.scenario}</p>
        </section>
      )}

      {/* inputs */}
      <section className="est-inputs" aria-label="Assumptions">
        <header className="est-head">
          <span className="w-label">Assumptions</span>
          <AnimatePresence>
            {target && matches && !reached && (
              <motion.span
                key="match"
                className="est-match"
                initial={reduce ? false : { opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ type: 'spring', stiffness: 600, damping: 22 }}
              >
                <CircleCheck size={13} strokeWidth={2.8} />
                matches scenario
              </motion.span>
            )}
          </AnimatePresence>
        </header>
        {KEYS.map((k) => {
          const list = stops[k]
          const i = idx[k]
          const fill = list.length > 1 ? (i / (list.length - 1)) * 100 : 0
          const id = `${uid}-${k}`
          return (
            <div key={k} className="est-slider">
              <div className="est-slider__top">
                <label htmlFor={id} className="est-slider__label">
                  {INPUT_LABEL[k]}
                </label>
                <span className="est-slider__value tabular">{formatInput(k, list[i])}</span>
              </div>
              <div className="est-slider__row">
                <motion.button type="button" className="est-nudge" aria-label={`Decrease ${INPUT_LABEL[k]}`} whileTap={{ scale: 0.9 }} onClick={() => set(k, i - 1)} disabled={i === 0}>
                  <Minus size={16} strokeWidth={3} />
                </motion.button>
                <input
                  id={id}
                  type="range"
                  className="w-slider est-range"
                  min={0}
                  max={list.length - 1}
                  step={1}
                  value={i}
                  aria-valuetext={formatInput(k, list[i])}
                  style={{ ['--fill' as string]: `${fill}%` } as CSSProperties}
                  onChange={(e) => set(k, Number(e.target.value))}
                />
                <motion.button type="button" className="est-nudge" aria-label={`Increase ${INPUT_LABEL[k]}`} whileTap={{ scale: 0.9 }} onClick={() => set(k, i + 1)} disabled={i === list.length - 1}>
                  <Plus size={16} strokeWidth={3} />
                </motion.button>
              </div>
            </div>
          )
        })}
      </section>

      {/* derived */}
      <section className="est-derived" aria-label="Derived">
        <header className="est-head">
          <span className="w-label">Derived</span>
          <span className="est-head__note">1 day = 86,400 s</span>
        </header>
        <div className="est-grid">
          {METRICS.map((m) => {
            // the metric being asked about stays masked until it is answered (only when there is a question)
            const hidden = goal === 'answer' && target?.metric === m.key && !reached && !revealed
            const isTarget = goal === 'answer' && target?.metric === m.key
            return (
              <div key={m.key} className={['est-card', m.wide ? 'is-wide' : '', isTarget ? 'is-target' : '', isTarget && reached ? 'is-done' : ''].join(' ')}>
                <span className="est-card__label">{m.label}</span>
                <span className="est-card__value">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {hidden ? (
                      <motion.span key="q" className="est-card__mask" exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.12 } }} aria-label="hidden until you answer">
                        ?
                      </motion.span>
                    ) : (
                      <motion.span
                        key="v"
                        className="est-card__num"
                        initial={reduce ? false : { opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 520, damping: 20 }}
                      >
                        <Ticker value={d[m.key]} from={isTarget ? 0 : undefined} duration={reduce ? 0 : 0.5} format={fmtMetric(m.key)} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {m.unit && <span className="est-card__unit">{m.unit}</span>}
                </span>
                <span className="est-card__formula">{m.formula}</span>
              </div>
            )
          })}
        </div>
      </section>

      {/* the question */}
      {goal === 'answer' && target && (
        <form className="est-ask" onSubmit={check}>
          <label className="est-ask__q" htmlFor={`${uid}-answer`}>
            {QUESTION[target.metric].q}
          </label>
          <div className="est-ask__row">
            <motion.div
              key={shake}
              className={['est-ask__field', feedback?.tone === 'retry' ? 'is-retry' : '', reached ? 'is-good' : ''].join(' ')}
              animate={shake && !reduce ? { x: [0, -9, 9, -6, 6, -2, 0] } : { x: 0 }}
              transition={{ duration: 0.4 }}
            >
              <input
                id={`${uid}-answer`}
                className="est-ask__input"
                type="text"
                inputMode="text"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="done"
                placeholder={QUESTION[target.metric].placeholder}
                value={answer}
                disabled={reached}
                onChange={(e) => {
                  setAnswer(e.target.value)
                  if (feedback?.tone === 'retry') setFeedback(null)
                }}
              />
              <span className="est-ask__unit">{QUESTION[target.metric].unit}</span>
            </motion.div>
            <Button
              size="sm"
              variant={reached ? 'good' : 'primary'}
              type="submit"
              disabled={!reached && !answer.trim()}
              feedback={!reached}
              icon={reached ? <CircleCheck size={15} strokeWidth={2.8} /> : undefined}
              className="est-ask__check"
            >
              {reached ? 'Done' : 'Check'}
            </Button>
          </div>
          <AnimatePresence mode="popLayout" initial={false}>
            {feedback && (
              <motion.p
                key={feedback.text}
                className={`est-fb est-fb--${feedback.tone}`}
                initial={reduce ? false : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.08 } }}
                role="status"
              >
                {feedback.tone === 'good' ? <CircleCheck size={16} strokeWidth={2.6} /> : feedback.tone === 'neutral' ? <Eye size={16} strokeWidth={2.6} /> : <Lightbulb size={16} strokeWidth={2.6} />}
                <span>{feedback.text}</span>
              </motion.p>
            )}
          </AnimatePresence>
          {misses >= 2 && !reached && !revealed && (
            <Button size="sm" variant="ghost" icon={<Eye size={14} strokeWidth={2.6} />} onClick={reveal} className="est-ask__reveal">
              Show answer
            </Button>
          )}
        </form>
      )}

      <div className="est-foot">
        <span className="est-foot__note">3 significant figures · 1 KB = 1,000 bytes</span>
        <Button size="sm" variant="ghost" icon={<RotateCcw size={14} strokeWidth={2.6} />} onClick={reset} disabled={!changed}>
          Reset
        </Button>
      </div>
    </div>
  )
}
