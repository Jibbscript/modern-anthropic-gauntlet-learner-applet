import { AnimatePresence, motion, useReducedMotion, useReducedMotionConfig } from 'motion/react'
import { CheckCircle2, Lock, RotateCcw, Target } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Button } from '../ui/Button'
import { Tile } from '../ui/Tile'
import { Ticker } from '../ui/Ticker'
import { haptic, sfx } from '../ui/fx'
import type { PoolConfig, WidgetProps } from './specs'
import { bestWall, simulatePool, type Executor, type PoolResult, type SegKind, type TaskKind } from './pool/model'
import './PoolWidget.css'

const EXECUTORS: { id: Executor; label: string }[] = [
  { id: 'thread', label: 'Threads' },
  { id: 'process', label: 'Processes' },
  { id: 'async', label: 'Async' },
]
const KINDS: { id: TaskKind; label: string }[] = [
  { id: 'cpu', label: 'CPU-bound' },
  { id: 'io', label: 'I/O-bound' },
]
const DEFAULT_EXECUTOR: Executor = 'thread'
const DEFAULT_WORKERS = 2
const DRAW_S = 0.6
/** a setup must stay unchanged this long to count (goal 'fastest' and 'explore') */
const SETTLE_MS = 600

// chart geometry (viewBox units)
const VB_W = 320
const LABEL_W = 26
const X0 = LABEL_W + 2
const X1 = VB_W - 6
const TOP = 16
const ROWS_H = 120
const LANE_GAP = 6
const LANE_H = 13
const AXIS_H = 16

