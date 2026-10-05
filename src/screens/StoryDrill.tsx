import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, CalendarClock, Check, Mic, NotebookPen, Pause, Play, RotateCcw, Sparkles, Timer, TriangleAlert, UserRound, X } from 'lucide-react'
import { XP, scheduleOptions, useStore } from '../core/store'
import type { StorySlot, StorySlotId } from '../core/types'
import { STORY_BY_ID, STORY_SLOTS } from '../content/skills'
import { formatInterval, newCard, previewIntervals, type Grade } from '../core/fsrs'
import { DAY_MS } from '../core/dates'
import { useNav } from '../app/nav'
import { Button, IconButton } from '../ui/Button'
import { ProgressBar } from '../ui/ProgressBar'
import { Ring } from '../ui/Ring'
import { Ticker } from '../ui/Ticker'
import { courseStyle } from '../ui/course'
import { celebrate, haptic, sfx } from '../ui/fx'
import { SLOT_ICON, dueIn, groupOf, hasAnyText, isDrafted, layerDone } from './StoriesScreen'
import { clock } from './StoryEditor'
import './StoryDrill.css'

/** the speak-it-out budget per answer */
const BUDGET_S = 120

const GRADES: { g: Grade; label: string; hint: string }[] = [
  { g: 1, label: 'Blanked', hint: 'Lost the thread' },
  { g: 2, label: 'Rough', hint: 'Got there, messy' },
  { g: 3, label: 'Solid', hint: 'Covered it' },
  { g: 4, label: 'Crisp', hint: 'Tight and natural' },
]

interface Item {
  slot: StorySlotId
  def: StorySlot
  followUp: string | null
}

interface Result {
  slot: StorySlotId
  grade: Grade
  due: number
}

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/**
 * First rehearsal: the main question. After that, a follow-up from the
 * slot, cycling with the rehearsal count (offset per slot) so each one comes
 * up in turn and the delivery cannot settle into a script.
 */
function followUpFor(def: StorySlot, rehearsals: number): string | null {
  if (rehearsals <= 0 || !def.followUps.length) return null
  return def.followUps[(hash(def.id) + rehearsals - 1) % def.followUps.length]
}

function buildQueue(slots?: StorySlotId[]): Item[] {
  const s = useStore.getState()
  const now = Date.now()
  let ids: StorySlotId[]
  if (slots?.length) ids = slots.filter((id, i) => STORY_BY_ID[id] && hasAnyText(s.stories[id]) && slots.indexOf(id) === i)
  else
    ids = STORY_SLOTS.map((x) => x.id)
      .filter((id) => isDrafted(s.stories[id]))
      .sort((a, b) => (s.stories[a]?.rehearsal?.due ?? now) - (s.stories[b]?.rehearsal?.due ?? now))
  return ids.map((id) => ({ slot: id, def: STORY_BY_ID[id], followUp: followUpFor(STORY_BY_ID[id], s.stories[id]?.rehearsals ?? 0) }))
}

/** a pausable stopwatch measured against a countdown budget */
function useSpeakTimer() {
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const base = useRef(0)
  const since = useRef<number | null>(null)
  const read = () => base.current + (since.current != null ? performance.now() - since.current : 0)

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setElapsed(read()), 200)
    return () => clearInterval(id)
  }, [running])

  const start = useCallback(() => {
    since.current = performance.now()
    setRunning(true)
  }, [])
  const pause = useCallback(() => {
    base.current = read()
    since.current = null
    setElapsed(base.current)
    setRunning(false)
  }, [])
  const reset = useCallback(() => {
    base.current = 0
    since.current = null
    setElapsed(0)
    setRunning(false)
  }, [])
  return { running, elapsed: elapsed / 1000, start, pause, reset, read: () => read() / 1000 }
}

