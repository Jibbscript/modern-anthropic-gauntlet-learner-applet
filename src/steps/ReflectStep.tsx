import { AnimatePresence, motion } from 'motion/react'
import { BookMarked, Check, CloudCheck, History, ListChecks } from 'lucide-react'
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ReflectStep as T } from '../core/types'
import { useStore } from '../core/store'
import { STORY_BY_ID } from '../content/skills'
import { Rich } from '../ui/Rich'
import { haptic, sfx } from '../ui/fx'
import type { StepProps } from './types'
import './steps.css'
import './ReflectStep.css'

const DRAFT_MS = 600

const countWords = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0)

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

/** merge a reflection into a Story Bank slot's notes without duplicating it */
function mergeNotes(notes: string, text: string): string {
  const t = text.trim()
  if (!notes.trim()) return t
  if (notes.includes(t)) return notes
  return `${notes.replace(/\s+$/, '')}\n\n${t}`
}

/**
 * Free-text reflection. Not graded: the learner writes, ticks the rubric as a
 * self-check, and "Save & continue" stores the text (and merges it into the
 * Story Bank slot, when the step has one). Drafts autosave while typing.
 */
export default function ReflectStep({ step, setController, lessonId }: StepProps<T & { id: string }>) {
  const key = `${lessonId ?? 'free'}/${step.id}`
  const [text, setText] = useState(() => useStore.getState().reflections[key] ?? '')
  const [ticked, setTicked] = useState<boolean[]>(() => step.rubric.map(() => false))
  /** draft indicator: "restored" when the step opens on a saved draft, then "saved" after each autosave (n re-pops the icon) */
  const [draft, setDraft] = useState<{ kind: 'restored' | 'saved'; n: number } | null>(() => (text.trim() ? { kind: 'restored', n: 0 } : null))
  const slot = step.slot ? STORY_BY_ID[step.slot] : undefined
  const words = countWords(text)
  const ready = text.trim().length > 0

  // ---- persistence: debounced draft + flush on leave
  const latest = useRef(text)
  latest.current = text
  const pending = useRef<number | null>(null)
  const saveDraft = useCallback(
    (value: string) => {
      const s = useStore.getState()
      const cur = s.reflections[key]
      if (cur === value || (cur == null && !value.trim())) return false
      s.saveReflection(key, value)
      return true
    },
    [key],
  )
  const flush = useCallback(() => {
    if (pending.current != null) {
      clearTimeout(pending.current)
      pending.current = null
      saveDraft(latest.current)
    }
  }, [saveDraft])
  useEffect(() => {
    // leaving the lesson unmounts the step; closing the tab does not, so flush on pagehide too
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [flush])

  const onChange = (value: string) => {
    setText(value)
    if (pending.current != null) clearTimeout(pending.current)
    pending.current = window.setTimeout(() => {
      pending.current = null
      if (saveDraft(latest.current)) setDraft((d) => ({ kind: 'saved', n: (d?.n ?? 0) + 1 }))
    }, DRAFT_MS)
  }

  useEffect(() => {
    setController({
      ready,
      check: () => {
        if (pending.current != null) {
          clearTimeout(pending.current)
          pending.current = null
        }
        const value = latest.current
        // "Skip for now": nothing goes to the Story Bank, but a draft the learner just emptied stays emptied
        if (!value.trim()) {
          saveDraft(value)
          return { correct: true }
        }
        const s = useStore.getState()
        s.saveReflection(key, value)
        if (step.slot) {
          const notes = s.stories[step.slot]?.notes ?? ''
          const next = mergeNotes(notes, value)
          if (next !== notes) s.saveStory(step.slot, { notes: next })
        }
        return { correct: true }
      },
    })
  }, [ready, key, step.slot, setController, saveDraft])

  // ---- autosize
  const area = useRef<HTMLTextAreaElement>(null)
  const field = useRef<HTMLDivElement>(null)
  const fit = useCallback(() => {
    const el = area.current
    if (!el) return
    const sc = scrollParent(el)
    // collapsing to measure shrinks the page for a moment, which clamps the scroll position; put it back
    const keep = sc?.scrollTop ?? 0
    const was = el.offsetHeight
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight + 2}px`
    if (!sc) return
    if (sc.scrollTop !== keep) sc.scrollTop = keep
    // typing at the end grows the field downwards: keep its bottom edge (and the word count) above the fold
    if (el.offsetHeight > was && document.activeElement === el && el.selectionEnd === el.value.length && field.current) {
      const over = field.current.getBoundingClientRect().bottom + 12 - sc.getBoundingClientRect().bottom
      if (over > 0) sc.scrollTop += over
    }
  }, [])
  useLayoutEffect(fit, [text, fit])
  useEffect(() => {
    // line wrapping changes when the width or the web font changes
    window.addEventListener('resize', fit)
    document.fonts?.ready.then(fit).catch(() => {})
    return () => window.removeEventListener('resize', fit)
  }, [fit])

  const toggle = (i: number) => {
    const next = ticked.map((v, k) => (k === i ? !v : v))
    if (next[i]) {
      haptic('light')
      sfx(next.every(Boolean) ? 'unlock' : 'select')
    } else sfx('tap')
    setTicked(next)
  }
  const nTicked = ticked.filter(Boolean).length
  const allTicked = nTicked === step.rubric.length && step.rubric.length > 0
  const ids = useId()
  const guidanceId = `${ids}-guidance`

  return (
    <div className="step reflect">
      {step.eyebrow && <div className="eyebrow step__eyebrow">{step.eyebrow}</div>}
      <Rich text={step.prompt} className="step__prompt" />
      {slot && (
        <span className="chip chip--course reflect-slot">
          <BookMarked size={14} strokeWidth={2.6} />
          <span className="reflect-slot__text">
            Saves to your Story Bank · <b>{slot.title}</b>
          </span>
        </span>
      )}
      <div id={guidanceId}>
        <Rich text={step.guidance} className="reflect-guidance" />
      </div>

      <div className="reflect-field" ref={field}>
        <textarea
          ref={area}
          className="reflect-input"
          value={text}
          onChange={(e) => onChange(e.target.value)}
          onBlur={flush}
          placeholder={step.placeholder ?? 'Write it the way you would say it out loud.'}
          aria-label="Your reflection"
          aria-describedby={guidanceId}
          rows={5}
          spellCheck
        />
        <div className="reflect-meta">
          <span className="reflect-count tabular">
            {words} {words === 1 ? 'word' : 'words'}
          </span>
          <AnimatePresence mode="wait" initial={false}>
            {draft && ready && (
              <motion.span
                key={draft.kind}
                className={`reflect-saved reflect-saved--${draft.kind}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                transition={{ duration: 0.2 }}
              >
                <motion.span
                  key={draft.n}
                  className="reflect-saved__icon"
                  initial={draft.n > 0 ? { scale: 0.5, rotate: -20 } : false}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 600, damping: 16 }}
                >
                  {draft.kind === 'restored' ? <History size={14} strokeWidth={2.4} /> : <CloudCheck size={14} strokeWidth={2.4} />}
                </motion.span>
                {draft.kind === 'restored' ? 'Draft restored' : 'Draft saved'}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {step.rubric.length > 0 && (
        <section className="reflect-rubric" aria-label="Self-check">
          <div className="reflect-rubric__head">
            <span className="step__instructions reflect-rubric__title">
              <ListChecks size={16} strokeWidth={2.6} /> Self-check
            </span>
            <motion.span
              key={allTicked ? 'all' : 'some'}
              className={`chip reflect-rubric__count tabular${allTicked ? ' chip--good' : ''}`}
              initial={allTicked ? { scale: 0.7 } : false}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 600, damping: 16 }}
            >
              {allTicked && <Check size={13} strokeWidth={3} />}
              {nTicked}/{step.rubric.length}
            </motion.span>
          </div>
          <div className="reflect-checks">
            {step.rubric.map((r, i) => (
              <RubricRow key={i} text={r} on={ticked[i]} onToggle={() => toggle(i)} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function RubricRow({ text, on, onToggle }: { text: string; on: boolean; onToggle: () => void }) {
  // the box pops only when it changes, not on first paint
  const first = useRef(true)
  useEffect(() => {
    first.current = false
  }, [])
  const pop = useMemo(() => (first.current ? false : { scale: [1, 1.18, 1] }), [on]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <button type="button" role="checkbox" aria-checked={on} className={`reflect-check${on ? ' reflect-check--on' : ''}`} onClick={onToggle}>
      <motion.span className="reflect-check__box" aria-hidden animate={pop || undefined} transition={{ duration: 0.28 }}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
          <motion.path
            d="M5 12.5l4.5 4.5L19 7.5"
            stroke="currentColor"
            strokeWidth={3.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={false}
            animate={{ pathLength: on ? 1 : 0, opacity: on ? 1 : 0 }}
            transition={{ duration: on ? 0.26 : 0.12, ease: 'easeOut' }}
          />
        </svg>
      </motion.span>
      <span className="reflect-check__text">{text}</span>
    </button>
  )
}
