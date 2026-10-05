import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { Check, CheckCheck, CircleCheck, CircleX, Eye, MoveRight, X } from 'lucide-react'
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
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

const FLY = { type: 'spring', stiffness: 460, damping: 36 } as const
const range = (n: number) => Array.from({ length: n }, (_, i) => i)

/**
 * Brilliant-style sorting: one card centre stage on a little deck, big bucket
 * buttons underneath. Tapping a bucket flies the card into that bucket's tray
 * as a chip; tapping a chip sends it back to the top of the deck.
 */
export default function SortStep({ step, phase, attempt, setController, lessonId, mode }: StepProps<T>) {
  const n = step.items.length
  const memKey = `${lessonId ?? mode}:${step.id}`
  const [st, setSt] = useState<SortState>(() => {
    const shuffled = seededShuffle(range(n), step.id)
    const saved = attempt > 0 ? memory.get(memKey) : undefined
    const keep = (saved ?? []).filter((p) => step.items[p.i]?.bucket === p.b)
    return { deck: shuffled.filter((i) => !keep.some((p) => p.i === i)), placed: keep }
  })
  const [settled, setSettled] = useState(false)
  const [live, setLive] = useState('')
  const locked = phase !== 'answer'
  const labelOf = useMemo(() => Object.fromEntries(step.buckets.map((b) => [b.id, b.label])), [step.buckets])
  const lid = (i: number) => `${step.id}:sort:${i}`

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
    setSt({ deck: rest, placed: [...st.placed, { i: top, b }] })
    sfx('select')
    haptic('light')
    setLive(`Sorted into ${labelOf[b]}. ${rest.length ? `${rest.length} left.` : 'All cards sorted.'}`)
  }

  const unplace = (i: number) => {
    if (locked) return
    setSt({ deck: [i, ...st.deck], placed: st.placed.filter((p) => p.i !== i) })
    sfx('tap')
    haptic('light')
    setLive('Card returned to the deck.')
  }

  // desktop nicety: number keys pick a bucket
  useEffect(() => {
    if (locked) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      const k = Number(e.key)
      if (k >= 1 && k <= step.buckets.length) place(step.buckets[k - 1].id)
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

  const total = n
  const sorted = total - st.deck.length

  return (
    <LayoutGroup id={step.id}>
      <div className="step sort">
        {step.eyebrow && <div className="eyebrow step__eyebrow">{step.eyebrow}</div>}
        <Rich text={step.prompt} className="step__prompt" />

        <div className="sort-stage">
          <div className="sort-stage__meta">
            <span className="step__instructions">{phase === 'answer' ? (st.deck.length ? 'Tap the bucket this card belongs in' : 'All cards sorted') : 'Your sort'}</span>
            <span className="sort-stage__count tabular" aria-label={`${sorted} of ${total} sorted`}>
              {sorted}/{total}
            </span>
          </div>
          <div className={`sort-stage__well${locked ? ' sort-stage__well--compact' : ''}`}>
            {st.deck.length > 0 ? (
              <div className="sort-deck" aria-live="off">
                {st.deck.slice(0, 3).map((i, depth) => (
                  <motion.div
                    key={i}
                    layoutId={lid(i)}
                    className={`sort-card${depth > 0 ? ' sort-card--behind' : ''}`}
                    style={{ zIndex: 3 - depth, borderRadius: 18 }}
                    initial={{ opacity: 0, y: 34, scale: 0.84 }}
                    animate={{ opacity: 1, y: depth * 9, scale: 1 - depth * 0.055 }}
                    transition={FLY}
                    aria-hidden={depth > 0}
                  >
                    <motion.span
                      layout="position"
                      className="sort-card__text"
                      animate={{ opacity: depth === 0 ? 1 : 0 }}
                      transition={{ duration: 0.18 }}
                    >
                      <Rich text={step.items[i].text} inline />
                    </motion.span>
                  </motion.div>
                ))}
              </div>
            ) : (
              <StageStatus phase={phase} />
            )}
          </div>
        </div>

        <div className="sort-buckets" style={{ '--sort-cols': step.buckets.length } as CSSProperties}>
          {step.buckets.map((b, k) => {
            const chips = shownPlaced.filter((p) => p.b === b.id)
            return (
              <section key={b.id} className="sort-bucket" aria-label={b.label}>
                <motion.button
                  type="button"
                  className="sort-bucket__btn"
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
                      {chips.length > 0 && (
                        <motion.span
                          key="n"
                          className="sort-bucket__n tabular"
                          aria-hidden
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          transition={{ type: 'spring', stiffness: 600, damping: 22 }}
                        >
                          {chips.length}
                        </motion.span>
                      )}
                    </AnimatePresence>
                </motion.button>
                <div className={`sort-bucket__tray${chips.length ? '' : ' sort-bucket__tray--empty'}`}>
                  {chips.map((p) => {
                    const s = chipState(p)
                    const it = step.items[p.i]
                    return (
                      <motion.div
                        key={p.i}
                        layoutId={lid(p.i)}
                        className={`sort-chip sort-chip--${s}`}
                        style={{ borderRadius: 10 }}
                        animate={s === 'incorrect' ? { x: [0, -6, 6, -4, 4, -2, 0] } : { x: 0 }}
                        transition={{ layout: FLY, x: { duration: 0.42 } }}
                      >
                        <motion.button
                          type="button"
                          layout="position"
                          className="sort-chip__btn"
                          disabled={locked}
                          onClick={() => unplace(p.i)}
                          aria-label={locked ? undefined : `${it.text}. Tap to put it back on the deck.`}
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
                          {s === 'reveal' && it.why && (
                            <motion.div
                              className="sort-chip__why"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              transition={{ delay: 0.25, duration: 0.25 }}
                            >
                              <Rich text={it.why} inline />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )
                  })}
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
      key={phase}
      className={`sort-status sort-status--${tone}${compact ? ' sort-status--compact' : ''}`}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 520, damping: 30 }}
    >
      <Icon size={compact ? 22 : 30} strokeWidth={2.4} className="sort-status__icon" aria-hidden />
      <div className="sort-status__words">
        <div className="sort-status__title">{title}</div>
        {sub && <div className="sort-status__sub">{sub}</div>}
      </div>
    </motion.div>
  )
}
