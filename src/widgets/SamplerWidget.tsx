import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowRight, Check, CircleCheck, Eye, PartyPopper, RotateCcw, Target } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Button } from '../ui/Button'
import { haptic, sfx } from '../ui/fx'
import type { SamplerConfig, WidgetProps } from './specs'
import { checkMarks, colorSlots, eventText, eventsOf, finalEvents, normalize, spansUpTo, transitions, type MarkCheck, type TraceEvent } from './sampler/model'
import './SamplerWidget.css'

const HUES = ['blue', 'teal', 'orange', 'violet', 'rose', 'indigo', 'green', 'slate'] as const
const SPRING = { type: 'spring', stiffness: 520, damping: 30 } as const
const POP = { type: 'spring', stiffness: 560, damping: 18 } as const

function useReduced(): boolean {
  const pref = useReducedMotion()
  return !!pref || (typeof document !== 'undefined' && document.documentElement.dataset.reduceMotion === 'true')
}

function hueVars(slot: number | undefined): CSSProperties {
  const h = HUES[(slot ?? 0) % HUES.length]
  return {
    ['--f' as string]: `var(--c-${h})`,
    ['--f-edge' as string]: `var(--c-${h}-edge)`,
    ['--f-soft' as string]: `var(--c-${h}-soft)`,
    ['--f-ink' as string]: `var(--c-${h}-ink)`,
  }
}

type Side = 'end' | 'begin'
interface Wrong {
  n: number
  check: MarkCheck
}

function toggle(set: Set<number>, d: number): Set<number> {
  const n = new Set(set)
  if (n.has(d)) n.delete(d)
  else n.add(d)
  return n
}

