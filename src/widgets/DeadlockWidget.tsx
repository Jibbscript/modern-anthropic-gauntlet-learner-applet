import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Check, CircleCheck, Hourglass, Lightbulb, Lock, Play, RotateCcw, Target, TriangleAlert } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Button } from '../ui/Button'
import { haptic, sfx } from '../ui/fx'
import type { DeadlockConfig, WidgetProps } from './specs'
import { LOCKS, THREADS, allDone, canStep, findCycle, heldBy, initDeadlock, isDone, opLabel, programs, step, type DState } from './deadlock/model'
import './DeadlockWidget.css'

const HUES = ['blue', 'orange'] as const
const SPRING = { type: 'spring', stiffness: 520, damping: 28 } as const

function threadVars(t: number): CSSProperties {
  const h = HUES[t] ?? 'blue'
  return {
    ['--th' as string]: `var(--c-${h})`,
    ['--th-edge' as string]: `var(--c-${h}-edge)`,
    ['--th-soft' as string]: `var(--c-${h}-soft)`,
    ['--th-ink' as string]: `var(--c-${h}-ink)`,
    ['--c' as string]: `var(--c-${h})`,
    ['--c-edge' as string]: `var(--c-${h}-edge)`,
  }
}

function useReduced(): boolean {
  const pref = useReducedMotion()
  return !!pref || (typeof document !== 'undefined' && document.documentElement.dataset.reduceMotion === 'true')
}

/* ------------------------------------------------------------ geometry */
const VB = { x: 14, y: 6, w: 272, h: 160 }
const T_POS = [
  { x: 48, y: 86 },
  { x: 252, y: 86 },
]
const L_POS = [
  { x: 150, y: 36 },
  { x: 150, y: 136 },
]
const T_R = 25
const L_R = 23

interface Edge {
  key: string
  kind: 'holds' | 'waits'
  thread: number
  lock: number
  cycle: boolean
}

function seg(from: { x: number; y: number }, to: { x: number; y: number }, r0: number, r1: number) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.hypot(dx, dy)
  const ux = dx / len
  const uy = dy / len
  const s = { x: from.x + ux * r0, y: from.y + uy * r0 }
  const e = { x: to.x - ux * r1, y: to.y - uy * r1 }
  // arrowhead at e
  const bx = e.x - ux * 10
  const by = e.y - uy * 10
  const head = `M${e.x.toFixed(1)},${e.y.toFixed(1)} L${(bx - uy * 5.5).toFixed(1)},${(by + ux * 5.5).toFixed(1)} L${(bx + uy * 5.5).toFixed(1)},${(by - ux * 5.5).toFixed(1)} Z`
  // the line stops at the arrow's base so the stroke cap doesn't poke through the tip
  return { s, e: { x: bx + ux * 2, y: by + uy * 2 }, head }
}

function edgesOf(s: DState, cycle: number[] | null): Edge[] {
  const out: Edge[] = []
  for (let t = 0; t < 2; t++) {
    for (let l = 0; l < 2; l++) {
      if (s.owner[l] === t) out.push({ key: `h-${t}-${l}`, kind: 'holds', thread: t, lock: l, cycle: !!cycle && cycle.includes(t) && cycle.some((u) => s.waiting[u] === l) })
      if (s.waiting[t] === l) out.push({ key: `w-${t}-${l}`, kind: 'waits', thread: t, lock: l, cycle: !!cycle && cycle.includes(t) })
    }
  }
  return out
}

function EdgeView({ edge, reduce }: { edge: Edge; reduce: boolean }) {
  const t = T_POS[edge.thread]
  const l = L_POS[edge.lock]
  const g = edge.kind === 'holds' ? seg(l, t, L_R, T_R) : seg(t, l, T_R, L_R)
  const cls = ['dl-edge', `dl-edge--${edge.kind}`, edge.cycle ? 'is-cycle' : ''].join(' ')
  return (
    <motion.g className={cls} style={threadVars(edge.thread)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.15 } }}>
      <motion.line
        x1={g.s.x}
        y1={g.s.y}
        initial={reduce ? false : { x2: g.s.x, y2: g.s.y }}
        animate={{ x2: g.e.x, y2: g.e.y }}
        transition={{ duration: reduce ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="dl-edge__line"
      />
      <motion.path d={g.head} className="dl-edge__head" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduce ? 0 : 0.22, duration: 0.12 }} />
      {edge.cycle && !reduce && (
        <motion.line
          x1={g.s.x}
          y1={g.s.y}
          x2={g.e.x}
          y2={g.e.y}
          className="dl-edge__glow"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.75, 0, 0.75, 0, 0.75, 0.25] }}
          transition={{ duration: 2.4, ease: 'easeInOut' }}
        />
      )}
    </motion.g>
  )
}

