import { AnimatePresence, LayoutGroup, motion, useReducedMotion, useReducedMotionConfig } from 'motion/react'
import { CheckCircle2, Lock, Pause, Play, RotateCcw, StepForward, Target } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Button } from '../ui/Button'
import { Tile } from '../ui/Tile'
import { haptic, sfx } from '../ui/fx'
import type { CrawlerConfig, WidgetProps } from './specs'
import { GRAPHS, type SiteGraph } from './crawler/graphs'
import { edgeGeometry, NODE_R, VIEW_H, VIEW_W } from './crawler/geometry'
import { crawlable, initCrawl, stepCrawl, type CrawlEvent, type CrawlOptions, type CrawlState, type Dedupe } from './crawler/model'
import './CrawlerWidget.css'

const TICK_MS = 340
const WORKER_COLORS = ['var(--c-blue)', 'var(--c-orange)', 'var(--c-green)', 'var(--c-slate)']
const HOST_COLORS = ['var(--c, var(--select))', 'var(--c-violet)', 'var(--c-amber)']
const CHIP_W = 26 // chip + gap

const DEDUPE: { id: Dedupe; label: string; blurb: (cap: number) => string }[] = [
  { id: 'none', label: 'None', blurb: (cap) => `No visited set: every link is fetched, again and again. Capped at ${cap} fetches so it stops.` },
  {
    id: 'check-then-add',
    label: 'Check, then add',
    blurb: () => 'Check visited when a URL is dequeued, add it after the fetch. Two workers can grab the same URL in between.',
  },
  { id: 'atomic', label: 'Atomic', blurb: () => 'Check and add under one lock when enqueuing, so each URL enters the queue exactly once.' },
]

const hostVar = (host: number) => ({ ['--host' as string]: HOST_COLORS[host] ?? HOST_COLORS[0] }) as CSSProperties
const workerVar = (w: number) => ({ ['--wc' as string]: WORKER_COLORS[w] }) as CSSProperties

