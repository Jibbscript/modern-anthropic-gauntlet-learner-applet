import { AnimatePresence, motion } from 'motion/react'
import { CircleCheck } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { ClozeStep as T, Lang } from '../core/types'
import { Rich } from '../ui/Rich'
import { Code, Toks } from '../ui/code/Code'
import { tokenLines, tokenizePython, type Tok, type TokKind } from '../ui/code/highlight'
import { haptic, sfx } from '../ui/fx'
import { seededShuffle } from './shuffle'
import type { StepProps } from './types'
import { Hint } from './Hint'
import './steps.css'
import './ClozeStep.css'

/* ------------------------------------------------------------ parsing */

type Seg = { t: 'code'; toks: Tok[] } | { t: 'blank'; i: number }

const MARK = /\{\{(\d+)\}\}/g
const PH = /__cz(\d+)__/g

/**
 * Split cloze source into per-line segments of highlighted code and blanks.
 * Blanks are swapped for identifier-shaped placeholders before tokenizing the
 * whole snippet, so strings, comments and f-strings around a blank keep their
 * colours; each line is then cut at the placeholders.
 */
export function parseCloze(code: string, lang: Lang, nBlanks: number): Seg[][] {
  const src = code.replace(/\s+$/, '').replace(MARK, (m, n: string) => (Number(n) < nBlanks ? `__cz${n}__` : m))
  const toks = tokenLines(src, lang)
  return src.split('\n').map((line, li) => {
    // per-character token kinds; anything the tokenizer skipped stays plain
    const kinds: TokKind[] = new Array(line.length).fill('plain')
    let cur = 0
    for (const t of toks[li] ?? []) {
      const at = line.indexOf(t.v, cur)
      if (at < 0) continue
      kinds.fill(t.k, at, at + t.v.length)
      cur = at + t.v.length
    }
    const segs: Seg[] = []
    const pushCode = (from: number, to: number) => {
      if (to <= from) return
      const out: Tok[] = []
      for (let j = from; j < to; j++) {
        const last = out[out.length - 1]
        if (last && last.k === kinds[j]) last.v += line[j]
        else out.push({ k: kinds[j], v: line[j] })
      }
      segs.push({ t: 'code', toks: out })
    }
    let last = 0
    for (const m of line.matchAll(PH)) {
      pushCode(last, m.index)
      segs.push({ t: 'blank', i: Number(m[1]) })
      last = m.index + m[0].length
    }
    pushCode(last, line.length)
    return segs
  })
}

/* ---------------------------------------------------------------- view */

type SlotState = 'empty' | 'active' | 'filled' | 'correct' | 'incorrect' | 'reveal'

/**
 * The runner remounts a step on "Try again"; remember the last fill so a retry
 * keeps the blanks that were right and only reopens the wrong ones.
 */
const memory = new Map<string, (number | null)[]>()

