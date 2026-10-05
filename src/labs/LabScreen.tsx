import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Copy,
  Eye,
  FileCode2,
  GitCompare,
  Lightbulb,
  ListChecks,
  Lock,
  MessageSquareText,
  Minus,
  Play,
  RotateCcw,
  ScrollText,
  Sparkles,
  TerminalSquare,
  Trophy,
  TriangleAlert,
  WifiOff,
  X,
} from 'lucide-react'
import type { Lab } from '../core/types'
import { XP, useStore } from '../core/store'
import { COURSES } from '../content'
import { courseStyle } from '../ui/course'
import { Button, IconButton } from '../ui/Button'
import { Sheet } from '../ui/Sheet'
import { Rich } from '../ui/Rich'
import { Code } from '../ui/code/Code'
import { ProgressBar } from '../ui/ProgressBar'
import { celebrate, haptic, sfx } from '../ui/fx'
import { ALL_LABS } from './data'
import { Editor, type EditorHandle } from './Editor'
import { getRunner, RunnerUnavailableError, testNames, useRunnerStatus, type RunResult, type TestResult } from './runner'
import './LabScreen.css'

type Tab = 'spec' | 'code' | 'tests'
const TABS: { id: Tab; label: string }[] = [
  { id: 'spec', label: 'Spec' },
  { id: 'code', label: 'Code' },
  { id: 'tests', label: 'Tests' },
]

const SLIDE = {
  enter: (d: number) => ({ x: d * 48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: d * -48, opacity: 0 }),
}
const SLIDE_T = { type: 'spring', stiffness: 420, damping: 38 } as const

interface LastRun {
  r: RunResult
  /** how many levels (1..n) the run covered */
  levels: number
  code: string
  wallMs: number
}

/* ------------------------------------------------------------- helpers */

export function formatClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = h ? String(m).padStart(2, '0') : String(m)
  return `${h ? `${h}:` : ''}${mm}:${String(sec).padStart(2, '0')}`
}

function readNum(key: string): number {
  try {
    const v = Number(localStorage.getItem(key))
    return Number.isFinite(v) && v > 0 ? v : 0
  } catch {
    return 0
  }
}

function writeNum(key: string, v: number) {
  try {
    localStorage.setItem(key, String(Math.round(v)))
  } catch {
    /* private mode: the timer simply restarts next session */
  }
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  } catch {
    return false
  }
}

/** a test name with line-break opportunities after underscores */
function TestName({ name }: { name: string }) {
  const parts = name.split('_')
  return (
    <span className="lab-row__name">
      {parts.map((p, i) => (
        <span key={i}>
          {p}
          {i < parts.length - 1 && (
            <>
              _<wbr />
            </>
          )}
        </span>
      ))}
    </span>
  )
}

/** split a test source into readable chunks: setup code and one chunk per test */
export function splitTests(src: string): { name: string | null; code: string }[] {
  const lines = src.replace(/\s+$/, '').split('\n')
  const chunks: { name: string | null; lines: string[] }[] = []
  let pending: string[] = [] // comments / decorators waiting for the next def
  for (const line of lines) {
    const top = line.length > 0 && !/^\s/.test(line)
    if (top && /^(#|@)/.test(line)) {
      pending.push(line)
      continue
    }
    if (top) {
      const m = /^(?:async\s+)?def\s+(test_\w+)/.exec(line)
      const last = chunks[chunks.length - 1]
      if (m) chunks.push({ name: m[1], lines: [...pending, line] })
      else if (last && last.name === null) last.lines.push(...pending, line)
      else chunks.push({ name: null, lines: [...pending, line] })
      pending = []
      continue
    }
    const last = chunks[chunks.length - 1]
    if (last) last.lines.push(...pending, line)
    else pending.push(line)
    if (last) pending = []
  }
  return chunks
    .map((c) => ({ name: c.name, code: c.lines.join('\n').replace(/\s+$/, '') }))
    .filter((c) => c.code.trim())
}

type DiffRow = { t: ' ' | '-' | '+'; s: string } | { t: 'fold'; n: number }

/** line diff (LCS) between the learner's code and the reference, with folded context */
export function lineDiff(a: string, b: string, context = 2): DiffRow[] {
  const A = a.replace(/\s+$/, '').split('\n')
  const B = b.replace(/\s+$/, '').split('\n')
  const n = A.length
  const m = B.length
  const rows: { t: ' ' | '-' | '+'; s: string }[] = []
  if (n * m > 600_000) {
    A.forEach((s) => rows.push({ t: '-', s }))
    B.forEach((s) => rows.push({ t: '+', s }))
  } else {
    const W = m + 1
    const dp = new Uint32Array((n + 1) * W)
    const eq = (i: number, j: number) => A[i].trimEnd() === B[j].trimEnd()
    for (let i = n - 1; i >= 0; i--)
      for (let j = m - 1; j >= 0; j--)
        dp[i * W + j] = eq(i, j) ? dp[(i + 1) * W + j + 1] + 1 : Math.max(dp[(i + 1) * W + j], dp[i * W + j + 1])
    let i = 0
    let j = 0
    while (i < n && j < m) {
      if (eq(i, j)) {
        rows.push({ t: ' ', s: B[j] })
        i++
        j++
      } else if (dp[(i + 1) * W + j] >= dp[i * W + j + 1]) rows.push({ t: '-', s: A[i++] })
      else rows.push({ t: '+', s: B[j++] })
    }
    while (i < n) rows.push({ t: '-', s: A[i++] })
    while (j < m) rows.push({ t: '+', s: B[j++] })
  }
  // fold long unchanged runs
  const out: DiffRow[] = []
  let k = 0
  while (k < rows.length) {
    if (rows[k].t !== ' ') {
      out.push(rows[k++])
      continue
    }
    let e = k
    while (e < rows.length && rows[e].t === ' ') e++
    const run = rows.slice(k, e)
    const head = k === 0 ? 0 : context
    const tail = e === rows.length ? 0 : context
    if (run.length > head + tail + 2) {
      out.push(...run.slice(0, head), { t: 'fold', n: run.length - head - tail }, ...run.slice(run.length - tail))
    } else out.push(...run)
    k = e
  }
  return out
}

/* --------------------------------------------------------------- hooks */

/**
 * Active-time timer: starts at the learner's first edit, pauses while the
 * page is hidden or the lab is closed. Accumulated time is kept per lab in
 * localStorage (a per-device convenience); the store holds `startedAt`.
 */
function useLabTimer(labId: string, startedAt: number | null, active: boolean) {
  const key = `gauntlet:lab-time:${labId}`
  const acc = useRef(readNum(key))
  const seg = useRef<number | null>(null)
  const [, setTick] = useState(0)
  const started = startedAt != null || acc.current > 0
  const running = started && active

  useEffect(() => {
    if (!running) return
    const begin = () => {
      if (seg.current == null && document.visibilityState !== 'hidden') seg.current = Date.now()
    }
    const pause = () => {
      if (seg.current != null) {
        acc.current += Date.now() - seg.current
        seg.current = null
        writeNum(key, acc.current)
      }
    }
    begin()
    const tick = setInterval(() => setTick((t) => t + 1), 1000)
    const save = setInterval(() => seg.current != null && writeNum(key, acc.current + Date.now() - seg.current), 10_000)
    const vis = () => (document.visibilityState === 'hidden' ? pause() : begin())
    document.addEventListener('visibilitychange', vis)
    window.addEventListener('pagehide', pause)
    return () => {
      pause()
      clearInterval(tick)
      clearInterval(save)
      document.removeEventListener('visibilitychange', vis)
      window.removeEventListener('pagehide', pause)
    }
  }, [running, key])

  const elapsed = useCallback(() => acc.current + (seg.current != null ? Date.now() - seg.current : 0), [])
  return { started, running, elapsed }
}

/** true once `active` has stayed true for `ms` */
function useSlowBoot(active: boolean, ms: number): boolean {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    setSlow(false)
    if (!active) return
    const t = setTimeout(() => setSlow(true), ms)
    return () => clearTimeout(t)
  }, [active, ms])
  return slow
}

