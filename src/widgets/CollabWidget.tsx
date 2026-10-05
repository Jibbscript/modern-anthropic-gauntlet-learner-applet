import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowLeftRight, ArrowUpDown, Check, CircleCheck, RefreshCw, RotateCcw, Server, Target, TriangleAlert, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Button } from '../ui/Button'
import { Tile } from '../ui/Tile'
import { haptic, sfx } from '../ui/fx'
import type { CollabConfig, WidgetProps } from './specs'
import { DEFAULT_A, DEFAULT_B, DEFAULT_BASE, clampEdit, localCopy, merge, other, type Edit, type Seg, type Strategy, type User } from './collab/model'
import './CollabWidget.css'

const NAMES: Record<User, string> = { A: 'Alice', B: 'Bob' }
const HUE: Record<User, string> = { A: 'violet', B: 'orange' }
const SPRING = { type: 'spring', stiffness: 520, damping: 30 } as const
/** packet flight and the pause at the hub, in seconds */
const FLY = 0.5
const SYNC_MS = 1700
const WIRE_H = 72

function userVars(u: User): CSSProperties {
  const h = HUE[u]
  return {
    ['--u' as string]: `var(--c-${h})`,
    ['--u-edge' as string]: `var(--c-${h}-edge)`,
    ['--u-soft' as string]: `var(--c-${h}-soft)`,
    ['--u-ink' as string]: `var(--c-${h}-ink)`,
  }
}

function useReduced(): boolean {
  const pref = useReducedMotion()
  return !!pref || (typeof document !== 'undefined' && document.documentElement.dataset.reduceMotion === 'true')
}

const STRATS: { id: Strategy; title: string; sub: string; caption: string }[] = [
  {
    id: 'lww',
    title: 'Last write wins',
    sub: 'one copy',
    caption: 'Simplest: the server keeps whichever copy arrives last. The other edit is silently lost.',
  },
  {
    id: 'ot',
    title: 'OT',
    sub: 'transform',
    caption: 'Edits travel as operations. A central server orders them and shifts positions so both apply.',
  },
  {
    id: 'crdt',
    title: 'CRDT',
    sub: 'char ids',
    caption: 'Every character gets a permanent ID, so peers merge directly with no server, at a metadata cost.',
  },
]

type Phase = 'typing' | 'ready' | 'syncing' | 'merged'

/** a run of text; inserts are tinted with their author's colour, lost text is struck through */
function Doc({ segs, caret }: { segs: Seg[]; caret?: User }) {
  return (
    <span className="collab-text">
      {segs.map((s, i) =>
        s.who === 'base' ? (
          <span key={i}>{s.text}</span>
        ) : (
          <span key={i} className={['collab-ins', s.lost ? 'is-lost' : ''].join(' ')} style={userVars(s.who)}>
            {s.text}
            {caret === s.who && <span className="collab-caret" aria-hidden />}
            {s.lost && <span className="collab-lost-tag">lost</span>}
          </span>
        ),
      )}
    </span>
  )
}

const quote = (s: string) => `“${s.length > 16 ? s.slice(0, 15) + '…' : s}”`