export default function PoolWidget({ config, onComplete }: WidgetProps<PoolConfig>) {
  const tasks = Math.max(1, Math.min(16, Math.round(config.tasks ?? 8)))
  const cores = Math.max(1, Math.min(16, Math.round(config.cores ?? 4)))
  const locked = useMemo(() => new Set(config.lockControls ?? []), [config.lockControls])
  const goal = config.goal === 'explore' ? 'explore' : 'fastest'
  const initial = useMemo(
    () => ({ kind: (config.kind === 'io' ? 'io' : 'cpu') as TaskKind, executor: DEFAULT_EXECUTOR, workers: DEFAULT_WORKERS }),
    [config.kind],
  )
  // app setting (via MotionConfig) or the OS preference
  const reduceConfig = useReducedMotionConfig()
  const reduceOs = useReducedMotion()
  const reduce = Boolean(reduceConfig || reduceOs)

  const [kind, setKind] = useState<TaskKind>(initial.kind)
  const [executor, setExecutor] = useState<Executor>(initial.executor)
  const [workers, setWorkers] = useState(initial.workers)
  const [reached, setReached] = useState(false)
  const doneRef = useRef(false)
  const seenRef = useRef(new Set<string>())
  const completeRef = useRef(onComplete)
  completeRef.current = onComplete

  const params = { executor, workers, kind, tasks, cores }
  const result = useMemo(() => simulatePool({ executor, workers, kind, tasks, cores }), [executor, workers, kind, tasks, cores])
  const best = useMemo(
    () => bestWall({ executor, workers, kind, tasks, cores }, { executor: locked.has('executor'), workers: locked.has('workers') }),
    [executor, workers, kind, tasks, cores, locked],
  )
  // a fixed time axis per task kind (the slowest combo), so faster setups visibly shrink
  const tMax = useMemo(() => {
    let m = 0
    for (const ex of ['thread', 'process', 'async'] as Executor[])
      for (let w = 1; w <= 8; w++) m = Math.max(m, simulatePool({ ...params, executor: ex, workers: w }).wall)
    return Math.ceil(m)
  }, [kind, tasks, cores])

  // async ignores the worker count, so every async setup of a task kind is the same setup
  const key = `${executor}-${executor === 'async' ? 1 : workers}-${kind}`
  const fastest = result.wall <= best.wall * 1.1 + 1e-9
  useEffect(() => {
    if (doneRef.current) return
    // a setup counts once it has stayed put for the chart's draw (cancelled if the setup changes first),
    // so scrubbing the slider past a good value, or through three values, does not complete the goal
    const t = window.setTimeout(
      () => {
        seenRef.current.add(key)
        const met = goal === 'fastest' ? fastest : seenRef.current.size >= 3
        if (!met || doneRef.current) return
        doneRef.current = true
        setReached(true)
        sfx('correct')
        haptic('success')
        completeRef.current(true)
      },
      // independent of reduced motion: settling is about the learner's choice, not the animation
      SETTLE_MS,
    )
    return () => window.clearTimeout(t)
  }, [key, fastest, goal])

  const reset = () => {
    setKind(initial.kind)
    setExecutor(initial.executor)
    setWorkers(initial.workers)
  }
  const speedup = result.sequential / result.wall
  const goalText =
    goal === 'fastest'
      ? `Find a setup within 10% of the fastest possible for ${kind === 'cpu' ? 'CPU-bound' : 'I/O-bound'} tasks`
      : 'Try three different setups'

  return (
    <div className="pool">
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
            <span>
              Goal reached
              {goal === 'fastest' && <span className="pool-goal__detail"> · fastest possible is {best.wall.toFixed(1)} s</span>}
            </span>
          </motion.div>
        ) : (
          <motion.div key="todo" className="pool-goal" exit={{ opacity: 0, y: -4 }} transition={{ duration: reduce ? 0 : 0.15 }}>
            <Target size={15} strokeWidth={2.6} />
            <span>{goalText}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pool-stats">
        <div className={`w-stat pool-stat${fastest && goal === 'fastest' ? ' pool-stat--good' : ''}`}>
          <span className="w-stat__label">Wall time</span>
          <span className="w-stat__value">
            <Ticker value={result.wall} duration={reduce ? 0 : DRAW_S} format={(n) => `${n.toFixed(1)} s`} />
          </span>
        </div>
        <div className="w-stat pool-stat">
          <span className="w-stat__label">Speedup</span>
          <span className="w-stat__value">
            <Ticker value={speedup} duration={reduce ? 0 : DRAW_S} format={(n) => `${n.toFixed(1)}×`} />
          </span>
        </div>
        <div className="w-stat pool-stat pool-stat--meta">
          <span className="w-stat__label">Machine</span>
          <span className="w-stat__value">
            {cores} core{cores === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      <Gantt result={result} tMax={tMax} drawKey={key} reduce={reduce} />
      <Legend result={result} />

      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={`${executor}-${kind}-${workers >= tasks}`}
          className="pool-insight"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
        >
          {insight(executor, kind, workers, tasks, cores)}
        </motion.p>
      </AnimatePresence>

      <div className="pool-controls">
        <div className="pool-group">
          <span className="w-label">Executor {locked.has('executor') && <Lock size={11} strokeWidth={2.8} />}</span>
          <div className="pool-tiles pool-tiles--3" role="radiogroup" aria-label="Executor">
            {EXECUTORS.map((e) => (
              <Tile
                key={e.id}
                compact
                role="radio"
                aria-checked={executor === e.id}
                state={executor === e.id ? 'selected' : locked.has('executor') ? 'dimmed' : 'idle'}
                disabled={locked.has('executor')}
                onClick={() => setExecutor(e.id)}
              >
                {e.label}
              </Tile>
            ))}
          </div>
        </div>

        <label className={`pool-slider${locked.has('workers') || executor === 'async' ? ' is-off' : ''}`}>
          <span className="w-label">
            {executor === 'process' ? 'Processes' : 'Threads'} {locked.has('workers') && <Lock size={11} strokeWidth={2.8} />}
          </span>
          <span className="pool-slider__val tabular">{executor === 'async' ? '1 · event loop' : workers}</span>
          <input
            className="w-slider"
            type="range"
            min={1}
            max={8}
            step={1}
            value={executor === 'async' ? 1 : workers}
            disabled={locked.has('workers') || executor === 'async'}
            onChange={(e) => setWorkers(Number(e.target.value))}
            aria-label="Workers"
          />
        </label>

        <div className="pool-group">
          <span className="w-label">Tasks {locked.has('kind') && <Lock size={11} strokeWidth={2.8} />}</span>
          <div className="pool-tiles pool-tiles--2" role="radiogroup" aria-label="Task kind">
            {KINDS.map((k) => (
              <Tile
                key={k.id}
                compact
                role="radio"
                aria-checked={kind === k.id}
                state={kind === k.id ? 'selected' : locked.has('kind') ? 'dimmed' : 'idle'}
                disabled={locked.has('kind')}
                onClick={() => setKind(k.id)}
              >
                <span className="pool-kind">
                  <b>
                    {tasks} × {k.label}
                  </b>
                  <small>{k.id === 'cpu' ? '1 s of CPU each' : '0.2 s CPU + 1 s wait'}</small>
                </span>
              </Tile>
            ))}
          </div>
        </div>
      </div>

      <div className="pool-footer">
        <Button
          size="sm"
          variant="ghost"
          icon={<RotateCcw size={15} strokeWidth={2.6} />}
          onClick={reset}
          disabled={kind === initial.kind && executor === initial.executor && workers === initial.workers}
        >
          Reset
        </Button>
      </div>
    </div>
  )
}

function insight(ex: Executor, kind: TaskKind, w: number, tasks: number, cores: number): string {
  if (ex === 'thread' && kind === 'cpu') return 'Only the thread holding the GIL runs Python. CPU work takes turns, so extra threads add nothing.'
  if (ex === 'thread')
    return w >= tasks
      ? 'Every task waits at the same time, so the batch costs about one wait.'
      : 'A waiting thread releases the GIL, so waits overlap. More threads, more overlap.'
  if (ex === 'process' && kind === 'cpu')
    return `Each process has its own interpreter and GIL: CPU work runs in parallel on up to ${cores} cores. Each spawn costs 0.3 s.`
  if (ex === 'process') return 'Processes overlap waits too, but you pay startup and pickling for parallelism the waits never needed.'
  if (kind === 'cpu') return 'One thread and no pre-emption: a coroutine that never awaits holds the loop. CPU work runs one task at a time.'
  return 'While one coroutine awaits I/O, the loop runs the next. One thread overlaps every wait.'
}

function Gantt({ result, tMax, drawKey, reduce }: { result: PoolResult; tMax: number; drawKey: string; reduce: boolean }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const n = result.rows.length
  const rowH = Math.min(24, ROWS_H / n)
  const hasLane = result.executor !== 'process'
  // the frame keeps one height for every setup (no layout jump under the controls); the rows and the
  // GIL / loop lane sit together, centred in it, instead of leaving a hole when there are few rows
  const AREA_H = ROWS_H + LANE_GAP + LANE_H
  const blockH = n * rowH + (hasLane ? LANE_GAP + LANE_H : 0)
  const rowsTop = TOP + Math.max(0, (AREA_H - blockH) / 2)
  const laneY = rowsTop + n * rowH + LANE_GAP
  const axisY = TOP + AREA_H + 6
  const H = axisY + AXIS_H
  const x = (t: number) => X0 + (t / tMax) * (X1 - X0)
  const step = tMax > 10 ? 2 : 1
  const ticks = Array.from({ length: Math.floor(tMax / step) + 1 }, (_, i) => i * step)
  const wallX = x(result.wall)
  const seqX = x(result.sequential)
  const ease = [0.22, 1, 0.36, 1] as const
  const draw = reduce ? { duration: 0 } : { duration: DRAW_S, ease }
  const barH = Math.max(3, Math.min(17, rowH - (rowH > 12 ? 6 : 3)))
  const laneLabel = result.executor === 'thread' ? 'GIL' : 'loop'

  return (
    <div className="pool-chart">
      <svg
        viewBox={`0 0 ${VB_W} ${H}`}
        role="img"
        aria-label={`Timeline: ${n} ${result.executor === 'async' ? 'coroutines' : 'workers'}, wall time ${result.wall.toFixed(2)} seconds`}
      >
        <defs>
          <pattern id={`hatch-${uid}`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="4" height="4" className="pool-hatch-bg" />
            <line x1="0" y1="0" x2="0" y2="4" className="pool-hatch-line" />
          </pattern>
          <clipPath id={`clip-${uid}`}>
            <motion.rect key={drawKey} x={0} y={0} height={H} initial={{ width: reduce ? wallX + 4 : X0 }} animate={{ width: wallX + 4 }} transition={draw} />
          </clipPath>
        </defs>

        {/* grid */}
        <rect x={X0} y={laneY} width={X1 - X0} height={LANE_H} rx={3} className="pool-lane-track" style={{ display: hasLane ? undefined : 'none' }} />
        {ticks.map((t, i) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={TOP - 2} y2={axisY - 2} className="pool-grid" />
            <text x={x(t)} y={axisY + 9} className="pool-axis">
              {i === ticks.length - 1 ? `${t} s` : t}
            </text>
          </g>
        ))}

        {/* row labels */}
        {result.rows.map((r, i) => (
          <text key={i} x={LABEL_W - 3} y={rowsTop + i * rowH + rowH / 2} dy="0.35em" className="pool-rowlabel" style={{ fontSize: Math.min(10, rowH * 0.75) }}>
            {r.label}
          </text>
        ))}
        {hasLane && (
          <text x={LABEL_W - 3} y={laneY + LANE_H / 2} dy="0.35em" className="pool-rowlabel pool-rowlabel--lane">
            {laneLabel}
          </text>
        )}

        <g clipPath={`url(#clip-${uid})`}>
          {result.rows.map((r, i) =>
            r.bars.map((b, j) => (
              <rect
                key={`${i}-${j}`}
                x={x(b.start) + 0.3}
                y={rowsTop + i * rowH + (rowH - barH) / 2}
                width={Math.max(0.8, x(b.end) - x(b.start) - 0.6)}
                height={barH}
                rx={Math.min(3, barH / 2)}
                className={`pool-bar pool-bar--${b.kind}`}
                fill={b.kind === 'ready' ? `url(#hatch-${uid})` : undefined}
              />
            )),
          )}
          {hasLane &&
            result.token.map((t, i) => {
              const w = x(t.end) - x(t.start)
              return (
                <g key={i}>
                  <rect
                    x={x(t.start) + 0.4}
                    y={laneY}
                    width={Math.max(0.8, w - 0.8)}
                    height={LANE_H}
                    rx={3}
                    className={`pool-token pool-token--${t.row % 2}`}
                  />
                  {w >= 11 && (
                    <text x={x(t.start) + w / 2} y={laneY + LANE_H / 2} dy="0.35em" className="pool-token__label">
                      {t.row + 1}
                    </text>
                  )}
                </g>
              )
            })}
        </g>

        {/* sequential reference */}
        {Math.abs(seqX - wallX) > 2 && (
          <g className="pool-seq">
            <line x1={seqX} x2={seqX} y1={TOP - 4} y2={axisY - 2} />
            {/* both labels sit left of their lines; drop this one where it would run into the wall-time label */}
            {Math.abs(seqX - wallX) > 46 && (
              <text x={seqX - 3} y={TOP - 6} textAnchor="end">
                1 worker
              </text>
            )}
          </g>
        )}
        {/* wall-time cursor sweeps with the drawing */}
        <motion.g key={drawKey} className="pool-wall" initial={{ x: reduce ? wallX : X0 }} animate={{ x: wallX }} transition={draw}>
          <line x1={0} x2={0} y1={TOP - 4} y2={axisY - 2} />
          <motion.text
            x={-3}
            y={TOP - 6}
            textAnchor="end"
            initial={{ opacity: reduce ? 1 : 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: reduce ? 0 : DRAW_S * 0.8 }}
          >
            {result.wall.toFixed(1)} s
          </motion.text>
        </motion.g>
      </svg>
    </div>
  )
}

const LEGEND: Record<SegKind, string> = { cpu: 'CPU', wait: 'Waiting on I/O', over: 'Startup / pickling', ready: 'Waiting' }

function Legend({ result }: { result: PoolResult }) {
  const kinds = new Set<SegKind>()
  result.rows.forEach((r) => r.bars.forEach((b) => kinds.add(b.kind)))
  const order: SegKind[] = ['cpu', 'wait', 'ready', 'over']
  const readyLabel = result.executor === 'thread' ? 'Waiting for the GIL' : result.executor === 'process' ? 'Waiting for a core' : 'Waiting for the loop'
  return (
    <div className="pool-legend">
      {order
        .filter((k) => kinds.has(k))
        .map((k) => (
          <span key={k} className="pool-legend__item">
            <i className={`pool-swatch pool-swatch--${k}`} />
            {k === 'ready' ? readyLabel : LEGEND[k]}
          </span>
        ))}
    </div>
  )
}
