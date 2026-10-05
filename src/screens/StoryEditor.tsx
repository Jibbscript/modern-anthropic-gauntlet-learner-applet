import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type TextareaHTMLAttributes } from 'react'
import { BookOpenText, Check, ChevronLeft, CloudCheck, Mic, MessageCircleQuestion, NotebookPen, Plus, Quote, TriangleAlert } from 'lucide-react'
import { useStore } from '../core/store'
import type { StorySlotId } from '../core/types'
import { STORY_BY_ID } from '../content/skills'
import { CATALOG } from '../content'
import { nav } from '../app/nav'
import { useClock } from '../app/clock'
import { Button, IconButton } from '../ui/Button'
import { Callout } from '../ui/Callout'
import { courseStyle } from '../ui/course'
import { haptic, sfx } from '../ui/fx'
import { STATUS_LABEL, ago, dueIn, groupOf, isDrafted, layerDone, storyStatus, type StoryGroup } from './StoriesScreen'
import './StoryEditor.css'

const WPM = 150
/** spoken answers longer than this get interrupted */
const MAX_SECONDS = 180
const SAVE_MS = 450

/** what interviewers listen for, per kind of story */
const TIPS: Record<StoryGroup['id'], string> = {
  culture: [
    '**What lands in a culture answer**',
    '- Say what you actually thought at the time, not the polished version.',
    '- Name the cost: what it took from you, the team or the project.',
    '- Say what you would do differently now, and why.',
    '- No villains. Give the other side’s view at its strongest.',
  ].join('\n'),
  recruiter: [
    '**What lands on a recruiter screen**',
    '- Be specific: a team, a paper, a decision. Not the mission statement.',
    '- Tie it to something you have actually done.',
    '- Real disagreement is fine. Show you understand the other side first.',
    '- Keep it under two minutes; they will ask for more.',
  ].join('\n'),
  technical: [
    '**What lands in a technical story**',
    '- Say “I” for your part and “we” for the team’s. Interviewers listen for the difference.',
    '- Name the alternatives you rejected and why.',
    '- Bring numbers: scale, latency, cost, what changed.',
    '- Say what broke and what you would change now.',
  ].join('\n'),
}

export function wordCount(text: string): number {
  const t = text.trim()
  return t ? t.split(/\s+/).length : 0
}

