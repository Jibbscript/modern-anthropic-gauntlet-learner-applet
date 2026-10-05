import { motion } from 'motion/react'
import { useMemo } from 'react'
import {
  Bot,
  Check,
  ChevronRight,
  Compass,
  Gauge,
  Layers,
  Lock,
  MessagesSquare,
  Mic,
  NotebookPen,
  PenLine,
  RefreshCw,
  Scale,
  ShieldAlert,
  Split,
  ThumbsDown,
  Timer,
  TrendingDown,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useStore, type GauntletState, type StoryEntry } from '../core/store'
import type { CourseColor, IconName, StorySlot, StorySlotId } from '../core/types'
import { STORY_BY_ID, STORY_SLOTS } from '../content/skills'
import { dueStories } from '../core/adaptive'
import { formatInterval } from '../core/fsrs'
import { DAY_MS, dayKey, daysBetween } from '../core/dates'
import { nav } from '../app/nav'
import { useClock } from '../app/clock'
import { Button } from '../ui/Button'
import { ProgressBar } from '../ui/ProgressBar'
import { Ticker } from '../ui/Ticker'
import { CourseIcon } from '../ui/Icon'
import { courseStyle } from '../ui/course'
import './StoriesScreen.css'

/* ------------------------------------------------- shared story helpers */

/** a layer counts as written once it has more than this many characters */
export const LAYER_MIN_CHARS = 20

export const layerDone = (t: string | undefined) => (t ?? '').trim().length > LAYER_MIN_CHARS

/** drafted = at least two layers with real content (same rule as the achievements) */
export function isDrafted(e: StoryEntry | undefined): boolean {
  return !!e && Object.values(e.layers).filter(layerDone).length >= 2
}

export function hasAnyText(e: StoryEntry | undefined): boolean {
  return !!e && (Object.values(e.layers).some((v) => v.trim().length > 0) || e.notes.trim().length > 0)
}

/** something to say out loud: at least one layer with text (notes alone do not count) */
export function hasLayerText(e: StoryEntry | undefined): boolean {
  return !!e && Object.values(e.layers).some((v) => v.trim().length > 0)
}

export function layersWritten(slot: StorySlot, e: StoryEntry | undefined): number {
  return slot.layers.filter((_, i) => layerDone(e?.layers[i])).length
}

/**
 * stories due for rehearsal that have something to say, most overdue first. A
 * schedule left behind after the layers were cleared does not count: the drill
 * would open empty.
 */
export function rehearsalsDue(s: GauntletState, now: number): StorySlotId[] {
  return (dueStories(s, now) as StorySlotId[])
    .filter((id) => STORY_BY_ID[id] && hasLayerText(s.stories[id]))
    .sort((a, b) => (s.stories[a]?.rehearsal?.due ?? 0) - (s.stories[b]?.rehearsal?.due ?? 0))
}

export type StoryStatus = 'new' | 'draft' | 'ready' | 'due'

/**
 * due wins (it matches the tab badge), then drafted, then any text at all. A
 * schedule left behind after the layers were cleared is not "due": there is
 * nothing to rehearse, and the drill would open empty.
 */
export function storyStatus(e: StoryEntry | undefined, now: number): StoryStatus {
  if (!e) return 'new'
  if (e.rehearsal && e.rehearsal.due <= now && hasLayerText(e)) return 'due'
  if (isDrafted(e)) return 'ready'
  return hasAnyText(e) ? 'draft' : 'new'
}

export const STATUS_LABEL: Record<StoryStatus, string> = {
  new: 'Not started',
  draft: 'Draft',
  ready: 'Ready',
  due: 'Due for rehearsal',
}

export interface StoryGroup {
  id: 'recruiter' | 'culture' | 'technical'
  title: string
  blurb: string
  color: CourseColor
  icon: IconName
  slots: StorySlotId[]
}

