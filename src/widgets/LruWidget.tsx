import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'motion/react'
import { Check, CircleCheck, Lightbulb, Play, RotateCcw, Target, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Button } from '../ui/Button'
import { Ring } from '../ui/Ring'
import { Ticker } from '../ui/Ticker'
import { Tile } from '../ui/Tile'
import { haptic, sfx } from '../ui/fx'
import type { LruConfig, WidgetProps } from './specs'
import { KEYS, apply, clampCapacity, has, hitRate, initLru, opText, parseSequence, simulate, wouldEvict, type LruState, type Op, type OpKind, type Outcome } from './lru/model'
import './LruWidget.css'

const HUES = ['violet', 'blue', 'teal', 'orange', 'rose', 'indigo', 'green', 'slate'] as const
const DEFAULT_SEQ = ['put A', 'put B', 'put C', 'get A', 'put D', 'get C', 'put E']
const EXPLORE_OPS = 6
const SPRING = { type: 'spring', stiffness: 520, damping: 30 } as const
const POP = { type: 'spring', stiffness: 560, damping: 18 } as const

function keyVars(key: string): CSSProperties {
  const i = KEYS.indexOf(key as (typeof KEYS)[number])
  const h = HUES[(i < 0 ? key.charCodeAt(0) : i) % HUES.length]
  return {
    ['--k' as string]: `var(--c-${h})`,
    ['--k-edge' as string]: `var(--c-${h}-edge)`,
    ['--k-soft' as string]: `var(--c-${h}-soft)`,
    ['--k-ink' as string]: `var(--c-${h}-ink)`,
  }
}

function useReduced(): boolean {
  const pref = useReducedMotion()
  return !!pref || (typeof document !== 'undefined' && document.documentElement.dataset.reduceMotion === 'true')
}

interface Flash {
  n: number
  key: string
  kind: OpKind
  outcome: Outcome
  evicted: string | null
}

interface Pick {
  n: number
  key: string
  ok: boolean
}

function describe(f: Flash): { text: string; tone: 'good' | 'bad' | 'plain' } {
  switch (f.outcome) {
    case 'hit':
      return { text: `get ${f.key}: hit. ${f.key} moves to the front`, tone: 'good' }
    case 'miss':
      return { text: `get ${f.key}: miss. ${f.key} isn't cached`, tone: 'bad' }
    case 'update':
      return { text: `put ${f.key}: updated in place, moved to the front`, tone: 'plain' }
    case 'insert':
      return f.evicted
        ? { text: `put ${f.key}: full, so ${f.evicted} (least recent) is evicted`, tone: 'bad' }
        : { text: `put ${f.key}: inserted at the front`, tone: 'plain' }
  }
}

