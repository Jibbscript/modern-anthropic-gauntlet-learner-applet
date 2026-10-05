import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { CircleCheck, RotateCcw, Send, Server, Smartphone, Target, TriangleAlert, Zap } from 'lucide-react'
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { Button } from '../ui/Button'
import { Tile } from '../ui/Tile'
import { haptic, sfx } from '../ui/fx'
import type { TokenBucketConfig, WidgetProps } from './specs'
import {
  bucketMaxIn,
  bucketTake,
  burstRate,
  densest,
  makeBucket,
  makeWindow,
  newBurst,
  peakSpan,
  tokensAt,
  trackBurst,
  windowAt,
  windowTake,
  type Bucket,
  type FixedWindow,
} from './tokenbucket/model'
import './TokenBucketWidget.css'

/** seconds of history on the timeline */
const SPAN = 10
/** press this long before a hold turns into a burst */
const HOLD_DELAY = 0.32
const SPRING = { type: 'spring', stiffness: 520, damping: 26 } as const

type Mode = 'bucket' | 'window'

interface Req {
  id: number
  t: number
  ok: boolean
}

function useReduced(): boolean {
  const pref = useReducedMotion()
  return !!pref || (typeof document !== 'undefined' && document.documentElement.dataset.reduceMotion === 'true')
}

function fmt(n: number, digits = 1): string {
  return String(Number(n.toFixed(digits)))
}

/* ------------------------------------------------------------------ jar */
const COIN = 25
const GAP = 4
const PAD = 7

function jarGeometry(capacity: number) {
  const cols = capacity <= 2 ? Math.max(1, capacity) : capacity <= 6 ? 2 : capacity <= 12 ? 3 : 4
  const rows = Math.max(2, Math.ceil(capacity / cols))
  const innerW = cols * COIN + (cols - 1) * GAP + 2 * PAD
  const innerH = rows * (COIN + GAP) - GAP + 2 * PAD
  const W = innerW + 8
  const H = innerH + 12
  const slot = (i: number) => {
    const row = Math.floor(i / cols)
    const col = i % cols
    // centre a partly filled top row
    const inRow = Math.min(cols, capacity - row * cols)
    const shift = ((cols - inRow) * (COIN + GAP)) / 2
    return { cx: 4 + PAD + shift + col * (COIN + GAP) + COIN / 2, cy: 8 + innerH - PAD - row * (COIN + GAP) - COIN / 2 }
  }
  return { cols, rows, W, H, slot }
}

function pie(cx: number, cy: number, r: number, f: number): string {
  if (f <= 0) return ''
  if (f >= 0.999) return `M${cx},${cy - r} A${r},${r} 0 1 1 ${cx - 0.01},${cy - r} Z`
  const a = f * Math.PI * 2
  const x = cx + r * Math.sin(a)
  const y = cy - r * Math.cos(a)
  return `M${cx},${cy} L${cx},${cy - r} A${r},${r} 0 ${f > 0.5 ? 1 : 0} 1 ${x.toFixed(2)},${y.toFixed(2)} Z`
}