export default function CrawlerWidget({ config, onComplete }: WidgetProps<CrawlerConfig>) {
  const graph: SiteGraph = GRAPHS[config.graph ?? 'small'] ?? GRAPHS.small
  const locked = useMemo(() => new Set(config.lockControls ?? []), [config.lockControls])
  const goal = config.goal === 'no-dupes' ? 'no-dupes' : 'finish'
  // app setting (via MotionConfig) or the OS preference
  const reduceConfig = useReducedMotionConfig()
  const reduceOs = useReducedMotion()
  const reduce = Boolean(reduceConfig || reduceOs)

  const [opts, setOpts] = useState<CrawlOptions>(() => ({
    workers: Math.max(1, Math.min(4, Math.round(config.workers ?? 2))),
    dedupe: config.dedupe && DEDUPE.some((d) => d.id === config.dedupe) ? config.dedupe : 'check-then-add',
    sameHost: config.sameHost ?? true,
  }))
  const [sim, setSim] = useState<CrawlState>(() => initCrawl(graph, opts))
  const [playing, setPlaying] = useState(false)
  const [reached, setReached] = useState(false)
  const doneRef = useRef(false)
  const dupHeardRef = useRef(false)
  const completeRef = useRef(onComplete)
  completeRef.current = onComplete

  // how many frontier chips fit on one line
  const chipsRef = useRef<HTMLDivElement>(null)
  const [maxChips, setMaxChips] = useState(8)
  useEffect(() => {
    const el = chipsRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => setMaxChips(Math.max(3, Math.floor((el.clientWidth - 30) / CHIP_W))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const groupId = useId()
  const edges = useMemo(() => edgeGeometry(graph), [graph])
  const reach = useMemo(() => crawlable(graph, opts.sameHost), [graph, opts.sameHost])

  // play loop: one tick every TICK_MS; stops on pause, finish and unmount
  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => setSim((s) => (s.finished ? s : stepCrawl(graph, opts, s))), TICK_MS)
    return () => window.clearInterval(id)
  }, [playing, graph, opts])

  useEffect(() => {
    if (sim.finished) setPlaying(false)
  }, [sim.finished])

  // the "aha": first duplicate fetch of a run gets a sound
  useEffect(() => {
    if (!dupHeardRef.current && sim.events.some((e) => e.kind === 'start' && e.dup)) {
      dupHeardRef.current = true
      sfx('wrong')
      haptic('error')
    }
  }, [sim.events])

  const goalMet = sim.finished && (goal === 'finish' || (opts.workers >= 2 && sim.dupes === 0 && !sim.capped))
  useEffect(() => {
    if (!goalMet || doneRef.current) return
    doneRef.current = true
    setReached(true)
    sfx('correct')
    haptic('success')
    completeRef.current(true)
  }, [goalMet])

  const restart = (o: CrawlOptions = opts) => {
    setSim(initCrawl(graph, o))
    dupHeardRef.current = false
  }
  const change = (patch: Partial<CrawlOptions>) => {
    const o = { ...opts, ...patch }
    setOpts(o)
    setPlaying(false)
    restart(o)
  }
  const togglePlay = () => {
    if (sim.finished) {
      restart()
      setPlaying(true)
      return
    }
    setPlaying((p) => !p)
  }
  const stepOnce = () => {
    setPlaying(false)
    setSim((s) => (s.finished ? s : stepCrawl(graph, opts, s)))
  }

  // ---- derived view state
  const n = graph.pages.length
  const queued = new Array<number>(n).fill(0)
  sim.queue.forEach((e) => queued[e.page]++)
  const fetchers: number[][] = graph.pages.map(() => [])
  sim.workers.forEach((w, i) => w.page >= 0 && fetchers[w.page].push(i))
  const inFlightTwice = (page: number) => queued[page] + fetchers[page].length > 1
  const fresh = new Set(sim.events.filter((e) => e.kind === 'done').map((e) => e.page))
  const dupBurst = new Set(sim.events.filter((e) => e.kind === 'start' && e.dup).map((e) => e.page))
  const dropped = new Set(sim.events.flatMap((e) => (e.kind === 'drop' ? [e.entry] : [])))
  const uniqueDone = sim.done.filter(Boolean).length
  // the dedupe set: filled at enqueue time (atomic) or only after a fetch completes (check-then-add)
  const visited = sim.visited.flatMap((v, i) => (v ? [i] : []))
  const hostsShown = graph.hosts.filter((_, h) => graph.pages.some((p) => p.host === h))
  const multiHost = hostsShown.length > 1
  const mode = DEDUPE.find((d) => d.id === opts.dedupe)!

  /** why worker `wi` is fetching `page` a second time: a race on an in-flight page, or no memory at all */
  const dupMessage = (wi: number, page: number, fresh: boolean) => {
    const label = graph.pages[page].label
    const other = sim.workers.findIndex((w, i) => i !== wi && w.page === page && !w.dup)
    if (!fresh) return other >= 0 ? `W${other + 1} and W${wi + 1} are both fetching ${label}. One fetch is wasted.` : `W${wi + 1} is fetching ${label} a second time.`
    if (opts.dedupe === 'check-then-add' && other >= 0) return `W${wi + 1} grabs ${label} while W${other + 1} is still fetching it: not in visited yet.`
    if (other >= 0) return `W${wi + 1} fetches ${label} too, while W${other + 1} is on it. No visited set.`
    return `W${wi + 1} fetches ${label} again: nothing remembers it was fetched.`
  }

  const status = (() => {
    if (sim.finished) {
      const pages = `${uniqueDone} page${uniqueDone === 1 ? '' : 's'}`
      if (sim.capped) return `Hit the ${sim.cap}-fetch cap after ${sim.tick} ticks. Without a visited set this crawl never ends.`
      return `Crawled ${pages} in ${sim.tick} ticks with ${sim.totalFetches} fetches.`
    }
    if (sim.tick === 0) return `Start from page ${graph.pages[0].label} (${graph.hosts[0]}). Press play or step.`
    const dup = sim.events.find((e): e is Extract<CrawlEvent, { kind: 'start' }> => e.kind === 'start' && e.dup)
    if (dup) return dupMessage(dup.worker, dup.page, true)
    const drop = sim.events.find((e) => e.kind === 'drop')
    if (drop) return `${graph.pages[drop.page].label} is in visited by now, so W${drop.worker + 1} drops it.`
    const skip = sim.events.find((e) => e.kind === 'skip')
    if (skip) return `${graph.pages[skip.page].label} is on ${graph.hosts[graph.pages[skip.page].host]}: skipped (off-host).`
    // keep the duplicate in view for as long as the wasted fetch runs
    const dupWorker = sim.workers.findIndex((w) => w.page >= 0 && w.dup)
    if (dupWorker >= 0) return dupMessage(dupWorker, sim.workers[dupWorker].page, false)
    return `${sim.queue.length} URL${sim.queue.length === 1 ? '' : 's'} in the frontier, ${sim.workers.filter((w) => w.page >= 0).length} fetching.`
  })()

  const goalText = goal === 'no-dupes' ? 'Crawl every page with 2+ workers and zero duplicate fetches' : 'Run a crawl all the way to the end'

  return (
    <div className="crawl">
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
          <motion.div key="todo" className="crawl-goal" exit={{ opacity: 0, y: -4 }} transition={{ duration: reduce ? 0 : 0.15 }}>
            <Target size={15} strokeWidth={2.6} />
            <span>{goalText}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="crawl-stats">
        <Stat label="Pages" value={`${uniqueDone}/${reach.size}`} />
        <Stat label="Fetches" value={sim.totalFetches} />
        <Stat label="Dupes" value={sim.dupes} tone={sim.dupes > 0 ? 'bad' : undefined} bump={dupBurst.size > 0} />
        <Stat label="Ticks" value={sim.tick} />
      </div>

      <LayoutGroup id={groupId}>
        <div className="crawl-card">
          <div className="crawl-legend" aria-hidden>
            {hostsShown.map((h) => {
              const hi = graph.hosts.indexOf(h)
              const off = hi !== graph.pages[0].host
              return (
                <span key={h} className={`crawl-legend__item${off && opts.sameHost ? ' crawl-legend__item--off' : ''}`} style={hostVar(hi)}>
                  <i />
                  {h}
                  {off && opts.sameHost ? ' · skipped' : ''}
                </span>
              )
            })}
          </div>
          <svg className="crawl-graph" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} role="img" aria-label={`Site graph with ${n} pages. ${status}`}>
            <g>
              {edges.map((e, i) => {
                const offHost = opts.sameHost && graph.pages[e.to].host !== graph.pages[0].host
                const cls = ['crawl-edge', sim.done[e.from] && 'crawl-edge--walked', offHost && 'crawl-edge--off'].filter(Boolean).join(' ')
                return (
                  <g key={i} className={cls}>
                    <path d={e.d} />
                    <polygon points={e.head} />
                  </g>
                )
              })}
              {!reduce &&
                edges.map((e, i) =>
                  fresh.has(e.from) ? (
                    <motion.path
                      key={`f${sim.tick}-${i}`}
                      className="crawl-edge-fresh"
                      d={e.d}
                      initial={{ pathLength: 0, opacity: 1 }}
                      animate={{ pathLength: 1, opacity: [1, 1, 0] }}
                      transition={{ duration: 0.7, ease: 'easeOut', times: [0, 0.6, 1] }}
                    />
                  ) : null,
                )}
            </g>
            {graph.pages.map((p, i) => {
              const fw = fetchers[i]
              const fetching = fw.length > 0
              const state =
                sim.skipped[i] && !sim.done[i] && !fetching ? 'skipped' : fetching ? 'fetching' : sim.done[i] ? 'done' : queued[i] > 0 ? 'queued' : 'unseen'
              const w0 = fetching ? sim.workers[fw[0]] : null
              const dupNow = fw.some((wi) => sim.workers[wi].dup)
              const frac = w0 ? (w0.total - w0.left + 1) / w0.total : 0
              const badge =
                sim.fetches[i] > 1
                  ? { text: `×${sim.fetches[i]}`, tone: 'bad' }
                  : queued[i] + fw.length > 1 && opts.dedupe !== 'atomic'
                    ? { text: `×${queued[i] + fw.length}`, tone: 'warn' }
                    : null
              return (
                <g key={i} transform={`translate(${p.x} ${p.y})`} className={`crawl-node crawl-node--${state}`} style={hostVar(p.host)}>
                  <title>{`${p.label}: ${p.path} (${graph.hosts[p.host]})`}</title>
                  {dupBurst.has(i) && !reduce && (
                    <motion.circle
                      key={`b${sim.tick}`}
                      className="crawl-burst"
                      initial={{ r: NODE_R, opacity: 0.95 }}
                      animate={{ r: NODE_R * 2.6, opacity: 0 }}
                      transition={{ duration: 0.75, ease: 'easeOut' }}
                    />
                  )}
                  {fresh.has(i) && !reduce && (
                    <motion.circle
                      key={`d${sim.tick}`}
                      className="crawl-pop"
                      initial={{ r: NODE_R, opacity: 0.7 }}
                      animate={{ r: NODE_R * 1.9, opacity: 0 }}
                      transition={{ duration: 0.55, ease: 'easeOut' }}
                    />
                  )}
                  <motion.g
                    initial={false}
                    animate={
                      dupBurst.has(i) && !reduce ? { x: [0, -2.5, 2.5, -1.5, 1.5, 0] } : fresh.has(i) && !reduce ? { scale: [1, 1.16, 1] } : { x: 0, scale: 1 }
                    }
                    transition={{ duration: 0.4 }}
                  >
                    <circle className="crawl-node__body" r={NODE_R} />
                    <text className="crawl-node__label" dy="0.35em">
                      {p.label}
                    </text>
                  </motion.g>
                  {fetching && (
                    <g transform="rotate(-90)">
                      <motion.circle
                        key={`r${w0?.total}-${fw[0]}-${sim.workers[fw[0]].entry}`}
                        className="crawl-node__ring"
                        r={NODE_R + 3.5}
                        style={dupNow ? undefined : workerVar(fw[0])}
                        data-dup={dupNow || undefined}
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: frac }}
                        transition={reduce ? { duration: 0 } : { duration: playing ? TICK_MS / 1000 : 0.3, ease: playing ? 'linear' : 'easeOut' }}
                      />
                    </g>
                  )}
                  {fw.map((wi, k) => (
                    <g key={wi} transform={`translate(${-NODE_R + 1 + k * 11} ${NODE_R + 1})`} className="crawl-node__worker" style={workerVar(wi)}>
                      <circle r={5.6} />
                      <text dy="0.35em">{wi + 1}</text>
                    </g>
                  ))}
                  {badge && (
                    <g transform={`translate(${NODE_R - 1} ${-NODE_R + 1})`} className={`crawl-node__badge crawl-node__badge--${badge.tone}`}>
                      <rect x={-3} y={-7.5} width={badge.text.length * 6.2 + 6} height={15} rx={7.5} />
                      <text x={badge.text.length * 3.1} dy="0.35em">
                        {badge.text}
                      </text>
                    </g>
                  )}
                </g>
              )
            })}
          </svg>
        </div>

        <div className="crawl-workers" style={{ ['--n' as string]: sim.workers.length } as CSSProperties}>
          {sim.workers.map((w, i) => (
            <div
              key={i}
              className={`crawl-worker${w.page >= 0 ? ' crawl-worker--busy' : ''}${w.dup ? ' crawl-worker--dup' : ''}`}
              style={workerVar(i)}
              aria-label={`Worker ${i + 1}: ${w.page >= 0 ? `fetching ${graph.pages[w.page].label}${w.dup ? ' (duplicate)' : ''}` : 'idle'}`}
            >
              <span className="crawl-worker__in">
                <span className="crawl-worker__id">
                  <span className="crawl-worker__w">W</span>
                  {i + 1}
                </span>
                {w.page >= 0 ? (
                  <motion.span
                    layoutId={reduce ? undefined : `qe-${w.entry}`}
                    className="crawl-chip"
                    style={hostVar(graph.pages[w.page].host)}
                    transition={{ type: 'spring', stiffness: 520, damping: 34 }}
                  >
                    {graph.pages[w.page].label}
                  </motion.span>
                ) : (
                  <span className="crawl-worker__idle">idle</span>
                )}
                {w.dup && <span className="crawl-worker__dup">dup</span>}
              </span>
              <span className="crawl-worker__bar">
                <motion.span
                  initial={false}
                  animate={{ scaleX: w.page >= 0 ? (w.total - w.left + 1) / w.total : 0 }}
                  transition={reduce ? { duration: 0 } : { duration: playing ? TICK_MS / 1000 : 0.25, ease: 'linear' }}
                />
              </span>
            </div>
          ))}
        </div>

        <div className="crawl-queue">
          <span className="w-label">Frontier</span>
          <div ref={chipsRef} className="crawl-queue__chips" aria-label={`Frontier: ${sim.queue.map((e) => graph.pages[e.page].label).join(', ') || 'empty'}`}>
            <AnimatePresence initial={false} custom={dropped} mode="popLayout">
              {sim.queue.slice(0, maxChips).map((e) => (
                <motion.span
                  key={e.id}
                  layout={!reduce}
                  layoutId={reduce ? undefined : `qe-${e.id}`}
                  custom={dropped}
                  className={`crawl-chip${inFlightTwice(e.page) && opts.dedupe !== 'atomic' ? ' crawl-chip--twin' : ''}`}
                  style={hostVar(graph.pages[e.page].host)}
                  initial={reduce ? false : { opacity: 0, scale: 0.4, x: 10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  variants={{ gone: (d: Set<number>) => (d.has(e.id) ? { opacity: 0, y: 14, scale: 0.6, rotate: -12 } : { opacity: 0, scale: 0.8 }) }}
                  exit="gone"
                  transition={{ type: 'spring', stiffness: 520, damping: 34 }}
                >
                  {graph.pages[e.page].label}
                </motion.span>
              ))}
            </AnimatePresence>
            {sim.queue.length > maxChips && <span className="crawl-queue__more">+{sim.queue.length - maxChips}</span>}
            {sim.queue.length === 0 && <span className="crawl-queue__empty">empty</span>}
          </div>
        </div>

        <div className="crawl-queue crawl-visited">
          <span className="w-label">Visited</span>
          <div className="crawl-visited__chips" aria-label={`Visited set: ${visited.map((p) => graph.pages[p].label).join(', ') || 'empty'}`}>
            {opts.dedupe === 'none' ? (
              <span className="crawl-queue__empty">no visited set</span>
            ) : visited.length === 0 ? (
              <span className="crawl-queue__empty">empty</span>
            ) : (
              <AnimatePresence initial={false}>
                {visited.map((p) => (
                  <motion.span
                    key={p}
                    className="crawl-chip crawl-chip--sm"
                    style={hostVar(graph.pages[p].host)}
                    initial={reduce ? false : { scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 560, damping: 26 }}
                  >
                    {graph.pages[p].label}
                  </motion.span>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      </LayoutGroup>

      <p className={`crawl-status${sim.finished ? ' crawl-status--end' : ''}`} aria-live="polite">
        {status}
        {sim.finished && (
          <span className={`chip ${sim.dupes ? 'chip--bad' : 'chip--good'}`}>
            {sim.dupes} duplicate{sim.dupes === 1 ? '' : 's'}
          </span>
        )}
      </p>

      <div className="crawl-transport">
        <Button size="sm" variant="course" icon={playing ? <Pause size={16} strokeWidth={2.6} /> : <Play size={16} strokeWidth={2.6} />} onClick={togglePlay}>
          {playing ? 'Pause' : sim.finished ? 'Replay' : 'Play'}
        </Button>
        <Button size="sm" variant="secondary" icon={<StepForward size={16} strokeWidth={2.6} />} onClick={stepOnce} disabled={sim.finished}>
          Step
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="crawl-reset"
          icon={<RotateCcw size={16} strokeWidth={2.6} />}
          onClick={() => {
            setPlaying(false)
            restart()
          }}
          disabled={sim.tick === 0}
          aria-label="Reset crawl"
        >
          Reset
        </Button>
      </div>

      <div className={`crawl-controls${multiHost ? '' : ' crawl-controls--single'}`}>
        <label className={`crawl-slider${locked.has('workers') ? ' is-locked' : ''}`}>
          <span className="w-label">Workers {locked.has('workers') && <Lock size={11} strokeWidth={2.8} />}</span>
          <span className="crawl-slider__val tabular">{opts.workers}</span>
          <input
            className="w-slider"
            type="range"
            min={1}
            max={4}
            step={1}
            value={opts.workers}
            disabled={locked.has('workers')}
            onChange={(e) => change({ workers: Number(e.target.value) })}
            aria-label="Workers"
          />
        </label>
        {multiHost && (
          <Tile
            compact
            className="crawl-toggle"
            state={opts.sameHost ? 'selected' : 'idle'}
            disabled={locked.has('sameHost')}
            onClick={() => change({ sameHost: !opts.sameHost })}
            role="switch"
            aria-checked={opts.sameHost}
          >
            <span className="crawl-toggle__text">Same host {locked.has('sameHost') && <Lock size={11} strokeWidth={2.8} />}</span>
            <span className={`crawl-switch${opts.sameHost ? ' is-on' : ''}`} aria-hidden>
              <motion.i layout transition={{ type: 'spring', stiffness: 600, damping: 32 }} />
            </span>
          </Tile>
        )}
      </div>

      <div className="crawl-dedupe">
        <span className="w-label">Dedupe {locked.has('dedupe') && <Lock size={11} strokeWidth={2.8} />}</span>
        <div className="crawl-dedupe__tiles" role="radiogroup" aria-label="Dedupe strategy">
          {DEDUPE.map((d) => (
            <Tile
              key={d.id}
              compact
              state={opts.dedupe === d.id ? 'selected' : locked.has('dedupe') ? 'dimmed' : 'idle'}
              disabled={locked.has('dedupe')}
              onClick={() => opts.dedupe !== d.id && change({ dedupe: d.id })}
              role="radio"
              aria-checked={opts.dedupe === d.id}
            >
              {d.label}
            </Tile>
          ))}
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={mode.id}
            className="crawl-dedupe__blurb"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >
            {mode.blurb(sim.cap)}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  )
}

function Stat({ label, value, tone, bump }: { label: string; value: number | string; tone?: 'bad'; bump?: boolean }) {
  return (
    <div className={`w-stat crawl-stat${tone ? ` crawl-stat--${tone}` : ''}`}>
      <span className="w-stat__label">{label}</span>
      <motion.span
        key={bump ? String(value) : 'v'}
        className="w-stat__value"
        initial={bump ? { scale: 1.5 } : false}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 16 }}
      >
        {value}
      </motion.span>
    </div>
  )
}
