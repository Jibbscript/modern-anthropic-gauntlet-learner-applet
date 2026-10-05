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
/** after the last verdict, a beat to read it before the debrief and the feedback panel arrive */
const WRAP_MS = 900

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

const RANK: Record<Quality, number> = { weak: 0, okay: 1, strong: 2 }

/** the best option of a turn when it beats the learner's pick, else -1 (nothing better to show) */
function strongerOption(turn: Turn, picked: number): number {
  let best = -1
  turn.options.forEach((o, i) => {
    if (best < 0 || RANK[o.quality] > RANK[turn.options[best].quality]) best = i
  })
  return best >= 0 && best !== picked && RANK[turn.options[best].quality] > RANK[turn.options[picked].quality] ? best : -1
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
    () =>
      turns.map((tr, t) =>
        seededShuffle(
          tr.options.map((_, i) => i),
          `${step.id}:${t}:${attempt}`,
        ),
      ),
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
    if (s === 0) return n === 1 ? 'Not weak, but not strong either.' : `No weak replies, but none strong either.`
    return `No weak replies: ${s} strong, ${o} okay.`
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

  const rootRef = useRef<HTMLDivElement>(null)
  /**
   * Height floor for the step while a turn resolves. Removing the reply tiles
   * shrinks the content; without a floor the scroll position clamps and the
   * whole transcript jumps down. New messages grow past it again.
   */
  const [floor, setFloor] = useState(0)
  const busy = useRef(false)

  const pick = (opt: number) => {
    if (!optionsOpen || chosen != null || busy.current) return
    busy.current = true
    const root = rootRef.current
    const sc = root && scrollParent(root)
    if (root && sc) {
      const top = root.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop
      setFloor(Math.ceil(sc.scrollTop + sc.clientHeight - top))
    }
    setChosen(opt)
    const turn = current
    const last = turn === turns.length - 1
    const q = turns[turn].options[opt].quality
    later(() => {
      busy.current = false
      setChosen(null)
      setPicks((p) => (p.length === turn ? [...p, opt] : p))
    }, COMMIT_MS)
    later(() => {
      setGraded((g) => Math.max(g, turn + 1))
      // the last verdict is followed by the feedback panel's own sound and haptic; don't stack two
      if (last) return
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

  // keep the newest message (and the reply tiles under it) in view, never scrolling its top out of sight;
  // on reveal, go back up to the first stronger reply
  const revealed = phase === 'revealed'
  const followUntil = useRef(0)
  const follow = useRef<() => void>(() => {})
  follow.current = () => {
    const root = rootRef.current
    const sc = root && scrollParent(root)
    if (!root || !sc) return
    const view = sc.clientHeight
    const max = sc.scrollHeight - view
    if (max <= 0) return
    const base = sc.getBoundingClientRect().top - sc.scrollTop
    const top = (el: Element) => el.getBoundingClientRect().top - base
    const bottom = (el: Element) => el.getBoundingClientRect().bottom - base
    const behavior = reduce ? 'auto' : 'smooth'
    const reveal = revealed ? root.querySelector<HTMLElement>('[data-reveal]') : null
    if (reveal) {
      const t = Math.max(0, Math.min(max, top(reveal) - 16))
      if (Math.abs(t - sc.scrollTop) > 2) sc.scrollTo({ top: t, behavior })
      return
    }
    const anchors = root.querySelectorAll<HTMLElement>('[data-anchor]')
    const anchor = anchors[anchors.length - 1]
    if (!anchor) return
    const opts = root.querySelector<HTMLElement>('.interview-options')
    const end = Math.max(bottom(anchor), opts ? bottom(opts) : 0) + 20
    const t = Math.max(0, Math.min(max, top(anchor) - 16, end - view))
    // only ever scroll down: the learner may have scrolled up to re-read
    if (t > sc.scrollTop + 2) sc.scrollTo({ top: t, behavior })
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
    <div className="step interview" ref={rootRef} style={floor ? { minHeight: floor } : undefined}>
      <div className="interview-head">
        <div className="eyebrow step__eyebrow">{step.eyebrow ?? 'Interview sim'}</div>
        {turns.length > 1 && <Pips turns={turns.length} asked={asked} qualities={qualities} graded={graded} />}
      </div>

      <div className="interview-log" role="log" aria-live="polite" aria-label="Interview transcript">
        {step.setup && (
          <motion.div className="interview-setup" initial={attempt === 0 ? { opacity: 0, y: 6 } : false} animate={{ opacity: 1, y: 0 }} transition={SPRING}>
            <Rich text={step.setup} inline />
          </motion.div>
        )}

        {turns.slice(0, asked).map((turn, t) => {
          const p = picks[t]
          const q = p != null ? turn.options[p].quality : undefined
          const best = p != null ? strongerOption(turn, p) : -1
          return (
            <Fragment key={t}>
              <Interviewer text={turn.interviewer} first={t === 0} />
              {p != null && q && <Reply text={turn.options[p].text} feedback={turn.options[p].feedback} quality={q} graded={graded > t} reduce={reduce} first={t === 0} />}
              <AnimatePresence initial={false}>
                {revealed && best >= 0 && (
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

        {/* no exit animation: the question bubble takes its place in the same frame, so nothing below jumps */}
        {typing && (
          <motion.div key={`typing-${asked}`} className="interview-row" data-anchor initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING}>
            <Avatar />
            <div className="interview-typing" role="status" aria-label="Interviewer is typing">
              <span />
              <span />
              <span />
            </div>
          </motion.div>
        )}

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
            variants={{
              hidden: {},
              shown: { transition: { staggerChildren: 0.05 } },
            }}
          >
            <div className="step__instructions interview-options__how">Your reply</div>
            <div className="choices" role="group" aria-label="Pick your reply">
              {orders[current].map((i, k) => (
                <motion.div
                  key={i}
                  variants={{
                    hidden: { opacity: 0, y: 14 },
                    shown: { opacity: 1, y: 0, transition: SPRING },
                  }}
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
    <motion.div className="interview-row" data-anchor initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING}>
      <Avatar />
      <div className="interview-col">
        {first && <div className="interview-name">Interviewer</div>}
        <motion.div className="interview-bubble interview-bubble--them" initial={{ scale: 0.92 }} animate={{ scale: 1 }} transition={POP}>
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
  first,
}: {
  text: string
  feedback: string
  quality: Quality
  graded: boolean
  reduce: boolean
  first: boolean
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
    <motion.div className="interview-me" data-anchor initial={{ opacity: 0, y: 16, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={SPRING}>
      {first && <div className="interview-name interview-name--me">You</div>}
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