function Jar({ capacity, level, mode, uid, reduce, flash }: { capacity: number; level: number; mode: Mode; uid: string; reduce: boolean; flash: { n: number; ok: boolean } }) {
  const g = jarGeometry(capacity)
  const whole = Math.min(capacity, Math.floor(level + 1e-9))
  const frac = mode === 'bucket' && whole < capacity ? level - whole : 0
  const r = COIN / 2
  return (
    <svg className="tb-jar" width={g.W} height={g.H} viewBox={`0 0 ${g.W} ${g.H}`} aria-hidden>
      <defs>
        <linearGradient id={`${uid}-gold`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="tb-gold0" />
          <stop offset="1" className="tb-gold1" />
        </linearGradient>
        <linearGradient id={`${uid}-glass`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" className="tb-glass0" />
          <stop offset="0.5" className="tb-glass1" />
          <stop offset="1" className="tb-glass2" />
        </linearGradient>
      </defs>
      <rect x={4} y={6} width={g.W - 8} height={g.H - 8} rx={16} className="tb-jar__glass" fill={`url(#${uid}-glass)`} />
      {/* forming coin: fills like a pie as the refill accrues */}
      {frac > 0.001 && (
        <g>
          <circle cx={g.slot(whole).cx} cy={g.slot(whole).cy} r={r - 1} className="tb-coin__ghost" />
          <path d={pie(g.slot(whole).cx, g.slot(whole).cy, r - 1, frac)} className="tb-coin__pie" fill={`url(#${uid}-gold)`} />
        </g>
      )}
      <AnimatePresence initial={false}>
        {Array.from({ length: whole }, (_, i) => {
          const p = g.slot(i)
          return (
            <motion.g
              key={i}
              initial={reduce ? { opacity: 0 } : { scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0, transition: { duration: 0.1 } } : { y: -(p.cy + 18), scale: 0.7, opacity: 0, transition: { duration: 0.34, ease: [0.3, 0.6, 0.4, 1] } }}
              transition={reduce ? { duration: 0.1 } : { ...SPRING, delay: mode === 'window' ? i * 0.025 : 0 }}
            >
              <circle cx={p.cx} cy={p.cy} r={r} fill={`url(#${uid}-gold)`} className="tb-coin" />
              <circle cx={p.cx} cy={p.cy} r={r - 4.5} className="tb-coin__inner" />
              <ellipse cx={p.cx - 3.5} cy={p.cy - 5.5} rx={5} ry={2.6} className="tb-coin__shine" />
            </motion.g>
          )
        })}
      </AnimatePresence>
      <rect x={10} y={16} width={5} height={Math.max(10, g.H - 38)} rx={2.5} className="tb-jar__gloss" />
      <rect x={g.W - 13} y={22} width={2.5} height={Math.max(8, (g.H - 38) * 0.45)} rx={1.25} className="tb-jar__gloss tb-jar__gloss--r" />
      <rect x={4} y={6} width={g.W - 8} height={g.H - 8} rx={16} className="tb-jar__rim" />
      <rect x={1} y={0} width={g.W - 2} height={10} rx={5} className="tb-jar__lip" />
      <AnimatePresence>
        {flash.n > 0 && (
          <motion.rect
            key={flash.n}
            x={1}
            y={0}
            width={g.W - 2}
            height={10}
            rx={5}
            className={flash.ok ? 'tb-jar__flash is-ok' : 'tb-jar__flash is-bad'}
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
          />
        )}
      </AnimatePresence>
    </svg>
  )
}

/* --------------------------------------------------------------- widget */
export default function TokenBucketWidget({ config, onComplete }: WidgetProps<TokenBucketConfig>) {
  const capacity = Number.isFinite(config.capacity) ? Math.max(1, Math.min(20, Math.round(config.capacity!))) : 5
  // above ~5/s a hold can't outrun the refill on screen, and the window-edge burst disappears
  const rate = Number.isFinite(config.rate) && config.rate! > 0 ? Math.max(0.1, Math.min(5, config.rate!)) : 1
  const compare = !!config.compareFixedWindow
  const goal = config.goal ?? 'burst'
  const windowLen = capacity / rate
  const holdRate = burstRate(rate)
  /** span for the "peak" burst metric, and the most a bucket can ever pass in it */
  const span = peakSpan(capacity, rate)
  const bucketBound = bucketMaxIn(capacity, rate, span)

  const reduce = useReduced()
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const [mode, setModeState] = useState<Mode>('bucket')
  const modeRef = useRef<Mode>('bucket')
  const simRef = useRef(0)
  const bucketRef = useRef<Bucket>(makeBucket(capacity, rate, 0))
  const winRef = useRef<FixedWindow>(makeWindow(capacity, windowLen, 0))
  const eventsRef = useRef<Req[]>([])
  const samplesRef = useRef<{ t: number; v: number }[]>([])
  const burstRef = useRef(newBurst())
  const holdRef = useRef<{ next: number } | null>(null)
  const idRef = useRef(0)
  const firedRef = useRef(false)
  const rejectStreak = useRef(0)

  const [, setFrame] = useState(0)
  const [holding, setHolding] = useState(false)
  const [totals, setTotals] = useState({ ok: 0, rejected: 0 })
  const [flyers, setFlyers] = useState<Req[]>([])
  const [flash, setFlash] = useState({ n: 0, ok: true })
  const [reached, setReached] = useState(false)
  const [visible, setVisible] = useState(true)
  const [width, setWidth] = useState(300)
  const rootRef = useRef<HTMLDivElement>(null)

  const level = useCallback(
    (t: number) => (modeRef.current === 'bucket' ? tokensAt(bucketRef.current, t) : capacity - windowAt(winRef.current, t).count),
    [capacity],
  )

  const resetSim = useCallback(() => {
    const t = simRef.current
    bucketRef.current = makeBucket(capacity, rate, t)
    winRef.current = makeWindow(capacity, windowLen, t)
    eventsRef.current = []
    // the limiter has been idle (and full) before now
    samplesRef.current = [
      { t: t - SPAN - 1, v: capacity },
      { t, v: capacity },
    ]
    burstRef.current = newBurst()
    holdRef.current = null
    rejectStreak.current = 0
    setHolding(false)
    setFlyers([])
    setTotals({ ok: 0, rejected: 0 })
  }, [capacity, rate, windowLen])

  // config changes (gallery / authoring) start fresh
  useEffect(() => {
    resetSim()
  }, [resetSim])

  const send = useCallback(() => {
    const t = simRef.current
    const before = level(t)
    let ok: boolean
    if (modeRef.current === 'bucket') {
      const r = bucketTake(bucketRef.current, t)
      bucketRef.current = r.bucket
      ok = r.ok
    } else {
      const r = windowTake(winRef.current, t)
      winRef.current = r.win
      ok = r.ok
    }
    const req = { id: ++idRef.current, t, ok }
    samplesRef.current.push({ t, v: before }, { t, v: level(t) })
    eventsRef.current.push(req)
    setTotals((x) => (ok ? { ...x, ok: x.ok + 1 } : { ...x, rejected: x.rejected + 1 }))
    setFlyers((f) => [...f.slice(-14), req])
    setFlash((f) => ({ n: f.n + 1, ok }))

    if (ok) {
      rejectStreak.current = 0
      sfx('tap')
    } else {
      if (rejectStreak.current === 0) {
        sfx('wrong')
        haptic('error')
      }
      rejectStreak.current++
    }

    const b = trackBurst(burstRef.current, req, capacity)
    burstRef.current = b.state
    if (b.hit && goal === 'burst' && !firedRef.current) {
      firedRef.current = true
      setReached(true)
      sfx('correct')
      haptic('success')
      onComplete(true)
    }
  }, [capacity, goal, level, onComplete])
  const sendRef = useRef(send)
  sendRef.current = send

  // measure for the timeline + flight paths
  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    setWidth(el.clientWidth)
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // only simulate while on screen
  useEffect(() => {
    const el = rootRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver((entries) => setVisible(entries.some((e) => e.isIntersecting)))
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // the clock: advances simulated time, drives holds and samples the level
  useEffect(() => {
    if (!visible) return
    let raf = 0
    let last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(0.1, Math.max(0, (now - last) / 1000))
      last = now
      simRef.current += dt
      const t = simRef.current
      const h = holdRef.current
      if (h && t >= h.next) {
        h.next = Math.max(h.next + 1 / holdRate, t)
        sendRef.current()
      }
      const s = samplesRef.current
      if (!s.length || t - s[s.length - 1].t >= 1 / 30) s.push({ t, v: level(t) })
      while (s.length > 2 && s[1].t < t - SPAN - 0.5) s.shift()
      const ev = eventsRef.current
      while (ev.length && ev[0].t < t - SPAN - 0.5) ev.shift()
      setFrame((f) => (f + 1) % 1_000_000)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [visible, holdRate, level])

  // never leave a burst running after unmount / blur
  useEffect(() => {
    const stop = () => {
      holdRef.current = null
      setHolding(false)
    }
    window.addEventListener('pointerup', stop)
    window.addEventListener('blur', stop)
    return () => {
      holdRef.current = null
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('blur', stop)
    }
  }, [])

  function startHold(e: RPointerEvent<HTMLButtonElement>) {
    // motion re-dispatches untrusted pointer events for keyboard presses; those are handled by onClick
    if (!e.nativeEvent.isTrusted) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    sendRef.current()
    holdRef.current = { next: simRef.current + HOLD_DELAY }
    setHolding(true)
  }
  function stopHold() {
    holdRef.current = null
    setHolding(false)
  }

  function switchMode(m: Mode) {
    if (m === modeRef.current) return
    modeRef.current = m
    setModeState(m)
    resetSim()
  }

  /* ---------------------------------------------------------- derived */
  const now = simRef.current
  const lvl = level(now)
  const win = windowAt(winRef.current, now)
  const resetIn = win.start + win.window - now
  const accepted = eventsRef.current.filter((e) => e.ok)
  const peak = densest(
    accepted.map((e) => e.t),
    span,
  )
  const boundaryBurst = mode === 'window' && peak.count > bucketBound

  /* ------------------------------------------------------- geometry */
  const jar = jarGeometry(capacity)
  const wireY = 24
  const clientX = 22
  const serverX = width - 22
  const jarX = width / 2
  const stageH = wireY + jar.H + 4

  const TL_H = 104
  const plotTop = 18
  const plotH = 46
  const okY = plotTop + plotH + 14
  const badY = okY + 15
  // "now" sits a few px in from the right edge so fresh dots aren't clipped
  const plotW = width - 6
  const tx = (t: number) => plotW - ((now - t) / SPAN) * plotW
  const ly = (v: number) => plotTop + (1 - v / capacity) * plotH
  // pruned to the visible span plus one point before it, so the line reaches the left edge
  const samples = samplesRef.current
  let line = ''
  samples.forEach((s, i) => {
    line += `${i ? 'L' : 'M'}${tx(s.t).toFixed(1)},${ly(s.v).toFixed(1)}`
  })
  if (line) line += `L${plotW},${ly(lvl).toFixed(1)}`
  const area = samples.length ? `${line}L${plotW},${plotTop + plotH}L${tx(samples[0].t).toFixed(1)},${plotTop + plotH}Z` : ''
  const edges: number[] = []
  const edgeGap = (windowLen / SPAN) * plotW
  if (mode === 'window' && edgeGap >= 4) {
    for (let k = Math.ceil((now - SPAN) / windowLen); k * windowLen <= now; k++) edges.push(k * windowLen)
  }
  const secTicks: number[] = []
  for (let k = Math.ceil(now - SPAN); k <= now; k++) secTicks.push(k)

  const goalText = 'Goal: send a burst until you get a 429'
  const holdLabel = holding ? `Bursting · ${holdRate}/s` : 'Send request'

  return (
    <div className="tb" ref={rootRef}>
      {goal === 'burst' && (
        <AnimatePresence mode="wait" initial={false}>
          {reached ? (
            <motion.div key="done" className="w-goal tb-goal" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 520, damping: 18 }}>
              <CircleCheck size={18} strokeWidth={2.6} />
              Goal reached: burst absorbed, then throttled
            </motion.div>
          ) : (
            <motion.div key="todo" className="w-goal tb-goal tb-goal--todo" exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.12 }}>
              <Target size={16} strokeWidth={2.6} />
              {goalText}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {compare && (
        <div className="tb-modes" role="group" aria-label="Rate limiter">
          <Tile compact state={mode === 'bucket' ? 'selected' : 'idle'} onClick={() => switchMode('bucket')} aria-pressed={mode === 'bucket'}>
            Token bucket
          </Tile>
          <Tile compact state={mode === 'window' ? 'selected' : 'idle'} onClick={() => switchMode('window')} aria-pressed={mode === 'window'}>
            Fixed window
          </Tile>
        </div>
      )}

      {/* client → limiter → API */}
      <div className="tb-stage" style={{ height: stageH }}>
        <div className="tb-wire" style={{ top: wireY, left: clientX + 18, right: 22 + 18 }} />
        <div className="tb-node tb-node--client" style={{ top: wireY - 20, left: clientX - 20 }}>
          <Smartphone size={20} strokeWidth={2.4} />
          <span>Client</span>
        </div>
        <div className="tb-node tb-node--server" style={{ top: wireY - 20, left: serverX - 20 }}>
          <Server size={20} strokeWidth={2.4} />
          <span>API</span>
          <AnimatePresence>
            {flyers.length > 0 && flyers[flyers.length - 1].ok && (
              <motion.span
                key={flyers[flyers.length - 1].id}
                className="tb-node__ping"
                initial={{ opacity: 0, scale: 1 }}
                animate={{ opacity: [0, 0.8, 0], scale: [1, 1, 1.5] }}
                transition={{ duration: 0.5, delay: reduce ? 0 : 0.3, times: [0, 0.2, 1] }}
              />
            )}
          </AnimatePresence>
        </div>
        <div className="tb-jarwrap" style={{ top: wireY - 6, left: jarX - jar.W / 2 }}>
          <Jar capacity={capacity} level={lvl} mode={mode} uid={uid} reduce={reduce} flash={flash} />
        </div>
        {!reduce &&
          flyers.map((f) => (
            <motion.span
              key={f.id}
              className={['tb-req', f.ok ? 'is-ok' : 'is-bad'].join(' ')}
              style={{ top: wireY - 11, left: 0 }}
              initial={{ x: clientX - 18, y: 0, opacity: 0 }}
              animate={
                f.ok
                  ? { x: [clientX - 18, jarX - 18, serverX - 18], y: 0, opacity: [0, 1, 1, 0] }
                  : { x: [clientX - 18, jarX - 18, jarX - 70], y: [0, 0, 40], rotate: [0, 0, -18], opacity: [0, 1, 1, 0] }
              }
              transition={{
                duration: f.ok ? 0.62 : 0.7,
                ease: 'easeOut',
                x: { duration: f.ok ? 0.62 : 0.7, times: [0, 0.3, 1], ease: 'easeInOut' },
                y: { duration: 0.7, times: [0, 0.3, 1], ease: 'easeIn' },
                rotate: { duration: 0.7, times: [0, 0.3, 1] },
                opacity: { duration: f.ok ? 0.62 : 0.7, times: [0, 0.12, 0.85, 1] },
              }}
              onAnimationComplete={() => setFlyers((all) => all.filter((x) => x.id !== f.id))}
            >
              <span className="tb-req__base">req</span>
              <motion.span className="tb-req__status" initial={{ opacity: 0 }} animate={{ opacity: [0, 0, 1, 1] }} transition={{ duration: 0.6, times: [0, 0.28, 0.34, 1] }}>
                {f.ok ? '200' : '429'}
              </motion.span>
            </motion.span>
          ))}
        {reduce && flyers.length > 0 && (
          <span className={['tb-last', flyers[flyers.length - 1].ok ? 'is-ok' : 'is-bad'].join(' ')} style={{ top: wireY - 11, left: jarX + jar.W / 2 + 6 }}>
            {flyers[flyers.length - 1].ok ? '200' : '429'}
          </span>
        )}
      </div>

      <div className="tb-caption">
        {mode === 'bucket' ? (
          <>
            Refills {fmt(rate, 2)}/s · holds {capacity}
          </>
        ) : (
          <>
            {capacity} per {fmt(windowLen, 1)}s · resets in <span className="tabular">{resetIn.toFixed(1)}s</span>
          </>
        )}
      </div>
      {mode === 'window' && (
        <div className="tb-winbar" aria-hidden>
          <span style={{ width: `${Math.min(100, ((now - win.start) / win.window) * 100)}%` }} />
        </div>
      )}

      <div className="w-row tb-stats">
        <div className="w-stat">
          <span className="w-stat__label">{mode === 'bucket' ? 'Tokens' : 'Left'}</span>
          <span className="w-stat__value">
            {mode === 'bucket' ? lvl.toFixed(1) : String(capacity - win.count)}
            <small>/{capacity}</small>
          </span>
        </div>
        <div className="w-stat tb-stat--ok">
          <span className="w-stat__label">200 OK</span>
          <span className="w-stat__value">{totals.ok}</span>
        </div>
        <div className={['w-stat tb-stat--bad', totals.rejected ? 'is-on' : ''].join(' ')}>
          <span className="w-stat__label">429</span>
          <motion.span key={totals.rejected} className="w-stat__value" initial={totals.rejected && !reduce ? { scale: 1.3 } : false} animate={{ scale: 1 }} transition={SPRING}>
            {totals.rejected}
          </motion.span>
        </div>
      </div>

      {/* rolling timeline */}
      <div className="tb-tl">
        <div className="tb-tl__head">
          <span className="w-label">Last {SPAN}s</span>
          {compare && (
            <span className={['tb-peak', boundaryBurst ? 'is-warn' : ''].join(' ')}>
              Peak: {peak.count} in {fmt(span, 2)}s
            </span>
          )}
        </div>
        <svg className="tb-tl__svg" width={width} height={TL_H} viewBox={`0 0 ${width} ${TL_H}`} role="img" aria-label={`Timeline: ${accepted.length} accepted and ${eventsRef.current.length - accepted.length} rejected in the last ${SPAN} seconds`}>
          {secTicks.map((k) => (
            <line key={`s${k}`} x1={tx(k)} x2={tx(k)} y1={plotTop} y2={badY + 6} className="tb-tl__tick" />
          ))}
          <line x1={0} x2={width} y1={plotTop + plotH} y2={plotTop + plotH} className="tb-tl__base" />
          <line x1={0} x2={width} y1={plotTop} y2={plotTop} className="tb-tl__cap" />
          <text x={4} y={plotTop - 5} className="tb-tl__label">
            {mode === 'bucket' ? 'tokens' : 'left in window'}
          </text>
          {boundaryBurst && (
            <g>
              <rect x={tx(peak.from) - 5} y={2} width={Math.max(10, tx(peak.to) - tx(peak.from) + 10)} height={badY + 8} rx={6} className="tb-tl__band" />
            </g>
          )}
          {edges.map((e) => (
            <g key={`e${e}`}>
              <line x1={tx(e)} x2={tx(e)} y1={2} y2={badY + 8} className="tb-tl__edge" />
              {edgeGap >= 44 && (
                <text x={tx(e) + 3} y={plotTop - 5} className="tb-tl__edge-label">
                  reset
                </text>
              )}
            </g>
          ))}
          {area && <path d={area} className="tb-tl__area" />}
          {line && <path d={line} className="tb-tl__line" />}
          {eventsRef.current.map((e) => (
            <circle key={e.id} cx={tx(e.t)} cy={e.ok ? okY : badY} r={3.6} className={e.ok ? 'tb-tl__ok' : 'tb-tl__bad'} />
          ))}
          {/* lane labels sit on a little plate so old dots slide under them */}
          <rect x={0} y={okY - 9} width={30} height={badY - okY + 18} className="tb-tl__plate" />
          <text x={4} y={okY + 4} className="tb-tl__lane">
            200
          </text>
          <text x={4} y={badY + 4} className="tb-tl__lane">
            429
          </text>
          <line x1={plotW} x2={plotW} y1={2} y2={badY + 8} className="tb-tl__now" />
        </svg>
      </div>

      <AnimatePresence>
        {boundaryBurst && (
          <motion.div key="bb" className="tb-callout" initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={SPRING}>
            <TriangleAlert size={18} strokeWidth={2.6} />
            <span>
              <b>Boundary burst:</b> {peak.count} requests in {fmt(span, 2)}s, {peak.count >= 2 * capacity ? 'twice' : `${fmt(peak.count / capacity, 1)}×`} the {capacity}-per-window limit, because the counter reset mid-burst. A token bucket at the same rate caps any {fmt(span, 2)}s at {bucketBound}.
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      {mode === 'window' && !boundaryBurst && <p className="tb-tip">Try a burst just before the counter resets, then keep going right after.</p>}

      <div className="tb-controls">
        <Button
          size="md"
          variant="course"
          block
          feedback={false}
          className={['tb-send', holding ? 'is-holding' : ''].join(' ')}
          icon={holding ? <Zap size={18} strokeWidth={2.6} fill="currentColor" /> : <Send size={17} strokeWidth={2.6} />}
          onPointerDown={startHold}
          onPointerUp={stopHold}
          onPointerCancel={stopHold}
          onLostPointerCapture={stopHold}
          onContextMenu={(e) => e.preventDefault()}
          onClick={(e) => {
            // keyboard activation (pointer presses are handled on pointerdown)
            if (e.detail === 0) sendRef.current()
          }}
        >
          {holdLabel}
        </Button>
        <Button size="sm" variant="ghost" className="tb-reset" aria-label="Reset" icon={<RotateCcw size={14} strokeWidth={2.6} />} onClick={resetSim}>
          Reset
        </Button>
      </div>
      <p className="tb-hint">Tap to send one · hold for a burst of {holdRate}/s</p>
    </div>
  )
}