/** height of the on-screen keyboard (iOS/Android), 0 when closed */
function useKeyboardInset(): number {
  const [kb, setKb] = useState(0)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const on = () => {
      if (Math.abs(vv.scale - 1) > 0.01) return setKb(0)
      const inset = Math.round(window.innerHeight - vv.height - vv.offsetTop)
      setKb(inset > 80 ? inset : 0)
    }
    vv.addEventListener('resize', on)
    vv.addEventListener('scroll', on)
    return () => {
      vv.removeEventListener('resize', on)
      vv.removeEventListener('scroll', on)
    }
  }, [])
  return kb
}

/* ---------------------------------------------------------- the screen */

/**
 * Full-screen code lab: a CodeSignal-style progressive build. Levels unlock
 * in order; each run executes the tests of levels 1..current, so earlier
 * levels must keep passing. Falls back to self-check mode when the in-browser
 * Python runtime is unavailable.
 *
 * `lab` lets previews and tests render a lab object that is not in the
 * registry; normally the lab is looked up by `labId`.
 */
export default function LabScreen({ labId, onExit, lab: labOverride }: { labId: string; onExit: () => void; lab?: Lab }) {
  const lab = labOverride ?? ALL_LABS.find((l) => l.id === labId)
  if (!lab || lab.levels.length === 0) {
    return (
      <div className="screen lab safe-top">
        <header className="lab__head">
          <IconButton label="Close lab" onClick={onExit}>
            <X size={24} strokeWidth={2.6} />
          </IconButton>
        </header>
        <div className="lab-empty">
          <FileCode2 size={40} strokeWidth={2.2} />
          <h2>This lab isn't ready yet</h2>
          <p>Its levels are still being written. Try another lab for now.</p>
          <Button variant="secondary" onClick={onExit}>
            Back
          </Button>
        </div>
      </div>
    )
  }
  return <LabView key={lab.id} lab={lab} onExit={onExit} />
}