export default function CollabWidget({ config, onComplete }: WidgetProps<CollabConfig>) {
  const reduce = useReduced()
  const base = typeof config.base === 'string' ? config.base : DEFAULT_BASE
  const aKey = JSON.stringify([base, config.editA ?? DEFAULT_A, config.editB ?? DEFAULT_B])
  const { a, b } = useMemo(() => {
    const [bs, ea, eb] = JSON.parse(aKey) as [string, Edit, Edit]
    return { a: clampEdit(bs, ea), b: clampEdit(bs, eb) }
  }, [aKey])
  const goal = config.goal === 'explore' ? 'explore' : 'preserve'

  const [strategy, setStrategy] = useState<Strategy>('lww')
  const [last, setLast] = useState<User>('B')
  const [phase, setPhase] = useState<Phase>(reduce ? 'ready' : 'typing')
  const [typed, setTyped] = useState(reduce ? Infinity : 0)
  const [results, setResults] = useState<Partial<Record<Strategy, number>>>({})
  const [reached, setReached] = useState(false)
  const firedRef = useRef(false)
  const timers = useRef<number[]>([])
  const [syncId, setSyncId] = useState(0)

  const clearTimers = () => {
    timers.current.forEach((t) => clearTimeout(t))
    timers.current = []
  }
  useEffect(() => clearTimers, [])

  const maxLen = Math.max(a.insert.length, b.insert.length)
  // both users type their edit at the same time, offline
  useEffect(() => {
    if (phase !== 'typing') return
    if (reduce || maxLen === 0) {
      setTyped(Infinity)
      setPhase('ready')
      return
    }
    const per = Math.max(28, Math.min(70, 1100 / maxLen))
    let n = 0
    const id = window.setInterval(() => {
      n++
      setTyped(n)
      if (n >= maxLen) {
        clearInterval(id)
        setPhase('ready')
      }
    }, per)
    return () => clearInterval(id)
  }, [phase, reduce, maxLen])

  const result = useMemo(() => merge(strategy, base, a, b, last), [strategy, base, a, b, last])

  const restart = useCallback(
    (retype: boolean) => {
      clearTimers()
      setPhase(retype && !reduce ? 'typing' : 'ready')
      setTyped(retype && !reduce ? 0 : Infinity)
    },
    [reduce],
  )
  // new texts from config restart the scene
  useEffect(() => {
    restart(true)
  }, [aKey, restart])

  function choose(s: Strategy) {
    if (s === strategy) return
    setStrategy(s)
    if (phase === 'merged' || phase === 'syncing') restart(false)
  }

  function sync() {
    if (phase !== 'ready') return
    clearTimers()
    setSyncId((n) => n + 1)
    setPhase('syncing')
    const done = () => {
      setPhase('merged')
      setResults((r) => ({ ...r, [strategy]: result.kept }))
      const ok = goal === 'explore' || result.kept === 2
      // losing an edit is the lesson here, not a mistake: a soft cue, not a buzzer
      if (result.kept < 2) {
        sfx('flip')
        haptic('error')
      }
      if (ok && !firedRef.current) {
        firedRef.current = true
        setReached(true)
        sfx('correct')
        haptic('success')
        onComplete(true)
      } else if (ok) sfx('select')
    }
    if (reduce) done()
    else timers.current.push(window.setTimeout(done, SYNC_MS))
  }

  const strat = STRATS.find((s) => s.id === strategy)!
  const merged = phase === 'merged'
  const syncing = phase === 'syncing'

  // what each lane shows
  function laneSegs(u: User): Seg[] {
    // after a merge both sites hold the same text; under LWW the loser sees where their edit went missing
    if (merged) return strategy === 'lww' && result.lww?.loser !== u ? result.segs.filter((s) => !s.lost) : result.segs
    const e = u === 'A' ? a : b
    const shown = Number.isFinite(typed) ? e.insert.slice(0, typed) : e.insert
    return localCopy(base, { at: e.at, insert: shown }, u)
  }
  function laneStatus(u: User): { text: string; tone: 'muted' | 'busy' | 'good' | 'bad' } {
    if (phase === 'typing') return { text: 'editing offline', tone: 'muted' }
    if (phase === 'ready') return { text: 'offline', tone: 'muted' }
    if (syncing) return { text: 'syncing…', tone: 'busy' }
    if (strategy === 'lww' && result.lww?.loser === u) return { text: 'edit lost', tone: 'bad' }
    return { text: 'in sync', tone: 'good' }
  }
  /** how this user's edit travels under the current strategy */
  const opLabel = (u: User) => {
    const e = u === 'A' ? a : b
    if (strategy === 'lww') return 'whole doc'
    if (strategy === 'crdt') return `after ${u === 'A' ? result.crdt?.anchorA : result.crdt?.anchorB}`
    return `ins @${e.at}`
  }

  const goalText = goal === 'preserve' ? 'Goal: sync with a strategy that keeps both edits' : 'Goal: sync with any strategy'
  const reachedText = goal === 'preserve' ? 'Goal reached: both edits kept' : 'Goal reached: you synced'

  /** packets for the current strategy: [user, direction, label, delay] */
  const hub = strategy !== 'crdt'
  const packets = useMemo(() => {
    type P = { key: string; u: User; dir: 'in' | 'out' | 'across'; to: 'top' | 'bottom'; label: string; delay: number }
    const out: P[] = []
    if (strategy === 'crdt') {
      out.push({ key: 'a', u: 'A', dir: 'across', to: 'bottom', label: `after ${result.crdt?.anchorA}`, delay: 0 })
      out.push({ key: 'b', u: 'B', dir: 'across', to: 'top', label: `after ${result.crdt?.anchorB}`, delay: 0.08 })
      return out
    }
    const first: User = strategy === 'lww' ? other(last) : 'A'
    const second = other(first)
    const lbl = (u: User) => (strategy === 'lww' ? 'whole doc' : `ins @${(u === 'A' ? a : b).at}`)
    out.push({ key: 'in1', u: first, dir: 'in', to: first === 'A' ? 'top' : 'bottom', label: lbl(first), delay: 0 })
    out.push({ key: 'in2', u: second, dir: 'in', to: second === 'A' ? 'top' : 'bottom', label: lbl(second), delay: 0.28 })
    if (strategy === 'lww') {
      const w = result.lww!.winner
      out.push({ key: 'o1', u: w, dir: 'out', to: 'top', label: `${NAMES[w]}’s doc`, delay: FLY + 0.45 })
      out.push({ key: 'o2', u: w, dir: 'out', to: 'bottom', label: `${NAMES[w]}’s doc`, delay: FLY + 0.45 })
    } else {
      out.push({ key: 'o1', u: 'B', dir: 'out', to: 'top', label: `ins @${result.ot!.bOnA.to}`, delay: FLY + 0.45 })
      out.push({ key: 'o2', u: 'A', dir: 'out', to: 'bottom', label: `ins @${result.ot!.aOnB.to}`, delay: FLY + 0.45 })
    }
    return out
  }, [strategy, last, a, b, result])

  return (
    <div className="collab">
      <AnimatePresence mode="wait" initial={false}>
        {reached ? (
          <motion.div key="done" className="w-goal collab-goal" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 520, damping: 18 }}>
            <CircleCheck size={18} strokeWidth={2.6} />
            {reachedText}
          </motion.div>
        ) : (
          <motion.div key="todo" className="w-goal collab-goal collab-goal--todo" exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.12 }}>
            <Target size={16} strokeWidth={2.6} />
            {goalText}
          </motion.div>
        )}
      </AnimatePresence>

      {/* strategy picker */}
      <div className="collab-picker" role="radiogroup" aria-label="Merge strategy">
        {STRATS.map((s) => {
          const kept = results[s.id]
          return (
            <Tile key={s.id} compact role="radio" aria-checked={strategy === s.id} aria-pressed={undefined} state={strategy === s.id ? 'selected' : 'idle'} className="collab-pick" onClick={() => choose(s.id)}>
              <span className="collab-pick__title">{s.title}</span>
              <span className="collab-pick__sub">{s.sub}</span>
              {kept !== undefined && (
                <motion.span
                  className={['collab-pick__mark', kept === 2 ? 'is-good' : 'is-bad'].join(' ')}
                  initial={reduce ? false : { scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 600, damping: 18 }}
                  aria-label={kept === 2 ? 'kept both edits' : 'lost an edit'}
                >
                  {kept === 2 ? <Check size={11} strokeWidth={3.4} /> : <X size={11} strokeWidth={3.4} />}
                </motion.span>
              )}
            </Tile>
          )
        })}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={strategy}
          className="collab-caption"
          initial={reduce ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.08 } }}
          transition={{ duration: 0.18 }}
        >
          {strat.caption}
        </motion.p>
      </AnimatePresence>

      {/* the two users and the network between them */}
      <div className="collab-net">
        {(['A', 'B'] as User[]).map((u) => {
          const st = laneStatus(u)
          return (
            <motion.div key={u} className={['collab-lane', `collab-lane--${u}`, st.tone === 'bad' ? 'is-bad' : ''].join(' ')} style={{ ...userVars(u), order: u === 'A' ? 0 : 2 }} layout={!reduce}>
              <div className="collab-lane__head">
                <span className="collab-lane__badge">{u}</span>
                <span className="collab-lane__name">{NAMES[u]}</span>
                <span className={`collab-status collab-status--${st.tone}`}>
                  {st.tone === 'bad' && <TriangleAlert size={12} strokeWidth={2.8} />}
                  {st.tone === 'good' && <Check size={12} strokeWidth={3} />}
                  {st.tone === 'busy' && <RefreshCw size={11} strokeWidth={3} className="collab-spin" />}
                  {st.text}
                </span>
                <span className="collab-lane__op">{opLabel(u)}</span>
              </div>
              <div className="collab-lane__doc">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={merged ? `m-${strategy}-${last}` : 'local'}
                    initial={reduce ? false : { opacity: 0, y: u === 'A' ? 6 : -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, transition: { duration: 0.1 } }}
                    transition={SPRING}
                  >
                    <Doc segs={laneSegs(u)} caret={phase === 'typing' ? u : undefined} />
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          )
        })}

        <div className={['collab-wire', hub ? 'has-hub' : 'is-p2p', syncing ? 'is-live' : ''].join(' ')} style={{ order: 1 }}>
          <span className="collab-wire__line" aria-hidden />
          <motion.span
            key={`${strategy}-${syncId}`}
            className="collab-hub"
            animate={syncing && !reduce ? { scale: [1, 1, 1.12, 1] } : { scale: 1 }}
            transition={{ duration: 0.5, delay: FLY, times: [0, 0.2, 0.6, 1] }}
          >
            {hub ? <Server size={14} strokeWidth={2.6} /> : <ArrowUpDown size={14} strokeWidth={2.6} />}
            {strategy === 'lww' ? 'Server' : strategy === 'ot' ? 'Server orders ops' : 'Peer to peer'}
            {strategy === 'ot' && (syncing || merged) && <span className="collab-hub__seq">#1 A · #2 B</span>}
          </motion.span>
          {syncing &&
            !reduce &&
            packets.map((p) => {
              // y positions in px inside the 72px wire: lanes sit just beyond 0 and 72, the hub at 36
              const LANE_A = -10
              const LANE_B = WIRE_H + 10
              const HUB_A = WIRE_H / 2 - 20
              const HUB_B = WIRE_H / 2 + 20
              const fromTop = p.dir === 'across' ? p.to === 'bottom' : p.dir === 'in' ? p.to === 'top' : p.to === 'top'
              const [y0, y1] =
                p.dir === 'across' ? (fromTop ? [LANE_A, LANE_B] : [LANE_B, LANE_A]) : p.dir === 'in' ? (fromTop ? [LANE_A, HUB_A] : [LANE_B, HUB_B]) : fromTop ? [HUB_A, LANE_A] : [HUB_B, LANE_B]
              const dx = p.dir === 'across' ? (p.u === 'A' ? -46 : 46) : 0
              const dur = p.dir === 'across' ? FLY * 1.8 : FLY
              return (
                <motion.span
                  key={`${syncId}-${p.key}`}
                  className="collab-packet"
                  style={{ ...userVars(p.u), left: `calc(50% + ${dx}px)`, x: '-50%' }}
                  initial={{ y: y0, opacity: 0, scale: 0.6 }}
                  animate={{ y: [y0, y1], opacity: [0, 1, 1, 0], scale: [0.6, 1, 1, 0.85] }}
                  transition={{ duration: dur, delay: p.delay, ease: [0.3, 0.7, 0.3, 1], opacity: { duration: dur, delay: p.delay, times: [0, 0.15, 0.8, 1] }, scale: { duration: dur, delay: p.delay, times: [0, 0.15, 0.8, 1] } }}
                >
                  {p.label}
                </motion.span>
              )
            })}
        </div>
      </div>

      {/* LWW depends on arrival order; OT and CRDT do not */}
      <AnimatePresence initial={false}>
        {strategy === 'lww' && (
          <motion.div
            key="order"
            className="collab-order"
            initial={reduce ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.2 }}
          >
            <span className="w-label" id="collab-order-label">
              Syncs last
            </span>
            <div className="collab-order__opts" role="radiogroup" aria-labelledby="collab-order-label">
              {(['A', 'B'] as User[]).map((u) => (
                <motion.button
                  key={u}
                  type="button"
                  role="radio"
                  aria-checked={last === u}
                  className={['collab-order__opt', last === u ? 'is-on' : ''].join(' ')}
                  style={userVars(u)}
                  whileTap={{ scale: 0.94 }}
                  disabled={syncing}
                  onClick={() => {
                    if (last === u) return
                    sfx('select')
                    setLast(u)
                    if (phase === 'merged') restart(false)
                  }}
                >
                  <span className="collab-order__badge">{u}</span>
                  {NAMES[u]}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="collab-controls">
        <Button size="sm" variant="primary" icon={<ArrowLeftRight size={15} strokeWidth={2.6} />} onClick={sync} disabled={phase !== 'ready'} className="collab-sync">
          {syncing ? 'Syncing…' : merged ? 'Synced' : 'Sync'}
        </Button>
        <Button size="sm" variant="ghost" className="collab-reset" aria-label="Reset" icon={<RotateCcw size={14} strokeWidth={2.6} />} onClick={() => restart(true)} disabled={phase === 'typing'}>
          Reset
        </Button>
      </div>

      {/* what the merge did, and why */}
      <AnimatePresence mode="popLayout">
        {merged && (
          <motion.section
            key={`${strategy}-${last}`}
            className={['collab-result', result.kept < 2 ? 'is-bad' : 'is-good'].join(' ')}
            initial={reduce ? false : { opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.12 } }}
            transition={SPRING}
          >
            <div className="collab-result__head">
              {result.kept < 2 ? <TriangleAlert size={18} strokeWidth={2.6} /> : <CircleCheck size={18} strokeWidth={2.6} />}
              <span>{result.kept < 2 ? `${NAMES[result.lww!.loser]}’s edit was lost` : 'Both edits kept'}</span>
            </div>
            {strategy === 'lww' && result.lww && (
              <p className="collab-why">
                {NAMES[result.lww.winner]} synced last, so the server kept {NAMES[result.lww.winner]}’s whole copy. {NAMES[result.lww.loser]}’s {quote((result.lww.loser === 'A' ? a : b).insert)} never made it in, and nobody saw an error.
              </p>
            )}

            {strategy === 'ot' && result.ot && (
              <div className="collab-ot">
                <span className="w-label">Transforms</span>
                {[result.ot.bOnA, result.ot.aOnB].map((t) => {
                  const them = other(t.user)
                  const theirs = them === 'A' ? a : b
                  return (
                    <div key={t.user} className="collab-ot__row" style={userVars(t.user)}>
                      <span className="collab-ot__who">
                        {NAMES[t.user]}’s insert, applied on {NAMES[them]}’s copy
                      </span>
                      <span className="collab-ot__math">
                        <span className="collab-ot__pos">@{t.from}</span>
                        {t.shift > 0 ? (
                          <>
                            <span className="collab-ot__op"> + {t.shift}</span>
                            <span className="collab-ot__eq"> = </span>
                            <b className="collab-ot__pos is-new">@{t.to}</b>
                          </>
                        ) : (
                          <span className="collab-ot__eq"> → stays @{t.to}</span>
                        )}
                      </span>
                      <span className="collab-ot__why">
                        {t.reason === 'before'
                          ? `${NAMES[them]} inserted ${t.shift} chars (${quote(theirs.insert)}) at ${theirs.at}, before ${t.from}, so it shifts right by ${t.shift}.`
                          : t.reason === 'tie'
                            ? t.shift > 0
                              ? `Same position. Ties go to the lower user id, so ${NAMES[them]}’s text goes first and this shifts by ${t.shift}.`
                              : `Same position. ${NAMES[t.user]} has the lower user id, so this goes first and stays.`
                            : `${NAMES[them]}’s insert at ${theirs.at} comes after ${t.from}, so nothing before it moved.`}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {strategy === 'crdt' && result.crdt && (
              <div className="collab-crdt">
                <span className="w-label">Characters by id</span>
                <div className="collab-chain">
                  <span className="collab-chain__root">⊢ start</span>
                  {result.crdt.chain.map((l, i) => (
                    <span key={i} className="collab-chain__item">
                      <span className="collab-chain__arrow" aria-hidden>
                        →
                      </span>
                      <span className={['collab-link', l.who !== 'base' ? 'is-ins' : ''].join(' ')} style={l.who !== 'base' ? userVars(l.who) : undefined}>
                        <span className="collab-link__ids">{l.first === l.last ? l.first : `${l.first}–${l.last}`}</span>
                        <span className="collab-link__text">{quote(l.text)}</span>
                        {l.after && <span className="collab-link__after">after {l.after}</span>}
                      </span>
                    </span>
                  ))}
                </div>
                <p className="collab-why">Inserts point at their left neighbour’s id, not an index. Ids never shift, so peers apply each other’s edits in any order.</p>
              </div>
            )}

            <div className="collab-stats">
              <div className={['w-stat', result.kept < 2 ? 'is-bad' : 'is-good'].join(' ')}>
                <span className="w-stat__label">Edits kept</span>
                <span className="w-stat__value">{result.kept} / 2</span>
              </div>
              <div className="w-stat">
                <span className="w-stat__label">Server</span>
                <span className="w-stat__value collab-stats__small">{strategy === 'crdt' ? 'none' : strategy === 'ot' ? 'orders ops' : 'required'}</span>
              </div>
              <div className="w-stat">
                <span className="w-stat__label">Metadata</span>
                <span className="w-stat__value collab-stats__small">{strategy === 'crdt' ? `${result.crdt!.ids} ids` : strategy === 'ot' ? 'op log' : 'none'}</span>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  )
}
