import { AnimatePresence, Reorder, motion, useDragControls } from 'motion/react'
import { ArrowDown, ArrowUp, Check, GripVertical, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { OrderStep as T } from '../core/types'
import { Rich } from '../ui/Rich'
import { haptic, sfx } from '../ui/fx'
import { Hint } from './Hint'
import { shuffleNotIdentity } from './shuffle'
import type { StepProps } from './types'
import './steps.css'
import './OrderStep.css'

type CardState = 'idle' | 'selected' | 'correct' | 'incorrect' | 'reveal'

/**
 * The runner remounts a step on "Try again"; this keeps the learner's last
 * arrangement so a retry means fixing the red cards, not starting over.
 */
const memory = new Map<string, number[]>()

const LAYOUT_SPRING = { type: 'spring', stiffness: 520, damping: 40 } as const
const range = (n: number) => Array.from({ length: n }, (_, i) => i)
const isPermutation = (a: number[], n: number) => a.length === n && range(n).every((i) => a.includes(i))

/**
 * Put items in sequence. Drag a card by its grip (or anywhere with a mouse),
 * or tap a card and nudge it with the arrow buttons / arrow keys.
 */
export default function OrderStep({ step, phase, attempt, setController, onHint, lessonId, mode }: StepProps<T>) {
  const n = step.items.length
  const memKey = `${lessonId ?? mode}:${step.id}`
  /** is item v right at position pos? Compared by text, so duplicate items are interchangeable */
  const fits = (v: number, pos: number) => v === pos || step.items[v] === step.items[pos]
  const [order, setOrder] = useState<number[]>(() => {
    const saved = attempt > 0 ? memory.get(memKey) : undefined
    if (saved && isPermutation(saved, n)) return saved
    const s = shuffleNotIdentity(range(n), step.id)
    // with duplicate items a shuffle can still read as solved; rotate it until it doesn't
    for (let k = 0; k < n && s.every((v, i) => fits(v, i)); k++) s.push(s.shift()!)
    return s
  })
  const [moved, setMoved] = useState(false)
  const [sel, setSel] = useState<number | null>(null)
  const [settled, setSettled] = useState(false)
  const [live, setLive] = useState('')
  const listRef = useRef<HTMLOListElement>(null)
  const refocus = useRef<HTMLElement | null>(null)
  const locked = phase !== 'answer'
  const activeSel = locked ? null : sel

  useEffect(() => {
    memory.set(memKey, order)
  }, [memKey, order])

  useEffect(() => {
    setController({
      ready: moved,
      check: () => {
        const right = order.filter((v, i) => fits(v, i)).length
        if (right === n) return { correct: true }
        return {
          correct: false,
          feedback:
            right === 0
              ? 'None of the cards are in the right spot yet.'
              : `${right} of ${n} cards ${right === 1 ? 'is' : 'are'} in the right spot.`,
        }
      },
    })
  }, [order, moved, n, step, setController])

  // revealed: pause a beat so the learner sees their order, then glide into the right one
  useEffect(() => {
    if (phase !== 'revealed') return
    const t = setTimeout(() => setSettled(true), 280)
    return () => clearTimeout(t)
  }, [phase])

  // moving a list item re-inserts its DOM node, which can drop focus; put it back
  useLayoutEffect(() => {
    const el = refocus.current
    refocus.current = null
    if (!el || !el.isConnected || document.activeElement === el) return
    if ((el as HTMLButtonElement).disabled) el.closest('li')?.querySelector<HTMLElement>('.order-card__main')?.focus({ preventScroll: true })
    else el.focus({ preventScroll: true })
  }, [order])

  const shown = phase === 'revealed' && settled ? range(n) : order

  const onReorder = (next: number[]) => {
    if (locked || next.every((v, i) => v === order[i])) return
    setOrder(next)
    setMoved(true)
    sfx('tap')
    haptic('light')
  }

  const move = (v: number, dir: -1 | 1) => {
    const i = order.indexOf(v)
    const j = i + dir
    if (locked || j < 0 || j >= n) return
    const next = order.slice()
    ;[next[i], next[j]] = [next[j], next[i]]
    const active = document.activeElement
    refocus.current = active instanceof HTMLElement && listRef.current?.contains(active) ? active : null
    setOrder(next)
    setMoved(true)
    setLive(`Moved to position ${j + 1} of ${n}.`)
    sfx('tap')
    haptic('light')
  }

  const toggle = (v: number) => {
    if (locked) return
    sfx('select')
    haptic('light')
    setSel((s) => (s === v ? null : v))
    if (sel !== v) setLive(`Selected card ${order.indexOf(v) + 1} of ${n}. Use the arrow buttons or arrow keys to move it.`)
  }

  const stateOf = (v: number, pos: number): CardState => {
    if (phase === 'answer') return activeSel === v ? 'selected' : 'idle'
    if (phase === 'correct') return 'correct'
    if (phase === 'incorrect') return fits(v, pos) ? 'correct' : 'incorrect'
    // revealed: solid green where the learner already had this card right, striped where it moved
    return fits(order[v], v) ? 'correct' : 'reveal'
  }

  const how =
    phase === 'answer'
      ? 'Drag to reorder, or tap a card to move it'
      : phase === 'correct'
        ? 'Every card is in place'
        : phase === 'incorrect'
          ? 'Green cards are in the right spot'
          : 'The correct order'

  return (
    <div className="step order">
      {step.eyebrow && <div className="eyebrow step__eyebrow">{step.eyebrow}</div>}
      <Rich text={step.prompt} className="step__prompt" />
      <div className="order__body">
        <div className="step__instructions order__how">
          {phase === 'answer' && <GripVertical size={15} strokeWidth={2.6} aria-hidden />}
          {how}
        </div>
        <Reorder.Group
          as="ol"
          axis="y"
          ref={listRef}
          values={shown}
          onReorder={onReorder}
          className="order-list"
          aria-label="Cards to put in order"
        >
          {shown.map((v, pos) => (
            <OrderCard
              key={v}
              value={v}
              pos={pos}
              n={n}
              text={step.items[v]}
              state={stateOf(v, pos)}
              phase={phase}
              locked={locked}
              selected={activeSel === v}
              onToggle={() => toggle(v)}
              onMove={(dir) => move(v, dir)}
              onDeselect={() => setSel(null)}
            />
          ))}
        </Reorder.Group>
      </div>
      <div className="visually-hidden" aria-live="polite">
        {live}
      </div>
      {step.hint && phase === 'answer' && <Hint text={step.hint} attempt={attempt} onOpen={onHint} />}
    </div>
  )
}

function OrderCard({
  value,
  pos,
  n,
  text,
  state,
  phase,
  locked,
  selected,
  onToggle,
  onMove,
  onDeselect,
}: {
  value: number
  pos: number
  n: number
  text: string
  state: CardState
  phase: StepProps['phase']
  locked: boolean
  selected: boolean
  onToggle: () => void
  onMove: (dir: -1 | 1) => void
  onDeselect: () => void
}) {
  const controls = useDragControls()
  const [dragging, setDragging] = useState(false)
  const justDragged = useRef(false)

  const startDrag = (e: PointerEvent) => {
    if (locked || e.button > 0) return
    controls.start(e)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (!selected) return
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      onMove(e.key === 'ArrowUp' ? -1 : 1)
    } else if (e.key === 'Escape') {
      onDeselect()
    }
  }

  const face =
    state === 'incorrect'
      ? { x: [0, -7, 7, -5, 5, -2, 0] }
      : state === 'correct' && phase === 'correct'
        ? { scale: [1, 1.03, 1] }
        : { x: 0, scale: 1 }

  return (
    <Reorder.Item
      value={value}
      layout="position"
      dragListener={false}
      dragControls={controls}
      dragElastic={0.12}
      transition={LAYOUT_SPRING}
      whileDrag={{ scale: 1.03 }}
      className={['order-item', dragging && 'order-item--dragging'].filter(Boolean).join(' ')}
      onDragStart={() => {
        justDragged.current = true
        setDragging(true)
        sfx('select')
        haptic('light')
      }}
      onDragEnd={() => {
        setDragging(false)
        setTimeout(() => (justDragged.current = false), 60)
      }}
      onPointerDown={(e) => {
        // a mouse or pen can grab the whole card; touch uses the grip so the page still scrolls
        if (e.pointerType === 'touch' || (e.target as HTMLElement).closest('.order-card__moves')) return
        startDrag(e)
      }}
    >
      <motion.div
        className={`order-card order-card--${state}`}
        animate={face}
        transition={{ duration: state === 'incorrect' ? 0.42 : 0.32, delay: phase === 'correct' ? pos * 0.05 : 0 }}
        onKeyDown={onKeyDown}
      >
        <button
          type="button"
          className="order-card__main"
          disabled={locked}
          aria-pressed={locked ? undefined : selected}
          onClick={() => {
            if (!justDragged.current) onToggle()
          }}
        >
          <motion.span
            key={pos}
            className="order-card__num tabular"
            initial={locked ? false : { scale: 0.7 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 600, damping: 22 }}
            aria-label={`Position ${pos + 1} of ${n}:`}
          >
            {pos + 1}
          </motion.span>
          <Rich text={text} inline className="order-card__text" />
        </button>
        <AnimatePresence initial={false}>
          {selected && (
            <motion.span
              className="order-card__moves"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.1 } }}
              transition={{ type: 'spring', stiffness: 600, damping: 28 }}
            >
              <motion.button
                type="button"
                className="order-move"
                aria-label="Move up"
                disabled={pos === 0}
                whileTap={{ scale: 0.9 }}
                onClick={() => onMove(-1)}
              >
                <ArrowUp size={20} strokeWidth={2.8} />
              </motion.button>
              <motion.button
                type="button"
                className="order-move"
                aria-label="Move down"
                disabled={pos === n - 1}
                whileTap={{ scale: 0.9 }}
                onClick={() => onMove(1)}
              >
                <ArrowDown size={20} strokeWidth={2.8} />
              </motion.button>
            </motion.span>
          )}
        </AnimatePresence>
        {!locked && !selected && (
          <span
            className="order-card__grip"
            aria-hidden
            onPointerDown={(e) => {
              e.stopPropagation()
              startDrag(e)
            }}
          >
            <GripVertical size={20} strokeWidth={2.4} />
          </span>
        )}
        {locked && (state === 'correct' || state === 'incorrect') && (
          <motion.span
            className="order-card__mark"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 600, damping: 18, delay: phase === 'correct' ? pos * 0.05 : 0 }}
            aria-label={state === 'correct' ? 'In the right spot' : 'In the wrong spot'}
          >
            {state === 'correct' ? <Check size={18} strokeWidth={3.2} /> : <X size={18} strokeWidth={3.2} />}
          </motion.span>
        )}
      </motion.div>
    </Reorder.Item>
  )
}
