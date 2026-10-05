import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { CircleCheck, CircleHelp, OctagonX, Pause, Play, RotateCcw, SkipForward, Target, TriangleAlert } from 'lucide-react'
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Button } from '../ui/Button'
import { Tile, type TileState } from '../ui/Tile'
import { haptic, sfx } from '../ui/fx'
import type { VmConfig, WidgetProps } from './specs'
import { DEFAULT_PROGRAM, initVm, nextExec, parseProgram, showNum, stepVm, type Line, type Program, type VmState } from './vm/model'
import './VmWidget.css'

/** ~4 instructions a second while running */
const TICK_MS = 250
const MAX_VISIBLE = 7
const SPRING = { type: 'spring', stiffness: 520, damping: 30 } as const

function useReduced(): boolean {
  const pref = useReducedMotion()
  return !!pref || (typeof document !== 'undefined' && document.documentElement.dataset.reduceMotion === 'true')
}

/** syntax-coloured source line: label, op, argument, comment */
function Source({ line }: { line: Line }) {
  const parts: ReactNode[] = []
  if (line.label) parts.push(<span key="l" className="vm-src__label">{line.label}:</span>)
  if (line.code) {
    const [op, ...rest] = line.code.split(/\s+/)
    const arg = rest.join(' ')
    const argKind = line.instr ? (line.instr.op === 'PUSH' ? 'num' : line.instr.op === 'JMP' || line.instr.op === 'JZ' ? 'label' : 'name') : 'bad'
    parts.push(
      <span key="o" className={['vm-src__op', line.label ? 'is-after-label' : ''].join(' ')}>
        {op}
      </span>,
    )
    if (arg) parts.push(<span key="a" className={`vm-src__arg vm-src__arg--${argKind}`}>{arg}</span>)
  }
  if (line.comment) parts.push(<span key="c" className="vm-src__com"># {line.comment}</span>)
  if (!parts.length) parts.push(<span key="e" className="vm-src__blank"> </span>)
  return <>{parts}</>
}

export default function VmWidget({ config, onComplete }: WidgetProps<VmConfig>) {
  const reduce = useReduced()
  const uid = useId()
  // keyed by value, not identity: a parent re-render with an equal config must not restart the machine
  const programKey = JSON.stringify(Array.isArray(config.program) && config.program.length ? config.program.map(String) : DEFAULT_PROGRAM)
  const prog: Program = useMemo(() => parseProgram(JSON.parse(programKey) as string[]), [programKey])

  // predict: the line index (0-based) where the machine pauses to ask
  const predictKey = JSON.stringify(config.predict ?? null)
  const predict = useMemo(() => JSON.parse(predictKey) as VmConfig['predict'] | null, [predictKey])
  const predictIdx = useMemo(() => {
    if (!predict || !Number.isFinite(predict.line)) return -1
    const i = nextExec(prog, Math.max(0, Math.round(predict.line) - 1))
    return i < prog.lines.length ? i : -1
  }, [predict, prog])
  /** dry run: is the predict line reached, and what is on top after it runs? */
  const dry = useMemo(() => {
    if (predictIdx < 0) return { reachable: false, top: undefined as number | undefined }
    let s = initVm(prog)
    while (s.status === 'ok' && s.pc !== predictIdx) s = stepVm(prog, s)
    if (s.status !== 'ok') return { reachable: false, top: undefined }
    const after = stepVm(prog, s)
    return { reachable: true, top: after.stack[after.stack.length - 1]?.value }
  }, [prog, predictIdx])
  const answer = Number.isFinite(predict?.answer) ? (predict!.answer as number) : dry.top
  const options = useMemo(() => {
    const given = (predict?.options ?? []).filter((n) => Number.isFinite(n))
    if (given.length >= 2) return given
    const a = answer ?? 0
    return [...new Set([a, -a, a + 1, a * 2])].slice(0, 4)
  }, [predict, answer])
  const predictOn = dry.reachable && answer !== undefined
  const goal: 'halt' | 'predict' = config.goal === 'predict' && predictOn ? 'predict' : config.goal === 'halt' ? 'halt' : predictOn ? 'predict' : 'halt'

  const [state, setState] = useState<VmState>(() => initVm(prog))
  const stateRef = useRef(state)
  const [running, setRunning] = useState(false)
  const [asking, setAsking] = useState(false)
  const [predicted, setPredicted] = useState(false)
  const [picks, setPicks] = useState<Record<number, TileState>>({})
  const [reached, setReached] = useState(false)
  const firedRef = useRef(false)
  const predictedRef = useRef(false)
  const timers = useRef<number[]>([])
  const listRef = useRef<HTMLOListElement>(null)

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }
  useEffect(() => () => timers.current.forEach((t) => clearTimeout(t)), [])

  const complete = useCallback(() => {
    if (firedRef.current) return
    firedRef.current = true
    setReached(true)
    sfx('correct')
    haptic('success')
    onComplete(true)
  }, [onComplete])

  const commit = useCallback(
    (next: VmState) => {
      stateRef.current = next
      setState(next)
      if (next.status === 'error') {
        setRunning(false)
        sfx('wrong')
        haptic('error')
      } else if (next.status === 'halted') {
        setRunning(false)
        if (goal === 'halt') complete()
      }
    },
    [goal, complete],
  )

  /** run one instruction, unless the predict line wants an answer first */
  const advance = useCallback((): boolean => {
    const cur = stateRef.current
    if (cur.status !== 'ok') return false
    if (predictOn && cur.pc === predictIdx && !predictedRef.current) {
      setRunning(false)
      setAsking(true)
      return false
    }
    commit(stepVm(prog, cur))
    return true
  }, [commit, predictIdx, predictOn, prog])

  // run loop: ~4 steps a second, stops on halt / error / predict / unmount
  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => {
      if (!advance()) setRunning(false)
    }, TICK_MS)
    return () => clearInterval(id)
  }, [running, advance])

  const reset = useCallback(() => {
    timers.current.forEach((t) => clearTimeout(t))
    timers.current = []
    const s = initVm(prog)
    stateRef.current = s
    setState(s)
    setRunning(false)
    setAsking(false)
    predictedRef.current = false
    setPredicted(false)
    setPicks({})
  }, [prog])

  // a new program (gallery / authoring) restarts the machine
  useEffect(() => {
    reset()
  }, [reset])

  function pick(v: number) {
    if (!asking || picks[v] === 'correct') return
    if (v === answer) {
      setPicks((p) => ({ ...p, [v]: 'correct' }))
      predictedRef.current = true
      setPredicted(true)
      if (goal === 'predict') complete()
      else sfx('correct')
      // let the green tile land, then run the instruction so the stack proves it
      later(
        () => {
          setAsking(false)
          advance()
        },
        reduce ? 150 : 650,
      )
    } else {
      setPicks((p) => ({ ...p, [v]: 'incorrect' }))
      sfx('wrong')
      haptic('error')
    }
  }

  // keep the PC visible when a long listing scrolls inside its box
  useLayoutEffect(() => {
    const list = listRef.current
    if (!list || list.scrollHeight <= list.clientHeight + 2) return
    const row = list.querySelector<HTMLElement>(`[data-line="${state.pc}"]`)
    if (!row) return
    const top = row.offsetTop - list.offsetTop
    if (top < list.scrollTop + 8) list.scrollTop = Math.max(0, top - 8)
    else if (top + row.offsetHeight > list.scrollTop + list.clientHeight - 8) list.scrollTop = top + row.offsetHeight - list.clientHeight + 8
  }, [state.pc])

  const { status, stack, last, error } = state
  const finished = status !== 'ok'
  const hidden = Math.max(0, stack.length - MAX_VISIBLE)
  const visible = stack.slice(hidden)
  const lineNo = (i: number) => i + 1
  const predictLine = predictOn ? prog.lines[predictIdx] : undefined

  const goalText = goal === 'predict' ? `Goal: predict the top of the stack at line ${lineNo(predictIdx)}` : 'Goal: run the program until it halts'
  const reachedText = goal === 'predict' ? 'Goal reached: prediction correct' : 'Goal reached: the program halted'
  const codeOf = (i: number) => prog.lines[i]?.code || prog.lines[i]?.src.trim() || ''

  let narration: ReactNode
  if (last)
    narration = (
      <>
        <span className="vm-say__op">
          <b className="tabular">{lineNo(last.line)}</b>
          {codeOf(last.line)}
        </span>
        <span className="vm-say__text">{last.text}</span>
      </>
    )
  else
    narration = (
      <span className="vm-say__muted">
        Press Step to run line {lineNo(state.pc)}
        {predictOn ? `. The machine pauses at line ${lineNo(predictIdx)} for your prediction.` : '.'}
      </span>
    )

  return (
    <div className="vm">
      <AnimatePresence mode="wait" initial={false}>
        {reached ? (
          <motion.div key="done" className="w-goal vm-goal" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 520, damping: 18 }}>
            <CircleCheck size={18} strokeWidth={2.6} />
            {reachedText}
          </motion.div>
        ) : (
          <motion.div key="todo" className="w-goal vm-goal vm-goal--todo" exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.12 }}>
            <Target size={16} strokeWidth={2.6} />
            {goalText}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="vm-main">
        {/* program listing */}
        <section className="vm-prog" aria-label="Program">
          <header className="vm-head">
            <span className="w-label">Program</span>
            <span className="vm-head__meta tabular">
              {state.steps} step{state.steps === 1 ? '' : 's'}
            </span>
          </header>
          <ol className="vm-list" ref={listRef}>
            {prog.lines.map((line, i) => {
              const isPc = i === state.pc && (status === 'ok' || (status === 'halted' && state.haltReason === 'halt'))
              const isErr = status === 'error' && error?.line === i
              const exec = line.instr || line.error
              return (
                <li
                  key={i}
                  data-line={i}
                  className={[
                    'vm-line',
                    isPc ? 'is-pc' : '',
                    isErr ? 'is-error' : '',
                    !exec ? 'is-meta' : '',
                    status === 'halted' && isPc ? 'is-halted' : '',
                    asking && i === state.pc ? 'is-asking' : '',
                  ].join(' ')}
                >
                  <span className="vm-line__no tabular">{lineNo(i)}</span>
                  <span className="vm-line__pc" aria-hidden>
                    {isPc && !isErr && <motion.span layoutId={`${uid}-pc`} className="vm-line__arrow" transition={reduce ? { duration: 0 } : SPRING} />}
                    {isErr && <TriangleAlert size={12} strokeWidth={3} className="vm-line__err" />}
                  </span>
                  <span className="vm-line__src">
                    <Source line={line} />
                  </span>
                  {predictOn && i === predictIdx && !predicted && !isPc && (
                    <span className="vm-line__q" title="The machine pauses here">
                      ?
                    </span>
                  )}
                  {last && last.line === i && !reduce && (
                    <motion.span
                      key={`flash-${state.steps}`}
                      className="vm-line__flash"
                      initial={{ opacity: 0.85 }}
                      animate={{ opacity: 0 }}
                      transition={{ duration: 0.7, ease: 'easeOut' }}
                      aria-hidden
                    />
                  )}
                </li>
              )
            })}
          </ol>
        </section>

        {/* stack */}
        <section className={['vm-stack', status === 'error' && error?.message.includes('underflow') ? 'is-error' : ''].join(' ')} aria-label="Stack">
          <header className="vm-head">
            <span className="w-label">Stack</span>
            <span className="vm-head__meta tabular">{stack.length}</span>
          </header>
          <motion.div
            className="vm-well"
            animate={status === 'error' && !reduce ? { x: [0, -6, 6, -4, 4, -2, 0] } : { x: 0 }}
            transition={{ duration: 0.42 }}
          >
            {stack.length === 0 && <span className="vm-well__empty">empty</span>}
            <div className="vm-blocks">
              <AnimatePresence initial={false} mode="popLayout">
                {visible.map((item, k) => {
                  const isTop = k === visible.length - 1
                  return (
                    <motion.div
                      key={item.id}
                      layout={!reduce}
                      className={['vm-block', isTop ? 'is-top' : ''].join(' ')}
                      initial={reduce ? false : { y: -34, opacity: 0, scale: 0.7 }}
                      animate={{ y: 0, opacity: 1, scale: 1 }}
                      exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { y: -26, opacity: 0, scale: 0.6, transition: { duration: 0.18 } }}
                      transition={SPRING}
                    >
                      <span className="vm-block__v tabular">{showNum(item.value)}</span>
                      {isTop && <span className="vm-block__tag">top</span>}
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
            {hidden > 0 && <span className="vm-well__more">+{hidden} below</span>}
          </motion.div>
        </section>
      </div>

      {/* what the last instruction did; the prediction or the error take its place */}
      <AnimatePresence mode="popLayout" initial={false}>
        {status === 'error' && error ? (
          <motion.div
            key="err"
            className="vm-error"
            role="alert"
            initial={reduce ? false : { opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={SPRING}
          >
            <OctagonX size={18} strokeWidth={2.6} />
            <div>
              <b>Error on line {lineNo(error.line)}</b>
              <span className="vm-error__code">{codeOf(error.line)}</span>
              <span>{error.message}</span>
            </div>
          </motion.div>
        ) : asking && predictLine ? (
          <motion.section
            key="ask"
            className="vm-ask"
            initial={reduce ? false : { opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.12 } }}
            transition={SPRING}
          >
            <div className="vm-ask__q">
              <CircleHelp size={18} strokeWidth={2.6} />
              <span>
                What will be on top of the stack after <code>{predictLine.code}</code> runs?
              </span>
            </div>
            <div className="vm-ask__opts">
              {options.map((v) => (
                <Tile
                  key={v}
                  compact
                  state={picks[v] ?? (Object.values(picks).includes('correct') ? 'dimmed' : 'idle')}
                  className="vm-ask__tile"
                  onClick={() => pick(v)}
                  disabled={picks[v] === 'incorrect' || Object.values(picks).includes('correct')}
                >
                  {showNum(v)}
                </Tile>
              ))}
            </div>
            <AnimatePresence>
              {Object.values(picks).includes('incorrect') && !Object.values(picks).includes('correct') && (
                <motion.p key="nudge" className="vm-ask__nudge" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  Not quite. Look at the stack: which value is on top, and what does {predictLine.instr?.op ?? 'this line'} do with it?
                </motion.p>
              )}
            </AnimatePresence>
          </motion.section>
        ) : (
          <motion.div
            key="say"
            className={['vm-say', last ? 'is-live' : ''].join(' ')}
            aria-live="polite"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.08 } }}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={state.steps}
                className="vm-say__in"
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.08 } }}
                transition={{ duration: 0.18 }}
              >
                {narration}
              </motion.span>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="vm-io">
        <section className="vm-vars" aria-label="Variables">
          <span className="w-label">Variables</span>
          {state.varOrder.length === 0 ? (
            <span className="vm-io__empty">none yet</span>
          ) : (
            <ul>
              {state.varOrder.map((name) => (
                <li key={name}>
                  <span className="vm-vars__k">{name}</span>
                  <span className="vm-vars__v tabular">
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span
                        key={state.vars[name]}
                        initial={reduce ? false : { y: -12, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 12, opacity: 0 }}
                        transition={SPRING}
                      >
                        {showNum(state.vars[name])}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="vm-out" aria-label="Output">
          <span className="w-label">Output</span>
          <div className="vm-out__console">
            <span className="vm-out__prompt" aria-hidden>
              &gt;
            </span>
            <AnimatePresence initial={false}>
              {state.output.map((v, i) => (
                <motion.span
                  key={i}
                  className="vm-out__val tabular"
                  initial={reduce ? false : { opacity: 0, scale: 0.4, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 600, damping: 20 }}
                >
                  {showNum(v)}
                </motion.span>
              ))}
            </AnimatePresence>
            {status === 'halted' && (
              <motion.span className="vm-out__halt" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }}>
                {state.haltReason === 'halt' ? 'halted' : 'end of program'}
              </motion.span>
            )}
            {status === 'error' && <span className="vm-out__crash">crashed</span>}
          </div>
        </section>
      </div>

      <div className="vm-controls">
        <Button
          size="sm"
          variant="course"
          icon={<SkipForward size={15} strokeWidth={2.6} />}
          onClick={() => {
            setRunning(false)
            advance()
          }}
          disabled={finished || asking}
        >
          Step
        </Button>
        <Button
          size="sm"
          variant="secondary"
          icon={running ? <Pause size={15} strokeWidth={2.6} fill="currentColor" /> : <Play size={15} strokeWidth={2.6} fill="currentColor" />}
          onClick={() => {
            if (running) setRunning(false)
            else if (advance()) setRunning(true)
          }}
          disabled={finished || asking}
          aria-pressed={running}
        >
          {running ? 'Pause' : 'Run'}
        </Button>
        <Button size="sm" variant="ghost" className="vm-controls__reset" icon={<RotateCcw size={14} strokeWidth={2.6} />} onClick={reset} disabled={state.steps === 0 && !asking}>
          Reset
        </Button>
      </div>
    </div>
  )
}