export const STORY_GROUPS: StoryGroup[] = [
  {
    id: 'recruiter',
    title: 'Recruiter screen',
    blurb: 'Asked in the first call. Specific beats polished.',
    color: 'violet',
    icon: 'shield',
    slots: ['why-anthropic', 'disagree-anthropic', 'ai-risks'],
  },
  {
    id: 'culture',
    title: 'Culture round',
    blurb: 'Real stories, what you thought then, what you think now.',
    color: 'rose',
    icon: 'heart',
    slots: ['disagree-company', 'ethical-conflict', 'speed-vs-safety', 'changed-mind', 'dislike-work', 'failure', 'conflict'],
  },
  {
    id: 'technical',
    title: 'Technical',
    blurb: 'Your own work, explained all the way down.',
    color: 'orange',
    icon: 'search',
    slots: ['project-deep-dive', 'agent-workflow'],
  },
]

export function groupOf(slot: StorySlotId): StoryGroup {
  return STORY_GROUPS.find((g) => g.slots.includes(slot)) ?? STORY_GROUPS[1]
}

export const SLOT_ICON: Record<StorySlotId, LucideIcon> = {
  'why-anthropic': Compass,
  'disagree-anthropic': MessagesSquare,
  'ai-risks': ShieldAlert,
  'disagree-company': Split,
  'ethical-conflict': Scale,
  'speed-vs-safety': Gauge,
  'changed-mind': RefreshCw,
  'dislike-work': ThumbsDown,
  failure: TrendingDown,
  conflict: Users,
  'project-deep-dive': Layers,
  'agent-workflow': Bot,
}

/** "today", "yesterday", "3 days ago", "2 weeks ago" */
export function ago(t: number, now: number): string {
  const d = daysBetween(dayKey(t), dayKey(now))
  if (d <= 0) return 'today'
  if (d === 1) return 'yesterday'
  if (d < 7) return `${d} days ago`
  if (d < 14) return 'last week'
  if (d < 60) return `${Math.round(d / 7)} weeks ago`
  return `${Math.round(d / 30)} months ago`
}

/** "in 3d", "in 12h", "now" */
export function dueIn(due: number, now: number): string {
  return due <= now ? 'now' : `in ${formatInterval((due - now) / DAY_MS)}`
}

/* ----------------------------------------------------------- the screen */

const rise = (i: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { type: 'spring' as const, stiffness: 420, damping: 34, delay: 0.03 + i * 0.045 },
})

/** rough minutes per rehearsed story: two minutes speaking plus the check */
const MIN_PER_STORY = 3