function LabView({ lab, onExit }: { lab: Lab; onExit: () => void }) {
  const labId = lab.id
  const progress = useStore((s) => s.labs[labId])
  const n = lab.levels.length
  const passed = Math.min(progress?.levelsPassed ?? 0, n)
  const complete = passed >= n
  const current = Math.min(passed, n - 1)

  const status = useRunnerStatus()
  /** the learner can opt into self-check while a slow download is still going */
  const [manualCheck, setManualCheck] = useState(false)
  const selfCheck = status === 'unavailable' || manualCheck
  const runner = getRunner()

  const [code, setCode] = useState(() => (progress?.code ? progress.code : lab.starter))
  const [tab, setTab] = useState<Tab>(() => (progress?.code || passed > 0 ? 'code' : 'spec'))
  const [view, setView] = useState(current)
  const [dir, setDir] = useState(1)
  const [running, setRunning] = useState(false)
  const [last, setLast] = useState<LastRun | null>(null)
  const [cleared, setCleared] = useState<{ level: number; ms: number } | null>(null)
  const [hints, setHints] = useState<Record<number, number>>({})
  const [revealed, setRevealed] = useState<Record<number, boolean>>({})
  const [askSolution, setAskSolution] = useState<null | 'solution' | 'compare'>(null)
  const [askReset, setAskReset] = useState(false)
  const [compared, setCompared] = useState<Record<number, boolean>>({})
  /** self-check ticks, keyed `${level}:${testName}`; kept here so they survive tab switches */
  const [ticks, setTicks] = useState<Record<string, boolean>>({})
  const editorRef = useRef<EditorHandle>(null)
  const testsRef = useRef<HTMLDivElement>(null)
  /** a run is in flight (a ref, so a fast double Cmd+Enter can't start two) */
  const busy = useRef(false)
  /** false once the lab is closed; a run that finishes later still records a pass, quietly */
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  const codeRef = useRef(code)
  codeRef.current = code

  const timer = useLabTimer(labId, progress?.startedAt ?? null, !complete)
  const timerElapsed = timer.elapsed
  const kb = useKeyboardInset()
  const color = COURSES.find((c) => c.id === lab.area)?.color ?? 'blue'
  const style = useMemo(() => ({ ...courseStyle(color), ['--kb' as string]: `${kb}px` }), [color, kb])

  // boot Python in the background as soon as the lab opens
  useEffect(() => {
    void runner.warmup()
  }, [runner])

  // persist code (debounced) and on close
  const savedRef = useRef(code)
  useEffect(() => {
    if (code === savedRef.current) return
    const t = setTimeout(() => {
      savedRef.current = code
      useStore.getState().saveLab(labId, { code })
    }, 400)
    return () => clearTimeout(t)
  }, [code, labId])
  useEffect(
    () => () => {
      if (codeRef.current !== savedRef.current) useStore.getState().saveLab(labId, { code: codeRef.current })
    },
    [labId],
  )

  const onCodeChange = useCallback(
    (v: string) => {
      setCode(v)
      if (useStore.getState().labs[labId]?.startedAt == null) useStore.getState().saveLab(labId, { startedAt: Date.now() })
    },
    [labId],
  )

  const tabRef = useRef(tab)
  tabRef.current = tab
  /** change tab, sliding in the direction of travel */
  const switchTab = useCallback((t: Tab) => {
    const from = tabRef.current
    if (t === from) return
    setDir(TABS.findIndex((x) => x.id === t) > TABS.findIndex((x) => x.id === from) ? 1 : -1)
    tabRef.current = t
    setTab(t)
  }, [])

  const passLevel = useCallback(
    (level: number) => {
      const ms = Math.max(1000, timerElapsed())
      useStore.getState().passLabLevel(labId, level, ms)
      if (!alive.current) return
      setCleared({ level, ms })
      // the Spec tab now shows the level just unlocked
      setView(Math.min(level + 1, n - 1))
      haptic('success')
      if (level + 1 >= n) {
        sfx('complete')
        setTimeout(() => celebrate('big'), 150)
      } else {
        sfx('complete')
        celebrate('small')
      }
    },
    [labId, n, timerElapsed],
  )

  const run = useCallback(async () => {
    if (busy.current) return
    busy.current = true
    const levels = current + 1
    const src = codeRef.current
    if (src !== savedRef.current) {
      savedRef.current = src
      useStore.getState().saveLab(labId, { code: src })
    }
    setRunning(true)
    setCleared(null)
    // first run: show the Tests tab right away, where the download is explained
    if (runner.status !== 'ready') switchTab('tests')
    const t0 = performance.now()
    try {
      const r = await runner.run(
        src,
        lab.levels.slice(0, levels).map((l) => l.tests),
      )
      const wallMs = performance.now() - t0
      const expected = lab.levels.slice(0, levels).reduce((k, l) => k + testNames(l.tests).length, 0)
      const allOk = !r.error && r.results.length > 0 && r.results.length >= expected && r.results.every((t) => t.ok)
      const levelPassed = useStore.getState().labs[labId]?.levelsPassed ?? 0
      const newPass = allOk && levelPassed === current && levelPassed < n
      if (!alive.current) {
        if (newPass) passLevel(current)
        return
      }
      setLast({ r, levels, code: src, wallMs })
      if (newPass) passLevel(current)
      else if (allOk) {
        sfx('correct')
        haptic('success')
      } else haptic('error')
      switchTab('tests')
    } catch (err) {
      if (!alive.current) return
      if (!(err instanceof RunnerUnavailableError)) {
        setLast({ r: { results: [], stdout: '', error: String((err as Error)?.message ?? err) }, levels, code: src, wallMs: 0 })
      }
      switchTab('tests')
    } finally {
      busy.current = false
      if (alive.current) setRunning(false)
    }
  }, [current, labId, lab, runner, n, passLevel, switchTab])

  useEffect(() => {
    if (cleared) testsRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [cleared])

  const nextLevel = () => {
    setCleared(null)
    setLast(null)
    setView(Math.min(passed, n - 1))
    switchTab('spec')
    setDir(1) // the next level always arrives from the right
  }

  const gotoLine = (line: number) => {
    switchTab('code')
    requestAnimationFrame(() => requestAnimationFrame(() => editorRef.current?.gotoLine(line)))
  }

  const pickLevel = (i: number) => {
    if (i > passed) return
    if (tabRef.current === 'spec') setDir(i >= view ? 1 : -1)
    setView(i)
    switchTab('spec')
  }

  const ranLevels = last?.levels ?? current + 1
  const results = last?.r.results ?? []
  const okCount = results.filter((t) => t.ok).length
  const summary = last && !last.r.error ? { ok: okCount, total: results.length } : null
  const elapsedMs = timer.elapsed()
  const over = elapsedMs > lab.minutes * 60_000

  return (
    <div className="screen lab safe-top" style={style} data-kb={kb > 0 || undefined}>
      <header className="lab__head">
        <IconButton label="Close lab" onClick={onExit}>
          <X size={24} strokeWidth={2.6} />
        </IconButton>
        <div className="lab__titles">
          <div className="lab__title">{lab.title}</div>
          <LevelPills lab={lab} passed={passed} current={current} view={tab === 'spec' ? view : -1} onPick={pickLevel} />
        </div>
        <div
          className={['lab__timer', 'tabular', timer.running && 'lab__timer--on', over && 'lab__timer--over'].filter(Boolean).join(' ')}
          title={`Suggested time: ${lab.minutes} min`}
          aria-label={timer.started ? `Elapsed ${formatClock(elapsedMs)} of a suggested ${lab.minutes} minutes` : `Suggested time ${lab.minutes} minutes`}
        >
          <Clock size={14} strokeWidth={2.8} />
          {timer.started ? (
            <span>
              {formatClock(elapsedMs)}
              <span className="lab__timer-of">/{lab.minutes}m</span>
            </span>
          ) : (
            <span>{lab.minutes} min</span>
          )}
        </div>
      </header>

      <div className="lab__tabs" role="tablist" aria-label="Lab sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`lab-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`lab-panel-${t.id}`}
            className={['lab__tab', tab === t.id && 'lab__tab--on'].filter(Boolean).join(' ')}
            onClick={() => switchTab(t.id)}
          >
            {tab === t.id && <motion.span layoutId={`lab-tab-ind-${labId}`} className="lab__tab-ind" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
            <span className="lab__tab-label">
              {t.label}
              {t.id === 'tests' && summary && (
                <span className={`lab__tab-badge ${summary.ok === summary.total ? 'lab__tab-badge--good' : 'lab__tab-badge--bad'}`}>
                  {summary.ok}/{summary.total}
                </span>
              )}
              {t.id === 'tests' && last?.r.error && <span className="lab__tab-badge lab__tab-badge--bad">!</span>}
            </span>
          </button>
        ))}
      </div>

      <div className="lab__body">
        <AnimatePresence initial={false} custom={dir}>
          {tab === 'spec' && (
            <motion.div
              key={`spec-${view}`}
              className="lab__panel scroll"
              role="tabpanel"
              id="lab-panel-spec"
              aria-labelledby="lab-tab-spec"
              custom={dir}
              variants={SLIDE}
              initial="enter"
              animate="center"
              exit="exit"
              transition={SLIDE_T}
            >
              <SpecPanel
                lab={lab}
                level={view}
                passed={passed}
                current={current}
                complete={complete}
                hintsShown={hints[view] ?? 0}
                onHint={() => setHints((h) => ({ ...h, [view]: (h[view] ?? 0) + 1 }))}
                solutionShown={!!revealed[view]}
                onAskSolution={() => setAskSolution('solution')}
                onBackToCurrent={() => pickLevel(current)}
                onReset={() => setAskReset(true)}
                elapsedMs={elapsedMs}
              />
            </motion.div>
          )}
          {tab === 'tests' && (
            <motion.div
              key="tests"
              ref={testsRef}
              className="lab__panel scroll"
              role="tabpanel"
              id="lab-panel-tests"
              aria-labelledby="lab-tab-tests"
              custom={dir}
              variants={SLIDE}
              initial="enter"
              animate="center"
              exit="exit"
              transition={SLIDE_T}
            >
              {selfCheck ? (
                <SelfCheckPanel
                  lab={lab}
                  level={current}
                  passed={passed}
                  complete={complete}
                  code={code}
                  compared={!!compared[current]}
                  checked={ticks}
                  onToggle={(name) => setTicks((s) => ({ ...s, [`${current}:${name}`]: !s[`${current}:${name}`] }))}
                  onCompare={() => setAskSolution('compare')}
                  onRetry={() => {
                    setManualCheck(false)
                    void runner.retry()
                  }}
                  reason={runner.reason}
                  manual={status !== 'unavailable'}
                  ready={status === 'ready'}
                  cleared={cleared}
                  onNext={nextLevel}
                  onExit={onExit}
                />
              ) : (
                <TestsPanel
                  lab={lab}
                  last={last}
                  ranLevels={ranLevels}
                  running={running}
                  booting={status === 'loading'}
                  stale={!!last && last.code !== code}
                  current={current}
                  passed={passed}
                  cleared={cleared}
                  onNext={nextLevel}
                  onExit={onExit}
                  onGoto={gotoLine}
                  onSelfCheck={() => setManualCheck(true)}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="lab__panel lab__code" role="tabpanel" id="lab-panel-code" aria-labelledby="lab-tab-code" hidden={tab !== 'code'}>
          <Editor
            ref={editorRef}
            value={code}
            onChange={onCodeChange}
            onRun={selfCheck ? undefined : run}
            errorLine={last && last.code === code ? (last.r.errorLine ?? null) : null}
            label={`${lab.title} code`}
          />
        </div>
      </div>

      <footer className="lab__bar safe-bottom">
        {selfCheck ? (
          <SelfCheckBar
            compared={!!compared[current]}
            complete={complete}
            level={current}
            onCompare={() => setAskSolution('compare')}
            onDone={() => passLevel(current)}
            onTests={() => switchTab('tests')}
          />
        ) : (
          <>
            <AnimatePresence initial={false}>
              {summary && tab !== 'tests' && (
                <motion.button
                  key="sum"
                  type="button"
                  className={['lab__sum', summary.ok === summary.total ? 'lab__sum--good' : 'lab__sum--bad', last && last.code !== code && 'lab__sum--stale'].filter(Boolean).join(' ')}
                  onClick={() => switchTab('tests')}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 26 }}
                  aria-label={`${summary.ok} of ${summary.total} tests passing. Show results`}
                >
                  {summary.ok === summary.total ? <Check size={16} strokeWidth={3} /> : <X size={16} strokeWidth={3} />}
                  <span className="tabular">
                    {summary.ok}/{summary.total}
                  </span>
                </motion.button>
              )}
            </AnimatePresence>
            <Button
              block
              className="lab__run"
              onClick={() => void run()}
              disabled={running}
              icon={running ? <span className="lab-spin" aria-hidden /> : <Play size={18} strokeWidth={2.8} fill="currentColor" />}
            >
              {running ? (status === 'loading' ? 'Starting Python…' : 'Running…') : current > 0 ? `Run tests · L1–${current + 1}` : 'Run tests'}
            </Button>
          </>
        )}
      </footer>

      <Sheet open={askSolution != null} onClose={() => setAskSolution(null)} label="Show the solution">
        <div className="lab-confirm">
          <h3>{askSolution === 'compare' ? 'Compare with the reference?' : 'Peek at the solution?'}</h3>
          <p>
            {askSolution === 'compare'
              ? `You'll see a diff between your code and the reference for levels 1–${current + 1}. Read it as a code review: what did it handle that you didn't?`
              : `This is the full reference for levels 1–${view + 1}. In the interview, how you get there is what's graded. A hint is usually enough.`}
          </p>
          <div className="lab-confirm__actions">
            <Button
              block
              onClick={() => {
                if (askSolution === 'compare') setCompared((c) => ({ ...c, [current]: true }))
                else setRevealed((r) => ({ ...r, [view]: true }))
                setAskSolution(null)
                if (askSolution === 'compare') switchTab('tests')
              }}
            >
              {askSolution === 'compare' ? 'Show the diff' : 'Show solution'}
            </Button>
            <Button block variant="ghost" onClick={() => setAskSolution(null)}>
              Keep trying
            </Button>
          </div>
        </div>
      </Sheet>

      <Sheet open={askReset} onClose={() => setAskReset(false)} label="Reset code">
        <div className="lab-confirm">
          <h3>Start over from the starter code?</h3>
          <p>Your current code for this lab will be replaced. Levels you've passed stay passed.</p>
          <div className="lab-confirm__actions">
            <Button
              block
              variant="bad"
              onClick={() => {
                setCode(lab.starter)
                setLast(null)
                setAskReset(false)
                switchTab('code')
              }}
            >
              Reset code
            </Button>
            <Button block variant="ghost" onClick={() => setAskReset(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  )
}

/* -------------------------------------------------------------- header */

function LevelPills({ lab, passed, current, view, onPick }: { lab: Lab; passed: number; current: number; view: number; onPick: (i: number) => void }) {
  return (
    <div className="lab-pills" role="list" aria-label="Levels">
      {lab.levels.map((lv, i) => {
        const done = i < passed
        const locked = i > passed
        const state = done ? 'done' : i === current ? 'current' : 'locked'
        return (
          <motion.button
            key={i}
            type="button"
            role="listitem"
            layout
            className={['lab-pill', `lab-pill--${state}`, view === i && i !== current && 'lab-pill--view'].filter(Boolean).join(' ')}
            disabled={locked}
            onClick={() => onPick(i)}
            aria-label={`Level ${i + 1}: ${lv.title}${done ? ' (passed)' : locked ? ' (locked)' : ' (current)'}`}
            title={lv.title}
            initial={false}
            animate={done ? { scale: [1, 1.18, 1] } : { scale: 1 }}
            transition={{ duration: 0.35 }}
          >
            {done ? <Check size={12} strokeWidth={3.4} /> : locked ? <Lock size={10} strokeWidth={3} /> : null}
            <span>L{i + 1}</span>
          </motion.button>
        )
      })}
    </div>
  )
}

/* ---------------------------------------------------------------- spec */

function SpecPanel({
  lab,
  level,
  passed,
  current,
  complete,
  hintsShown,
  onHint,
  solutionShown,
  onAskSolution,
  onBackToCurrent,
  onReset,
  elapsedMs,
}: {
  lab: Lab
  level: number
  passed: number
  current: number
  complete: boolean
  hintsShown: number
  onHint: () => void
  solutionShown: boolean
  onAskSolution: () => void
  onBackToCurrent: () => void
  onReset: () => void
  elapsedMs: number
}) {
  const lv = lab.levels[level]
  const done = level < passed
  const n = lab.levels.length
  const shown = Math.min(hintsShown, lv.hints.length)
  return (
    <div className="lab-spec">
      {complete && level === current && <CompletionCard lab={lab} ms={elapsedMs} compact />}
      {level !== current && (
        <button type="button" className="lab-spec__away" onClick={onBackToCurrent}>
          <span>
            Viewing level {level + 1}. You're on level {current + 1}.
          </span>
          <span className="lab-spec__away-cta">
            Back <ChevronRight size={16} strokeWidth={2.8} />
          </span>
        </button>
      )}
      <div className="lab-spec__meta">
        <span className="eyebrow">
          Level {level + 1} of {n}
        </span>
        {done ? (
          <span className="chip chip--good">
            <Check size={12} strokeWidth={3.2} /> Passed
          </span>
        ) : (
          <span className="chip">In progress</span>
        )}
      </div>
      <h2 className="lab-spec__title">{lv.title}</h2>
      {level === 0 && lab.summary && (
        <div className="lab-spec__intro">
          <Rich text={lab.summary} />
          <div className="lab-spec__facts">
            <span className="chip">
              <Clock size={12} strokeWidth={2.8} /> {lab.minutes} min suggested
            </span>
            <span className="chip">
              <ListChecks size={12} strokeWidth={2.8} /> {n} levels
            </span>
          </div>
        </div>
      )}
      <Rich text={lv.spec} className="lab-spec__body" />
      {level > 0 && <p className="lab-spec__note">Tests from earlier levels run too, so they must keep passing.</p>}

      {lv.hints.length > 0 && (
        <section className="lab-spec__section">
          <div className="lab-spec__section-head">
            <Lightbulb size={16} strokeWidth={2.6} />
            <span>Hints</span>
            <span className="lab-spec__count tabular">
              {shown}/{lv.hints.length}
            </span>
          </div>
          <AnimatePresence initial={false}>
            {lv.hints.slice(0, shown).map((h, i) => (
              <motion.div
                key={i}
                className="lab-hint"
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 460, damping: 30 }}
              >
                <span className="lab-hint__n">{i + 1}</span>
                <Rich text={h} />
              </motion.div>
            ))}
          </AnimatePresence>
          {shown < lv.hints.length && (
            <Button
              variant="secondary"
              size="md"
              icon={<Lightbulb size={16} strokeWidth={2.6} />}
              onClick={() => {
                sfx('flip')
                onHint()
              }}
            >
              {shown === 0 ? 'Show a hint' : `Next hint (${shown + 1} of ${lv.hints.length})`}
            </Button>
          )}
        </section>
      )}

      <section className="lab-spec__section">
        <div className="lab-spec__section-head">
          <FileCode2 size={16} strokeWidth={2.6} />
          <span>Reference solution</span>
        </div>
        {solutionShown ? (
          <SolutionBlock code={lv.solution} caption={`Reference for levels 1–${level + 1}.`} />
        ) : (
          <Button variant="ghost" size="md" icon={<Eye size={16} strokeWidth={2.6} />} onClick={onAskSolution} className="lab-spec__reveal">
            Show solution
          </Button>
        )}
      </section>

      <div className="lab-spec__foot">
        <Button variant="ghost" size="sm" icon={<RotateCcw size={14} strokeWidth={2.6} />} onClick={onReset}>
          Reset code to starter
        </Button>
      </div>
    </div>
  )
}

function SolutionBlock({ code, caption }: { code: string; caption?: string }) {
  const [copied, setCopied] = useState<null | boolean>(null)
  useEffect(() => {
    if (copied == null) return
    const t = setTimeout(() => setCopied(null), 1800)
    return () => clearTimeout(t)
  }, [copied])
  return (
    <motion.div className="lab-solution" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="lab-solution__bar">
        <span>{caption}</span>
        <button
          type="button"
          className="lab-solution__copy"
          onClick={async () => {
            const ok = await copyText(code)
            setCopied(ok)
            if (ok) sfx('select')
          }}
        >
          {copied ? <Check size={14} strokeWidth={3} /> : <Copy size={14} strokeWidth={2.6} />}
          {copied == null ? 'Copy' : copied ? 'Copied' : "Couldn't copy"}
        </button>
      </div>
      <Code code={code} />
    </motion.div>
  )
}

/* --------------------------------------------------------------- tests */

function TestsPanel({
  lab,
  last,
  ranLevels,
  running,
  booting,
  stale,
  current,
  passed,
  cleared,
  onNext,
  onExit,
  onGoto,
  onSelfCheck,
}: {
  lab: Lab
  last: LastRun | null
  ranLevels: number
  running: boolean
  booting: boolean
  stale: boolean
  current: number
  passed: number
  cleared: { level: number; ms: number } | null
  onNext: () => void
  onExit: () => void
  onGoto: (line: number) => void
  onSelfCheck: () => void
}) {
  const n = lab.levels.length
  const r = last?.r
  const slow = useSlowBoot(running && booting, 10_000)
  const results = r?.results ?? []
  const ok = results.filter((t) => t.ok).length
  const levels = Array.from({ length: ranLevels }, (_, i) => i + 1)

  return (
    <div className="lab-tests">
      <AnimatePresence>
        {cleared && cleared.level + 1 >= n && <CompletionCard key="done" lab={lab} ms={cleared.ms} onExit={onExit} />}
        {cleared && cleared.level + 1 < n && <LevelCleared key="lvl" lab={lab} level={cleared.level} ms={cleared.ms} onNext={onNext} />}
      </AnimatePresence>

      {!r && (
        <div className="lab-tests__intro">
          <div className="lab-tests__intro-icon">
            <ListChecks size={22} strokeWidth={2.6} />
          </div>
          <div>
            <h3>{running ? (booting ? 'Starting Python…' : 'Running tests…') : 'Ready when you are'}</h3>
            <p>
              {running && booting
                ? 'The first run downloads a Python runtime (about 12 MB). After that, runs are instant.'
                : current > 0
                  ? `Run tests checks levels 1–${current + 1}. Earlier levels' tests run too, so they must keep passing.`
                  : 'Run tests checks your code against the level 1 tests below.'}
            </p>
            {slow && (
              <button type="button" className="lab-link" onClick={onSelfCheck}>
                <ClipboardCheck size={13} strokeWidth={2.6} /> Taking a while? Check your code by hand instead
              </button>
            )}
          </div>
        </div>
      )}

      {r && (
        <div className={['lab-sum', r.error ? 'lab-sum--bad' : ok === results.length ? 'lab-sum--good' : 'lab-sum--bad'].join(' ')}>
          <div className="lab-sum__row">
            <div className="lab-sum__big tabular">
              {r.error && !results.length ? (
                <>Didn't run</>
              ) : (
                <>
                  <motion.span key={`${ok}/${results.length}/${last?.wallMs}`} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 520, damping: 20 }}>
                    {ok}/{results.length}
                  </motion.span>{' '}
                  <span className="lab-sum__word">passing</span>
                </>
              )}
            </div>
            {running && <span className="lab-spin lab-spin--ink" aria-label="Running" />}
          </div>
          {results.length > 0 && <ProgressBar value={results.length ? ok / results.length : 0} tone="good" height={10} label="Tests passing" />}
          <div className="lab-sum__meta">
            {levels.map((lv) => {
              const rs = results.filter((t) => t.level === lv)
              const good = rs.filter((t) => t.ok).length
              return (
                <span key={lv} className={`chip ${rs.length && good === rs.length ? 'chip--good' : rs.length ? 'chip--bad' : ''}`}>
                  L{lv} {good}/{rs.length || testNames(lab.levels[lv - 1].tests).length}
                </span>
              )
            })}
            {r.ms != null && <span className="lab-sum__ms tabular">{r.ms < 1000 ? `${Math.round(r.ms)} ms` : `${(r.ms / 1000).toFixed(1)} s`}</span>}
            {stale && <span className="lab-sum__stale">Code changed since this run</span>}
          </div>
          {!r.error && results.length > 0 && ok < results.length && <BrokeEarlier results={results} current={current} passed={passed} />}
        </div>
      )}

      {r?.timedOut && (
        <div className="lab-note lab-note--warn">
          <TriangleAlert size={18} strokeWidth={2.6} />
          <div>
            <b>Stopped a run that didn't finish.</b> Each test gets 8 seconds. Look for a loop whose condition never changes, or a wait nothing wakes up.
          </div>
        </div>
      )}

      {r?.error && (
        <div className="lab-err">
          <div className="lab-err__head">
            <TriangleAlert size={18} strokeWidth={2.6} />
            <span>{r.timedOut ? 'Your code never finished loading' : 'Your code didn’t run'}</span>
          </div>
          <pre className="lab-err__text">{r.error}</pre>
          {r.errorLine != null && (
            <Button variant="secondary" size="sm" icon={<FileCode2 size={14} strokeWidth={2.6} />} onClick={() => onGoto(r.errorLine!)}>
              Go to line {r.errorLine}
            </Button>
          )}
        </div>
      )}

      {levels.map((lv) => {
        const names = testNames(lab.levels[lv - 1].tests)
        const rs = results.filter((t) => t.level === lv)
        const rows: (TestResult | { name: string; level: number; pending: true })[] = r && !r.error ? rs : names.map((name) => ({ name, level: lv, pending: true as const }))
        const good = rs.filter((t) => t.ok).length
        return (
          <section key={lv} className="lab-group">
            <div className="lab-group__head">
              <span className="lab-group__level">Level {lv}</span>
              <span className="lab-group__title">{lab.levels[lv - 1].title}</span>
              {r && !r.error && (
                <span className={`lab-group__count tabular ${good === rs.length ? 'is-good' : 'is-bad'}`}>
                  {good}/{rs.length}
                </span>
              )}
            </div>
            <ul className="lab-rows">
              {rows.map((t, i) => {
                const prev = i > 0 ? (rows[i - 1] as TestResult) : null
                const cur = t as TestResult
                const same = !!prev && !('pending' in t) && !cur.ok && prev.error != null && (prev.error === cur.error || (!!prev.skipped && !!cur.skipped))
                return <ResultRow key={`${last?.wallMs ?? 'p'}-${t.name}`} t={t} index={i} onGoto={onGoto} same={same} />
              })}
            </ul>
          </section>
        )
      })}

      {r && r.stdout && <Stdout text={r.stdout} />}
    </div>
  )
}