export function clock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** textarea that grows with its content */
function AutoTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const fit = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight + 2}px`
  }, [])
  useLayoutEffect(fit, [props.value, fit])
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    let w = el.clientWidth
    const ro = new ResizeObserver(() => {
      if (el.clientWidth !== w) {
        w = el.clientWidth
        fit()
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [fit])
  return <textarea ref={ref} rows={3} {...props} />
}

type SaveState = 'idle' | 'saving' | 'saved'

export default function StoryEditor({ slot }: { slot: StorySlotId }) {
  const def = STORY_BY_ID[slot]
  const group = groupOf(slot)
  const saveStory = useStore((s) => s.saveStory)
  const entry = useStore((s) => s.stories[slot])
  const reflections = useStore((s) => s.reflections)

  // local copies are the source of truth while editing; the store is written debounced
  const [layers, setLayers] = useState<Record<number, string>>(() => ({ ...(useStore.getState().stories[slot]?.layers ?? {}) }))
  const [notes, setNotes] = useState(() => useStore.getState().stories[slot]?.notes ?? '')
  const [save, setSave] = useState<SaveState>('idle')
  const pending = useRef<{ layers: Record<number, string>; notes?: string } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** "Saved" shows for a moment, then the header goes back to the story's status */
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    const p = pending.current
    if (!p) return
    pending.current = null
    saveStory(slot, p)
    setSave('saved')
    if (savedTimer.current) clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => setSave('idle'), 1600)
  }, [saveStory, slot])

  const queue = useCallback(
    (patch: { layers?: Record<number, string>; notes?: string }) => {
      const prev = pending.current ?? { layers: {} }
      pending.current = { layers: { ...prev.layers, ...(patch.layers ?? {}) }, notes: patch.notes ?? prev.notes }
      if (savedTimer.current) clearTimeout(savedTimer.current)
      setSave('saving')
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(flush, SAVE_MS)
    },
    [flush],
  )

  // never lose the last keystrokes when the page is closed or the tab hidden
  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && flush()
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [flush])
  // declared after the flush effect so its cleanup runs last and clears the timer flush just set
  useEffect(
    () => () => {
      if (savedTimer.current) clearTimeout(savedTimer.current)
    },
    [],
  )

  const related = useMemo(
    () =>
      Object.values(CATALOG.lessons).flatMap((l) =>
        l.steps.flatMap((st) => (st.kind === 'reflect' && st.slot === slot ? [{ key: `${l.id}/${st.id}`, lesson: l.title }] : [])),
      ),
    [slot],
  )
  const written = related.filter((r) => (reflections[r.key] ?? '').trim())
  const now = useClock()

  if (!def) {
    return (
      <div className="sed">
        <header className="sed-head safe-top">
          <IconButton label="Back" className="sed-head__back" onClick={nav.back}>
            <ChevronLeft size={28} strokeWidth={2.6} />
          </IconButton>
          <div className="sed-head__titles">
            <h1>Story</h1>
          </div>
          <span />
        </header>
        <div className="sed-missing">This story slot no longer exists.</div>
      </div>
    )
  }

  const liveEntry = { layers, notes, updatedAt: entry?.updatedAt ?? 0, rehearsal: entry?.rehearsal ?? null, rehearsals: entry?.rehearsals ?? 0 }
  const drafted = isDrafted(liveEntry)
  const status = storyStatus(liveEntry, now)
  const done = def.layers.filter((_, i) => layerDone(layers[i])).length
  const words = def.layers.reduce((a, _, i) => a + wordCount(layers[i] ?? ''), 0)
  const seconds = (words / WPM) * 60
  const long = seconds > MAX_SECONDS
  const need = Math.max(0, 2 - done)
  // a story already on the rehearsal schedule can always be rehearsed, even if it is thin
  const canRehearse = drafted || status === 'due'

  const statusLine =
    save === 'saving'
      ? 'Saving…'
      : save === 'saved'
        ? 'Saved'
        : entry?.rehearsal?.last
          ? `Rehearsed ${ago(entry.rehearsal.last, now)}`
          : STATUS_LABEL[status]

  const addToNotes = (text: string) => {
    const next = notes.trim() ? `${notes.trimEnd()}\n\n${text.trim()}` : text.trim()
    setNotes(next)
    queue({ notes: next })
    sfx('select')
    haptic('light')
  }

  return (
    <div className="sed" style={courseStyle(group.color)}>
      <header className="sed-head safe-top">
        <IconButton
          label="Back"
          className="sed-head__back"
          onClick={() => {
            flush()
            nav.back()
          }}
        >
          <ChevronLeft size={28} strokeWidth={2.6} />
        </IconButton>
        <div className="sed-head__titles">
          <h1>{def.title}</h1>
          <span className={`sed-head__status sed-head__status--${save}`} aria-live="polite">
            {save === 'saved' && <CloudCheck size={14} strokeWidth={2.6} />}
            {statusLine}
          </span>
        </div>
        <span />
      </header>

      <div className="sed-scroll scroll">
        <div className="sed-body">
          <motion.section
            className="sed-q"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          >
            <div className="sed-q__eyebrow">
              <Quote size={14} strokeWidth={2.8} />
              {group.title} question
            </div>
            <h2 className="sed-q__text">{def.question}</h2>
            <div className="sed-q__meta">
              <span className="sed-q__pips" aria-hidden>
                {def.layers.map((_, i) => (
                  <i key={i} className={layerDone(layers[i]) ? 'on' : ''} />
                ))}
              </span>
              <span className="tabular">
                {done} of {def.layers.length} layers written
              </span>
              {entry?.rehearsal && canRehearse && (
                <span className="sed-q__due">
                  <Mic size={13} strokeWidth={2.8} />
                  {entry.rehearsal.due <= now ? 'Due now' : `Next ${dueIn(entry.rehearsal.due, now)}`}
                </span>
              )}
            </div>
          </motion.section>

          <ol className="sed-layers">
            {def.layers.map((prompt, i) => {
              const ok = layerDone(layers[i])
              return (
                <motion.li
                  key={i}
                  className={`sed-layer ${ok ? 'is-done' : ''}`}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 34, delay: 0.05 + i * 0.04 }}
                >
                  <label className="sed-layer__head" htmlFor={`sed-layer-${i}`}>
                    <span className="sed-layer__num" aria-hidden>
                      <AnimatePresence mode="popLayout" initial={false}>
                        {ok ? (
                          <motion.span
                            key="ok"
                            initial={{ scale: 0.3, rotate: -30 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0.3, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 520, damping: 16 }}
                          >
                            <Check size={16} strokeWidth={3.4} />
                          </motion.span>
                        ) : (
                          <motion.span key="n" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}>
                            {i + 1}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </span>
                    <span className="sed-layer__prompt">{prompt}</span>
                  </label>
                  <AutoTextarea
                    id={`sed-layer-${i}`}
                    className="sed-input"
                    value={layers[i] ?? ''}
                    placeholder={i === 0 ? 'Write it the way you would say it out loud…' : 'A few honest sentences…'}
                    onChange={(e) => {
                      const v = e.target.value
                      setLayers((l) => ({ ...l, [i]: v }))
                      queue({ layers: { [i]: v } })
                    }}
                    onBlur={flush}
                  />
                </motion.li>
              )
            })}
          </ol>

          <section className="sed-sec">
            <h3 className="sed-sec__title" id="sed-notes-title">
              <NotebookPen size={18} strokeWidth={2.6} />
              Notes &amp; lesson reflections
            </h3>
            <AutoTextarea
              aria-labelledby="sed-notes-title"
              className="sed-input sed-input--notes"
              value={notes}
              placeholder="Names, numbers, dates, the one line you want to land…"
              onChange={(e) => {
                setNotes(e.target.value)
                queue({ notes: e.target.value })
              }}
              onBlur={flush}
            />
            {written.map((r) => {
              const text = (reflections[r.key] ?? '').trim()
              const added = notes.includes(text)
              return (
                <div key={r.key} className="sed-refl">
                  <div className="sed-refl__head">
                    <BookOpenText size={15} strokeWidth={2.6} />
                    <span>From the lesson</span>
                  </div>
                  <b className="sed-refl__lesson">{r.lesson}</b>
                  <p className="sed-refl__text">{text}</p>
                  <Button
                    size="md"
                    variant="secondary"
                    className="sed-refl__btn"
                    disabled={added}
                    icon={added ? <Check size={16} strokeWidth={3} /> : <Plus size={16} strokeWidth={3} />}
                    onClick={() => addToNotes(text)}
                  >
                    {added ? 'In your notes' : 'Add to notes'}
                  </Button>
                </div>
              )
            })}
            {written.length === 0 && related.length > 0 && (
              <p className="sed-hint">
                What you write in the <b>{related[0].lesson}</b> lesson shows up here too.
              </p>
            )}
          </section>

          {def.followUps.length > 0 && (
            <section className="sed-sec">
              <h3 className="sed-sec__title">
                <MessageCircleQuestion size={18} strokeWidth={2.6} />
                Likely follow-ups
              </h3>
              <ul className="sed-follow">
                {def.followUps.map((f) => (
                  <li key={f}>
                    <span className="sed-follow__dot" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
              <p className="sed-hint">Rehearsals rotate through these once you have told the story once.</p>
            </section>
          )}

          <Callout callout={{ tone: 'tip', text: TIPS[group.id] }} />
        </div>
      </div>

      <footer className="sed-foot safe-bottom">
        <div className={`sed-stats ${long ? 'is-long' : ''}`} aria-live="polite">
          <div className="sed-stats__line">
            <span className="tabular">
              <b>{words}</b> {words === 1 ? 'word' : 'words'}
            </span>
            <span className="sed-stats__sep" aria-hidden>
              ·
            </span>
            <span className="tabular">
              ≈ <b>{clock(seconds)}</b> spoken
            </span>
            <span className="sed-stats__meter" aria-hidden>
              <motion.i initial={false} animate={{ width: `${Math.min(1, seconds / MAX_SECONDS) * 100}%` }} transition={{ type: 'spring', stiffness: 200, damping: 26 }} />
            </span>
          </div>
          <AnimatePresence initial={false}>
            {long && (
              <motion.p
                className="sed-stats__warn"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 36 }}
              >
                <TriangleAlert size={14} strokeWidth={2.8} />
                Over 3 minutes. Interviewers will cut in; trim to the core.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
        <Button
          block
          size="lg"
          variant={canRehearse ? 'course' : 'primary'}
          disabled={!canRehearse}
          icon={canRehearse ? <Mic size={20} strokeWidth={2.6} /> : undefined}
          onClick={() => {
            flush()
            nav.openDrill([slot])
          }}
        >
          {canRehearse ? 'Rehearse this story' : `Write ${need} more ${need === 1 ? 'layer' : 'layers'} to rehearse`}
        </Button>
      </footer>
    </div>
  )
}