function Padlock({ lock, owner, reduce }: { lock: number; owner: number | null; reduce: boolean }) {
  const p = L_POS[lock]
  const held = owner !== null
  return (
    <g transform={`translate(${p.x} ${p.y})`} className={['dl-lock', held ? 'is-held' : ''].join(' ')} style={held ? threadVars(owner) : undefined}>
      <motion.path
        d="M -8.5 -3 V -10 A 8.5 8.5 0 0 1 8.5 -10 V -3"
        className="dl-lock__shackle"
        initial={false}
        animate={{ y: held ? 0 : -5, rotate: held ? 0 : -14 }}
        style={{ originX: 0, originY: 1 }}
        transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 600, damping: 20 }}
      />
      <motion.rect
        x={-16}
        y={-5}
        width={32}
        height={25}
        rx={7}
        className="dl-lock__body"
        initial={false}
        animate={{ scale: held ? [1, 1.12, 1] : 1 }}
        transition={{ duration: reduce ? 0 : 0.3 }}
      />
      <rect x={-13} y={-3} width={26} height={8} rx={4} className="dl-lock__gloss" />
      <text x={0} y={12} textAnchor="middle" className="dl-lock__label">
        {LOCKS[lock]}
      </text>
    </g>
  )
}

function ThreadNode({ t, s, progs, stuck, reduce }: { t: number; s: DState; progs: ReturnType<typeof programs>; stuck: boolean; reduce: boolean }) {
  const p = T_POS[t]
  const done = isDone(s, progs, t)
  const waiting = s.waiting[t] !== null
  return (
    <g transform={`translate(${p.x} ${p.y})`} className={['dl-tnode', waiting ? 'is-waiting' : '', stuck ? 'is-stuck' : '', done ? 'is-done' : ''].join(' ')} style={threadVars(t)}>
      {stuck && !reduce && (
        <motion.circle r={T_R + 2} className="dl-tnode__pulse" initial={{ scale: 1, opacity: 0.7 }} animate={{ scale: [1, 1.35], opacity: [0.7, 0] }} transition={{ duration: 0.9, repeat: 2, ease: 'easeOut' }} />
      )}
      <circle r={T_R} className="dl-tnode__ring" />
      <circle r={T_R - 4} className="dl-tnode__core" />
      <ellipse cx={0} cy={-9} rx={13} ry={6} className="dl-tnode__gloss" />
      <text x={0} y={6.5} textAnchor="middle" className="dl-tnode__label">
        {THREADS[t]}
      </text>
      <AnimatePresence>
        {(waiting || done) && (
          <motion.g key={done ? 'done' : 'wait'} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={SPRING}>
            <circle cx={17} cy={-17} r={9} className={done ? 'dl-tnode__badge is-done' : 'dl-tnode__badge'} />
            {done ? (
              <Check x={11} y={-23} width={12} height={12} strokeWidth={3.2} className="dl-tnode__badge-icon" />
            ) : (
              <Hourglass x={11.5} y={-22.5} width={11} height={11} strokeWidth={2.8} className="dl-tnode__badge-icon" />
            )}
          </motion.g>
        )}
      </AnimatePresence>
    </g>
  )
}

