import { motion, type Variants } from 'motion/react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Battery, BatteryCharging, Brain, CalendarDays, Check, ChevronRight, Clock, NotebookPen, Sparkles, Target, Trophy, Zap } from 'lucide-react'
import type { Course, Lesson, StorySlotId } from '../core/types'
import { liveStreak, qualifies, useStore, type GauntletState } from '../core/store'
import { areaMastery, buildCatalog, buildSession, courseProgress, dueCardIds, dueStories, recommendedLesson } from '../core/adaptive'
import { recallNow } from '../core/fsrs'
import { dayKey, daysBetween, weekOf } from '../core/dates'
import { CATALOG, COURSES } from '../content'
import { nav, useNav } from '../app/nav'
import { Button } from '../ui/Button'
import { ProgressBar } from '../ui/ProgressBar'
import { Ring } from '../ui/Ring'
import { Sheet } from '../ui/Sheet'
import { Ticker } from '../ui/Ticker'
import { CourseArt } from '../ui/CourseArt'
import { Logo } from '../ui/Logo'
import { courseStyle } from '../ui/course'
import { haptic, sfx } from '../ui/fx'
import './LearnScreen.css'

/* ---------------------------------------------------------------- helpers */

const hasSteps = (l: Lesson) => l.steps.length > 0

/** catalog of lessons that can actually be played (authored, with steps) */
function playableCatalog() {
  return buildCatalog(COURSES.map((c) => ({ ...c, lessons: c.lessons.filter(hasSteps) })))
}

/** re-render every minute and on refocus so due counts and the day roll over */
function useNow(ms = 60_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms)
    const vis = () => document.visibilityState === 'visible' && setNow(Date.now())
    document.addEventListener('visibilitychange', vis)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', vis)
    }
  }, [ms])
  return now
}

const fmt = new Intl.NumberFormat('en-US')
function compact(n: number): string {
  if (n >= 100_000) return `${Math.round(n / 1000)}k`
  if (n >= 10_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return fmt.format(n)
}

function greeting(t: number): string {
  const h = new Date(t).getHours()
  if (h < 5) return 'Up late'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const DOW_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const MAX_CHARGES = 2

/* ------------------------------------------------------------- animation */

const list: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.02 } },
}
const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 420, damping: 34 } },
}

/* ----------------------------------------------------------------- pieces */

/** the streak bolt: pear-filled when today is done, outlined otherwise */
function Bolt({ on, size = 18 }: { on: boolean; size?: number }) {
  return (
    <Zap
      size={size}
      strokeWidth={2.2}
      className={`learn-bolt ${on ? 'is-on' : ''}`}
      fill={on ? 'var(--streak)' : 'var(--bg)'}
      aria-hidden="true"
    />
  )
}

function Charges({ n, size = 18 }: { n: number; size?: number }) {
  return (
    <span className="learn-charges" aria-label={`${n} of ${MAX_CHARGES} streak charges`} title={`${n} of ${MAX_CHARGES} streak charges`}>
      {Array.from({ length: MAX_CHARGES }, (_, i) =>
        i < n ? (
          <BatteryCharging key={i} size={size} strokeWidth={2.2} className="learn-charge is-full" />
        ) : (
          <Battery key={i} size={size} strokeWidth={2.2} className="learn-charge" />
        ),
      )}
    </span>
  )
}

function WeekStrip({ s, today, big }: { s: GauntletState; today: string; big?: boolean }) {
  const days = weekOf(today)
  const charged = new Set(s.streak.frozenDays)
  return (
    <ol className={`learn-week ${big ? 'learn-week--big' : ''}`} aria-label="This week">
      {days.map((key, i) => {
        const met = qualifies(s.days[key])
        const isToday = key === today
        const future = key > today
        const saved = !met && charged.has(key)
        const state = met ? 'met' : saved ? 'saved' : future ? 'future' : 'empty'
        const label = `${DOW_LONG[i]}: ${met ? 'streak day' : saved ? 'saved by a streak charge' : future ? 'upcoming' : isToday ? 'not yet' : 'missed'}`
        return (
          <li key={key} className={`learn-day learn-day--${state} ${isToday ? 'is-today' : ''}`} aria-label={label}>
            <motion.span
              key={state}
              className="learn-day__dot"
              initial={met ? { scale: 0.3 } : false}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 520, damping: 18, delay: 0.12 + i * 0.045 }}
            >
              {met ? (
                <Zap size={big ? 20 : 16} strokeWidth={2.2} fill="currentColor" />
              ) : saved ? (
                <BatteryCharging size={big ? 20 : 16} strokeWidth={2.4} />
              ) : null}
            </motion.span>
            <span className="learn-day__dow">{DOW[i]}</span>
          </li>
        )
      })}
    </ol>
  )
}

