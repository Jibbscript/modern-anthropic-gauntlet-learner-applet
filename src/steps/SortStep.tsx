import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { Check, CheckCheck, CircleCheck, CircleX, Eye, MoveRight, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { SortStep as T } from '../core/types'
import { Rich } from '../ui/Rich'
import { haptic, sfx } from '../ui/fx'
import { seededShuffle } from './shuffle'
import type { StepProps } from './types'
import './steps.css'
import './SortStep.css'

type ChipState = 'idle' | 'correct' | 'incorrect' | 'reveal'
interface Placement {
  i: number
  b: string
}
interface SortState {
  /** item indices still to sort; deck[0] is the card on top */
  deck: number[]
  /** placements in the order they were made */
  placed: Placement[]
}

/**
 * The runner remounts a step on "Try again"; remember the last placements so
 * a retry keeps the cards that were right and deals the wrong ones again.
 */
const memory = new Map<string, Placement[]>()

const FLY = { type: 'spring', stiffness: 460, damping: 38 } as const
const range = (n: number) => Array.from({ length: n }, (_, i) => i)
const plain = (t: string) => t.replace(/[`*=]/g, '')

/**
 * Brilliant-style sorting: one card centre stage on a little deck, big bucket
 * buttons underneath. Tapping a bucket flies the card into that bucket's tray
 * as a chip (a shared-element crossfade); tapping a chip flies it back to the
 * top of the deck.
 *
 * Two buckets with short cards get side-by-side trays under their buttons.
 * Three buckets (or long cards) get full-width stacked trays with their own
 * headers, so chip text never has to be squeezed into a 90px column.
 */
export default function SortStep({ step, phase, attempt, setController, lessonId, mode }: StepProps<T>) {
  const n = step.items.length
  const B = step.buckets.length
  const memKey = `${lessonId ?? mode}:${step.id}`
  const [st, setSt] = useState<SortState>(() => {
    const shuffled = seededShuffle(range(n), step.id)
    const saved = attempt > 0 ? memory.get(memKey) : undefined
    const keep = (saved ?? []).filter((p) => step.items[p.i]?.bucket === p.b)
    return { deck: shuffled.filter((i) => !keep.some((p) => p.i === i)), placed: keep }
  })
  const [settled, setSettled] = useState(false)
  const [live, setLive] = useState('')
  /** the item that is flying back from a chip: it must not "deal in" from below */
  const returning = useRef<number | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const locked = phase !== 'answer'
  const labelOf = useMemo(() => Object.fromEntries(step.buckets.map((b) => [b.id, b.label])), [step.buckets])
  const lid = (i: number) => `${step.id}:sort:${i}`

  const stacked = B > 2 || Math.max(...step.items.map((it) => plain(it.text).length)) > 48
  const longLabels = step.buckets.some((b) => b.label.length > (B > 2 ? 11 : 18))

  useEffect(() => {
    memory.set(memKey, st.placed)
  }, [memKey, st.placed])

  useEffect(() => {
    setController({
      ready: st.deck.length === 0,
      check: () => {
        const wrong = st.placed.filter((p) => step.items[p.i].bucket !== p.b)
        if (!wrong.length) return { correct: true }
        const lines = wrong.map((p) => {
          const it = step.items[p.i]
          const name = it.text.includes('*') ? it.text : `**${it.text}**`
          return `- ${name}: ${it.why ?? `not ${labelOf[p.b]}.`}`
        })
        const head = wrong.length === 1 ? '1 card is in the wrong bucket.' : `${wrong.length} cards are in the wrong bucket.`
        return { correct: false, feedback: `${head}\n${lines.join('\n')}` }
      },
    })
  }, [st, step.items, labelOf, setController])

  // revealed: pause a beat on the learner's answer, then fly misplaced cards home
  useEffect(() => {
    if (phase !== 'revealed') return
    const t = setTimeout(() => setSettled(true), 320)
    return () => clearTimeout(t)
  }, [phase])

  const place = (b: string) => {
    if (locked || !st.deck.length) return
    const [top, ...rest] = st.deck
    returning.current = null
    setSt({ deck: rest, placed: [...st.placed, { i: top, b }] })
    sfx('select')
    haptic('light')
    setLive(`Sorted into ${labelOf[b]}. ${rest.length ? `${rest.length} left.` : 'All cards sorted.'}`)
  }

  const unplace = (i: number) => {
    if (locked) return
    returning.current = i
    setSt({ deck: [i, ...st.deck], placed: st.placed.filter((p) => p.i !== i) })
    sfx('tap')
    haptic('light')
    setLive('Card returned to the top of the deck.')
  }

  // desktop nicety: number keys pick a bucket (only when focus is not somewhere else that wants keys)
  useEffect(() => {
    if (locked) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      const active = document.activeElement
      if (active && active !== document.body && !rootRef.current?.contains(active)) return
      const k = Number(e.key)
      if (k >= 1 && k <= B) {
        e.preventDefault()
        place(step.buckets[k - 1].id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const learnerBucket = (i: number) => st.placed.find((p) => p.i === i)?.b
  const shownPlaced: Placement[] =
    phase === 'revealed' && settled
      ? [...st.placed.map((p) => p.i), ...st.deck].map((i) => ({ i, b: step.items[i].bucket }))
      : st.placed

  const chipState = (p: Placement): ChipState => {
    const ok = step.items[p.i].bucket === learnerBucket(p.i)
    if (phase === 'answer') return 'idle'
    if (phase === 'correct') return 'correct'
    if (phase === 'incorrect') return ok ? 'correct' : 'incorrect'
    return ok ? 'correct' : 'reveal'
  }

  const sorted = n - st.deck.length
  const meta =
    phase === 'answer'
      ? st.deck.length
        ? 'Tap the bucket this card belongs in'
        : 'All cards sorted'
      : phase === 'revealed'
        ? 'Where each card goes'
        : 'Your sort'

  return (
    <LayoutGroup id={step.id}>
      <div className="step sort" ref={rootRef}>
        {step.eyebrow && <div className="eyebrow step__eyebrow">{step.eyebrow}</div>}
        <Rich text={step.prompt} className="step__prompt" />

        <div className="sort-stage">
          <div className="sort-stage__meta">
            <span className="step__instructions">{meta}</span>
            <span className="sort-stage__count tabular" aria-label={`${sorted} of ${n} sorted`}>
              {sorted}/{n}
            </span>
          </div>
          <div className={`sort-stage__well${locked ? ' sort-stage__well--compact' : ''}`}>
            {/* the deck stays mounted so the last card can still crossfade into its chip */}
            <div className={`sort-deck${st.deck.length ? '' : ' sort-deck--empty'}`}>
              <AnimatePresence initial={attempt === 0}>
                {st.deck.slice(0, 3).map((i, depth) => (
                  <motion.div
                    key={i}
                    layoutId={lid(i)}
                    className={`sort-card${depth > 0 ? ' sort-card--behind' : ''}`}
                    style={{ zIndex: 3 - depth, borderRadius: 18 }}
                    initial={returning.current === i ? false : { opacity: 0, y: 40, scale: 0.86 }}
                    animate={{ opacity: 1, y: depth * 9, scale: 1 - depth * 0.055 }}
                    exit={{ opacity: 0, transition: { duration: 0.3 } }}
                    transition={FLY}
                    aria-hidden={depth > 0}
                  >
                    <motion.span
                      layout="position"
                      className="sort-card__text"
                      initial={false}
                      animate={{ opacity: depth === 0 ? 1 : 0 }}
                      transition={{ duration: 0.18 }}
                    >
                      <Rich text={step.items[i].text} inline />
                    </motion.span>
                  </motion.div>
                ))}
                {st.deck.length === 0 && <StageStatus key={`status-${phase}`} phase={phase} />}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div
          className={['sort-board', stacked ? 'sort-board--stack' : 'sort-board--cols', longLabels && 'sort-board--long'].filter(Boolean).join(' ')}
          style={{ '--sort-cols': B } as CSSProperties}
        >
          {step.buckets.map((b, k) => {
            const count = shownPlaced.filter((p) => p.b === b.id).length
            return (
              <motion.button
                key={`btn-${b.id}`}
                type="button"
                className="sort-bucket__btn"
                style={{ gridColumn: k + 1, gridRow: 1 }}
                disabled={locked || !st.deck.length}
                onClick={() => place(b.id)}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 700, damping: 30 }}
                aria-keyshortcuts={String(k + 1)}
                aria-label={`Put in ${b.label}`}
              >
                <span className="sort-bucket__face">
                  <span className="sort-bucket__label">{b.label}</span>
                </span>
                <AnimatePresence>
                  {count > 0 && (
                    <motion.span
                      key="n"
                      className="sort-bucket__n tabular"
                      aria-hidden
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ type: 'spring', stiffness: 600, damping: 22 }}
                    >
                      <motion.span
                        key={count}
                        initial={{ scale: 1.5 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 700, damping: 18 }}
                      >
                        {count}
                      </motion.span>
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            )
          })}
          {step.buckets.map((b, k) => {
            const chips = shownPlaced.filter((p) => p.b === b.id)
            return (
              <section
                key={`tray-${b.id}`}
                className={`sort-tray${chips.length ? '' : ' sort-tray--empty'}`}
                style={stacked ? { gridColumn: '1 / -1' } : { gridColumn: k + 1, gridRow: 2 }}
                aria-label={b.label}
              >
                {stacked && (
                  <header className="sort-tray__head">
                    <span className="sort-tray__key tabular" aria-hidden>
                      {k + 1}
                    </span>
                    <span className="sort-tray__label">{b.label}</span>
                    <span className="sort-tray__count tabular" aria-label={`${chips.length} cards`}>
                      {chips.length}
                    </span>
                  </header>
                )}
                <div className="sort-tray__chips">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {chips.map((p) => {
                      const s = chipState(p)
                      const it = step.items[p.i]
                      const why = s === 'reveal' && it.why
                      return (
                        <motion.div
                          key={p.i}
                          layoutId={lid(p.i)}
                          className={`sort-chip sort-chip--${s}${why ? ' sort-chip--why' : ''}`}
                          style={{ borderRadius: 10 }}
                          animate={s === 'incorrect' ? { x: [0, -6, 6, -4, 4, -2, 0] } : { x: 0 }}
                          exit={{ opacity: 0, transition: { duration: 0.15 } }}
                          transition={{ layout: FLY, x: { duration: 0.42 } }}
                        >
                          {/* the label fades in as the card lands, so the flight reads as one card shrinking into the tray */}
                          <motion.button
                            type="button"
                            layout="position"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ layout: FLY, opacity: { delay: 0.12, duration: 0.2 } }}
                            className="sort-chip__btn"
                            disabled={locked}
                            onClick={() => unplace(p.i)}
                            aria-label={locked ? undefined : `${plain(it.text)}. Tap to put it back on the deck.`}
                          >
                            <Rich text={it.text} inline className="sort-chip__text" />
                          </motion.button>
                          <AnimatePresence>
                            {s !== 'idle' && (
                              <motion.span
                                key={s}
                                className="sort-chip__mark"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 600, damping: 18, delay: 0.05 }}
                                role="img"
                                aria-label={s === 'correct' ? 'Right bucket' : s === 'incorrect' ? 'Wrong bucket' : 'Moved here'}
                              >
                                {s === 'correct' ? (
                                  <Check size={12} strokeWidth={3.6} />
                                ) : s === 'incorrect' ? (
                                  <X size={12} strokeWidth={3.6} />
                                ) : (
                                  <MoveRight size={12} strokeWidth={3.4} />
                                )}
                              </motion.span>
                            )}
                          </AnimatePresence>
                          <AnimatePresence initial={false}>
                            {why && (
                              <motion.div
                                className="sort-chip__why"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                transition={{ delay: 0.3, duration: 0.25 }}
                              >
                                <Rich text={why} inline />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              </section>
            )
          })}
        </div>
        <div className="visually-hidden" aria-live="polite">
          {live}
        </div>
      </div>
    </LayoutGroup>
  )
}

function StageStatus({ phase }: { phase: StepProps['phase'] }) {
  const [Icon, title, sub, tone] =
    phase === 'answer'
      ? [CheckCheck, 'All sorted', 'Tap a card in a bucket to take it back.', 'done']
      : phase === 'correct'
        ? [CircleCheck, 'Every card is in the right bucket', '', 'good']
        : phase === 'incorrect'
          ? [CircleX, 'Yellow cards belong in another bucket', '', 'bad']
          : [Eye, 'Here is where each card goes', 'Striped cards were moved.', 'reveal']
  const compact = phase !== 'answer'
  return (
    <motion.div
      className={`sort-status sort-status--${tone}${compact ? ' sort-status--compact' : ''}`}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      transition={{ type: 'spring', stiffness: 520, damping: 30 }}
      role={compact ? 'status' : undefined}
    >
      <Icon size={compact ? 22 : 30} strokeWidth={2.4} className="sort-status__icon" aria-hidden />
      <div className="sort-status__words">
        <div className="sort-status__title">{title}</div>
        {sub && <div className="sort-status__sub">{sub}</div>}
      </div>
    </motion.div>
  )
}
