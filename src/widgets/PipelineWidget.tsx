import { AnimatePresence, motion, useMotionValue, useReducedMotion, useReducedMotionConfig, useTransform, type MotionValue } from 'motion/react'
import { CheckCircle2, Minus, Pause, Play, Plus, RotateCcw, Snail, Target } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Button } from '../ui/Button'
import { Ticker } from '../ui/Ticker'
import { haptic, sfx } from '../ui/fx'
import type { PipelineConfig, WidgetProps } from './specs'
import {
  MAX_PER_STAGE,
  STAGES,
  bestThroughput,
  bottlenecks,
  defaultAllocation,
  peakBuffered,
  simulatePipeline,
  throughput,
  utilization,
  type Frame,
  type Loc,
} from './pipeline/model'
import './PipelineWidget.css'

const LABELS = ['Load', 'Resize', 'Filter', 'Save']
const IMG_HUES = ['--c-blue', '--c-violet', '--c-teal', '--c-orange', '--c-rose', '--c-amber', '--c-green', '--c-indigo']
const PILE = 3

const tileStyle = (img: number) => ({ ['--img' as string]: `var(${IMG_HUES[img % IMG_HUES.length]})` }) as CSSProperties
const fmtRate = (r: number) => (Number.isFinite(r) ? r.toFixed(2) : '–')