function BrokeEarlier({ results, current }: { results: TestResult[]; current: number; passed: number }) {
  const cur = results.filter((t) => t.level === current + 1)
  const earlier = results.filter((t) => t.level <= current && !t.ok).length
  if (!earlier || !cur.length || cur.some((t) => !t.ok)) return null
  return (
    <p className="lab-sum__hint">
      Level {current + 1} passes, but {earlier} earlier {earlier === 1 ? 'test' : 'tests'} broke. Earlier levels must keep passing.
    </p>
  )
}

function ResultRow({
  t,
  index,
  onGoto,
  same,
}: {
  t: TestResult | { name: string; level: number; pending: true }
  index: number
  onGoto: (line: number) => void
  /** same error as the row above: show a short note instead of repeating it */
  same?: boolean
}) {
  const pending = 'pending' in t
  const res = pending ? null : (t as TestResult)
  const state = pending ? 'pending' : res!.ok ? 'ok' : res!.skipped ? 'skip' : 'fail'
  return (
    <motion.li
      className={`lab-row lab-row--${state}`}
      initial={pending ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 520, damping: 34, delay: Math.min(index, 14) * 0.035 }}
    >
      <span className="lab-row__icon" aria-hidden>
        {state === 'ok' ? <Check size={14} strokeWidth={3.4} /> : state === 'fail' ? <X size={14} strokeWidth={3.4} /> : <Minus size={14} strokeWidth={3} />}
      </span>
      <div className="lab-row__body">
        <div className="lab-row__top">
          <TestName name={t.name} />
          <span className="visually-hidden">{state === 'ok' ? 'passed' : state === 'fail' ? 'failed' : state === 'skip' ? 'not run' : 'not run yet'}</span>
          {res && !res.skipped && <span className="lab-row__ms tabular">{res.ms < 1 ? '<1' : Math.round(res.ms)} ms</span>}
        </div>
        {res && !res.ok && res.error && (same ? <span className="lab-row__same">{res.skipped ? 'Not run' : 'Same error as above'}</span> : <pre className="lab-row__err">{res.error}</pre>)}
        {res && !res.ok && !same && (res.line != null || res.trace) && (
          <div className="lab-row__actions">
            {res.line != null && (
              <button type="button" className="lab-link" onClick={() => onGoto(res.line!)}>
                <FileCode2 size={13} strokeWidth={2.6} /> Line {res.line}
              </button>
            )}
            {res.trace && <TraceToggle trace={res.trace} />}
          </div>
        )}
      </div>
    </motion.li>
  )
}