export default function ClozeStep({ step, phase, attempt, setController, onHint, lessonId, mode }: StepProps<T>) {
  const lang = step.lang ?? 'python'
  const lines = useMemo(() => parseCloze(step.code, lang, step.blanks.length), [step.code, lang, step.blanks.length])
  /** blank indices in the order they appear in the code (auto-advance follows this) */
  const order = useMemo(() => {
    const seen: number[] = []
    for (const segs of lines) for (const s of segs) if (s.t === 'blank' && !seen.includes(s.i)) seen.push(s.i)
    return seen
  }, [lines])
  /** shuffled option order per blank, stable per step */
  const optOrder = useMemo(() => step.blanks.map((b, i) => seededShuffle(b.options.map((_, k) => k), `${step.id}:${i}`)), [step])
  const width = useMemo(() => step.blanks.map((b) => Math.max(2, ...b.options.map((o) => [...o].length))), [step])

  const memKey = `${lessonId ?? mode}:${step.id}`
  const [fill, setFill] = useState<(number | null)[]>(() => {
    const saved = attempt > 0 ? memory.get(memKey) : undefined
    return step.blanks.map((b, i) => (saved?.[i] === b.answer ? b.answer : null))
  })
  const [active, setActive] = useState<number | null>(() => order.find((i) => fill[i] == null) ?? null)
  const locked = phase !== 'answer'
  const slotRefs = useRef(new Map<number, HTMLButtonElement>())
  const touched = useRef(false)
  /** a keyboard pick unmounts the focused chip; hand focus to whatever the bank shows next */
  const refocus = useRef(false)
  const takeFocus = (el: HTMLElement | null) => {
    if (!el || !refocus.current) return
    refocus.current = false
    ;(el.querySelector<HTMLElement>('button') ?? el).focus({ preventScroll: true })
  }

  useEffect(() => {
    memory.set(memKey, fill)
  }, [memKey, fill])

  useEffect(() => {
    setController({
      ready: order.every((i) => fill[i] != null),
      check: () => {
        const wrong = order.filter((i) => fill[i] !== step.blanks[i].answer)
        if (!wrong.length) return { correct: true }
        const right = order.length - wrong.length
        const feedback =
          order.length === 1 ? undefined : wrong.length === 1 ? 'Almost: one blank is off.' : `${right} of ${order.length} blanks are right.`
        return { correct: false, feedback }
      },
    })
  }, [fill, order, step, setController])

  // keep the active slot visible inside a horizontally scrolling code box
  useEffect(() => {
    if (active == null || !touched.current) return
    slotRefs.current.get(active)?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
  }, [active])

  const pick = (k: number, viaKeyboard = false) => {
    if (locked || active == null) return
    touched.current = true
    refocus.current = viaKeyboard
    sfx('select')
    haptic('light')
    const next = fill.slice()
    next[active] = k
    setFill(next)
    const pos = order.indexOf(active)
    const after = [...order.slice(pos + 1), ...order.slice(0, pos)]
    setActive(after.find((i) => next[i] == null) ?? null)
  }

  const focusSlot = (i: number) => {
    if (locked) return
    touched.current = true
    if (active !== i) {
      sfx('tap')
      haptic('light')
    }
    setActive(i)
  }

  const stateOf = (i: number): SlotState => {
    const v = fill[i]
    const ok = v === step.blanks[i].answer
    if (phase === 'answer') return active === i ? 'active' : v == null ? 'empty' : 'filled'
    if (phase === 'correct') return 'correct'
    if (phase === 'incorrect') return v == null ? 'empty' : ok ? 'correct' : 'incorrect'
    return ok ? 'correct' : 'reveal'
  }

  const tokensOf = (text: string): Tok[] => (lang === 'python' ? tokenizePython(text) : [{ k: 'plain', v: text }])

  const renderSlot = (i: number, key: number) => {
    const state = stateOf(i)
    const shownIdx = phase === 'revealed' ? step.blanks[i].answer : fill[i]
    const shown = shownIdx == null ? null : step.blanks[i].options[shownIdx]
    const pos = order.indexOf(i) + 1
    const label =
      shown == null
        ? `Blank ${pos} of ${order.length}, empty`
        : `Blank ${pos} of ${order.length}: ${shown}${state === 'incorrect' ? ', wrong' : state === 'correct' || state === 'reveal' ? ', correct' : ''}`
    return (
      <motion.button
        key={key}
        ref={(el) => {
          if (el) slotRefs.current.set(i, el)
          else slotRefs.current.delete(i)
        }}
        type="button"
        className={`cloze__slot cloze__slot--${state}`}
        style={{ '--cz-ch': width[i] } as CSSProperties}
        onClick={() => focusSlot(i)}
        disabled={locked}
        aria-label={label}
        aria-current={state === 'active' ? 'true' : undefined}
        animate={
          state === 'incorrect'
            ? { x: [0, -5, 5, -4, 4, -1, 0] }
            : state === 'correct'
              ? { scale: [1, 1.12, 1] }
              : { x: 0, scale: 1 }
        }
        transition={{ duration: state === 'incorrect' ? 0.42 : 0.32, delay: state === 'correct' ? order.indexOf(i) * 0.06 : 0 }}
        whileTap={locked ? undefined : { scale: 0.92 }}
      >
        {shown != null && (
          <motion.span
            key={`${shownIdx}:${phase === 'revealed'}`}
            className="cloze__tok"
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 560, damping: 18 }}
          >
            <Toks toks={tokensOf(shown)} />
          </motion.span>
        )}
      </motion.button>
    )
  }

  const activePos = active == null ? -1 : order.indexOf(active)

  return (
    <div className="step cloze">
      {step.eyebrow && <div className="eyebrow step__eyebrow">{step.eyebrow}</div>}
      <Rich text={step.prompt} className="step__prompt" />
      <Code
        code={step.code}
        lang={lang}
        className="cloze__code"
        lineProps={(n) => (lines[n - 1]?.some((s) => s.t === 'blank') ? { className: 'cloze__line--slots' } : {})}
        renderLine={(n) => {
          const segs = lines[n - 1]
          if (!segs?.length) return undefined
          return segs.map((s, k) => (s.t === 'code' ? <Toks key={k} toks={s.toks} /> : renderSlot(s.i, k)))
        }}
      />

      <AnimatePresence initial={false}>
        {phase === 'answer' && order.length > 0 && (
          <motion.div
            className="cloze__bank"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6, transition: { duration: 0.15 } }}
          >
            <div className="cloze__bank-head">
              <span className="eyebrow">{active == null ? 'All blanks filled' : `Blank ${activePos + 1} of ${order.length}`}</span>
              {order.length > 1 && (
                <span className="cloze__dots" aria-hidden>
                  {order.map((i) => (
                    <span
                      key={i}
                      className={['cloze__dot', fill[i] != null && 'cloze__dot--filled', active === i && 'cloze__dot--active'].filter(Boolean).join(' ')}
                    />
                  ))}
                </span>
              )}
            </div>
            <AnimatePresence mode="wait" initial={false}>
              {active == null ? (
                <motion.div
                  key="done"
                  ref={takeFocus}
                  tabIndex={-1}
                  className="cloze__done"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.08 } }}
                >
                  <CircleCheck size={18} strokeWidth={2.6} />
                  <span>Ready to check. Tap a blank to change it.</span>
                </motion.div>
              ) : (
                <motion.div
                  key={active}
                  ref={takeFocus}
                  className="cloze__chips"
                  role="group"
                  aria-label={`Options for blank ${activePos + 1}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4, transition: { duration: 0.08 } }}
                  transition={{ type: 'spring', stiffness: 520, damping: 34 }}
                >
                  {optOrder[active].map((k) => {
                    const on = fill[active] === k
                    return (
                      <motion.button
                        key={k}
                        type="button"
                        className={['cloze__chip', on && 'cloze__chip--on'].filter(Boolean).join(' ')}
                        aria-pressed={on}
                        aria-label={step.blanks[active].options[k]}
                        onClick={(e) => pick(k, e.detail === 0)}
                        whileTap={{ y: 2 }}
                      >
                        <Toks toks={tokensOf(step.blanks[active].options[k])} />
                      </motion.button>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {step.hint && phase === 'answer' && <Hint text={step.hint} attempt={attempt} onOpen={onHint} />}
    </div>
  )
}
