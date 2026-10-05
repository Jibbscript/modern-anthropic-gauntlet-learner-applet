import { AnimatePresence, motion, useReducedMotion, useReducedMotionConfig } from 'motion/react'
import { ClipboardCheck, Minus, Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import type { InterviewStep as T } from '../core/types'
import { Rich } from '../ui/Rich'
import { Tile } from '../ui/Tile'
import { haptic, sfx } from '../ui/fx'
import { seededShuffle } from './shuffle'
import type { StepProps } from './types'
import './steps.css'
import './InterviewStep.css'

type Quality = 'strong' | 'okay' | 'weak'
type Turn = T['turns'][number]

const QUALITY: Record<Quality, { label: string; Icon: typeof ThumbsUp }> = {
  strong: { label: 'Strong', Icon: ThumbsUp },
  okay: { label: 'Okay', Icon: Minus },
  weak: { label: 'Weak', Icon: ThumbsDown },
}

/** typing indicator before each interviewer message */
const TYPING_MS = 600
/** pause after the learner's reply so the verdict can be read before the next question */
const READ_MS = 950
/** the picked tile shows "selected" for a beat before it moves into the transcript */
const COMMIT_MS = 170
/** the reply bubble lands, then gets its verdict */
const GRADE_MS = 320
const WRAP_MS = 750

const SPRING = { type: 'spring', stiffness: 520, damping: 32 } as const
const POP = { type: 'spring', stiffness: 600, damping: 22 } as const

function useReduce(): boolean {
  const cfg = useReducedMotionConfig()
  const os = useReducedMotion()
  return !!cfg || !!os || (typeof document !== 'undefined' && document.documentElement.dataset.reduceMotion === 'true')
}

/** nearest ancestor that scrolls vertically (the StepRunner body) */
function scrollParent(el: HTMLElement): HTMLElement | null {
  let p = el.parentElement
  while (p) {
    const oy = getComputedStyle(p).overflowY
    if (oy === 'auto' || oy === 'scroll') return p
    p = p.parentElement
  }
  return null
}

/** the strongest option of a turn (first 'strong', else first 'okay') */
function bestOption(turn: Turn): number {
  const s = turn.options.findIndex((o) => o.quality === 'strong')
  if (s >= 0) return s
  const o = turn.options.findIndex((x) => x.quality === 'okay')
  return o >= 0 ? o : 0
}

/**
 * A short simulated interview as a chat transcript. The interviewer "types",
 * asks; the learner picks a reply from pressable tiles; the reply lands as a
 * right-aligned bubble and is graded on the spot (Strong / Okay / Weak with a
 * one-line note). After the last turn a debrief card tallies the picks and
 * the step reports itself via complete(): it passes with no weak picks.
 */
export default function InterviewStep({ step, phase, attempt, complete }: StepProps<T & { id: string }>) {
  const turns = step.turns
  const reduce = useReduce()

  // option display order per turn (varies per attempt so a retry is not just recall of positions)
  const orders = useMemo(
    () => turns.map((tr, t) => seededShuffle(tr.options.map((_, i) => i), `${step.id}:${t}:${attempt}`)),
    [turns, step.id, attempt],
  )

  /** option index (into turn.options) picked per answered turn */
  const [picks, setPicks] = useState<number[]>([])
  /** number of interviewer messages shown */
  const [asked, setAsked] = useState(0)
  const [typing, setTyping] = useState(false)
  /** number of reply bubbles that have received their verdict */
  const [graded, setGraded] = useState(0)
  /** the tile tapped for the current turn, shown selected for a beat */
  const [chosen, setChosen] = useState<number | null>(null)
  const [wrapped, setWrapped] = useState(turns.length === 0)

  const completeRef = useRef(complete)
  completeRef.current = complete
  const reported = useRef(false)
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }

  const qualities = picks.map((p, t) => turns[t].options[p].quality)
  const counts = { strong: 0, okay: 0, weak: 0 } as Record<Quality, number>
  qualities.forEach((q) => counts[q]++)

  // the interviewer asks the next question: typing dots, then the bubble
  useEffect(() => {
    if (phase !== 'answer' || asked !== picks.length || asked >= turns.length) return
    const ids: number[] = []
    const pause = asked === 0 ? 200 : reduce ? 450 : READ_MS
    if (reduce) {
      ids.push(window.setTimeout(() => setAsked((a) => a + 1), asked === 0 ? 0 : pause))
    } else {
      ids.push(window.setTimeout(() => setTyping(true), pause))
      ids.push(
        window.setTimeout(() => {
          setTyping(false)
          setAsked((a) => a + 1)
        }, pause + TYPING_MS),
      )
    }
    return () => {
      ids.forEach(clearTimeout)
      setTyping(false)
    }
  }, [phase, asked, picks.length, turns.length, reduce])

  // after the last reply: debrief card
  useEffect(() => {
    if (phase !== 'answer' || wrapped || turns.length === 0 || picks.length < turns.length) return
    const id = window.setTimeout(() => setWrapped(true), reduce ? 400 : WRAP_MS)
    return () => clearTimeout(id)
  }, [phase, wrapped, picks.length, turns.length, reduce])

  const summary = useMemo(() => {
    const n = turns.length
    const { strong: s, okay: o, weak: w } = counts
    if (n === 0) return undefined
    if (w > 0) return `${w} weak ${w === 1 ? 'reply' : 'replies'} out of ${n}. The bar is no weak replies.`
    if (o === 0) return n === 1 ? 'Your reply was strong.' : `All ${n} replies were strong.`
    return `${s} strong, ${o} okay, no weak replies.`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counts.strong, counts.okay, counts.weak, turns.length])

  // report exactly once, when the debrief appears
  useEffect(() => {
    if (!wrapped || reported.current || phase !== 'answer') return
    reported.current = true
    completeRef.current({ correct: counts.weak === 0, feedback: summary })
  }, [wrapped, phase, counts.weak, summary])

  const current = picks.length
  const optionsOpen = phase === 'answer' && !wrapped && asked === current + 1 && current < turns.length && !typing

  const pick = (opt: number) => {
    if (!optionsOpen || chosen != null) return
    setChosen(opt)
    const turn = current
    const q = turns[turn].options[opt].quality
    later(() => {
      setChosen(null)
      setPicks((p) => (p.length === turn ? [...p, opt] : p))
    }, COMMIT_MS)
    later(() => {
      setGraded((g) => Math.max(g, turn + 1))
      if (q === 'strong') {
        sfx('unlock')
        haptic('success')
      } else if (q === 'weak') {
        sfx('wrong')
        haptic('error')
      } else haptic('light')
    }, COMMIT_MS + GRADE_MS)
  }

  // keyboard: 1..n picks a reply
  useEffect(() => {
    if (!optionsOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      const n = Number(e.key)
      const order = orders[current]
      if (Number.isInteger(n) && n >= 1 && n <= order.length) {
        e.preventDefault()
        pick(order[n - 1])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // keep the newest message in view (without pushing its top out of sight); on reveal, go to the first stronger reply
  const rootRef = useRef<HTMLDivElement>(null)
  const revealed = phase === 'revealed'
  const followUntil = useRef(0)
  const follow = useRef<() => void>(() => {})
  follow.current = () => {
    const root = rootRef.current
    const sc = root && scrollParent(root)
    if (!root || !sc) return
    const max = sc.scrollHeight - sc.clientHeight
    if (max <= 0) return
    const anchors = root.querySelectorAll<HTMLElement>('[data-anchor]')
    const reveal = revealed ? root.querySelector<HTMLElement>('[data-reveal]') : null
    const anchor = reveal ?? anchors[anchors.length - 1]
    let target = max
    if (anchor) {
      const top = anchor.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - 16
      target = Math.max(0, Math.min(max, top))
    }
    // only ever scroll down, except to bring the first revealed answer into view
    if (target > sc.scrollTop + 2 || (reveal && Math.abs(target - sc.scrollTop) > 2)) sc.scrollTo({ top: target, behavior: reduce ? 'auto' : 'smooth' })
  }
  useEffect(() => {
    followUntil.current = performance.now() + 1200
    const raf = requestAnimationFrame(() => follow.current())
    return () => cancelAnimationFrame(raf)
  }, [asked, current, graded, typing, wrapped, revealed, phase])
  // the feedback panel below grows after it mounts and shrinks the scroll area; keep following briefly
  useEffect(() => {
    const root = rootRef.current
    const sc = root && scrollParent(root)
    if (!sc || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => {
      if (performance.now() < followUntil.current) follow.current()
    })
    ro.observe(sc)
    return () => ro.disconnect()
  }, [])

  return (
    <div className="step interview" ref={rootRef}>
      <div className="interview-head">
        <div className="eyebrow step__eyebrow">{step.eyebrow ?? 'Interview sim'}</div>
        {turns.length > 1 && <Pips turns={turns.length} asked={asked} qualities={qualities} graded={graded} />}
      </div>

      <div className="interview-log" role="log" aria-live="polite" aria-label="Interview transcript">
        {step.setup && (
          <motion.div
            className="interview-setup"
            initial={attempt === 0 ? { opacity: 0, y: 6 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={SPRING}
          >
            <Rich text={step.setup} inline />
          </motion.div>
        )}

        {turns.slice(0, asked).map((turn, t) => {
          const p = picks[t]
          const q = p != null ? turn.options[p].quality : undefined
          const best = bestOption(turn)
          return (
            <Fragment key={t}>
              <Interviewer text={turn.interviewer} first={t === 0} />
              {p != null && q && (
                <Reply text={turn.options[p].text} feedback={turn.options[p].feedback} quality={q} graded={graded > t} reduce={reduce} />
              )}
              <AnimatePresence initial={false}>
                {revealed && p != null && q !== 'strong' && (
                  <motion.div
                    key="reveal"
                    className="interview-reveal"
                    data-reveal
                    initial={{ opacity: 0, y: 10, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ ...SPRING, delay: 0.08 * t }}
                  >
                    <div className="interview-reveal__label">
                      <Sparkles size={14} strokeWidth={2.6} /> Stronger reply
                    </div>
                    <Rich text={turn.options[best].text} className="interview-reveal__text" />
                    <Rich text={turn.options[best].feedback} className="interview-reveal__why" />
                  </motion.div>
                )}
              </AnimatePresence>
            </Fragment>
          )
        })}

        <AnimatePresence>
          {typing && (
            <motion.div
              key={`typing-${asked}`}
              className="interview-row"
              data-anchor
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.1 } }}
              transition={SPRING}
            >
              <Avatar />
              <div className="interview-typing" role="status" aria-label="Interviewer is typing">
                <span />
                <span />
                <span />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {wrapped && <Debrief counts={counts} total={turns.length} wrapUp={step.wrapUp} />}
      </div>

      <AnimatePresence mode="wait">
        {optionsOpen && (
          <motion.div
            key={`opts-${current}`}
            className="interview-options"
            initial="hidden"
            animate="shown"
            exit={{ opacity: 0, y: 10, transition: { duration: 0.14 } }}
            variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.05 } } }}
          >
            <div className="step__instructions interview-options__how">Your reply</div>
            <div className="choices" role="group" aria-label="Pick your reply">
              {orders[current].map((i, k) => (
                <motion.div
                  key={i}
                  variants={{ hidden: { opacity: 0, y: 14 }, shown: { opacity: 1, y: 0, transition: SPRING } }}
                >
                  <Tile
                    className="interview-option"
                    badge={String.fromCharCode(65 + k)}
                    state={chosen === i ? 'selected' : chosen != null ? 'dimmed' : 'idle'}
                    disabled={chosen != null}
                    onClick={() => pick(i)}
                    aria-keyshortcuts={String(k + 1)}
                  >
                    <Rich text={turns[current].options[i].text} inline />
                  </Tile>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Avatar() {
  return (
    <div className="interview-avatar" aria-hidden>
      I
    </div>
  )
}

function Interviewer({ text, first }: { text: string; first: boolean }) {
  return (
    <motion.div
      className="interview-row"
      data-anchor
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING}
    >
      <Avatar />
      <div className="interview-col">
        {first && <div className="interview-name">Interviewer</div>}
        <motion.div
          className="interview-bubble interview-bubble--them"
          initial={{ scale: 0.92 }}
          animate={{ scale: 1 }}
          transition={POP}
        >
          <span className="visually-hidden">Interviewer: </span>
          <Rich text={text} />
        </motion.div>
      </div>
    </motion.div>
  )
}

function Reply({
  text,
  feedback,
  quality,
  graded,
  reduce,
}: {
  text: string
  feedback: string
  quality: Quality
  graded: boolean
  reduce: boolean
}) {
  const { label, Icon } = QUALITY[quality]
  const tone = graded ? quality : 'sent'
  const settle =
    !graded || reduce
      ? { x: 0, scale: 1 }
      : quality === 'weak'
        ? { x: [0, -7, 7, -5, 5, -2, 0], scale: 1 }
        : quality === 'strong'
          ? { x: 0, scale: [1, 1.035, 1] }
          : { x: 0, scale: 1 }
  return (
    <motion.div
      className="interview-me"
      data-anchor
      initial={{ opacity: 0, y: 16, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={SPRING}
    >
      <div className="interview-name interview-name--me">You</div>
      <motion.div
        className={`interview-bubble interview-bubble--me interview-bubble--${tone}`}
        animate={settle}
        transition={{ duration: quality === 'weak' ? 0.42 : 0.32 }}
      >
        <span className="visually-hidden">You: </span>
        <Rich text={text} />
      </motion.div>
      <AnimatePresence initial={false}>
        {graded && (
          <motion.div
            key="note"
            className={`interview-note interview-note--${quality}`}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={SPRING}
          >
            <motion.span
              className={`chip interview-chip interview-chip--${quality}`}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={POP}
            >
              <Icon size={13} strokeWidth={2.8} /> {label}
            </motion.span>
            <Rich text={feedback} className="interview-note__text" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function Pips({ turns, asked, qualities, graded }: { turns: number; asked: number; qualities: Quality[]; graded: number }) {
  const done = Math.min(graded, qualities.length)
  return (
    <div className="interview-pips" role="img" aria-label={`Turn ${Math.min(Math.max(asked, 1), turns)} of ${turns}`}>
      {Array.from({ length: turns }, (_, t) => {
        const q = t < done ? qualities[t] : undefined
        const live = !q && t === asked - 1
        return <span key={t} className={['interview-pip', q && `interview-pip--${q}`, live && 'interview-pip--live'].filter(Boolean).join(' ')} />
      })}
    </div>
  )
}

function Debrief({ counts, total, wrapUp }: { counts: Record<Quality, number>; total: number; wrapUp: string }) {
  return (
    <motion.section
      className="interview-debrief"
      data-anchor
      aria-label="Interview debrief"
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={SPRING}
    >
      <div className="interview-debrief__head">
        <span className="interview-debrief__icon" aria-hidden>
          <ClipboardCheck size={20} strokeWidth={2.4} />
        </span>
        <div className="interview-debrief__titles">
          <div className="interview-debrief__title">Debrief</div>
          <div className="interview-debrief__sub">
            {total} {total === 1 ? 'turn' : 'turns'}
          </div>
        </div>
      </div>
      {total > 0 && (
        <div className="interview-tally">
          {(['strong', 'okay', 'weak'] as const).map((q, i) => {
            const { label, Icon } = QUALITY[q]
            return (
              <motion.div
                key={q}
                className={`interview-tally__cell interview-tally__cell--${q}${counts[q] ? '' : ' interview-tally__cell--zero'}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...SPRING, delay: 0.12 + i * 0.06 }}
              >
                <span className="interview-tally__label">
                  <Icon size={13} strokeWidth={2.8} /> {label}
                </span>
                <span className="interview-tally__n tabular">{counts[q]}</span>
              </motion.div>
            )
          })}
        </div>
      )}
      <Rich text={wrapUp} className="interview-debrief__text" />
    </motion.section>
  )
}