export default function StoriesScreen() {
  const s = useStore()
  const now = useClock()

  const d = useMemo(() => {
    const drafted = STORY_SLOTS.filter((x) => isDrafted(s.stories[x.id]))
    const due = rehearsalsDue(s, now)
    const upcoming = drafted
      .map((x) => s.stories[x.id]?.rehearsal?.due)
      .filter((t): t is number => t != null && t > now)
    const nextDue = upcoming.length ? Math.min(...upcoming) : null
    // the story to start from when nothing is drafted yet: a draft in progress, else the first slot
    const inProgress = STORY_SLOTS.filter((x) => storyStatus(s.stories[x.id], now) === 'draft').sort(
      (a, b) => (s.stories[b.id]?.updatedAt ?? 0) - (s.stories[a.id]?.updatedAt ?? 0),
    )[0]
    const unrehearsed = drafted.some((x) => !s.stories[x.id]?.rehearsal?.last)
    return { drafted: drafted.length, due, nextDue, inProgress, unrehearsed }
  }, [s, now])

  const total = STORY_SLOTS.length
  let i = 0

  return (
    <div className="sto">
      <header className="sto-head safe-top">
        <h1>Story Bank</h1>
        {d.drafted > 0 && (
          <span className="sto-head__pill" aria-label={`${d.drafted} of ${total} stories drafted`}>
            <NotebookPen size={16} strokeWidth={2.6} />
            <span className="tabular">
              {d.drafted}/{total}
            </span>
          </span>
        )}
      </header>

      <div className="sto-scroll scroll">
        <div className="sto-body">
          <motion.div className="sto-intro" {...rise(i++)}>
            <p className="sto-intro__lead">
              The culture round asks for real stories with real reflection. Draft them here, then rehearse them out loud on a spaced schedule.
            </p>
            <div className="sto-progress">
              <div className="sto-progress__line">
                <span>
                  <b className="tabular">{d.drafted}</b> of <span className="tabular">{total}</span> stories drafted
                </span>
                <span className="sto-progress__pct tabular">{Math.round((d.drafted / total) * 100)}%</span>
              </div>
              <ProgressBar value={d.drafted / total} label="Stories drafted" />
            </div>
          </motion.div>

          <motion.div {...rise(i++)}>
            {d.due.length > 0 ? (
              <RehearseHero count={d.due.length} onStart={() => nav.openDrill(d.due)} />
            ) : d.drafted > 0 ? (
              <CaughtUp title={d.unrehearsed ? 'Nothing due yet' : 'All rehearsed'} nextDue={d.nextDue} now={now} onAnyway={() => nav.openDrill()} />
            ) : (
              <StartCard
                resume={d.inProgress}
                onStart={(slot) => nav.openStory(slot)}
              />
            )}
          </motion.div>

          {STORY_GROUPS.map((g) => {
            const done = g.slots.filter((id) => isDrafted(s.stories[id])).length
            return (
              <motion.section key={g.id} className="sto-sec" style={courseStyle(g.color)} {...rise(i++)}>
                <div className="sto-sec__head">
                  <span className="sto-sec__icon" aria-hidden>
                    <CourseIcon name={g.icon} size={16} strokeWidth={2.8} />
                  </span>
                  <div className="sto-sec__titles">
                    <h2>{g.title}</h2>
                    <p>{g.blurb}</p>
                  </div>
                  <span className="sto-sec__count tabular">
                    {done}/{g.slots.length}
                  </span>
                </div>
                <div className="sto-list">
                  {g.slots.map((id) => STORY_BY_ID[id] && <StoryCard key={id} slot={STORY_BY_ID[id]} entry={s.stories[id]} now={now} />)}
                </div>
              </motion.section>
            )
          })}

          <motion.p className="sto-foot" {...rise(i++)}>
            <Lock size={14} strokeWidth={2.6} />
            Stories are saved on this device only.
          </motion.p>
        </div>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- hero */

function MicArt({ calm }: { calm?: boolean }) {
  return (
    <span className={`sto-mic ${calm ? 'sto-mic--calm' : ''}`} aria-hidden>
      {!calm && (
        <>
          <span className="sto-mic__ripple" />
          <span className="sto-mic__ripple sto-mic__ripple--2" />
        </>
      )}
      <motion.span
        className="sto-mic__face"
        initial={{ scale: 0.5, rotate: -18 }}
        animate={{ scale: 1, rotate: -6 }}
        transition={{ type: 'spring', stiffness: 380, damping: 14, delay: 0.12 }}
      >
        <Mic size={34} strokeWidth={2.4} />
      </motion.span>
    </span>
  )
}

function RehearseHero({ count, onStart }: { count: number; onStart: () => void }) {
  return (
    <section className="sto-hero" style={courseStyle('rose')}>
      <div className="sto-hero__top">
        <div className="sto-hero__main">
          <div className="sto-hero__eyebrow">
            <Mic size={15} strokeWidth={2.8} />
            Rehearsal
          </div>
          <div className="sto-hero__count">
            <Ticker value={count} from={0} />
          </div>
          <p className="sto-hero__sub">{count === 1 ? 'story due' : 'stories due'}</p>
        </div>
        <MicArt />
      </div>
      <p className="sto-hero__text">Say each one out loud with the timer running, then grade how it went.</p>
      <div className="sto-hero__chips">
        <span className="sto-chip">
          <Timer size={15} strokeWidth={2.6} />
          About {count * MIN_PER_STORY} min
        </span>
      </div>
      <Button variant="course" size="lg" block onClick={onStart}>
        Start rehearsal
      </Button>
    </section>
  )
}

function CaughtUp({ title, nextDue, now, onAnyway }: { title: string; nextDue: number | null; now: number; onAnyway: () => void }) {
  return (
    <section className="sto-done">
      <div className="sto-done__top">
        <motion.span
          className="sto-done__check"
          initial={{ scale: 0.4, rotate: -25 }}
          animate={{ scale: 1, rotate: -6 }}
          transition={{ type: 'spring', stiffness: 420, damping: 15, delay: 0.12 }}
          aria-hidden
        >
          <Check size={26} strokeWidth={3.6} />
        </motion.span>
        <div className="sto-done__main">
          <h2>{title}</h2>
          <p>{nextDue ? <>Next story due {dueIn(nextDue, now)}.</> : 'Nothing scheduled yet.'}</p>
        </div>
      </div>
      <Button variant="secondary" size="md" block icon={<Mic size={18} strokeWidth={2.6} />} onClick={onAnyway}>
        Rehearse anyway
      </Button>
    </section>
  )
}

function StartCard({ resume, onStart }: { resume?: StorySlot; onStart: (slot: StorySlotId) => void }) {
  const first = resume ?? STORY_SLOTS[0]
  return (
    <section className="sto-start" style={courseStyle('rose')}>
      <div className="sto-start__art" aria-hidden>
        <motion.span
          className="sto-start__card sto-start__card--a"
          initial={{ rotate: 0, x: 0 }}
          animate={{ rotate: -12, x: -30 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.15 }}
        />
        <motion.span
          className="sto-start__card sto-start__card--b"
          initial={{ rotate: 0, x: 0 }}
          animate={{ rotate: 12, x: 30 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.2 }}
        />
        <motion.span
          className="sto-start__card sto-start__card--c"
          initial={{ y: 10, scale: 0.9 }}
          animate={{ y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 16, delay: 0.1 }}
        >
          <PenLine size={34} strokeWidth={2.4} />
        </motion.span>
      </div>
      <h2>{resume ? 'Finish your first draft' : 'Write your first story'}</h2>
      <p className="sto-start__lead">
        Each story has four or five short layers, the parts interviewers dig into. Fill two and it becomes a draft you can rehearse.
      </p>
      <ol className="sto-start__steps">
        <li>
          <span>1</span>Draft the layers in your own words
        </li>
        <li>
          <span>2</span>Rehearse out loud against a timer
        </li>
        <li>
          <span>3</span>It comes back when it starts to fade
        </li>
      </ol>
      <Button size="lg" block onClick={() => onStart(first.id)}>
        {resume ? `Continue: ${first.title}` : `Start with ${first.title}`}
      </Button>
    </section>
  )
}

/* ---------------------------------------------------------------- card */

function StoryCard({ slot, entry, now }: { slot: StorySlot; entry: StoryEntry | undefined; now: number }) {
  const status = storyStatus(entry, now)
  const written = layersWritten(slot, entry)
  const n = slot.layers.length
  const Icon = SLOT_ICON[slot.id] ?? NotebookPen
  const last = entry?.rehearsal?.last ?? null
  let time: string | null = null
  if (status === 'due' || status === 'ready') time = last ? `Rehearsed ${ago(last, now)}` : 'Not rehearsed yet'
  else if (status === 'draft' && entry?.updatedAt) time = `Edited ${ago(entry.updatedAt, now)}`

  return (
    <motion.button
      type="button"
      className={`sto-card sto-card--${status}`}
      whileTap={{ y: 2 }}
      transition={{ type: 'spring', stiffness: 700, damping: 30 }}
      onClick={() => nav.openStory(slot.id)}
      aria-label={`${slot.title}. ${STATUS_LABEL[status]}. ${written} of ${n} layers written.`}
    >
      <span className="sto-card__icon" aria-hidden>
        <Icon size={22} strokeWidth={2.4} />
        {status === 'due' && <span className="sto-card__ping" />}
      </span>
      <span className="sto-card__main">
        <span className="sto-card__title">{slot.title}</span>
        <span className="sto-card__q">{slot.question}</span>
        <span className="sto-card__meta">
          <span className={`sto-status sto-status--${status}`}>
            {status === 'ready' && <Check size={13} strokeWidth={3.2} />}
            {status === 'due' && <Mic size={13} strokeWidth={2.8} />}
            {status === 'draft' && <PenLine size={13} strokeWidth={2.8} />}
            {STATUS_LABEL[status]}
          </span>
          <span className="sto-dots" aria-hidden>
            {slot.layers.map((_, k) => (
              <i key={k} className={layerDone(entry?.layers[k]) ? 'on' : (entry?.layers[k] ?? '').trim() ? 'half' : ''} />
            ))}
            <b className="tabular">
              {written}/{n}
            </b>
          </span>
          {time && <span className="sto-card__time">{time}</span>}
        </span>
      </span>
      <ChevronRight className="sto-card__chev" size={20} strokeWidth={2.6} aria-hidden />
    </motion.button>
  )
}