function TraceToggle({ trace }: { trace: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className="lab-link" aria-expanded={open} onClick={() => setOpen(!open)}>
        <ScrollText size={13} strokeWidth={2.6} /> {open ? 'Hide traceback' : 'Traceback'}
      </button>
      {open && <pre className="lab-row__trace">{trace}</pre>}
    </>
  )
}

function Stdout({ text }: { text: string }) {
  const lines = text.replace(/\n$/, '').split('\n').length
  const [open, setOpen] = useState(lines <= 30)
  return (
    <section className="lab-out">
      <button type="button" className="lab-out__head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <TerminalSquare size={16} strokeWidth={2.6} />
        <span>Output</span>
        <span className="lab-out__count tabular">
          {lines} {lines === 1 ? 'line' : 'lines'}
        </span>
        <ChevronRight size={16} strokeWidth={2.6} className={open ? 'lab-out__chev lab-out__chev--open' : 'lab-out__chev'} />
      </button>
      {open && <pre className="lab-out__text">{text}</pre>}
    </section>
  )
}

/* ------------------------------------------------------- celebrations */

function LevelCleared({ lab, level, ms, onNext }: { lab: Lab; level: number; ms: number; onNext: () => void }) {
  const next = lab.levels[level + 1]
  return (
    <motion.div
      className="lab-win"
      initial={{ opacity: 0, scale: 0.92, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 380, damping: 22 }}
    >
      <motion.div className="lab-win__badge" initial={{ rotate: -25, scale: 0.4 }} animate={{ rotate: -6, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 0.08 }}>
        <Check size={34} strokeWidth={3.4} />
      </motion.div>
      <div className="lab-win__text">
        <div className="eyebrow">Level {level + 1} cleared</div>
        <h3>All tests passing</h3>
        <div className="lab-win__meta">
          <span className="chip chip--good">
            <Sparkles size={12} strokeWidth={2.8} /> +{XP.labLevel} XP
          </span>
          <span className="lab-win__time tabular">{formatClock(ms)} elapsed</span>
        </div>
      </div>
      <Button block variant="course" onClick={onNext} iconRight={<ChevronRight size={18} strokeWidth={2.8} />}>
        Level {level + 2}: {next?.title}
      </Button>
    </motion.div>
  )
}