export default function PipelineWidget({ config, onComplete }: WidgetProps<PipelineConfig>) {
  const images = Math.max(4, Math.min(60, Math.round(config.images ?? 24)))
  const costs = useMemo(() => {
    const c = config.costs ?? { load: 1, resize: 2, filter: 4, save: 1 }
    return STAGES.map((s, i) => Math.max(0.25, Number(c[s] ?? [1, 2, 4, 1][i])))
  }, [config.costs])
  const budget = Math.max(4, Math.min(16, Math.round(config.budget ?? 8)))
  // a target no allocation within the budget can reach would make the step uncompletable: cap it at the best
  const target = useMemo(() => {
    const t = Number(config.target)
    return Math.min(Number.isFinite(t) && t > 0 ? t : 0.75, bestThroughput(budget, costs))
  }, [config.target, budget, costs])
  const goal = config.goal === 'explore' ? 'explore' : 'throughput'
  const reduceConfig = useReducedMotionConfig()
  const reduceOs = useReducedMotion()
  const reduce = Boolean(reduceConfig || reduceOs)

  const initialWorkers = useMemo(() => defaultAllocation(budget), [budget])
  const [workers, setWorkers] = useState<number[]>(initialWorkers)
  const [queue, setQueue] = useState(3)
  const [playing, setPlaying] = useState(false)
  const [started, setStarted] = useState(false)
  const [frameIdx, setFrameIdx] = useState(0)
  const [reached, setReached] = useState(false)
  const doneRef = useRef(false)
  const seenRef = useRef(new Set<string>())
  const completeRef = useRef(onComplete)
  completeRef.current = onComplete

  const run = useMemo(() => simulatePipeline({ workers, costs, queue, images }), [workers, costs, queue, images])
  const thr = throughput({ workers, costs })
  const bn = bottlenecks({ workers, costs })
  const util = utilization({ workers, costs }, thr)
  const peak = peakBuffered(run)
  const used = workers.reduce((a, b) => a + b, 0)
  const meanCost = costs.reduce((a, b) => a + b, 0) / 4
  const speed = 2.5 * meanCost // time units per second of animation (5 u/s with default costs)

  // ---- replay clock (motion value, so progress bars don't re-render React every frame)
  const clock = useMotionValue(0)
  const frames = run.frames
  const frameAt = (t: number) => {
    let lo = 0
    let hi = frames.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (frames[mid].t <= t + 1e-9) lo = mid
      else hi = mid - 1
    }
    return lo
  }
  useEffect(() => {
    clock.set(0)
    setFrameIdx(0)
  }, [run, clock])
  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const t = Math.min(run.total, clock.get() + dt * speed)
      clock.set(t)
      setFrameIdx(frameAt(t))
      if (t >= run.total) {
        setPlaying(false)
        return
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [playing, run, speed])

  // ---- goal
  const key = `${workers.join('')}-${queue}`
  const met = goal === 'throughput' ? thr >= target - 1e-9 : false
  // a config whose default allocation already meets the target still waits for the learner to act (run or
  // change something), so it never completes on mount, before any user gesture
  const [touched, setTouched] = useState(false)
  useEffect(() => {
    seenRef.current.add(key)
    const ok = goal === 'throughput' ? met && touched : seenRef.current.size >= 3
    if (!ok || doneRef.current) return
    doneRef.current = true
    setReached(true)
    sfx('correct')
    haptic('success')
    completeRef.current(true)
  }, [key, met, goal, touched])

  const restartWith = (play: boolean) => {
    clock.set(0)
    setFrameIdx(0)
    setPlaying(play)
  }
  const setAlloc = (s: number, d: number) => {
    setTouched(true)
    const next = workers.slice()
    next[s] += d
    setWorkers(next)
    if (started) setPlaying(true)
  }
  const setQ = (q: number) => {
    setTouched(true)
    setQueue(q)
    if (started) setPlaying(true)
  }
  const togglePlay = () => {
    setTouched(true)
    setStarted(true)
    if (playing) return setPlaying(false)
    if (clock.get() >= run.total - 1e-9) clock.set(0)
    setPlaying(true)
  }
  const resetAll = () => {
    setWorkers(initialWorkers)
    setQueue(3)
    setPlaying(false)
    setStarted(false)
    restartWith(false)
  }

  // before the first tick of a run, show every image still in the inbox
  const frame: Frame =
    !playing && frameIdx === 0 && clock.get() === 0
      ? { t: 0, locs: run.frames[0].locs.map(() => ({ at: 'src' }) as Loc) }
      : frames[Math.min(frameIdx, frames.length - 1)]
  const finished = frameIdx === frames.length - 1 && frames.length > 1 && clock.get() >= run.total - 1e-9
  const goalText = goal === 'throughput' ? `Reach a throughput of at least ${fmtRate(target)} images per time unit` : 'Try three different setups'
  const slowest = bn.length ? bn.map((s) => LABELS[s]).join(' & ') : null

  return (
    <div className="pipe">
      <AnimatePresence mode="wait" initial={false}>
        {reached ? (
          <motion.div
            key="done"
            className="w-goal"
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 520, damping: 20 }}
          >
            <CheckCircle2 size={18} strokeWidth={2.6} />
            <span>Goal reached</span>
          </motion.div>
        ) : (
          <motion.div key="todo" className="pipe-goal" exit={{ opacity: 0, y: -4 }} transition={{ duration: reduce ? 0 : 0.15 }}>
            <Target size={15} strokeWidth={2.6} />
            <span>{goalText}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pipe-stats">
        <div className={`w-stat pipe-stat${goal === 'throughput' ? (met ? ' pipe-stat--good' : '') : ''}`}>
          <span className="w-stat__label">Throughput</span>
          <span className="w-stat__value">
            <Ticker value={thr} duration={reduce ? 0 : 0.5} format={(n) => fmtRate(n)} />
            <small>/u</small>
          </span>
        </div>
        <div className="w-stat pipe-stat">
          <span className="w-stat__label">Batch</span>
          <span className="w-stat__value">
            <Ticker value={run.total} duration={reduce ? 0 : 0.5} format={(n) => `${Math.round(n)}`} />
            <small>u</small>
          </span>
        </div>
        <div className="w-stat pipe-stat" title="Most images waiting in queues at once: the memory the queues cost">
          <span className="w-stat__label">Queued</span>
          <span className="w-stat__value">
            <Ticker value={peak} duration={reduce ? 0 : 0.5} />
            <small>max</small>
          </span>
        </div>
      </div>

      <div className="pipe-card">
        <PipeHeader frame={frame} images={images} clock={clock} />
        <div className="pipe-line" style={{ ['--cap' as string]: queue } as CSSProperties}>
          {STAGES.map((_, s) => (
            <StageCol
              key={s}
              s={s}
              frame={frame}
              workers={workers[s]}
              cost={costs[s]}
              util={util[s]}
              bottleneck={bn.includes(s)}
              queue={queue}
              clock={clock}
              reduce={reduce}
            />
          ))}
        </div>
        <TileLayer frame={frame} layoutKey={key} reduce={reduce} />
      </div>

      <div className="pipe-transport">
        <Button size="sm" variant="course" icon={playing ? <Pause size={16} strokeWidth={2.6} /> : <Play size={16} strokeWidth={2.6} />} onClick={togglePlay}>
          {playing ? 'Pause' : finished ? 'Run again' : clock.get() > 0 ? 'Resume' : `Run ${images} images`}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          icon={<RotateCcw size={16} strokeWidth={2.6} />}
          onClick={resetAll}
          disabled={!started && key === `${initialWorkers.join('')}-3`}
        >
          Reset
        </Button>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={`${slowest}-${workers.join('')}`}
          className="pipe-insight"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: reduce ? 0 : 0.16 }}
        >
          {slowest ? (
            <>
              <b>{slowest}</b> {bn.length > 1 ? 'are' : 'is'} the bottleneck: {workers[bn[0]]} worker{workers[bn[0]] === 1 ? '' : 's'} ÷ {costs[bn[0]]} u ={' '}
              {fmtRate(thr)} images/u. Stages before it back up; stages after it wait.
            </>
          ) : (
            <>
              <b>Balanced.</b> Every stage keeps up at {fmtRate(thr)} images/u, so nobody waits for long.
            </>
          )}
        </motion.p>
      </AnimatePresence>

      <div className="pipe-alloc">
        <div className="pipe-alloc__head">
          <span className="w-label">Workers per stage</span>
          <span className={`pipe-budget${used === budget ? ' is-full' : ''}`}>
            {used} of {budget} used
          </span>
        </div>
        <div className="pipe-alloc__grid">
          {STAGES.map((_, s) => (
            <div key={s} className={`pipe-step${bn.includes(s) ? ' is-bn' : ''}`}>
              <span className="pipe-step__name">
                {LABELS[s]}
                <small>{costs[s]} u each</small>
              </span>
              <div className="pipe-step__ctl">
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Minus size={16} strokeWidth={2.8} />}
                  aria-label={`Fewer ${LABELS[s]} workers`}
                  disabled={workers[s] <= 1}
                  onClick={() => setAlloc(s, -1)}
                />
                <motion.span
                  key={workers[s]}
                  className="pipe-step__n tabular"
                  initial={reduce ? false : { scale: 1.4 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 600, damping: 18 }}
                >
                  {workers[s]}
                </motion.span>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Plus size={16} strokeWidth={2.8} />}
                  aria-label={`More ${LABELS[s]} workers`}
                  disabled={workers[s] >= MAX_PER_STAGE || used >= budget}
                  onClick={() => setAlloc(s, 1)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <label className="pipe-slider">
        <span className="w-label">Queue size</span>
        <span className="pipe-slider__val tabular">{queue}</span>
        <input
          className="w-slider"
          type="range"
          min={1}
          max={8}
          step={1}
          value={queue}
          onChange={(e) => setQ(Number(e.target.value))}
          aria-label="Queue size between stages"
        />
      </label>
    </div>
  )
}

