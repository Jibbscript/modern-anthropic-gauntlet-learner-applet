import { LayoutGroup, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import type { MatchStep as T } from '../core/types'
import { Rich } from '../ui/Rich'
import { Tile, type TileState } from '../ui/Tile'
import { sfx } from '../ui/fx'
import { shuffleNotIdentity } from './shuffle'
import type { StepProps } from './types'
import './steps.css'
import './MatchStep.css'

type Side = 'L' | 'R'
type Pairs = (number | null)[]

/**
 * The runner remounts a step on "Try again"; remember the last pairing so a
 * retry keeps the right pairs and only the wrong ones come apart.
 */
const memory = new Map<string, Pairs>()

const range = (n: number) => Array.from({ length: n }, (_, i) => i)
const POS_SPRING = { type: 'spring', stiffness: 420, damping: 36 } as const

/**
 * Two columns: prompts on the left in order, answers on the right shuffled.
 * Tap one item on each side to connect them; each pair gets its own colour
 * and number. Tap a paired item to pull it apart.
 */
export default function MatchStep({ step, phase, attempt, setController, lessonId, mode }: StepProps<T>) {
  const n = step.pairs.length
  const memKey = `${lessonId ?? mode}:${step.id}`
  const rightOrder = useMemo(() => {
    const s = shuffleNotIdentity(range(n), step.id)
    // with repeated answers a shuffle can still line every row up with its match; rotate it until it doesn't
    for (let k = 0; k < n && s.every((r, row) => step.pairs[r].right === step.pairs[row].right); k++) s.push(s.shift()!)
    return s
  }, [n, step])
  /**
   * Is left item l correctly paired with right item r? Compared by text, so two
   * pairs that share an answer (or a prompt) can be matched either way round.
   */
  const fits = (l: number, r: number | null) =>
    r != null && (r === l || step.pairs[r].right === step.pairs[l].right || step.pairs[r].left === step.pairs[l].left)
  /** pairs[left] = index of the right item (by its original pair index) */
  const [pairs, setPairs] = useState<Pairs>(() => {
    const saved = attempt > 0 ? memory.get(memKey) : undefined
    return range(n).map((l) => {
      const r = saved?.[l] ?? null
      return r != null && r < n && fits(l, r) ? r : null
    })
  })
  const [sel, setSel] = useState<{ side: Side; i: number } | null>(null)
  const [settled, setSettled] = useState(false)
  const [live, setLive] = useState('')
  const locked = phase !== 'answer'
  const activeSel = locked ? null : sel

  useEffect(() => {
    memory.set(memKey, pairs)
  }, [memKey, pairs])

  useEffect(() => {
    setController({
      ready: pairs.every((r) => r != null),
      check: () => {
        const right = pairs.filter((r, l) => fits(l, r)).length
        if (right === n) return { correct: true }
        return {
          correct: false,
          feedback: right === 0 ? 'None of the pairs match yet.' : `${right} of ${n} pairs ${right === 1 ? 'is' : 'are'} right.`,
        }
      },
    })
  }, [pairs, n, step, setController])

  // revealed: pause on the learner's pairs, then slide the answers into matching rows
  useEffect(() => {
    if (phase !== 'revealed') return
    const t = setTimeout(() => setSettled(true), 300)
    return () => clearTimeout(t)
  }, [phase])

  const partnerOf = (r: number) => pairs.indexOf(r)

  const connect = (l: number, r: number) => {
    setPairs((p) => p.map((x, k) => (k === l ? r : x === r ? null : x)))
    setSel(null)
    sfx('flip')
    setLive(`Paired as number ${l + 1}.`)
  }

  const tap = (side: Side, i: number) => {
    if (locked) return
    if (activeSel && activeSel.side !== side) {
      // second tap on the other side completes (or replaces) a pair
      if (side === 'L') connect(i, activeSel.i)
      else connect(activeSel.i, i)
      return
    }
    if (activeSel && activeSel.side === side && activeSel.i === i) {
      setSel(null)
      return
    }
    const paired = side === 'L' ? pairs[i] != null : partnerOf(i) >= 0
    if (paired) {
      // tapping a paired item pulls the pair apart and picks it up again
      setPairs((p) => p.map((x, k) => (side === 'L' ? (k === i ? null : x) : x === i ? null : x)))
      setLive('Pair removed.')
    }
    setSel({ side, i })
  }

  const shownRight = phase === 'revealed' && settled ? range(n) : rightOrder

  /** pair number shown in the socket (0-based), or -1 when unpaired */
  const numL = (l: number) => (phase === 'revealed' && settled ? l : pairs[l] != null ? l : -1)
  const numR = (r: number) => (phase === 'revealed' && settled ? r : partnerOf(r))

  const stateL = (l: number): TileState => {
    if (phase === 'answer') return activeSel?.side === 'L' && activeSel.i === l ? 'selected' : 'idle'
    if (phase === 'correct') return 'correct'
    if (phase === 'incorrect') return fits(l, pairs[l]) ? 'correct' : 'incorrect'
    return fits(l, pairs[l]) ? 'correct' : 'reveal'
  }
  const stateR = (r: number): TileState => {
    if (phase === 'answer') return activeSel?.side === 'R' && activeSel.i === r ? 'selected' : 'idle'
    if (phase === 'correct') return 'correct'
    const l = partnerOf(r)
    if (phase === 'incorrect') return l >= 0 && fits(l, r) ? 'correct' : 'incorrect'
    return l >= 0 && fits(l, r) ? 'correct' : 'reveal'
  }

  const how =
    phase === 'answer'
      ? activeSel
        ? `Now tap its match on the ${activeSel.side === 'L' ? 'right' : 'left'}`
        : 'Tap an item on each side to pair them'
      : phase === 'correct'
        ? 'Every pair matches'
        : phase === 'incorrect'
          ? 'Yellow pairs don’t match'
          : 'The correct pairs'

  const item = (side: Side, i: number, row: number) => {
    const state = side === 'L' ? stateL(i) : stateR(i)
    const num = side === 'L' ? numL(i) : numR(i)
    const text = side === 'L' ? step.pairs[i].left : step.pairs[i].right
    const paired = num >= 0
    const colour = paired && phase === 'answer' && state === 'idle' ? ` match-pair match-pair--${num % 6}` : ''
    return (
      <Tile
        key={`${side}${i}`}
        layout="position"
        // Tile's own shake/pop timing must survive: only the row slide uses the spring
        transition={{ layout: POS_SPRING, x: { duration: 0.42 }, scale: { duration: 0.3 } }}
        compact
        state={state}
        disabled={locked}
        onClick={() => tap(side, i)}
        className={`match-item match-item--${side === 'L' ? 'left' : 'right'}${colour}`}
        style={{ gridRow: row + 1, gridColumn: side === 'L' ? 1 : 2 }}
      >
        <span className="match-item__text">
          <Rich text={text} inline />
        </span>
        <Socket num={num} state={state} />
        {paired && <span className="visually-hidden">, pair {num + 1}</span>}
      </Tile>
    )
  }

  return (
    <LayoutGroup id={step.id}>
      <div className="step match">
        {step.eyebrow && <div className="eyebrow step__eyebrow">{step.eyebrow}</div>}
        <Rich text={step.prompt} className="step__prompt" />
        <div className="match__body">
          <div className="step__instructions match__how" aria-live="polite">
            {how}
          </div>
          <div className="match-grid" style={{ gridTemplateRows: `repeat(${n}, auto)` }}>
            {range(n).map((l) => item('L', l, l))}
            {shownRight.map((r, row) => item('R', r, row))}
          </div>
        </div>
        <div className="visually-hidden" aria-live="polite">
          {live}
        </div>
      </div>
    </LayoutGroup>
  )
}

/** The little connector on the inner edge of each item: empty ring, or a filled numbered dot once paired. */
function Socket({ num, state }: { num: number; state: TileState }) {
  const filled = num >= 0
  return (
    <span className={`match-socket${filled ? ' match-socket--on' : ''}`} aria-hidden>
      {filled && (
        <motion.span
          key={`${num}-${state}`}
          className="match-socket__dot tabular"
          initial={{ scale: 0.3 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 700, damping: 20 }}
        >
          {num + 1}
        </motion.span>
      )}
    </span>
  )
}