function CompletionCard({ lab, ms, onExit, compact }: { lab: Lab; ms: number; onExit?: () => void; compact?: boolean }) {
  const under = ms <= lab.minutes * 60_000
  return (
    <motion.div
      className={['lab-done', compact && 'lab-done--compact'].filter(Boolean).join(' ')}
      initial={{ opacity: 0, scale: 0.94, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 340, damping: 22 }}
    >
      <div className="lab-done__head">
        <motion.div className="lab-done__badge" initial={{ rotate: -30, scale: 0.3 }} animate={{ rotate: -6, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 12, delay: 0.1 }}>
          <Trophy size={compact ? 26 : 34} strokeWidth={2.6} />
        </motion.div>
        <div className="lab-done__titles">
          <h3>Lab complete</h3>
          <p className="lab-done__name">{lab.title}</p>
          <p className="tabular">
            All {lab.levels.length} levels{ms > 0 ? ` in ${formatClock(ms)}` : ''}
            {ms > 0 && <span className={under ? 'lab-done__under' : 'lab-done__over'}> · {under ? 'under' : 'over'} the {lab.minutes} min target</span>}
          </p>
        </div>
      </div>
      {lab.followUps.length > 0 && (
        <div className="lab-done__follow">
          <div className="lab-done__follow-head">
            <MessageSquareText size={16} strokeWidth={2.6} />
            <span>Interviewer follow-ups</span>
          </div>
          <p className="lab-done__follow-lead">Talk these through out loud, the way you would with an interviewer:</p>
          <ol className="lab-done__list">
            {lab.followUps.map((f, i) => (
              <motion.li key={i} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.08 }}>
                <Rich text={f} />
              </motion.li>
            ))}
          </ol>
        </div>
      )}
      {onExit && (
        <Button block onClick={onExit}>
          Done
        </Button>
      )}
    </motion.div>
  )
}