function PipeHeader({ frame, images, clock }: { frame: Frame; images: number; clock: MotionValue<number> }) {
  const inbox = frame.locs.filter((l) => l.at === 'src').length
  const saved = frame.locs.filter((l) => l.at === 'done').length
  const time = useTransform(clock, (t) => `t = ${t.toFixed(1)}`)
  return (
    <div className="pipe-head">
      <div className="pipe-pile">
        <span className="pipe-pile__tiles">
          {Array.from({ length: PILE }, (_, k) => (
            <span key={k} className="pipe-place" data-place={`in:${PILE - 1 - k}`} />
          ))}
        </span>
        <span className="pipe-pile__label">
          <b className="tabular">{inbox}</b>
          <span className="pipe-pile__word"> to go</span>
        </span>
      </div>
      <motion.span className="pipe-clock tabular">{time}</motion.span>
      <div className="pipe-pile pipe-pile--out">
        <span className="pipe-pile__label">
          <b className="tabular">
            {saved}/{images}
          </b>
          <span className="pipe-pile__word"> saved</span>
        </span>
        <span className="pipe-pile__tiles">
          {Array.from({ length: PILE }, (_, k) => (
            <span key={k} className="pipe-place" data-place={`out:${k}`} />
          ))}
        </span>
      </div>
    </div>
  )
}

function StageCol({
  s,
  frame,
  workers,
  cost,
  util,
  bottleneck,
  queue,
  clock,
  reduce,
}: {
  s: number
  frame: Frame
  workers: number
  cost: number
  util: number
  bottleneck: boolean
  queue: number
  clock: MotionValue<number>
  reduce: boolean
}) {
  const slots: (Extract<Loc, { at: 'work' }> & { img: number })[] = []
  const inQ: { img: number; slot: number }[] = []
  frame.locs.forEach((l, img) => {
    if (l.at === 'work' && l.stage === s) slots[l.worker] = { ...l, img }
    if (l.at === 'queue' && l.q === s) inQ.push({ img, slot: l.slot })
  })
  inQ.sort((a, b) => a.slot - b.slot)
  const blocked = slots.some((w) => w?.blocked)
  const full = s < 3 && inQ.length >= queue
  return (
    <>
      <div className={`pipe-stage${bottleneck ? ' is-bn' : ''}${blocked ? ' is-blocked' : ''}`}>
        <span className="pipe-stage__name">{LABELS[s]}</span>
        <div className="pipe-stage__slots" data-n={workers}>
          {Array.from({ length: workers }, (_, w) => {
            const job = slots[w]
            return (
              <span key={w} className={`pipe-slot${job ? (job.blocked ? ' is-blocked' : ' is-busy') : ''}`} data-place={`w:${s}:${w}`}>
                {job && !job.blocked && <SlotProgress clock={clock} start={job.start} end={job.end} />}
              </span>
            )
          })}
        </div>
        <span className="pipe-util" title="Steady-state utilization">
          <span className="pipe-util__bar">
            <motion.i initial={false} animate={{ scaleX: util }} transition={{ type: 'spring', stiffness: 200, damping: 28 }} />
          </span>
          <span className="tabular">{Math.round(util * 100)}%</span>
        </span>
        {bottleneck && (
          <motion.span
            className="pipe-stage__flag"
            initial={reduce ? false : { scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 18 }}
            title="Bottleneck"
          >
            <Snail size={13} strokeWidth={2.6} />
          </motion.span>
        )}
        <span className="visually-hidden">
          {LABELS[s]}: {workers} worker{workers === 1 ? '' : 's'}, {cost} time unit{cost === 1 ? '' : 's'} per image{bottleneck ? ', bottleneck' : ''}
          {blocked ? ', blocked by a full queue' : ''}
        </span>
      </div>
      {s < 3 && (
        <div className={`pipe-queue${full ? ' is-full' : ''}`} aria-label={`Queue ${s + 1}: ${inQ.length} of ${queue}`}>
          {Array.from({ length: queue }, (_, k) => (
            <span key={k} className={`pipe-qslot${inQ.some((x) => x.slot === k) ? ' is-taken' : ''}`} data-place={`q:${s}:${k}`} />
          ))}
        </div>
      )}
    </>
  )
}