/* -------------------------------------------------------------- widget */
export default function DeadlockWidget({ config, onComplete }: WidgetProps<DeadlockConfig>) {
  const scenario = config.scenario === 'ordered' ? 'ordered' : 'opposite'
  const goal = config.goal ?? (scenario === 'opposite' ? 'deadlock' : 'finish')
  /** with a consistent lock order a deadlock is impossible: completes after a contended run finishes */
  const tryToBreak = scenario === 'ordered' && goal === 'deadlock'
  const progs = useMemo(() => programs(scenario), [scenario])
  const reduce = useReduced()
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')

  const [s, setS] = useState<DState>(initDeadlock)
  const sRef = useRef(s)
  const [reached, setReached] = useState(false)
  const firedRef = useRef(false)
  const [misses, setMisses] = useState(0)
  const [event, setEvent] = useState<{ n: number; text: string; tone?: 'bad' | 'good' }>({ n: 0, text: 'Tap Step to run a thread' })

  useEffect(() => {
    const fresh = initDeadlock()
    sRef.current = fresh
    setS(fresh)
  }, [scenario])

  const cycle = findCycle(s)
  const deadlocked = cycle !== null
  const finished = allDone(s, progs)
  const edges = edgesOf(s, cycle)

  function complete() {
    if (firedRef.current) return
    firedRef.current = true
    setReached(true)
    sfx('correct')
    haptic('success')
    onComplete(true)
  }

  function describe(prev: DState, next: DState, t: number): { text: string; tone?: 'bad' | 'good' } {
    const name = THREADS[t]
    const op = progs[t][prev.pc[t]]
    if (findCycle(next)) return { text: `${name} waits for ${LOCKS[next.waiting[t]!]}, which ${THREADS[next.owner[next.waiting[t]!]!]} holds`, tone: 'bad' }
    if (op.kind === 'acquire') {
      if (next.waiting[t] !== null) return { text: `${name} blocks: ${LOCKS[op.lock]} is held by ${THREADS[next.owner[op.lock]!]}` }
      return { text: `${name} took ${LOCKS[op.lock]}` }
    }
    if (op.kind === 'release') {
      if (next.handoff) return { text: `${name} released ${LOCKS[op.lock]}. ${THREADS[next.handoff.to]} woke up and took it`, tone: 'good' }
      return { text: `${name} released ${LOCKS[op.lock]}${isDone(next, progs, t) ? ` and finished` : ''}` }
    }
    return { text: `${name} did its work while holding ${heldBy(next, t).map((l) => LOCKS[l]).join(' + ')}` }
  }

  function tap(t: number) {
    const prev = sRef.current
    const next = step(prev, progs, t)
    if (next === prev) return
    sRef.current = next
    setS(next)
    const d = describe(prev, next, t)
    setEvent((e) => ({ n: e.n + 1, ...d }))

    if (findCycle(next)) {
      if (goal === 'deadlock' && !tryToBreak) complete()
      else {
        sfx('wrong')
        haptic('error')
        setMisses((m) => m + 1)
      }
      return
    }
    if (allDone(next, progs)) {
      if (goal === 'finish' || (tryToBreak && next.contended)) complete()
      else setMisses((m) => m + 1)
    }
  }

  function reset() {
    const fresh = initDeadlock()
    sRef.current = fresh
    setS(fresh)
    setEvent((e) => ({ n: e.n + 1, text: 'Tap Step to run a thread' }))
  }

  const goalText = tryToBreak ? 'Goal: try to deadlock A and B' : goal === 'deadlock' ? 'Goal: get A and B stuck in a deadlock' : 'Goal: run both threads to the end'
  const reachedText = tryToBreak ? 'Goal reached: same lock order, no deadlock' : goal === 'deadlock' ? 'Goal reached: you made a deadlock' : 'Goal reached: both threads finished'
  const hint = tryToBreak
    ? 'Make them compete: step B while A holds L1.'
    : goal === 'deadlock'
      ? 'Give each thread its first lock before either takes its second.'
      : 'Let one thread take both locks before the other starts.'

  return (
    <div className="dl">
      <AnimatePresence mode="wait" initial={false}>
        {reached ? (
          <motion.div key="done" className="w-goal dl-goal" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 520, damping: 18 }}>
            <CircleCheck size={18} strokeWidth={2.6} />
            {reachedText}
          </motion.div>
        ) : (
          <motion.div key="todo" className="w-goal dl-goal dl-goal--todo" exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.12 }}>
            <Target size={16} strokeWidth={2.6} />
            {goalText}
          </motion.div>
        )}
      </AnimatePresence>

      {/* wait-for graph */}
      <div className={['dl-graph', deadlocked ? 'is-deadlocked' : ''].join(' ')}>
        <div className="dl-graph__head">
          <span className="w-label">Wait-for graph</span>
          <span className="dl-legend">
            <span className="dl-legend__item">
              <svg width="22" height="8" aria-hidden>
                <line x1="1" y1="4" x2="21" y2="4" className="dl-legend__solid" />
              </svg>
              holds
            </span>
            <span className="dl-legend__item">
              <svg width="22" height="8" aria-hidden>
                <line x1="1" y1="4" x2="21" y2="4" className="dl-legend__dash" />
              </svg>
              waits for
            </span>
          </span>
        </div>
        <svg className="dl-svg" viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`} role="img" aria-label={deadlocked ? 'Deadlock: A waits for B, B waits for A' : 'Lock ownership and waits'}>
          <defs>
            <radialGradient id={`${uid}-halo`}>
              <stop offset="0" className="dl-halo__stop0" />
              <stop offset="1" className="dl-halo__stop1" />
            </radialGradient>
          </defs>
          <AnimatePresence>{deadlocked && <motion.ellipse key="halo" cx={150} cy={86} rx={120} ry={70} fill={`url(#${uid}-halo)`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />}</AnimatePresence>
          <AnimatePresence>
            {edges.map((e) => (
              <EdgeView key={e.key} edge={e} reduce={reduce} />
            ))}
          </AnimatePresence>
          {[0, 1].map((l) => (
            <Padlock key={l} lock={l} owner={s.owner[l]} reduce={reduce} />
          ))}
          {[0, 1].map((t) => (
            <ThreadNode key={t} t={t} s={s} progs={progs} stuck={deadlocked && cycle.includes(t)} reduce={reduce} />
          ))}
        </svg>
        <div className="dl-event" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={event.n} className={event.tone ? `is-${event.tone}` : ''} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.08 } }} transition={{ duration: 0.18 }}>
              {event.text}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {deadlocked && (
          <motion.div
            key="deadlock"
            className="dl-banner"
            initial={{ opacity: 0, scale: 0.85, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', stiffness: 480, damping: 18 }}
          >
            <div className="dl-banner__row">
              <TriangleAlert size={20} strokeWidth={2.6} />
              <span className="dl-banner__title">Deadlock: A waits for B, B waits for A</span>
            </div>
            <p className="dl-banner__body">Each thread holds the lock the other needs, so neither can ever continue.</p>
            <Button size="sm" variant="secondary" icon={<RotateCcw size={14} strokeWidth={2.6} />} onClick={reset}>
              Start over
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* threads */}
      <div className="dl-threads">
        {[0, 1].map((t) => {
          const name = THREADS[t]
          const done = isDone(s, progs, t)
          const waitingFor = s.waiting[t]
          const runnable = canStep(s, progs, t)
          const held = heldBy(s, t)
          return (
            <div key={t} className={['dl-col', waitingFor !== null ? 'is-waiting' : '', done ? 'is-done' : '', deadlocked ? 'is-stuck' : ''].join(' ')} style={threadVars(t)}>
              <div className="dl-col__head">
                <span className="dl-col__badge">{name}</span>
                <span className="dl-col__chips">
                  <AnimatePresence initial={false}>
                    {held.map((l) => (
                      <motion.span key={`h${l}`} layout className="dl-chip dl-chip--held" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={SPRING}>
                        <Lock size={11} strokeWidth={3} />
                        {LOCKS[l]}
                      </motion.span>
                    ))}
                    {waitingFor !== null && (
                      <motion.span key="w" layout className={['dl-chip dl-chip--wait', deadlocked ? 'is-bad' : ''].join(' ')} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={SPRING}>
                        <Hourglass size={11} strokeWidth={3} />
                        {LOCKS[waitingFor]}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
              </div>
              <ol className="dl-prog" aria-label={`Thread ${name} program`}>
                {progs[t].map((op, i) => {
                  const cur = i === s.pc[t]
                  return (
                    <li key={i} className={['dl-ins', cur ? 'is-current' : '', i < s.pc[t] ? 'is-past' : '', cur && waitingFor !== null ? 'is-blocked' : '', op.kind === 'work' ? 'is-work' : ''].join(' ')}>
                      <span className="dl-ins__pc">{cur && <motion.span layoutId={`${uid}-pc-${t}`} className="dl-ins__arrow" transition={reduce ? { duration: 0 } : SPRING} />}</span>
                      <span className="dl-ins__op">{opLabel(op)}</span>
                    </li>
                  )
                })}
              </ol>
              <Button
                size="sm"
                variant="course"
                block
                disabled={!runnable}
                aria-label={done ? `Thread ${name} done` : waitingFor !== null ? `Thread ${name} waiting for ${LOCKS[waitingFor]}` : `Step thread ${name}`}
                icon={done ? <Check size={15} strokeWidth={3} /> : waitingFor !== null ? <Lock size={14} strokeWidth={2.8} /> : <Play size={14} strokeWidth={2.8} fill="currentColor" />}
                onClick={() => tap(t)}
              >
                {done ? 'Done' : deadlocked ? 'Stuck' : waitingFor !== null ? 'Waiting' : 'Step'}
              </Button>
            </div>
          )
        })}
      </div>

      <AnimatePresence>
        {finished && !deadlocked && (
          <motion.div key="fin" className="dl-finish" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={SPRING}>
            <CircleCheck size={18} strokeWidth={2.6} />
            <span>
              Both threads finished.{' '}
              {scenario === 'ordered' ? 'Taking L1 before L2 everywhere means nobody can hold L2 while waiting for L1.' : s.contended ? 'One thread waited, but never in a cycle.' : 'The threads never competed for a lock.'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {misses >= (goal === 'finish' ? 1 : 2) && !reached && (
          <motion.p key="hint" className="dl-hint" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Lightbulb size={15} strokeWidth={2.6} />
            {hint}
          </motion.p>
        )}
      </AnimatePresence>

      <div className="dl-foot">
        <span className="dl-foot__note">{scenario === 'opposite' ? 'A: L1 → L2 · B: L2 → L1' : 'Both: L1 → L2'}</span>
        <Button size="sm" variant="ghost" icon={<RotateCcw size={14} strokeWidth={2.6} />} onClick={reset} disabled={s.steps === 0}>
          Reset
        </Button>
      </div>
    </div>
  )
}
