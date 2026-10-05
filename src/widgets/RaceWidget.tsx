import { AnimatePresence, motion, useAnimate, useReducedMotion } from 'motion/react'
import { Check, CircleCheck, Lightbulb, Lock, LockOpen, Play, RotateCcw, Target, TriangleAlert } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Button } from '../ui/Button'
import { haptic, sfx } from '../ui/fx'
import type { RaceConfig, WidgetProps } from './specs'
import {
  buildProgram,
  canStep,
  expectedValue,
  initRace,
  isAllDone,
  isBlocked,
  isThreadDone,
  incrementsLabel,
  overwrites,
  step,
  threadName,
  type Op,
  type RaceState,
} from './race/model'
import './RaceWidget.css'

const HUES = ['blue', 'orange', 'violet'] as const
const FLIGHT = 0.42
const SPRING = { type: 'spring', stiffness: 520, damping: 26 } as const

const ARG: Record<Op, string> = { ACQUIRE: 'L', LOAD: 'r ← x', ADD: 'r ← r+1', STORE: 'x ← r', RELEASE: 'L' }
const SHORT: Record<Op, string> = { ACQUIRE: 'ACQ', LOAD: 'LOAD', ADD: 'ADD', STORE: 'STORE', RELEASE: 'REL' }

function threadVars(t: number): CSSProperties {
  const h = HUES[t] ?? 'blue'
  return {
    ['--th' as string]: `var(--c-${h})`,
    ['--th-edge' as string]: `var(--c-${h}-edge)`,
    ['--th-soft' as string]: `var(--c-${h}-soft)`,
    ['--th-ink' as string]: `var(--c-${h}-ink)`,
    // lets <Button variant="course"> take the thread colour
    ['--c' as string]: `var(--c-${h})`,
    ['--c-edge' as string]: `var(--c-${h}-edge)`,
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function useReduced(): boolean {
  const pref = useReducedMotion()
  return !!pref || (typeof document !== 'undefined' && document.documentElement.dataset.reduceMotion === 'true')
}

interface Pt {
  x: number
  y: number
}
interface Flyer {
  id: number
  t: number
  value: number
  from: Pt
  to: Pt
}

/** a value that swaps with a little directional spring, optionally after a delay (so it lands with a flyer) */
function SwapValue({ k, value, from, delay, className }: { k: string | number; value: string | number; from: 'above' | 'below' | 'none'; delay: number; className?: string }) {
  const dy = from === 'above' ? -18 : from === 'below' ? 18 : 0
  return (
    <span className={['race-swap', className].filter(Boolean).join(' ')}>
      <AnimatePresence initial={false}>
        <motion.span
          key={k}
          className="race-swap__v"
          initial={{ y: dy, opacity: 0, scale: 0.5 }}
          animate={{ y: 0, opacity: 1, scale: 1, transition: { ...SPRING, delay } }}
          exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.12, delay } }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

export default function RaceWidget({ config, onComplete, hostGoal }: WidgetProps<RaceConfig>) {
  const nThreads = config.threads === 3 ? 3 : 2
  const increments = config.increments === 2 ? 2 : 1
  const lock = config.mode === 'lock'
  const goal = config.goal ?? (lock ? 'correct' : 'lose-update')
  const setup = useMemo(() => ({ threads: nThreads, increments, lock }), [nThreads, increments, lock])
  const program = useMemo(() => buildProgram(increments, lock), [increments, lock])
  const expected = expectedValue(setup)
  /** with the lock on, losing an update is impossible: "try to break it" completes after any full run */
  const tryToBreak = lock && goal === 'lose-update'

  const reduce = useReduced()
  const uid = useId()
  const [state, setState] = useState<RaceState>(() => initRace(setup))
  const stateRef = useRef(state)
  const [failedRuns, setFailedRuns] = useState(0)
  const [reached, setReached] = useState(false)
  const firedRef = useRef(false)
  const [flyers, setFlyers] = useState<Flyer[]>([])
  const flyerId = useRef(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const memRef = useRef<HTMLDivElement>(null)
  const regRefs = useRef<(HTMLDivElement | null)[]>([])
  const [memScope, animateMem] = useAnimate<HTMLDivElement>()
  const [lastOp, setLastOp] = useState<{ t: number; op: Op } | null>(null)
  const revealTimer = useRef(0)
  useEffect(() => () => window.clearTimeout(revealTimer.current), [])
  const verdictRef = useRef<HTMLDivElement>(null)

  // config changes (gallery / authoring) restart the run
  useEffect(() => {
    const s = initRace(setup)
    stateRef.current = s
    setState(s)
    setFlyers([])
    setLastOp(null)
    setFailedRuns(0)
  }, [setup])

  const done = isAllDone(state, program)
  const ows = useMemo(() => (done ? overwrites(state, setup) : []), [done, state, setup])
  const lostCount = expected - state.x

  // bring the verdict on screen once it has landed
  useEffect(() => {
    if (!done) return
    const id = window.setTimeout(() => verdictRef.current?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' }), reduce ? 0 : FLIGHT * 1000 + 250)
    return () => window.clearTimeout(id)
  }, [done, reduce])
  const lostSoFar = state.writes.length - state.x
  const lastWrite = state.writes[state.writes.length - 1]
  const delay = reduce ? 0 : FLIGHT * 0.85

  function center(el: Element | null | undefined): Pt | null {
    const root = rootRef.current
    if (!el || !root) return null
    const r = el.getBoundingClientRect()
    const o = root.getBoundingClientRect()
    return { x: r.left - o.left + r.width / 2, y: r.top - o.top + r.height / 2 }
  }

  function launch(t: number, value: number, fromEl: Element | null | undefined, toEl: Element | null | undefined) {
    if (reduce) return
    const from = center(fromEl)
    const to = center(toEl)
    if (!from || !to) return
    const id = ++flyerId.current
    setFlyers((f) => [...f, { id, t, value, from, to }])
  }

  function tap(t: number) {
    const cur = stateRef.current
    const op = program[cur.threads[t].pc]
    const next = step(cur, program, t, lock)
    if (next === cur) return
    stateRef.current = next
    setState(next)
    setLastOp({ t, op })

    if (op === 'LOAD') launch(t, cur.x, memRef.current, regRefs.current[t])
    if (op === 'STORE') {
      launch(t, next.x, regRefs.current[t], memRef.current)
      const w = next.writes[next.writes.length - 1]
      if (w.dropped.length > 0) {
        haptic('error')
        if (memScope.current && !reduce) void animateMem(memScope.current, { x: [0, -7, 7, -5, 5, -2, 0] }, { duration: 0.42, delay })
      }
    }

    if (isAllDone(next, program)) {
      const ok = tryToBreak ? true : goal === 'lose-update' ? next.x < expected : next.x === expected
      if (ok) {
        if (!firedRef.current) {
          firedRef.current = true
          // celebrate once the final STORE has visibly landed in x (the step's own chime lands on the same beat)
          const reveal = () => {
            setReached(true)
            sfx('correct')
            haptic('success')
            onComplete(true)
          }
          if (reduce) reveal()
          else revealTimer.current = window.setTimeout(reveal, FLIGHT * 1000)
        }
      } else {
        setFailedRuns((n) => n + 1)
        if (next.x < expected) sfx('wrong')
      }
    }
  }

  function reset() {
    const s = initRace(setup)
    stateRef.current = s
    setState(s)
    setFlyers([])
    setLastOp(null)
  }

  const goalText = tryToBreak
    ? 'Goal: try to lose an update with the lock on'
    : goal === 'lose-update'
      ? `Goal: finish with x below ${expected}`
      : `Goal: finish with x = ${expected}`
  const reachedText = tryToBreak ? 'Goal reached: the lock made it impossible' : goal === 'lose-update' ? 'Goal reached: you lost an update' : 'Goal reached: every increment counted'
  const hint = goal === 'lose-update' ? 'Try switching threads between a LOAD and its STORE.' : 'Let each thread STORE before another thread LOADs.'

  const perInc = lock ? 5 : 3
  /** schedule indexes of STOREs that overwrote someone else's increment */
  const badStores = useMemo(() => {
    const out = new Set<number>()
    let w = 0
    state.schedule.forEach((e, i) => {
      if (e.op !== 'STORE') return
      if (state.writes[w]?.dropped.length) out.add(i)
      w++
    })
    return out
  }, [state])

  return (
    <div className="race" ref={rootRef}>
      {!hostGoal && (
        <AnimatePresence mode="wait" initial={false}>
          {reached ? (
            <motion.div key="done" className="w-goal race-goal" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 520, damping: 18 }}>
              <CircleCheck size={18} strokeWidth={2.6} />
              {reachedText}
            </motion.div>
          ) : (
            <motion.div key="todo" className="w-goal race-goal race-goal--todo" exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.12 }}>
              <Target size={16} strokeWidth={2.6} />
              {goalText}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* shared memory */}
      <div className="race-top">
        <div className="w-stat race-top__stat">
          <span className="w-stat__label">Expected</span>
          <span className="w-stat__value">{expected}</span>
        </div>
        <div className="race-mem" ref={memScope}>
          <span className="w-label">
            Shared <span className="race-mem__x">x</span>
          </span>
          <div className="race-mem__box" ref={memRef}>
            <SwapValue k={state.writes.length} value={state.x} from="below" delay={state.writes.length ? delay : 0} className="race-mem__val" />
            <AnimatePresence>
              {lastWrite && (
                <motion.span
                  key={state.writes.length}
                  className={['race-mem__flash', lastWrite.dropped.length ? 'is-bad' : ''].join(' ')}
                  style={threadVars(lastWrite.thread)}
                  initial={{ opacity: 0, scale: 1 }}
                  animate={{ opacity: [0, 0.9, 0], scale: [1, 1, 1.45] }}
                  transition={{ duration: reduce ? 0.01 : 0.7, delay, times: [0, 0.15, 1] }}
                />
              )}
            </AnimatePresence>
          </div>
        </div>
        <div className={['w-stat race-top__stat', lostSoFar > 0 ? 'is-bad' : ''].join(' ')}>
          <span className="w-stat__label">Lost</span>
          <span className="w-stat__value">
            <SwapValue k={lostSoFar} value={lostSoFar} from="above" delay={delay} />
          </span>
        </div>
        {lock && (
          <div className={['race-lock', state.lock !== null ? 'is-held' : ''].join(' ')} style={state.lock !== null ? threadVars(state.lock) : undefined}>
            {state.lock !== null ? <Lock size={13} strokeWidth={2.8} /> : <LockOpen size={13} strokeWidth={2.8} />}
            <span>{state.lock !== null ? `L held by ${threadName(state.lock)}` : 'L free'}</span>
          </div>
        )}
      </div>

      <div className="race-write" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={state.writes.length}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0, transition: { delay: state.writes.length ? delay : 0, duration: 0.2 } }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            className={lastWrite?.dropped.length ? 'is-bad' : ''}
          >
            {!lastWrite ? (
              'No writes yet'
            ) : lastWrite.dropped.length ? (
              <>
                <TriangleAlert size={14} strokeWidth={2.6} />
                {threadName(lastWrite.thread)} stored {lastWrite.value} and overwrote {incrementsLabel(lastWrite.dropped)}
              </>
            ) : (
              <>
                {threadName(lastWrite.thread)} stored {lastWrite.value}
              </>
            )}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* threads */}
      <div className="race-threads" style={{ gridTemplateColumns: `repeat(${nThreads}, minmax(0, 1fr))` }}>
        {state.threads.map((th, t) => {
          const name = threadName(t)
          const finished = isThreadDone(state, program, t)
          const blocked = isBlocked(state, program, t)
          const runnable = canStep(state, program, t)
          const regKey = state.schedule.filter((e) => e.thread === t && (e.op === 'LOAD' || e.op === 'ADD')).length
          const regFrom = lastOp?.t === t && lastOp.op === 'LOAD' ? 'above' : 'none'
          return (
            <div key={t} className={['race-col', blocked ? 'is-blocked' : '', finished ? 'is-done' : ''].join(' ')} style={threadVars(t)}>
              <div className="race-col__head">
                <span className="race-col__badge">{name}</span>
                <span className="race-col__name">Thread</span>
              </div>
              <div className="race-reg">
                <span className="race-reg__label">r</span>
                <div className="race-reg__box" ref={(el) => void (regRefs.current[t] = el)}>
                  <SwapValue k={regKey} value={th.reg ?? '–'} from={regFrom} delay={regFrom === 'above' ? delay : 0} />
                  <AnimatePresence>
                    {lastOp?.t === t && lastOp.op === 'ADD' && (
                      <motion.span
                        key={`plus-${regKey}`}
                        className="race-reg__plus"
                        initial={{ opacity: 0, y: 0 }}
                        animate={{ opacity: [0, 1, 0], y: -22 }}
                        transition={{ duration: reduce ? 0.01 : 0.7 }}
                      >
                        +1
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <ol className="race-prog" aria-label={`Thread ${name} program`}>
                {program.map((op, i) => {
                  const cur = i === th.pc
                  const past = i < th.pc
                  return (
                    <li key={i} className={['race-ins', cur ? 'is-current' : '', past ? 'is-past' : '', i > 0 && i % perInc === 0 ? 'is-break' : ''].join(' ')}>
                      <span className="race-ins__pc">
                        {cur && <motion.span layoutId={`${uid}-pc-${t}`} className="race-ins__arrow" transition={reduce ? { duration: 0 } : SPRING} />}
                      </span>
                      <span className="race-ins__op">
                        <span className="race-ins__long">{op}</span>
                        <span className="race-ins__short">{SHORT[op]}</span>
                      </span>
                      <span className="race-ins__arg">{ARG[op]}</span>
                      {cur && blocked && <Lock className="race-ins__lock" size={12} strokeWidth={2.8} />}
                    </li>
                  )
                })}
              </ol>
              <Button
                size="sm"
                variant="course"
                block
                className="race-step"
                disabled={!runnable}
                aria-label={finished ? `Thread ${name} done` : blocked ? `Thread ${name} blocked on lock L` : `Step thread ${name}`}
                icon={finished ? <Check size={15} strokeWidth={3} /> : blocked ? <Lock size={14} strokeWidth={2.8} /> : <Play size={14} strokeWidth={2.8} fill="currentColor" />}
                onClick={() => tap(t)}
              >
                {finished ? 'Done' : blocked ? 'Blocked' : 'Step'}
              </Button>
            </div>
          )
        })}
      </div>

      {flyers.map((f) => (
        <motion.span
          key={f.id}
          className="race-flyer"
          style={{ ...threadVars(f.t), left: f.from.x - 15, top: f.from.y - 15 }}
          initial={{ x: 0, y: 0, scale: 0.6, opacity: 0 }}
          animate={{ x: f.to.x - f.from.x, y: f.to.y - f.from.y, scale: [0.6, 1.15, 0.9], opacity: [0, 1, 1, 0] }}
          transition={{ duration: FLIGHT, ease: [0.3, 0.7, 0.3, 1], opacity: { duration: FLIGHT, times: [0, 0.15, 0.85, 1] } }}
          onAnimationComplete={() => setFlyers((all) => all.filter((x) => x.id !== f.id))}
        >
          {f.value}
        </motion.span>
      ))}

      {/* the interleaving the learner chose */}
      <div className="race-sched">
        <span className="w-label">Schedule</span>
        <div className="race-sched__list">
          {state.schedule.length === 0 && <span className="race-sched__empty">Tap Step on any thread</span>}
          <AnimatePresence initial={false}>
            {state.schedule.map((e, i) => {
              const bad = e.op === 'STORE' && badStores.has(i)
              return (
                <motion.span
                  key={i}
                  className={['race-chip', bad ? 'is-bad' : ''].join(' ')}
                  style={threadVars(e.thread)}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={SPRING}
                >
                  <b>{threadName(e.thread)}</b>
                  {SHORT[e.op]}
                </motion.span>
              )
            })}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {done && (
          <motion.div
            key="verdict"
            ref={verdictRef}
            className={['race-verdict', state.x < expected ? 'is-bad' : 'is-good'].join(' ')}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.12 } }}
            transition={{ ...SPRING, delay: reduce ? 0 : FLIGHT }}
          >
            <div className="race-verdict__head">
              {state.x < expected ? <TriangleAlert size={20} strokeWidth={2.6} /> : <CircleCheck size={20} strokeWidth={2.6} />}
              <span className="race-verdict__title">{state.x < expected ? (lostCount > 1 ? `${lostCount} lost updates` : 'Lost update') : 'Every increment landed'}</span>
            </div>
            <div className="race-verdict__nums">
              <div>
                <span className="w-label">Expected</span>
                <b>{expected}</b>
              </div>
              <div>
                <span className="w-label">Actual</span>
                <b className="race-verdict__actual">{state.x}</b>
              </div>
            </div>
            {state.x < expected ? (
              <ul className="race-verdict__why">
                {ows.map((o) => (
                  <li key={o.write}>
                    <b>
                      Thread {threadName(o.by)}’s write overwrote Thread {threadName(o.over)}’s.
                    </b>{' '}
                    {threadName(o.by)} loaded x = {o.staleValue} before {threadName(o.over)} stored {o.overValue}, then stored {o.storedValue}. {capitalize(incrementsLabel(o.lost))}{' '}
                    {o.lost.length > 1 ? 'are' : 'is'} lost.
                  </li>
                ))}
              </ul>
            ) : (
              <p className="race-verdict__why">
                {lock ? 'The lock kept each LOAD → STORE together, so no thread read a stale x.' : 'Every LOAD saw the previous STORE, so no increment was overwritten.'}
              </p>
            )}
            <Button size="sm" variant="secondary" icon={<RotateCcw size={14} strokeWidth={2.6} />} onClick={reset}>
              Run again
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {failedRuns >= 2 && !reached && (
          <motion.p key="hint" className="race-hint" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Lightbulb size={15} strokeWidth={2.6} />
            {hint}
          </motion.p>
        )}
      </AnimatePresence>

      {!done && (
        <div className="race-foot">
          <span className="race-foot__note">
            {nThreads} threads × {increments} increment{increments > 1 ? 's' : ''}
          </span>
          <Button size="sm" variant="ghost" icon={<RotateCcw size={14} strokeWidth={2.6} />} onClick={reset} disabled={state.schedule.length === 0}>
            Reset
          </Button>
        </div>
      )}
    </div>
  )
}