function SlotProgress({ clock, start, end }: { clock: MotionValue<number>; start: number; end: number }) {
  const scaleX = useTransform(clock, (t) => Math.max(0, Math.min(1, (t - start) / Math.max(1e-6, end - start))))
  return (
    <span className="pipe-slot__prog">
      <motion.i style={{ scaleX }} />
    </span>
  )
}

type Place = { x: number; y: number; w: number; h: number }

/**
 * Every image is one persistent element in an overlay layer that springs to
 * the measured box of its current place (inbox pile, worker slot, queue slot,
 * saved pile). Places only move when the layout changes, so they are
 * measured on layout changes and resizes, not on every frame.
 */
function TileLayer({ frame, layoutKey, reduce }: { frame: Frame; layoutKey: string; reduce: boolean }) {
  const [places, setPlaces] = useState<Map<string, Place>>(new Map())
  const layerRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    // the layer's own ref is attached before this effect runs (a parent's ref would not be yet)
    const card = layerRef.current?.parentElement
    if (!card) return
    let alive = true
    const measure = () => {
      if (!alive) return
      const c = card.getBoundingClientRect()
      // undo any ancestor scale (an entrance animation) so places are in the card's own CSS pixels
      const sx = card.offsetWidth ? c.width / card.offsetWidth : 1
      const sy = card.offsetHeight ? c.height / card.offsetHeight : 1
      const m = new Map<string, Place>()
      card.querySelectorAll<HTMLElement>('[data-place]').forEach((el) => {
        const r = el.getBoundingClientRect()
        m.set(el.dataset.place!, { x: (r.left - c.left) / sx, y: (r.top - c.top) / sy, w: r.width / sx, h: r.height / sy })
      })
      setPlaces(m)
    }
    measure()
    // web fonts can shift the slots without resizing the card
    void document.fonts?.ready.then(measure)
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    ro?.observe(card)
    return () => {
      alive = false
      ro?.disconnect()
    }
  }, [layoutKey])

  const inbox = frame.locs.map((l, i) => (l.at === 'src' ? i : -1)).filter((i) => i >= 0)
  const nDone = frame.locs.filter((l) => l.at === 'done').length
  const spring = reduce ? { duration: 0 } : { type: 'spring' as const, stiffness: 700, damping: 46, mass: 0.6 }
  return (
    <div className="pipe-tiles" ref={layerRef} aria-hidden>
      {frame.locs.map((l, i) => {
        let place: string
        let visible = true
        let z = 5
        let done = 0
        if (l.at === 'src') {
          const k = inbox.indexOf(i)
          place = `in:${Math.min(k, PILE - 1)}`
          visible = k < PILE
          z = PILE - k
        } else if (l.at === 'done') {
          const k = nDone - 1 - l.order
          place = `out:${Math.min(k, PILE - 1)}`
          visible = k < PILE
          z = PILE - k
          done = 4
        } else if (l.at === 'work') {
          place = `w:${l.stage}:${l.worker}`
          done = l.blocked ? l.stage + 1 : l.stage
          z = 6
        } else {
          place = `q:${l.q}:${l.slot}`
          done = l.q + 1
        }
        const p = places.get(place)
        if (!p) return null
        return (
          <motion.span
            key={i}
            className="pipe-tile"
            data-done={done}
            style={{ ...tileStyle(i), zIndex: z }}
            initial={false}
            animate={{ x: p.x, y: p.y, width: p.w, height: p.h, opacity: visible ? 1 : 0 }}
            transition={spring}
          >
            <i />
          </motion.span>
        )
      })}
    </div>
  )
}