/* --------------------------------------------------------- self-check */

function SelfCheckBar({
  compared,
  complete,
  level,
  onCompare,
  onDone,
  onTests,
}: {
  compared: boolean
  complete: boolean
  level: number
  onCompare: () => void
  onDone: () => void
  onTests: () => void
}) {
  if (complete)
    return (
      <Button block variant="secondary" icon={<ListChecks size={18} strokeWidth={2.6} />} onClick={onTests}>
        Review the checklist
      </Button>
    )
  return (
    <div className="lab__bar-row">
      {!compared && (
        <Button variant="secondary" icon={<GitCompare size={18} strokeWidth={2.6} />} onClick={onCompare} className="lab__bar-grow">
          Compare
        </Button>
      )}
      <Button block={compared} className="lab__bar-grow" disabled={!compared} icon={<ClipboardCheck size={18} strokeWidth={2.6} />} onClick={onDone}>
        Mark L{level + 1} done
      </Button>
    </div>
  )
}

function SelfCheckPanel({
  lab,
  level,
  passed,
  complete,
  code,
  compared,
  checked,
  onToggle,
  onCompare,
  onRetry,
  reason,
  manual,
  ready,
  cleared,
  onNext,
  onExit,
}: {
  lab: Lab
  level: number
  passed: number
  complete: boolean
  code: string
  compared: boolean
  /** ticks keyed `${level}:${testName}` */
  checked: Record<string, boolean>
  onToggle: (name: string) => void
  onCompare: () => void
  onRetry: () => void
  reason: string
  /** the learner chose self-check while Python was still downloading */
  manual: boolean
  ready: boolean
  cleared: { level: number; ms: number } | null
  onNext: () => void
  onExit: () => void
}) {
  const n = lab.levels.length
  const lv = lab.levels[level]
  const chunks = useMemo(() => splitTests(lv.tests), [lv.tests])
  const isOn = (name: string) => !!checked[`${level}:${name}`]
  const tests = chunks.filter((c) => c.name)
  const done = tests.filter((c) => isOn(c.name!)).length
  const diff = useMemo(() => (compared ? lineDiff(code, lv.solution) : null), [compared, code, lv.solution])

  return (
    <div className="lab-tests">
      <AnimatePresence>
        {cleared && cleared.level + 1 >= n && <CompletionCard key="done" lab={lab} ms={cleared.ms} onExit={onExit} />}
        {cleared && cleared.level + 1 < n && <LevelCleared key="lvl" lab={lab} level={cleared.level} ms={cleared.ms} onNext={onNext} />}
      </AnimatePresence>

      <div className="lab-note">
        <WifiOff size={18} strokeWidth={2.6} />
        <div>
          <b>Self-check mode.</b>{' '}
          {manual
            ? 'Python is still downloading, so check this level by hand: read each test as a checklist, trace your code against it, then compare with the reference and mark the level done.'
            : "The in-browser Python runtime isn't available here, so tests can't run. Read each test as a checklist, trace your code against it, then compare with the reference and mark the level done."}
          {reason && !manual && <span className="lab-note__why">{reason}</span>}
          {(!manual || ready) && (
            <button type="button" className="lab-link lab-note__retry" onClick={onRetry}>
              {ready ? <Play size={13} strokeWidth={2.6} /> : <RotateCcw size={13} strokeWidth={2.6} />} {ready ? 'Python is ready: run the tests instead' : 'Try loading Python again'}
            </button>
          )}
        </div>
      </div>

      <section className="lab-group">
        <div className="lab-group__head">
          <span className="lab-group__level">Level {level + 1}</span>
          <span className="lab-group__title">{lv.title}</span>
          <span className={`lab-group__count tabular ${done === tests.length ? 'is-good' : ''}`}>
            {done}/{tests.length}
          </span>
        </div>
        {complete && level < passed && <p className="lab-sum__hint">You've marked every level done.</p>}
        <div className="lab-checks">
          {chunks.map((c, i) =>
            c.name ? (
              <div key={i} className={['lab-check', isOn(c.name) && 'lab-check--on'].filter(Boolean).join(' ')}>
                <button
                  type="button"
                  className="lab-check__toggle"
                  aria-pressed={isOn(c.name)}
                  onClick={() => {
                    sfx('select')
                    onToggle(c.name!)
                  }}
                >
                  <span className="lab-check__box">{isOn(c.name) && <Check size={14} strokeWidth={3.4} />}</span>
                  <TestName name={c.name} />
                  <span className="lab-check__label">{isOn(c.name) ? 'Handled' : 'Check'}</span>
                </button>
                <Code code={c.code} />
              </div>
            ) : (
              <details key={i} className="lab-check lab-check--setup">
                <summary>Test setup</summary>
                <Code code={c.code} />
              </details>
            ),
          )}
        </div>
      </section>

      <section className="lab-group">
        <div className="lab-group__head">
          <GitCompare size={16} strokeWidth={2.6} />
          <span className="lab-group__title">Your code vs the reference</span>
        </div>
        {diff ? (
          <DiffView rows={diff} />
        ) : (
          <Button variant="secondary" size="md" icon={<GitCompare size={16} strokeWidth={2.6} />} onClick={onCompare}>
            Compare with the solution
          </Button>
        )}
      </section>
    </div>
  )
}

function DiffView({ rows }: { rows: DiffRow[] }) {
  const changed = rows.some((r) => r.t === '-' || r.t === '+')
  if (!changed) return <p className="lab-sum__hint">Your code matches the reference line for line.</p>
  return (
    <div className="lab-diff" role="figure" aria-label="Line diff: minus lines are yours, plus lines are the reference">
      <div className="lab-diff__legend">
        <span className="lab-diff__key lab-diff__key--del">− yours</span>
        <span className="lab-diff__key lab-diff__key--add">+ reference</span>
      </div>
      <div className="lab-diff__scroll">
        <div className="lab-diff__lines">
          {rows.map((r, i) =>
            r.t === 'fold' ? (
              <div key={i} className="lab-diff__fold">
                ⋯ {r.n} unchanged {r.n === 1 ? 'line' : 'lines'}
              </div>
            ) : (
              <div key={i} className={`lab-diff__line lab-diff__line--${r.t === '-' ? 'del' : r.t === '+' ? 'add' : 'same'}`}>
                <span className="lab-diff__sign">{r.t === ' ' ? '' : r.t === '-' ? '−' : '+'}</span>
                <span className="lab-diff__src">{r.s || ' '}</span>
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  )
}