export default function SamplerWidget({ config, onComplete }: WidgetProps<SamplerConfig>) {
  // keyed by content so an equal config from a parent re-render doesn't restart the run
  const sampleKey = JSON.stringify(config.samples ?? null)
  const samples = useMemo(() => normalize(JSON.parse(sampleKey)), [sampleKey])
  const goal = config.goal ?? 'events'
  const n = samples.length
  const trs = useMemo(() => transitions(samples), [samples])
  const slots = useMemo(() => colorSlots(samples), [samples])
  const maxDepth = Math.max(1, ...samples.map((s) => s.length))
  const reduce = useReduced()

  const [step, setStep] = useState(0)
  const [checked, setChecked] = useState(false)
  const [ends, setEnds] = useState<Set<number>>(() => new Set())
  const [begins, setBegins] = useState<Set<number>>(() => new Set())
  const [wrong, setWrong] = useState<Wrong | null>(null)
  const [fails, setFails] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [assists, setAssists] = useState(0)
  const [firstTry, setFirstTry] = useState(0)
  const nRef = useRef(0)
  const [reached, setReached] = useState(false)
  const firedRef = useRef(false)

  const done = step >= n
  const cur = done ? null : trs[step]
  /** samples whose events are already emitted */
  const cols = done ? n : step + (checked ? 1 : 0)
  const spans = useMemo(() => spansUpTo(samples, cols, done), [samples, cols, done])
  const events: TraceEvent[] = useMemo(() => [...trs.slice(0, cols).flatMap(eventsOf), ...(done ? finalEvents(samples) : [])], [trs, cols, done, samples])
  /** events from the most recent check (and the final close) get a highlight */
  const newFrom = useMemo(() => trs.slice(0, Math.max(0, cols - 1)).flatMap(eventsOf).length, [trs, cols])

  function resetState() {
    setStep(0)
    setChecked(false)
    setEnds(new Set())
    setBegins(new Set())
    setWrong(null)
    setFails(0)
    setRevealed(false)
    setAssists(0)
    setFirstTry(0)
  }
  useEffect(resetState, [samples])

  function complete() {
    if (firedRef.current) return
    firedRef.current = true
    setReached(true)
    sfx('correct')
    haptic('success')
    onComplete(true)
  }

  function tap(side: Side, d: number) {
    if (checked || done) return
    sfx('select')
    haptic('light')
    if (side === 'end') setEnds((s) => toggle(s, d))
    else setBegins((s) => toggle(s, d))
  }

  function check() {
    if (!cur || checked) return
    const r = checkMarks(cur.diff, ends, begins)
    nRef.current += 1
    if (!r.ok) {
      setWrong({ n: nRef.current, check: r })
      setFails((f) => f + 1)
      sfx('wrong')
      haptic('error')
      return
    }
    setWrong(null)
    if (revealed) setAssists((a) => a + 1)
    else if (fails === 0) setFirstTry((c) => c + 1)
    if (step === n - 1) {
      // last sample: the trace ends and everything still open closes
      setStep(n)
      setChecked(false)
      complete()
      return
    }
    setChecked(true)
    sfx('flip')
    haptic('light')
  }

  function next() {
    if (!checked) return
    setStep((s) => s + 1)
    setChecked(false)
    setEnds(new Set())
    setBegins(new Set())
    setWrong(null)
    setFails(0)
    setRevealed(false)
  }

  function showAnswer() {
    if (!cur) return
    setEnds(new Set(cur.diff.ends))
    setBegins(new Set(cur.diff.begins))
    setRevealed(true)
    setWrong(null)
  }

  /* ------------------------------------------------------------ copy */
  function nudge(c: MarkCheck): string {
    if (!cur) return ''
    if (c.extraEnds.length) {
      const d = c.extraEnds[0]
      return `${cur.prev[d]} is at the same depth in both samples, so it keeps running.`
    }
    if (c.extraBegins.length) {
      const d = c.extraBegins[0]
      return `${cur.next[d]} was already running at that depth. It continues; it doesn't begin.`
    }
    const missing = c.missingEnds.length + c.missingBegins.length
    const more = `${missing} more to mark.`
    // same name at the same depth, but a frame above it changed: it's a different call
    const twin = [...c.missingEnds, ...c.missingBegins].find((d) => cur.prev[d] !== undefined && cur.prev[d] === cur.next[d])
    if (twin !== undefined) {
      return `${cur.next[twin]} looks the same, but a frame above it changed, so it's a different call: the old one ends and a new one begins. ${more}`
    }
    if (c.missingBegins.length && c.missingBegins.some((d) => cur.prev.includes(cur.next[d]) && cur.prev[d] !== cur.next[d])) {
      return `A call at a new depth is a new frame, even with a familiar name. ${more}`
    }
    if (c.missingEnds.length) return `Compare row by row from the top. From the first row that differs, everything on the left ends. ${more}`
    return `From the first row that differs, everything on the right is new. ${more}`
  }

  const prefixText = cur ? (cur.diff.prefix === 0 ? 'no common prefix' : `common prefix: ${cur.next.slice(0, cur.diff.prefix).join(' › ')}`) : ''
  const curEvents = cur ? eventsOf(cur) : []
  const goalText = goal === 'explore' ? 'Goal: turn the samples into a trace' : "Goal: mark every sample's events"
  const doneText = 'Goal reached: every sample marked'
  const rows = cur ? Math.max(cur.prev.length, cur.next.length, 1) : 0
  const canReveal = !checked && !revealed && (goal === 'explore' || fails >= 2)
  const marksCount = ends.size + begins.size

  return (
    <div className="smp">
      <AnimatePresence mode="wait" initial={false}>
        {reached ? (
          <motion.div key="done" className="w-goal smp-goal" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={POP}>
            <CircleCheck size={18} strokeWidth={2.6} />
            <span className="smp-goal__text">{doneText}</span>
          </motion.div>
        ) : (
          <motion.div key="todo" className="w-goal smp-goal smp-goal--todo" exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.12 }}>
            <Target size={16} strokeWidth={2.6} />
            <span className="smp-goal__text">{goalText}</span>
            <span className="smp-goal__count tabular">
              {Math.min(step, n)}/{n}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------ compare panel */}
      <AnimatePresence mode="wait" initial={false}>
        {cur ? (
          <motion.section
            key={`cmp${step}`}
            className={['smp-cmp', checked ? 'is-checked' : ''].join(' ')}
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: -24 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            aria-label={`Sample ${step + 1} of ${n}`}
          >
            <div className="smp-cmp__head">
              <span className="w-label">
                Sample {step + 1} of {n}
              </span>
              <span className="smp-dots" aria-hidden>
                {samples.map((_, i) => (
                  <span key={i} className={['smp-dot', i < step || (i === step && checked) ? 'is-done' : '', i === step ? 'is-cur' : ''].join(' ')} />
                ))}
              </span>
            </div>
            <div className="smp-grid" style={{ ['--rows' as string]: rows }}>
              <div className="smp-col-head">
                <span className="smp-col-head__t tabular">{step === 0 ? 'start' : `t=${step - 1}`}</span>
                <span>before · tap ends</span>
              </div>
              <span />
              <div className="smp-col-head smp-col-head--now">
                <span className="smp-col-head__t tabular">t={step}</span>
                <span>now · tap begins</span>
              </div>
              {Array.from({ length: rows }, (_, d) => {
                const inPrefix = d < cur.diff.prefix
                return (
                  <Row
                    key={d}
                    d={d}
                    prev={cur.prev[d]}
                    next={cur.next[d]}
                    inPrefix={inPrefix}
                    checked={checked}
                    endMarked={ends.has(d)}
                    beginMarked={begins.has(d)}
                    wrongEnd={!!wrong && wrong.check.extraEnds.includes(d) && ends.has(d)}
                    wrongBegin={!!wrong && wrong.check.extraBegins.includes(d) && begins.has(d)}
                    wrongN={wrong?.n ?? 0}
                    revealed={revealed}
                    slots={slots}
                    reduce={reduce}
                    onTap={tap}
                    emptyPrev={cur.prev.length === 0 && d === 0 ? 'nothing yet' : null}
                    emptyNext={cur.next.length === 0 && d === 0 ? 'idle' : null}
                  />
                )
              })}
            </div>

            <div className="smp-feedback" aria-live="polite">
              <AnimatePresence mode="wait" initial={false}>
                {checked ? (
                  <motion.div key="ok" className="smp-fb smp-fb--good" initial={{ opacity: 0, y: 6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={POP}>
                    <span className="smp-fb__title">
                      <Check size={16} strokeWidth={3} />
                      {curEvents.length === 0 ? 'Right: nothing changed, no events' : `Right: ${prefixText}`}
                    </span>
                    {curEvents.length > 0 && <span className="smp-fb__body">{curEvents.map((e) => `${e.ph} ${e.name}`).join(', ')}</span>}
                  </motion.div>
                ) : wrong ? (
                  <motion.div key={`w${wrong.n}`} className="smp-fb smp-fb--retry" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                    <span className="smp-fb__title">Not quite.</span>
                    <span className="smp-fb__body">{nudge(wrong.check)}</span>
                  </motion.div>
                ) : revealed ? (
                  <motion.div key="rev" className="smp-fb smp-fb--neutral" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                    <span className="smp-fb__body">
                      Marked for you ({prefixText}). Tap Check to emit the events.
                    </span>
                  </motion.div>
                ) : marksCount === 0 ? (
                  <motion.p key="tip" className="smp-tip" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    Tap frames to mark them. No marks means no events.
                  </motion.p>
                ) : null}
              </AnimatePresence>
            </div>

            <div className="smp-actions">
              {checked ? (
                <Button size="sm" variant="course" block iconRight={<ArrowRight size={15} strokeWidth={2.8} />} onClick={next}>
                  Next sample
                </Button>
              ) : (
                <>
                  {canReveal && (
                    <Button size="sm" variant="secondary" icon={<Eye size={14} strokeWidth={2.6} />} onClick={showAnswer}>
                      Show me
                    </Button>
                  )}
                  <Button size="sm" variant="primary" block onClick={check}>
                    Check
                  </Button>
                </>
              )}
            </div>
          </motion.section>
        ) : (
          <motion.section key="fin" className="smp-fin" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={POP}>
            <PartyPopper size={20} strokeWidth={2.4} />
            <span>
              <b>Trace complete.</b> {events.length} events from {n} samples
              {finalEvents(samples).length ? '; the frames still open closed at the end.' : '.'}{' '}
              {assists === 0 ? `${firstTry} of ${n} right on the first try.` : `${assists} shown for you.`}
            </span>
          </motion.section>
        )}
      </AnimatePresence>

      {/* --------------------------------------------------- flame chart */}
      <section className="smp-chart-card" aria-label="Flame chart">
        <div className="smp-chart-card__head">
          <span className="w-label">Trace</span>
          <span className="smp-legend">
            <span className="smp-legend__ghost" /> sample
            <span className="smp-legend__span" /> frame
          </span>
        </div>
        <div className="smp-chart" style={{ ['--n' as string]: n, ['--depth' as string]: maxDepth }}>
          {Array.from({ length: n }, (_, t) => (
            <div key={t} className={['smp-chart__col', t === step && !done ? 'is-cur' : ''].join(' ')} style={{ left: `${(t / n) * 100}%`, width: `${100 / n}%` }} />
          ))}
          {samples.map((s, t) =>
            t >= cols
              ? s.map((f, d) => (
                  <div
                    key={`g${t}-${d}`}
                    className="smp-ghost"
                    style={{ ...hueVars(slots.get(f)), left: `calc(${(t / n) * 100}% + 1px)`, width: `calc(${100 / n}% - 2px)`, top: `calc(${d} * var(--row))` }}
                  />
                ))
              : null,
          )}
          {spans.map((sp) => {
            const end = sp.end ?? cols
            return (
              <motion.div
                key={`${sp.depth}-${sp.start}`}
                className={['smp-span', sp.end === null ? 'is-open' : ''].join(' ')}
                style={{ ...hueVars(slots.get(sp.name)), left: `calc(${(sp.start / n) * 100}% + 1px)`, top: `calc(${sp.depth} * var(--row))` }}
                initial={reduce ? false : { width: '0%', opacity: 0 }}
                animate={{ width: `calc(${((end - sp.start) / n) * 100}% - 2px)`, opacity: 1 }}
                transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 30 }}
              >
                <span className="smp-span__name">{sp.name}</span>
              </motion.div>
            )
          })}
          <motion.div className="smp-now" initial={false} animate={{ left: `${(cols / n) * 100}%` }} transition={reduce ? { duration: 0 } : SPRING} />
        </div>
        <div className="smp-axis" aria-hidden>
          {Array.from({ length: n + 1 }, (_, t) => (
            <span key={t} className="tabular" style={{ left: `${(t / n) * 100}%` }}>
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------- event log */}
      <section className="smp-log-card" aria-label="Trace events">
        <div className="smp-log-card__head">
          <span className="w-label">Events</span>
          <span className="smp-log-card__count tabular">{events.length}</span>
        </div>
        {events.length === 0 ? (
          <p className="smp-log__empty">B (begin) and E (end) events appear here as you go.</p>
        ) : (
          <ol className="smp-log">
            {events.map((e, i) => (
              <motion.li
                key={`${i}-${eventText(e)}`}
                className={['smp-ev', `smp-ev--${e.ph}`, i >= newFrom ? 'is-new' : ''].join(' ')}
                style={hueVars(slots.get(e.name))}
                initial={reduce ? false : { opacity: 0, scale: 0.6, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ ...POP, delay: reduce ? 0 : Math.max(0, i - newFrom) * 0.06 }}
              >
                <b>{e.ph}</b>
                <span className="smp-ev__name">{e.name}</span>
                <span className="smp-ev__t tabular">@{e.t}</span>
              </motion.li>
            ))}
          </ol>
        )}
      </section>

      <div className="smp-foot">
        <span className="smp-foot__note">frames match by position, not name</span>
        <Button size="sm" variant="ghost" icon={<RotateCcw size={14} strokeWidth={2.6} />} onClick={resetState} disabled={step === 0 && !checked && marksCount === 0}>
          Reset
        </Button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------- one row */
function Row({
  d,
  prev,
  next,
  inPrefix,
  checked,
  endMarked,
  beginMarked,
  wrongEnd,
  wrongBegin,
  wrongN,
  revealed,
  slots,
  reduce,
  onTap,
  emptyPrev,
  emptyNext,
}: {
  d: number
  prev: string | undefined
  next: string | undefined
  inPrefix: boolean
  checked: boolean
  endMarked: boolean
  beginMarked: boolean
  wrongEnd: boolean
  wrongBegin: boolean
  wrongN: number
  revealed: boolean
  slots: Map<string, number>
  reduce: boolean
  onTap: (side: Side, d: number) => void
  emptyPrev: string | null
  emptyNext: string | null
}) {
  return (
    <>
      {prev !== undefined ? (
        <Frame side="end" d={d} name={prev} marked={endMarked} wrong={wrongEnd} wrongN={wrongN} checked={checked} kept={inPrefix} revealed={revealed} slot={slots.get(prev)} reduce={reduce} onTap={onTap} />
      ) : (
        <span className={['smp-empty', emptyPrev ? 'has-text' : ''].join(' ')}>{emptyPrev}</span>
      )}
      <span className={['smp-gutter', checked && inPrefix ? 'is-same' : '', checked && !inPrefix ? 'is-diff' : ''].join(' ')}>
        <AnimatePresence mode="wait" initial={false}>
          {checked ? (
            <motion.span key="c" className="smp-gutter__mark" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...POP, delay: reduce ? 0 : d * 0.05 }}>
              {inPrefix ? '=' : '≠'}
            </motion.span>
          ) : (
            <motion.span key="d" className="smp-gutter__depth tabular" exit={{ opacity: 0 }}>
              {d}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      {next !== undefined ? (
        <Frame side="begin" d={d} name={next} marked={beginMarked} wrong={wrongBegin} wrongN={wrongN} checked={checked} kept={inPrefix} revealed={revealed} slot={slots.get(next)} reduce={reduce} onTap={onTap} />
      ) : (
        <span className={['smp-empty', emptyNext ? 'has-text' : ''].join(' ')}>{emptyNext}</span>
      )}
    </>
  )
}

function Frame({
  side,
  d,
  name,
  marked,
  wrong,
  wrongN,
  checked,
  kept,
  revealed,
  slot,
  reduce,
  onTap,
}: {
  side: Side
  d: number
  name: string
  marked: boolean
  wrong: boolean
  wrongN: number
  checked: boolean
  kept: boolean
  revealed: boolean
  slot: number | undefined
  reduce: boolean
  onTap: (side: Side, d: number) => void
}) {
  const cls = [
    'smp-frame',
    `smp-frame--${side}`,
    marked ? 'is-marked' : '',
    wrong ? 'is-wrong' : '',
    revealed && marked && !checked ? 'is-revealed' : '',
    checked ? (kept ? 'is-kept' : 'is-changed') : '',
  ].join(' ')
  return (
    <motion.button
      type="button"
      className={cls}
      style={hueVars(slot)}
      disabled={checked}
      aria-pressed={marked}
      title={name}
      aria-label={`${name} at depth ${d}${side === 'end' ? ', mark as ending' : ', mark as beginning'}`}
      onClick={() => onTap(side, d)}
      whileTap={checked ? undefined : { y: 2 }}
    >
      <motion.span
        key={wrong ? `w${wrongN}` : 'n'}
        className="smp-frame__face"
        animate={wrong && !reduce ? { x: [0, -8, 8, -6, 6, -2, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
      >
        <span className="smp-frame__stripe" />
        <span className="smp-frame__name">{name}</span>
      </motion.span>
      <AnimatePresence initial={false}>
        {marked && (
          <motion.span key="b" className="smp-frame__badge" initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={POP}>
            {side === 'end' ? 'E' : 'B'}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}