/* ------------------------------------------------------------ stats sheet */

type SheetKind = 'streak' | 'goal' | null

function StreakSheetBody({ s, today, onClose }: { s: GauntletState; today: string; onClose: () => void }) {
  const live = liveStreak(s.streak, today)
  const status = live.doneToday
    ? `You're on a ${live.count}-day streak. Come back tomorrow to keep it going.`
    : live.count > 0
      ? 'Finish a lesson or 3 reviews today to keep it alive.'
      : 'Finish a lesson or 3 reviews to start a streak.'
  return (
    <div className="learn-sheet">
      <motion.div
        className={`learn-sheet__bolt ${live.doneToday ? 'is-on' : ''}`}
        initial={{ scale: 0.6, rotate: -12 }}
        animate={{ scale: [0.6, 1.2, 0.9, 1.05, 1], rotate: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        <Zap size={56} strokeWidth={1.8} fill="currentColor" />
      </motion.div>
      <div className="learn-sheet__big">
        <b className="tabular">
          <Ticker value={live.count} from={0} duration={0.7} />
        </b>
        <span>day streak</span>
      </div>
      <p className="learn-sheet__lead">{status}</p>
      <div className="learn-sheet__panel">
        <WeekStrip s={s} today={today} big />
      </div>
      <div className="learn-sheet__stats">
        <div className="learn-stat">
          <span className="learn-stat__icon learn-stat__icon--best">
            <Trophy size={18} strokeWidth={2.4} />
          </span>
          <div>
            <b className="tabular">{s.streak.best}</b>
            <span>Best streak</span>
          </div>
        </div>
        <div className="learn-stat">
          <span className="learn-stat__icon learn-stat__icon--charge">
            <BatteryCharging size={18} strokeWidth={2.4} />
          </span>
          <div>
            <b className="tabular">
              {s.streak.freezes} of {MAX_CHARGES}
            </b>
            <span>Streak charges</span>
          </div>
        </div>
      </div>
      <p className="learn-sheet__note">Every 7 days in a row earns a streak charge. A charge covers a missed day automatically.</p>
      <Button block onClick={onClose}>
        Got it
      </Button>
    </div>
  )
}

function GoalSheetBody({ s, today, onClose }: { s: GauntletState; today: string; onClose: () => void }) {
  const goal = Math.max(1, s.settings.dailyXpGoal)
  const xp = s.days[today]?.xp ?? 0
  const met = xp >= goal
  const week = weekOf(today)
  const vals = week.map((k) => s.days[k]?.xp ?? 0)
  const top = Math.max(goal * 1.25, ...vals)
  const weekXp = vals.reduce((a, b) => a + b, 0)
  return (
    <div className="learn-sheet">
      <Ring value={xp / goal} size={112} stroke={11} color={met ? 'var(--good)' : 'var(--xp)'} label={`${xp} of ${goal} XP today`}>
        <div className={`learn-sheet__ring ${met ? 'is-met' : ''}`}>
          {met ? <Check size={40} strokeWidth={3.4} /> : <Target size={34} strokeWidth={2.4} />}
        </div>
      </Ring>
      <div className="learn-sheet__big">
        <b className="tabular">
          <Ticker value={xp} from={0} duration={0.7} />
        </b>
        <span>/ {goal} XP today</span>
      </div>
      <p className="learn-sheet__lead">{met ? 'Daily goal hit. Anything more is a bonus.' : `${goal - xp} XP to go. One lesson or a short review gets you there.`}</p>
      <div className="learn-sheet__panel">
        <div className="learn-bars" role="img" aria-label={`XP this week: ${weekXp}`}>
          <span className="learn-bars__goal" style={{ bottom: `calc(22px + (100% - 22px) * ${goal / top})` }}>
            <span>Goal</span>
          </span>
          {week.map((k, i) => {
            const v = vals[i]
            return (
              <div key={k} className={`learn-bars__col ${k === today ? 'is-today' : ''}`}>
                <div className="learn-bars__track">
                  <motion.div
                    className={`learn-bars__bar ${v >= goal ? 'is-met' : ''}`}
                    initial={{ height: 0 }}
                    animate={{ height: `${(v / top) * 100}%` }}
                    transition={{ type: 'spring', stiffness: 200, damping: 24, delay: 0.1 + i * 0.04 }}
                  />
                </div>
                <span className="learn-bars__dow">{DOW[i]}</span>
              </div>
            )
          })}
        </div>
      </div>
      <div className="learn-sheet__stats">
        <div className="learn-stat">
          <span className="learn-stat__icon learn-stat__icon--xp">
            <Sparkles size={18} strokeWidth={2.4} />
          </span>
          <div>
            <b className="tabular">{fmt.format(weekXp)}</b>
            <span>XP this week</span>
          </div>
        </div>
        <div className="learn-stat">
          <span className="learn-stat__icon learn-stat__icon--xp">
            <Sparkles size={18} strokeWidth={2.4} />
          </span>
          <div>
            <b className="tabular">{fmt.format(s.xp)}</b>
            <span>Total XP</span>
          </div>
        </div>
      </div>
      <div className="learn-sheet__actions">
        <Button
          variant="secondary"
          size="md"
          block
          onClick={() => {
            onClose()
            nav.openSettings()
          }}
        >
          Change goal
        </Button>
        <Button size="md" block onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ cards */

function StreakCard({ s, today, onOpen }: { s: GauntletState; today: string; onOpen: () => void }) {
  const live = liveStreak(s.streak, today)
  const status = live.doneToday ? 'Extended today' : live.count > 0 ? 'Do a lesson to keep it' : 'One lesson starts it'
  return (
    <motion.button
      variants={item}
      type="button"
      className="learn-streak"
      whileTap={{ y: 2 }}
      onClick={onOpen}
      aria-label={`${live.count}-day streak. ${status}. Show streak details`}
    >
      <span className="learn-streak__head">
        <Bolt on={live.doneToday} size={30} />
        <b className="learn-streak__num tabular">{live.count}</b>
        <span className="learn-streak__text">
          <b>day streak</b>
          <span className={live.count > 0 && !live.doneToday ? 'is-risk' : ''}>{status}</span>
        </span>
        <Charges n={s.streak.freezes} />
      </span>
      <WeekStrip s={s} today={today} />
    </motion.button>
  )
}

function HeroCard({ s, lessonId }: { s: GauntletState; lessonId: string }) {
  const lesson = CATALOG.lessons[lessonId]
  const course = COURSES.find((c) => c.id === lesson.courseId) as Course
  const prog = s.lessons[lessonId]
  const resume = !!prog && !prog.completedAt && prog.resumeStep > 0
  const n = course.lessons.length
  const k = lesson.index + 1
  const steps = lesson.steps.length
  const pct = resume ? Math.min(1, prog.resumeStep / Math.max(1, steps)) : 0
  return (
    <motion.section variants={item} className={`learn-hero learn-hero--${course.color}`} style={courseStyle(course.color)} aria-label="Continue learning">
      <div className="learn-hero__panel">
        <span className="learn-hero__tag">{resume ? 'Jump back in' : 'Up next'}</span>
        <div className="learn-hero__art">
          <CourseArt course={course} size={164} animated />
        </div>
        <div className="learn-hero__pips" aria-hidden="true">
          {course.lessons.map((l, i) => (
            <span key={l.id} className={`learn-hero__pip ${s.lessons[l.id]?.completedAt ? 'is-done' : ''} ${i === lesson.index ? 'is-now' : ''}`} />
          ))}
        </div>
      </div>
      <div className="learn-hero__body">
        <div className="learn-hero__eyebrow">
          {course.title} · Lesson {k} of {n}
        </div>
        <h2 className="learn-hero__title">{lesson.title}</h2>
        <div className="learn-hero__meta">
          <Clock size={14} strokeWidth={2.4} aria-hidden="true" />
          <span className="tabular">{lesson.minutes} min</span>
          {steps > 0 && (
            <>
              <span className="learn-hero__dot" aria-hidden="true" />
              <span className="tabular">{steps} steps</span>
            </>
          )}
        </div>
        {resume && (
          <div className="learn-hero__resume">
            <ProgressBar value={pct} tone="course" height={8} label="Lesson progress" />
            <span className="tabular">{Math.round(pct * 100)}%</span>
          </div>
        )}
        <Button variant="course" className="learn-hero__btn" block onClick={() => nav.openLesson(lessonId)}>
          {resume ? 'Resume lesson' : 'Start lesson'}
        </Button>
      </div>
    </motion.section>
  )
}

function EndCard({ kind, started }: { kind: 'complete' | 'waiting'; started: boolean }) {
  const setTab = useNav((n) => n.setTab)
  return (
    <motion.section variants={item} className={`learn-end learn-end--${kind}`}>
      <div className="learn-end__top">
        <div className="learn-end__badge">{kind === 'complete' ? <Trophy size={28} strokeWidth={2.2} /> : <Sparkles size={26} strokeWidth={2.2} />}</div>
        <div className="learn-end__titles">
          <div className="learn-end__eyebrow">{kind === 'complete' ? 'Path complete' : 'All caught up'}</div>
          <h2>{kind === 'complete' ? 'Every lesson done' : 'New lessons are on the way'}</h2>
        </div>
      </div>
      <div className="learn-end__text">
        <p>
          {kind === 'complete'
            ? 'Keep it fresh: short daily reviews hold it in memory until the interview.'
            : started
              ? "You've finished everything that's ready. Practice and your Story Bank are open in the meantime."
              : 'The first lessons are being written. Your Story Bank is open in the meantime.'}
        </p>
      </div>
      <Button variant="secondary" size="md" block onClick={() => setTab(kind === 'complete' ? 'practice' : 'stories')}>
        {kind === 'complete' ? 'Go to Practice' : 'Open Story Bank'}
      </Button>
    </motion.section>
  )
}

function ReviewCard({ s, now }: { s: GauntletState; now: number }) {
  // count only cards the catalog still knows, so Start always has something to show
  const plan = buildSession(s, CATALOG, now)
  if (!plan.cardIds.length) return null
  const due = dueCardIds(s, now).filter((id) => CATALOG.cards[id])
  const reviewed = Object.values(s.cards).filter((c) => c.last != null)
  const strength = reviewed.length ? reviewed.reduce((a, c) => a + recallNow(c, now), 0) / reviewed.length : null
  const allNew = due.every((id) => s.cards[id]?.last == null)
  const n = plan.due
  const mins = Math.max(1, Math.round(plan.cardIds.length * 0.4))
  const title = allNew ? `${n} new card${n === 1 ? '' : 's'} to lock in` : `${n} card${n === 1 ? ' is' : 's are'} fading`
  return (
    <motion.section variants={item} className="learn-card learn-review" aria-label="Daily review">
      <div className="learn-review__row">
        <div className="learn-review__icon">
          <Brain size={26} strokeWidth={2.2} />
        </div>
        <div className="learn-review__body">
          <div className="learn-label">Daily review</div>
          <h3 className="learn-review__title">{title}</h3>
          <div className="learn-review__meta">
            {strength != null ? (
              <span>
                Memory strength <b className="tabular">{Math.round(strength * 100)}%</b>
              </span>
            ) : (
              <span>First pass locks them in</span>
            )}
            <span className="learn-review__dot" aria-hidden="true" />
            <span className="tabular">≈ {mins} min</span>
          </div>
        </div>
      </div>
      {strength != null && <ProgressBar value={strength} tone="good" height={8} label="Memory strength" />}
      <Button
        variant="primary"
        size="md"
        block
        onClick={() => {
          const plan = buildSession(useStore.getState(), CATALOG, Date.now())
          if (plan.cardIds.length) nav.openReview(plan.cardIds, 'Daily review')
        }}
      >
        Start review
      </Button>
    </motion.section>
  )
}

function StoryNudge({ slots }: { slots: StorySlotId[] }) {
  if (!slots.length) return null
  const n = slots.length
  return (
    <motion.button
      variants={item}
      type="button"
      className="learn-card learn-nudge"
      style={courseStyle('rose')}
      whileTap={{ y: 2 }}
      onClick={() => {
        sfx('tap')
        haptic('light')
        nav.openDrill(slots)
      }}
    >
      <span className="learn-nudge__icon">
        <NotebookPen size={22} strokeWidth={2.2} />
      </span>
      <span className="learn-nudge__body">
        <span className="learn-nudge__title">
          {n} {n === 1 ? 'story is' : 'stories are'} ready to rehearse
        </span>
        <span className="learn-nudge__sub">Say {n === 1 ? 'it' : 'them'} out loud before {n === 1 ? 'it goes' : 'they go'} stale</span>
      </span>
      <ChevronRight size={22} strokeWidth={2.4} className="learn-nudge__chev" />
    </motion.button>
  )
}

function CourseCard({ course, s, mastery }: { course: Course; s: GauntletState; mastery: { mastery: number; coverage: number } | undefined }) {
  const { done, total } = courseProgress(s, course)
  const ready = course.lessons.filter(hasSteps).length
  const complete = total > 0 && done === total
  let chip: ReactNode = null
  if (complete) {
    chip = (
      <span className="chip chip--good learn-course__chip">
        <Check size={13} strokeWidth={3} /> Done
      </span>
    )
  } else if (ready === 0) {
    chip = <span className="chip learn-course__chip">Coming soon</span>
  } else if (mastery && mastery.coverage > 0) {
    chip = (
      <span className="chip chip--course learn-course__chip tabular" title="Mastery">
        <Brain size={13} strokeWidth={2.6} /> {Math.round(mastery.mastery * 100)}%
      </span>
    )
  }
  return (
    <motion.button
      variants={item}
      type="button"
      className="learn-course"
      style={courseStyle(course.color)}
      whileTap={{ y: 2 }}
      onClick={() => {
        sfx('tap')
        haptic('light')
        nav.openCourse(course.id)
      }}
      aria-label={`${course.title}: ${done} of ${total} lessons done`}
    >
      <span className="learn-course__art">
        <CourseArt course={course} size={64} />
      </span>
      <span className="learn-course__body">
        <span className="learn-course__top">
          <span className="learn-course__title">{course.title}</span>
          {chip}
        </span>
        <span className="learn-course__sub">{course.subtitle}</span>
        <span className="learn-course__prog">
          <span className="learn-course__bar">
            <ProgressBar value={total ? done / total : 0} tone="course" height={8} />
          </span>
          <span className="learn-course__count tabular">
            {done}/{total}
          </span>
        </span>
      </span>
    </motion.button>
  )
}

/* ----------------------------------------------------------------- screen */

export default function LearnScreen() {
  const s = useStore()
  const now = useNow()
  const today = dayKey(now)
  const [sheet, setSheet] = useState<SheetKind>(null)
  const [scrolled, setScrolled] = useState(false)

  const playable = useMemo(playableCatalog, [])
  const recId = useMemo(() => recommendedLesson(s, playable, now), [s, playable, now])
  const mastery = useMemo(() => areaMastery(s, CATALOG, now), [s, now])
  const storySlots = useMemo(() => dueStories(s, now) as StorySlotId[], [s, now])

  const live = liveStreak(s.streak, today)
  const goal = Math.max(1, s.settings.dailyXpGoal)
  const xpToday = s.days[today]?.xp ?? 0
  const goalMet = xpToday >= goal

  const readyLessons = Object.values(playable.lessons)
  const unauthored = Object.values(CATALOG.lessons).some((l) => !hasSteps(l))
  const endKind: 'complete' | 'waiting' =
    !unauthored && readyLessons.length > 0 && readyLessons.every((l) => s.lessons[l.id]?.completedAt) ? 'complete' : 'waiting'

  const started = COURSES.filter((c) => courseProgress(s, c).done > 0).length

  let countdown: ReactNode = null
  if (s.profile.interviewDate) {
    const d = daysBetween(today, s.profile.interviewDate)
    if (Number.isFinite(d) && d >= 0) {
      countdown = (
        <span className={`learn-countdown ${d <= 3 ? 'is-soon' : ''}`}>
          <CalendarDays size={15} strokeWidth={2.4} aria-hidden="true" />
          {d === 0 ? "Interview today — you've got this" : d === 1 ? 'Interview tomorrow' : `Interview in ${d} days`}
        </span>
      )
    }
  }

  const streakLabel = live.doneToday
    ? `${live.count}-day streak, done today`
    : live.count > 0
      ? `${live.count}-day streak, at risk: not done today`
      : 'No streak yet'

  const open = (k: SheetKind) => {
    sfx('tap')
    haptic('light')
    setSheet(k)
  }

  return (
    <div className="learn">
      <header className={`learn-head safe-top ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="learn-head__row">
          <Logo size={28} className="learn-head__logo" />
          <div className="learn-head__stats">
            <motion.button
              type="button"
              className={`learn-pill learn-pill--streak ${live.doneToday ? 'is-done' : live.count > 0 ? 'is-risk' : 'is-zero'}`}
              whileTap={{ scale: 0.92 }}
              onClick={() => open('streak')}
              aria-label={streakLabel}
            >
              <motion.span
                key={String(live.doneToday)}
                className="learn-pill__icon"
                initial={live.doneToday ? { scale: 0.6 } : false}
                animate={{ scale: live.doneToday ? [0.6, 1.25, 0.9, 1.05, 1] : 1 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              >
                <Bolt on={live.doneToday} size={18} />
              </motion.span>
              <Ticker value={live.count} duration={0.5} />
            </motion.button>
            <motion.button
              type="button"
              className="learn-pill learn-pill--xp"
              whileTap={{ scale: 0.92 }}
              onClick={() => open('goal')}
              aria-label={`${fmt.format(s.xp)} XP total`}
            >
              <Sparkles size={17} strokeWidth={2.4} />
              <Ticker value={s.xp} duration={0.9} format={(v) => compact(Math.round(v))} />
            </motion.button>
            <motion.button
              type="button"
              className={`learn-goal ${goalMet ? 'is-met' : ''}`}
              whileTap={{ scale: 0.9 }}
              onClick={() => open('goal')}
              aria-label={`Daily goal: ${xpToday} of ${goal} XP${goalMet ? ', met' : ''}`}
            >
              <Ring value={xpToday / goal} size={38} stroke={4.5} color={goalMet ? 'var(--good)' : 'var(--xp)'}>
                {goalMet ? (
                  <motion.span className="learn-goal__check" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 520, damping: 16 }}>
                    <Check size={15} strokeWidth={3.4} />
                  </motion.span>
                ) : (
                  <Target size={16} strokeWidth={2.4} className="learn-goal__icon" />
                )}
              </Ring>
            </motion.button>
          </div>
        </div>
      </header>

      <div className="scroll learn-scroll" onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 4)}>
        <motion.div className="learn-body" variants={list} initial="hidden" animate="show">
          <motion.div variants={item} className="learn-hello">
            <h1>
              {greeting(now)}
              {s.profile.name.trim() ? `, ${s.profile.name.trim().split(/\s+/)[0]}` : ''}
            </h1>
            {countdown}
          </motion.div>

          <StreakCard s={s} today={today} onOpen={() => open('streak')} />

          {recId && CATALOG.lessons[recId] ? <HeroCard s={s} lessonId={recId} /> : <EndCard kind={endKind} started={Object.values(s.lessons).some((l) => l.completedAt)} />}

          <ReviewCard s={s} now={now} />
          <StoryNudge slots={storySlots} />

          <motion.div variants={item} className="learn-section">
            <h2>Courses</h2>
            <span className="learn-section__aside tabular">{started ? `${started} of ${COURSES.length} started` : `${COURSES.length} courses`}</span>
          </motion.div>
          <div className="learn-courses">
            <span className="learn-courses__line" aria-hidden="true" />
            {COURSES.map((c) => (
              <CourseCard key={c.id} course={c} s={s} mastery={mastery[c.id]} />
            ))}
          </div>
        </motion.div>
      </div>

      <Sheet open={sheet !== null} onClose={() => setSheet(null)} label={sheet === 'streak' ? 'Streak' : 'Daily goal'}>
        {sheet === 'streak' && <StreakSheetBody s={s} today={today} onClose={() => setSheet(null)} />}
        {sheet === 'goal' && <GoalSheetBody s={s} today={today} onClose={() => setSheet(null)} />}
      </Sheet>
    </div>
  )
}
