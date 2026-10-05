import { useEffect, useMemo, useState } from 'react'
import type { McqStep as T } from '../core/types'
import { Rich } from '../ui/Rich'
import { CodeFromBlock } from '../ui/code/Code'
import { Tile, type TileState } from '../ui/Tile'
import { seededShuffle } from './shuffle'
import type { StepProps } from './types'
import { Hint } from './Hint'
import './steps.css'

/**
 * Reference implementation of a graded step:
 * - local answer state, reset by remount on retry
 * - setController() on every answer change
 * - render per-phase states: answer / correct / incorrect / revealed
 */
export default function McqStep({ step, phase, attempt, setController, onHint }: StepProps<T>) {
  const order = useMemo(
    () => (step.shuffle === false ? step.choices.map((_, i) => i) : seededShuffle(step.choices.map((_, i) => i), step.id)),
    [step],
  )
  const [picked, setPicked] = useState<number[]>([])
  const locked = phase !== 'answer'

  useEffect(() => {
    setController({
      ready: picked.length > 0,
      check: () => {
        const want = step.choices.map((c, i) => (c.correct ? i : -1)).filter((i) => i >= 0)
        const correct = want.length === picked.length && want.every((i) => picked.includes(i))
        const wrongPick = picked.find((i) => !step.choices[i].correct)
        const fb = correct
          ? step.choices[picked[0]]?.feedback
          : wrongPick != null
            ? step.choices[wrongPick].feedback
            : step.multi
              ? 'You missed at least one.'
              : undefined
        return { correct, feedback: fb }
      },
    })
  }, [picked, step, setController])

  const toggle = (i: number) => {
    if (locked) return
    setPicked((p) => (step.multi ? (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]) : [i]))
  }

  const stateOf = (i: number): TileState => {
    const sel = picked.includes(i)
    const ok = !!step.choices[i].correct
    if (phase === 'answer') return sel ? 'selected' : 'idle'
    if (phase === 'correct') return ok ? 'correct' : 'dimmed'
    if (phase === 'incorrect') return sel ? (ok ? 'correct' : 'incorrect') : 'idle'
    // revealed
    return ok ? 'reveal' : sel ? 'incorrect' : 'dimmed'
  }

  return (
    <div className="step">
      {step.eyebrow && <div className="eyebrow step__eyebrow">{step.eyebrow}</div>}
      <Rich text={step.prompt} className="step__prompt" />
      {step.code && <CodeFromBlock block={step.code} />}
      {step.multi && <div className="step__instructions">Select all that apply</div>}
      <div className="choices" role={step.multi ? 'group' : 'radiogroup'}>
        {order.map((i, k) => (
          <Tile key={i} state={stateOf(i)} badge={String.fromCharCode(65 + k)} onClick={() => toggle(i)} disabled={locked}>
            <Rich text={step.choices[i].text} inline />
          </Tile>
        ))}
      </div>
      {step.hint && phase === 'answer' && <Hint text={step.hint} attempt={attempt} onOpen={onHint} />}
    </div>
  )
}