export default function StoryDrill({ slots, onExit }: { slots?: StorySlotId[]; onExit: () => void }) {
  const [queue] = useState<Item[]>(() => buildQueue(slots))
  const [pos, setPos] = useState(0)
  const [phase, setPhase] = useState<'ask' | 'check'>('ask')
  const [checked, setChecked] = useState<Set<number>>(() => new Set())
  const [spoke, setSpoke] = useState(0)
  const [results, setResults] = useState<Result[]>([])
  const [done, setDone] = useState(false)
  const [pops, setPops] = useState<number[]>([])
  const [typing, setTyping] = useState(true)
  const timer = useSpeakTimer()
  const stageRef = useRef<HTMLDivElement>(null)
  const overRef = useRef(false)
  /** blocks a double tap on the last grade while the summary is on its way */
  const finishing = useRef(false)

  const item = queue[pos]
  const entry = useStore((s) => (item ? s.stories[item.slot] : undefined))
  const retention = useStore((s) => s.settings.retention)
  const interviewDate = useStore((s) => s.profile.interviewDate)
  const group = item ? groupOf(item.slot) : groupOf('why-anthropic')

  // interviewer "types" for a beat before each question
  useEffect(() => {
    setTyping(true)
    const t = setTimeout(() => setTyping(false), 650)
    return () => clearTimeout(t)
  }, [pos])

  // one nudge when the two minutes run out
  useEffect(() => {
    const over = timer.elapsed >= BUDGET_S
    if (over && !overRef.current) {
      sfx('flip')
      haptic('error')
    }
    overRef.current = over
  }, [timer.elapsed])

  const rehearsal = entry?.rehearsal
  const intervals = useMemo(() => {
    const now = Date.now()
    return previewIntervals(rehearsal ?? newCard(now, 0), now, scheduleOptions(useStore.getState()))
  }, [rehearsal, retention, interviewDate])

  if (!queue.length) return <EmptyDrill onExit={onExit} />
  if (done || !item) return <Summary results={results} onExit={onExit} />

  const answered = () => {
    setSpoke(timer.read())
    timer.pause()
    setPhase('check')
    sfx('flip')
    haptic('light')
    stageRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const grade = (g: Grade) => {
    if (finishing.current) return
    const st = useStore.getState()
    st.rehearseStory(item.slot, g)
    const due = useStore.getState().stories[item.slot]?.rehearsal?.due ?? Date.now()
    const next = [...results, { slot: item.slot, grade: g, due }]
    setResults(next)
    setPops((p) => [...p, Date.now()])
    if (g >= 3) {
      sfx('correct')
      haptic('success')
    } else {
      sfx('select')
      haptic('light')
    }
    if (pos + 1 >= queue.length) {
      finishing.current = true
      setTimeout(() => {
        setDone(true)
        sfx('complete')
        setTimeout(() => celebrate('small', { x: 0.5, y: 0.35 }), 250)
      }, 380)
      return
    }
    setPos(pos + 1)
    setPhase('ask')
    setChecked(new Set())
    setSpoke(0)
    timer.reset()
    stageRef.current?.scrollTo({ top: 0 })
  }

  const toggle = (i: number) => {
    setChecked((c) => {
      const n = new Set(c)
      if (n.has(i)) n.delete(i)
      else n.add(i)
      return n
    })
    sfx('select')
    haptic('light')
  }

  const capped = !!interviewDate && formatInterval(intervals[3]) === formatInterval(intervals[4])
  const remaining = BUDGET_S - timer.elapsed
  const over = remaining < 0
  const timerLabel = over ? 'Over time' : timer.running ? 'Speaking' : timer.elapsed > 0 ? 'Paused' : 'Two minutes'
  const Icon = SLOT_ICON[item.slot] ?? NotebookPen
  const layers = item.def.layers
  const progress = (pos + (phase === 'check' ? 0.5 : 0)) / queue.length

  return (
    <div className="drl" style={courseStyle(group.color)}>
      <header className="drl-head safe-top">
        <IconButton label="End rehearsal" onClick={onExit}>
          <X size={24} strokeWidth={2.6} />
        </IconButton>
        <div className="drl-head__bar">
          <ProgressBar value={progress} label="Rehearsal progress" />
        </div>
        <span className="drl-head__count tabular">
          {pos + 1}/{queue.length}
        </span>
        <div className="drl-pops" aria-hidden>
          <AnimatePresence>
            {pops.slice(-3).map((k) => (
              <motion.span
                key={k}
                className="drl-pop"
                initial={{ opacity: 0, y: 8, scale: 0.7 }}
                animate={{ opacity: [0, 1, 1, 0], y: [8, -6, -14, -26], scale: [0.7, 1.1, 1, 1] }}
                transition={{ duration: 1.3, times: [0, 0.2, 0.7, 1] }}
                onAnimationComplete={() => setPops((p) => p.filter((x) => x !== k))}
              >
                <Sparkles size={13} strokeWidth={2.8} />+{XP.story} XP
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      </header>

      <div className="drl-stage scroll" ref={stageRef}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={`${item.slot}:${pos}`}
            className="drl-slide"
            initial={{ x: 70, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -70, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
          >
            <div className="drl-story">
              <span className="drl-story__icon" aria-hidden>
                <Icon size={16} strokeWidth={2.6} />
              </span>
              <span className="drl-story__title">{item.def.title}</span>
              <span className="drl-story__group">{group.title}</span>
            </div>

            <section className="drl-ask" aria-live="polite">
              <div className="drl-who">
                <span className="drl-avatar" aria-hidden>
                  <UserRound size={20} strokeWidth={2.6} />
                </span>
                <span className="drl-who__label">{item.followUp ? 'Follow-up question' : 'Interviewer asks'}</span>
              </div>
              <AnimatePresence mode="wait" initial={false}>
                {typing ? (
                  <motion.div
                    key="typing"
                    className="drl-bubble drl-bubble--typing"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.15 }}
                    aria-label="Interviewer is typing"
                  >
                    <i />
                    <i />
                    <i />
                  </motion.div>
                ) : (
                  <motion.div
                    key="q"
                    className="drl-bubble"
                    initial={{ opacity: 0, y: 10, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 460, damping: 28 }}
                  >
                    {item.followUp ?? item.def.question}
                  </motion.div>
                )}
              </AnimatePresence>
              {item.followUp && (
                <p className="drl-context">
                  About your <b>{item.def.title}</b> story. Give the 30-second version, then answer this one in depth.
                </p>
              )}
            </section>

            <AnimatePresence initial={false} mode="popLayout">
              {phase === 'ask' ? (
                <motion.section
                  key="timer"
                  className={`drl-timer ${over ? 'is-over' : ''}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                >
                  <Ring
                    value={over ? 1 : remaining / BUDGET_S}
                    size={168}
                    stroke={12}
                    color={over ? 'var(--retry)' : 'var(--c)'}
                    track="var(--surface-3)"
                    label={`${clock(Math.abs(remaining))} ${over ? 'over' : 'left'}`}
                  >
                    <span className="drl-timer__in">
                      <b className="tabular">
                        {over ? '+' : ''}
                        {clock(over ? -remaining : Math.ceil(remaining))}
                      </b>
                      <span>{timerLabel}</span>
                    </span>
                  </Ring>
                  <div className="drl-timer__ctl">
                    <span className="drl-timer__side">
                      {timer.elapsed > 0 && (
                        <IconButton label="Reset timer" className="drl-reset" onClick={timer.reset}>
                          <RotateCcw size={20} strokeWidth={2.6} />
                        </IconButton>
                      )}
                    </span>
                    <motion.button
                      type="button"
                      className={`drl-play ${timer.running ? 'is-running' : ''}`}
                      aria-label={timer.running ? 'Pause timer' : 'Start timer'}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => {
                        sfx('tap')
                        haptic('light')
                        if (timer.running) timer.pause()
                        else timer.start()
                      }}
                    >
                      <span className="drl-play__face">
                        {timer.running ? <Pause size={28} strokeWidth={2.6} fill="currentColor" /> : <Play size={28} strokeWidth={2.6} fill="currentColor" />}
                      </span>
                    </motion.button>
                    <span className="drl-timer__side" />
                  </div>
                  <p className="drl-timer__hint">{timer.running || timer.elapsed > 0 ? 'Answer as if they are listening.' : 'Start the timer, then answer out loud.'}</p>
                </motion.section>
              ) : (
                <motion.section
                  key="check"
                  className="drl-check"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                >
                  {spoke > 1 && (
                    <div className={`drl-spoke ${spoke > BUDGET_S ? 'is-over' : ''}`}>
                      {spoke > BUDGET_S ? <TriangleAlert size={15} strokeWidth={2.8} /> : <Timer size={15} strokeWidth={2.8} />}
                      {spoke > BUDGET_S ? (
                        <span>
                          <b className="tabular">{clock(spoke)}</b>, over by {clock(spoke - BUDGET_S)}. Trim to the core.
                        </span>
                      ) : (
                        <span>
                          You spoke for <b className="tabular">{clock(spoke)}</b>
                        </span>
                      )}
                    </div>
                  )}
                  <div className="drl-check__head">
                    <h3>Did you cover…</h3>
                    <span className="drl-check__count tabular">
                      {checked.size}/{layers.length}
                    </span>
                  </div>
                  <ul className="drl-list">
                    {layers.map((prompt, i) => {
                      const on = checked.has(i)
                      const text = (entry?.layers[i] ?? '').trim()
                      return (
                        <li key={i}>
                          <motion.button
                            type="button"
                            className={`drl-item ${on ? 'is-on' : ''}`}
                            aria-pressed={on}
                            whileTap={{ y: 2 }}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ type: 'spring', stiffness: 420, damping: 32, delay: 0.05 + i * 0.05 }}
                            onClick={() => toggle(i)}
                          >
                            <span className="drl-item__box" aria-hidden>
                              <AnimatePresence initial={false}>
                                {on && (
                                  <motion.span
                                    initial={{ scale: 0.2, rotate: -25 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    exit={{ scale: 0.2, opacity: 0 }}
                                    transition={{ type: 'spring', stiffness: 600, damping: 18 }}
                                  >
                                    <Check size={16} strokeWidth={3.6} />
                                  </motion.span>
                                )}
                              </AnimatePresence>
                            </span>
                            <span className="drl-item__main">
                              <span className="drl-item__prompt">{prompt}</span>
                              {text ? (
                                <span className={`drl-item__text ${layerDone(text) ? '' : 'is-thin'}`}>{text}</span>
                              ) : (
                                <span className="drl-item__text is-empty">Not drafted yet</span>
                              )}
                            </span>
                          </motion.button>
                        </li>
                      )
                    })}
                  </ul>
                </motion.section>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      </div>

      <footer className="drl-foot safe-bottom">
        <AnimatePresence mode="wait" initial={false}>
          {phase === 'ask' ? (
            <motion.div key="ask" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.15 }}>
              <Button block size="lg" icon={<Mic size={20} strokeWidth={2.6} />} onClick={answered}>
                I’ve answered out loud
              </Button>
            </motion.div>
          ) : (
            <motion.div key="grade" className="drl-grade" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 34 }}>
              <div className="drl-grade__q">How did it go?</div>
              <div className="drl-grade__row">
                {GRADES.map(({ g, label, hint }) => (
                  <motion.button
                    key={g}
                    type="button"
                    className={`drl-gbtn drl-gbtn--${g}`}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => grade(g)}
                    aria-label={`${label}: ${hint}. Next rehearsal in ${formatInterval(intervals[g])}.`}
                  >
                    <span className="drl-gbtn__face">
                      <b>{label}</b>
                      <span className="tabular">{formatInterval(intervals[g])}</span>
                    </span>
                  </motion.button>
                ))}
              </div>
              {capped && <p className="drl-grade__note">Intervals are capped so this story is fresh for your interview.</p>}
            </motion.div>
          )}
        </AnimatePresence>
      </footer>
    </div>
  )
}

/* -------------------------------------------------------------- summary */

const GRADE_LABEL: Record<Grade, string> = { 1: 'Blanked', 2: 'Rough', 3: 'Solid', 4: 'Crisp' }

function Summary({ results, onExit }: { results: Result[]; onExit: () => void }) {
  const [now] = useState(() => Date.now())
  const n = results.length
  const nextDue = n ? Math.min(...results.map((r) => r.due)) : null
  const blanked = results.some((r) => r.grade === 1)
  return (
    <div className="drl drl--end" style={courseStyle('rose')}>
      <div className="drl-end scroll safe-top">
        <motion.div className="drl-badge" initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }}>
          <span className="drl-badge__rays" aria-hidden />
          <span className="drl-badge__face">
            <Mic size={52} strokeWidth={2.2} />
          </span>
        </motion.div>
        <motion.div className="drl-end__titles" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, type: 'spring', stiffness: 380, damping: 30 }}>
          <div className="eyebrow">Rehearsal complete</div>
          <h1>
            {n} {n === 1 ? 'story' : 'stories'} rehearsed
          </h1>
        </motion.div>
        <motion.div className="drl-tiles" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, type: 'spring', stiffness: 380, damping: 30 }}>
          <div className="drl-tile drl-tile--xp">
            <span className="drl-tile__label">
              <Sparkles size={16} strokeWidth={2.6} />
              XP earned
            </span>
            <b className="drl-tile__value">
              +<Ticker from={0} value={n * XP.story} />
            </b>
          </div>
          <div className="drl-tile">
            <span className="drl-tile__label">
              <CalendarClock size={16} strokeWidth={2.6} />
              Next rehearsal
            </span>
            <b className="drl-tile__value">{nextDue ? dueIn(nextDue, now) : '–'}</b>
          </div>
        </motion.div>
        <motion.ul className="drl-results" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.35 } } }}>
          {results.map((r, i) => {
            const def = STORY_BY_ID[r.slot]
            const Icon = SLOT_ICON[r.slot] ?? NotebookPen
            return (
              <motion.li
                key={`${r.slot}:${i}`}
                className="drl-res"
                style={courseStyle(groupOf(r.slot).color)}
                variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 420, damping: 32 } } }}
              >
                <span className="drl-res__icon" aria-hidden>
                  <Icon size={18} strokeWidth={2.6} />
                </span>
                <span className="drl-res__main">
                  <b>{def?.title ?? r.slot}</b>
                  <span className="tabular">Next {r.due - now < DAY_MS / 24 ? `in ${formatInterval((r.due - now) / DAY_MS)}` : dueIn(r.due, now)}</span>
                </span>
                <span className={`drl-res__grade drl-res__grade--${r.grade}`}>{GRADE_LABEL[r.grade]}</span>
              </motion.li>
            )
          })}
        </motion.ul>
        {blanked && <p className="drl-end__note">Blanked stories come back in about ten minutes. Reread the layers once, then try again.</p>}
      </div>
      <div className="drl-end__foot safe-bottom">
        <Button block size="lg" onClick={onExit}>
          Done
        </Button>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- empty */

function EmptyDrill({ onExit }: { onExit: () => void }) {
  const setTab = useNav((n) => n.setTab)
  return (
    <div className="drl drl--empty" style={courseStyle('rose')}>
      <header className="drl-head safe-top">
        <IconButton label="Close" onClick={onExit}>
          <X size={24} strokeWidth={2.6} />
        </IconButton>
      </header>
      <div className="drl-empty scroll">
        <motion.span
          className="drl-empty__art"
          initial={{ scale: 0.5, rotate: -16, opacity: 0 }}
          animate={{ scale: 1, rotate: -6, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 360, damping: 14 }}
          aria-hidden
        >
          <Mic size={44} strokeWidth={2.2} />
        </motion.span>
        <h1>Nothing to rehearse yet</h1>
        <p>
          Rehearsal needs a drafted story: at least two layers with a few honest sentences each. Draft one in the Story Bank, then come back and say it out loud.
        </p>
      </div>
      <div className="drl-end__foot safe-bottom">
        <Button
          block
          size="lg"
          iconRight={<ArrowRight size={20} strokeWidth={2.8} />}
          onClick={() => {
            onExit()
            setTab('stories')
          }}
        >
          Go to the Story Bank
        </Button>
      </div>
    </div>
  )
}