export default function LruWidget({ config, onComplete }: WidgetProps<LruConfig>) {
  const capacity = clampCapacity(config.capacity)
  const rawGoal = config.goal
  // keyed by content, not identity: a parent re-render with an equal config must not restart the run
  const seqKey = (Array.isArray(config.sequence) ? config.sequence : []).join('|')
  const ops: Op[] = useMemo(() => {
    const configured = parseSequence(seqKey ? seqKey.split('|') : [])
    return configured.length ? configured : rawGoal === 'predict' ? parseSequence(DEFAULT_SEQ) : []
  }, [seqKey, rawGoal])
  const seqMode = ops.length > 0
  const goal = rawGoal ?? (seqMode && config.predict !== false ? 'predict' : config.targetHits ? 'hits' : 'explore')
  const predict = seqMode && (config.predict ?? goal === 'predict')
  const plan = useMemo(() => simulate(ops, capacity), [ops, capacity])
  const seqHits = plan.length ? plan[plan.length - 1].state.hits : 0
  const targetHits = Math.max(1, Math.round(config.targetHits ?? 3))
  /** in a scripted sequence the learner can't score more hits than the script contains */
  const hitTarget = seqMode ? Math.min(targetHits, seqHits) : targetHits

  const reduce = useReduced()
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')

  const [s, setS] = useState<LruState>(initLru)
  const sRef = useRef(s)
  const [mode, setMode] = useState<OpKind>('put')
  const [flash, setFlash] = useState<Flash | null>(null)
  const nRef = useRef(0)
  const [pos, setPos] = useState(0)
  const posRef = useRef(0)
  const [pick, setPick] = useState<Pick | null>(null)
  const [predMisses, setPredMisses] = useState(0)
  const [evictLog, setEvictLog] = useState<(string | null)[]>([])
  const busyRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [reached, setReached] = useState(false)
  const firedRef = useRef(false)
  /** bumped on reset so the card row remounts instead of flying every card off */
  const [epoch, setEpoch] = useState(0)

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  // config change (gallery / hot reload): start over
  useEffect(() => {
    hardReset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ops, capacity])

  const nextOp = seqMode && pos < ops.length ? ops[pos] : null
  const victim = nextOp ? wouldEvict(s, nextOp, capacity) : null
  const awaiting = predict && victim !== null && !(pick?.ok ?? false)
  const seqDone = seqMode && pos >= ops.length
  const full = s.entries.length >= capacity

  function complete() {
    if (firedRef.current) return
    firedRef.current = true
    setReached(true)
    sfx('correct')
    haptic('success')
    onComplete(true)
  }

  function checkGoal(next: LruState, nextPos: number) {
    const finished = seqMode && nextPos >= ops.length
    if (goal === 'explore' && (next.tick >= EXPLORE_OPS || finished)) complete()
    else if (goal === 'hits' && (next.hits >= hitTarget || (finished && hitTarget === 0))) complete()
    else if (goal === 'predict' && finished) complete()
  }

  function run(op: Op) {
    const r = apply(sRef.current, op, capacity)
    sRef.current = r.state
    setS(r.state)
    nRef.current += 1
    setFlash({ n: nRef.current, key: op.key, kind: op.kind, outcome: r.outcome, evicted: r.evicted?.key ?? null })
    if (r.evicted) {
      sfx('flip')
      haptic('light')
    }
    return r
  }

  function step() {
    if (busyRef.current) return
    const p = posRef.current
    if (p >= ops.length) return
    const r = run(ops[p])
    posRef.current = p + 1
    setPos(p + 1)
    setPick(null)
    setEvictLog((l) => [...l, r.evicted?.key ?? null])
    checkGoal(r.state, p + 1)
  }

  function tapKey(key: string) {
    const r = run({ kind: mode, key })
    checkGoal(r.state, 0)
  }

  function choose(key: string) {
    if (!awaiting || busyRef.current) return
    nRef.current += 1
    if (key === victim) {
      setPick({ n: nRef.current, key, ok: true })
      sfx('select')
      haptic('light')
      busyRef.current = true
      timerRef.current = setTimeout(
        () => {
          busyRef.current = false
          timerRef.current = null
          step()
        },
        reduce ? 250 : 700,
      )
    } else {
      setPick({ n: nRef.current, key, ok: false })
      setPredMisses((m) => m + 1)
      sfx('wrong')
      haptic('error')
    }
  }

  function hardReset() {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    busyRef.current = false
    const fresh = initLru()
    sRef.current = fresh
    setS(fresh)
    posRef.current = 0
    setPos(0)
    setPick(null)
    setFlash(null)
    setEvictLog([])
    setPredMisses(0)
    setEpoch((e) => e + 1)
  }

  const ev = flash ? describe(flash) : null
  const wrongEntry = pick && !pick.ok ? s.entries.find((e) => e.key === pick.key) : null
  const victimEntry = victim ? s.entries.find((e) => e.key === victim) : null
  const predictions = evictLog.filter(Boolean).length

  let goalText = `Goal: run ${EXPLORE_OPS} operations`
  let goalCount: string | null = `${Math.min(s.tick, EXPLORE_OPS)}/${EXPLORE_OPS}`
  let doneText = `Goal reached: ${EXPLORE_OPS} operations`
  if (goal === 'hits') {
    goalText = `Goal: score ${hitTarget} cache hit${hitTarget === 1 ? '' : 's'}`
    goalCount = `${Math.min(s.hits, hitTarget)}/${hitTarget}`
    doneText = `Goal reached: ${hitTarget} hit${hitTarget === 1 ? '' : 's'}`
  } else if (goal === 'predict') {
    goalText = predict ? 'Goal: predict every eviction' : 'Goal: replay the sequence'
    goalCount = `${pos}/${ops.length}`
    doneText = predict ? 'Goal reached: every eviction called' : 'Goal reached: sequence replayed'
  } else if (seqMode) {
    goalCount = `${Math.min(pos, Math.min(EXPLORE_OPS, ops.length))}/${Math.min(EXPLORE_OPS, ops.length)}`
  }

  const showHint = !reached && !seqMode && goal === 'hits' && s.misses >= 2 && s.hits < hitTarget

  return (
    <div className="lru">
      <AnimatePresence mode="wait" initial={false}>
        {reached ? (
          <motion.div key="done" className="w-goal lru-goal" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={POP}>
            <CircleCheck size={18} strokeWidth={2.6} />
            <span className="lru-goal__text">{doneText}</span>
          </motion.div>
        ) : (
          <motion.div key="todo" className="w-goal lru-goal lru-goal--todo" exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.12 }}>
            <Target size={16} strokeWidth={2.6} />
            <span className="lru-goal__text">{goalText}</span>
            {goalCount && <span className="lru-goal__count tabular">{goalCount}</span>}
          </motion.div>
        )}
      </AnimatePresence>

      {seqMode && (
        <ol className="lru-seq" aria-label="Operation sequence">
          {ops.map((op, i) => {
            const done = i < pos
            const cur = i === pos
            const evicted = evictLog[i]
            return (
              <li key={i} className={['lru-op', done ? 'is-done' : '', cur ? 'is-current' : ''].join(' ')}>
                {cur && <motion.span layoutId={`${uid}-cur`} className="lru-op__cursor" transition={reduce ? { duration: 0 } : SPRING} />}
                <span className="lru-op__text">{opText(op)}</span>
                {done && evicted && (
                  <motion.span className="lru-op__ev" style={keyVars(evicted)} initial={reduce ? false : { scale: 0 }} animate={{ scale: 1 }} transition={POP}>
                    <X size={10} strokeWidth={3.4} />
                    {evicted}
                  </motion.span>
                )}
              </li>
            )
          })}
        </ol>
      )}

      {/* the cache */}
      <div className={['lru-cache', full ? 'is-full' : ''].join(' ')}>
        <div className="lru-cache__head">
          <span className="w-label">Cache</span>
          <span className="lru-cache__cap tabular">
            {s.entries.length}/{capacity} used
          </span>
        </div>
        <div className="lru-axis" aria-hidden>
          <span>most recent</span>
          <span className="lru-axis__line" />
          <span>least recent</span>
        </div>

        <div className="lru-track">
          <LayoutGroup id={uid}>
            <div key={epoch} className="lru-row">
              <AnimatePresence mode="popLayout" initial={false}>
                {s.entries.map((e, i) => {
                  const isLast = i === s.entries.length - 1
                  const fresh = flash && flash.key === e.key
                  const isWrong = pick && !pick.ok && pick.key === e.key
                  const isRight = pick && pick.ok && pick.key === e.key
                  const nextOut = full && isLast && !predict && !seqDone
                  return (
                    <motion.button
                      key={e.key}
                      type="button"
                      layout={!reduce}
                      className={['lru-card', awaiting ? 'is-pickable' : '', isWrong ? 'is-wrong' : '', isRight ? 'is-right' : ''].join(' ')}
                      style={keyVars(e.key)}
                      disabled={!awaiting}
                      aria-label={`${e.key}, last used at t${e.used}${awaiting ? ', tap if this will be evicted' : ''}`}
                      onClick={() => choose(e.key)}
                      initial={reduce ? { opacity: 0 } : { opacity: 0, y: -26, scale: 0.6 }}
                      animate={{ opacity: 1, y: 0, scale: 1, x: 0, rotate: 0 }}
                      exit={reduce ? { opacity: 0, transition: { duration: 0.15 } } : 'gone'}
                      variants={{
                        gone: { x: 74, y: 34, rotate: 24, opacity: 0, scale: 0.72, transition: { duration: 0.6, ease: [0.4, 0, 0.7, 0.2] } },
                      }}
                      transition={SPRING}
                    >
                      <motion.span
                        key={isWrong ? `w${pick!.n}` : 'n'}
                        className="lru-card__face"
                        animate={isWrong && !reduce ? { x: [0, -8, 8, -6, 6, -2, 0] } : { x: 0 }}
                        transition={{ duration: 0.4 }}
                      >
                        <span className="lru-card__key">{e.key}</span>
                        <span className="lru-card__used tabular">t{e.used}</span>
                        {e.version > 1 && (
                          <motion.span key={e.version} className="lru-card__ver tabular" initial={reduce ? false : { scale: 0.3 }} animate={{ scale: 1 }} transition={POP}>
                            v{e.version}
                          </motion.span>
                        )}
                        <motion.span className="lru-card__doom" variants={{ gone: { opacity: 1 } }} initial={{ opacity: 0 }} />
                      </motion.span>

                      {fresh && flash && (flash.outcome === 'hit' || flash.outcome === 'update' || flash.outcome === 'insert') && !reduce && (
                        <motion.span
                          key={`ring${flash.n}`}
                          className={`lru-card__ring is-${flash.outcome}`}
                          initial={{ opacity: 0, scale: 0.92 }}
                          animate={{ opacity: [0, 1, 1, 0], scale: [0.92, 1.06, 1.06, 1.12] }}
                          transition={{ duration: 1.2, times: [0, 0.15, 0.6, 1] }}
                        />
                      )}
                      {fresh && flash && flash.outcome !== 'miss' && (
                        <motion.span
                          key={`tag${flash.n}`}
                          className={`lru-card__pop is-${flash.outcome}`}
                          initial={{ opacity: 0, y: 6, scale: 0.6 }}
                          animate={{ opacity: [0, 1, 1, 0], y: [6, -2, -2, -6], scale: [0.6, 1, 1, 1] }}
                          transition={{ duration: reduce ? 1.4 : 1.5, times: [0, 0.15, 0.75, 1] }}
                        >
                          <span className="lru-pill">{flash.outcome === 'hit' ? 'hit' : flash.outcome === 'update' ? 'updated' : 'new'}</span>
                        </motion.span>
                      )}
                      <AnimatePresence>
                        {isRight && (
                          <motion.span key="ok" className="lru-card__check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={POP}>
                            <Check size={12} strokeWidth={3.4} />
                          </motion.span>
                        )}
                      </AnimatePresence>
                      <AnimatePresence>
                        {nextOut && (
                          <motion.span
                            key="out"
                            className="lru-card__next"
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            variants={{ gone: { opacity: 0, transition: { duration: 0.08 } } }}
                            transition={{ duration: 0.18 }}
                          >
                            <span className="lru-pill">next out</span>
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  )
                })}
                {Array.from({ length: Math.max(0, capacity - s.entries.length) }, (_, i) => (
                  <motion.span key={`slot${i}`} layout={!reduce} className="lru-slot" aria-hidden initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.1 } }} transition={SPRING} />
                ))}
              </AnimatePresence>
            </div>
          </LayoutGroup>

          <AnimatePresence>
            {flash && flash.outcome === 'miss' && (
              <motion.div
                key={`miss${flash.n}`}
                className="lru-miss"
                style={keyVars(flash.key)}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={reduce ? { opacity: [0, 1, 1, 0], scale: 1 } : { opacity: [0, 1, 1, 0], scale: [0.7, 1, 1, 0.96], x: [0, 0, -6, 6, -3, 0, 0] }}
                transition={{ duration: 1.3, times: reduce ? [0, 0.1, 0.8, 1] : undefined }}
              >
                <span className="lru-miss__pill">
                  <span className="lru-miss__key">{flash.key}</span>
                  not cached
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          {flash && flash.outcome === 'miss' && !reduce && <motion.span key={`mf${flash.n}`} className="lru-track__flash" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.9 }} />}
        </div>

        <div className="lru-event" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={flash?.n ?? 0}
              className={ev ? `is-${ev.tone}` : ''}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.08 } }}
              transition={{ duration: 0.18 }}
            >
              {ev ? ev.text : seqMode ? 'Step through the sequence below' : `Pick get or put, then tap a key`}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>

      {/* controls */}
      {seqMode ? (
        <div className="lru-controls">
          <AnimatePresence mode="wait" initial={false}>
            {seqDone ? (
              <motion.div key="done" className="lru-summary" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={SPRING}>
                <CircleCheck size={18} strokeWidth={2.6} />
                <span>
                  Sequence done.{' '}
                  {predict && predictions > 0
                    ? `${predictions} eviction${predictions === 1 ? '' : 's'}, ${predMisses === 0 ? 'all called on the first try' : `${predMisses} wrong guess${predMisses === 1 ? '' : 'es'} along the way`}.`
                    : `${predictions} eviction${predictions === 1 ? '' : 's'}.`}
                </span>
              </motion.div>
            ) : awaiting ? (
              <motion.div key={`ask${pos}`} className={['lru-ask', pick && !pick.ok ? 'is-retry' : ''].join(' ')} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={SPRING}>
                <span className="lru-ask__title">
                  <code>{nextOp && opText(nextOp)}</code> needs room. Which key gets evicted?
                </span>
                <span className="lru-ask__sub">
                  {pick && !pick.ok && wrongEntry && victimEntry
                    ? `Not ${wrongEntry.key}: it was used at t${wrongEntry.used}. Look for the key used longest ago.`
                    : 'Tap the card that will go.'}
                </span>
              </motion.div>
            ) : (
              <motion.div key={`run${pos}`} className="lru-run" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>
                {pick?.ok ? (
                  <span className="lru-run__ok">
                    <Check size={16} strokeWidth={3} /> Right: {pick.key} is the least recently used
                  </span>
                ) : (
                  <Button size="sm" variant="course" block icon={<Play size={14} strokeWidth={2.8} fill="currentColor" />} onClick={step}>
                    Run <code className="lru-run__op">{nextOp && opText(nextOp)}</code>
                  </Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="lru-controls">
          <div className="lru-seg" role="radiogroup" aria-label="Operation">
            {(['get', 'put'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                className={['lru-seg__btn', mode === m ? 'is-on' : ''].join(' ')}
                onClick={() => {
                  if (mode !== m) {
                    sfx('tap')
                    setMode(m)
                  }
                }}
              >
                {mode === m && <motion.span layoutId={`${uid}-seg`} className="lru-seg__thumb" transition={reduce ? { duration: 0 } : SPRING} />}
                <span className="lru-seg__label">
                  {m}(<i>key</i>)
                </span>
              </button>
            ))}
          </div>
          <div className="lru-pad" role="group" aria-label={`${mode} a key`}>
            {KEYS.map((k) => {
              const cached = has(s, k)
              return (
                <Tile key={k} compact className={['lru-key', cached ? 'is-cached' : ''].join(' ')} style={keyVars(k)} aria-label={`${mode} ${k}${cached ? ' (cached)' : ''}`} onClick={() => tapKey(k)}>
                  <span className="lru-key__letter">{k}</span>
                  <span className="lru-key__dot" aria-hidden />
                </Tile>
              )
            })}
          </div>
        </div>
      )}

      <div className="lru-stats">
        <div className="w-stat lru-stat">
          <span className="w-stat__label">Hits</span>
          <span className={['w-stat__value', s.hits > 0 ? 'lru-stat__hits' : ''].join(' ')}>
            <Ticker value={s.hits} duration={0.4} />
          </span>
        </div>
        <div className="w-stat lru-stat">
          <span className="w-stat__label">Misses</span>
          <span className={['w-stat__value', s.misses > 0 ? 'lru-stat__misses' : ''].join(' ')}>
            <Ticker value={s.misses} duration={0.4} />
          </span>
        </div>
        <div className="w-stat lru-stat lru-stat--ring">
          <Ring value={hitRate(s)} size={42} stroke={5} label={`Hit rate ${Math.round(hitRate(s) * 100)}%`} />
          <span className="lru-stat__rate">
            <span className="w-stat__label">Hit rate</span>
            <span className="w-stat__value tabular">{s.hits + s.misses === 0 ? '–' : `${Math.round(hitRate(s) * 100)}%`}</span>
          </span>
        </div>
      </div>

      <AnimatePresence>
        {showHint && (
          <motion.p key="hint" className="lru-hint" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Lightbulb size={15} strokeWidth={2.6} />A get only hits if the key is cached. Put a key first, then get it.
          </motion.p>
        )}
      </AnimatePresence>

      <div className="lru-foot">
        <span className="lru-foot__note">capacity {capacity} · LRU eviction</span>
        <Button size="sm" variant="ghost" icon={<RotateCcw size={14} strokeWidth={2.6} />} onClick={hardReset} disabled={s.tick === 0 && !pick}>
          Reset
        </Button>
      </div>
    </div>
  )
}
