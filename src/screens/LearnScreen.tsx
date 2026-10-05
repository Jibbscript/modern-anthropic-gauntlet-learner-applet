import { motion, type Variants } from 'motion/react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Brain, CalendarDays, Check, ChevronRight, Clock, Flame, NotebookPen, Snowflake, Sparkles, Target, Trophy, Zap } from 'lucide-react'
import type { Course, Lesson, StorySlotId } from '../core/types'
import { liveStreak, useStore, type GauntletState } from '../core/store'
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

/** mirrors the store's streak rule: a lesson (or lab level), or 5 reviews */
function dayMet(s: GauntletState, key: string): boolean {
  const d = s.days[key]
  return !!d && (d.lessons > 0 || d.reviews >= 5)
}

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const DOW_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/* ------------------------------------------------------------- animation */

const list: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.02 } },
}
const item: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.985 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 420, damping: 32 } },
}

/* ------------------------------------------------------------- week strip */

function WeekStrip({ s, today, big }: { s: GauntletState; today: string; big?: boolean }) {
  const days = weekOf(today)
  const frozen = new Set(s.streak.frozenDays)
  return (
    <ol className={`learn-week ${big ? 'learn-week--big' : ''}`} aria-label="This week">
      {days.map((key, i) => {
        const met = dayMet(s, key)
        const isToday = key === today
        const future = key > today
        const ice = !met && frozen.has(key)
        const state = met ? 'met' : ice ? 'frozen' : future ? 'future' : isToday ? 'today' : 'missed'
        const label = `${DOW_LONG[i]}: ${met ? 'streak day' : ice ? 'covered by a freeze' : future ? 'upcoming' : isToday ? 'not yet' : 'missed'}`
        return (
          <li key={key} className={`learn-day learn-day--${state} ${isToday ? 'is-today' : ''}`} aria-label={label}>
            <span className="learn-day__dow">{DOW[i]}</span>
            <motion.span
              className="learn-day__dot"
              initial={met ? { scale: 0.4, opacity: 0 } : false}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 520, damping: 22, delay: 0.15 + i * 0.04 }}
            >
              {met ? (
                <Flame size={big ? 20 : 17} strokeWidth={2.6} fill="currentColor" />
              ) : ice ? (
                <Snowflake size={big ? 19 : 16} strokeWidth={2.6} />
              ) : null}
            </motion.span>
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
    ? 'Done for today. Come back tomorrow to keep it going.'
    : live.count > 0
      ? 'Finish a lesson or 5 reviews today to keep it alive.'
      : 'Finish a lesson or 5 reviews to start a streak.'
  return (
    <div className="learn-sheet">
      <div className={`learn-sheet__badge learn-sheet__badge--streak ${live.doneToday ? '' : 'is-off'}`}>
        <Flame size={44} strokeWidth={2.4} fill="currentColor" />
      </div>
      <div className="learn-sheet__big tabular">
        <Ticker value={live.count} from={0} duration={0.7} />
        <span>day streak</span>
      </div>
      <p className="learn-sheet__lead">{status}</p>
      <div className="learn-sheet__panel">
        <WeekStrip s={s} today={today} big />
      </div>
      <div className="learn-sheet__stats">
        <div className="learn-stat">
          <Trophy size={18} strokeWidth={2.6} className="learn-stat__icon learn-stat__icon--streak" />
          <div>
            <b className="tabular">{s.streak.best}</b>
            <span>Best streak</span>
          </div>
        </div>
        <div className="learn-stat">
          <Snowflake size={18} strokeWidth={2.6} className="learn-stat__icon learn-stat__icon--freeze" />
          <div>
            <b className="tabular">{s.streak.freezes} / 2</b>
            <span>Freezes banked</span>
          </div>
        </div>
      </div>
      <p className="learn-sheet__note">Every 7 days in a row earns a freeze. A freeze covers one missed day automatically.</p>
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
      <Ring value={xp / goal} size={116} stroke={12} color={met ? 'var(--good)' : 'var(--xp)'} label={`${xp} of ${goal} XP today`}>
        <div className="learn-sheet__ring">
          {met ? <Check size={40} strokeWidth={3.4} className="learn-sheet__ring-check" /> : <Target size={34} strokeWidth={2.6} />}
        </div>
      </Ring>
      <div className="learn-sheet__big tabular">
        <Ticker value={xp} from={0} duration={0.7} />
        <span>/ {goal} XP today</span>
      </div>
      <p className="learn-sheet__lead">{met ? 'Daily goal hit. Anything more is a bonus.' : `${goal - xp} XP to go. A lesson or a short review gets you there.`}</p>
      <div className="learn-sheet__panel">
        <div className="learn-bars" role="img" aria-label={`XP this week: ${weekXp}`}>
          <span className="learn-bars__goal" style={{ bottom: `${(goal / top) * 100}%` }} />
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
          <Zap size={18} strokeWidth={2.6} className="learn-stat__icon learn-stat__icon--xp" fill="currentColor" />
          <div>
            <b className="tabular">{fmt.format(weekXp)}</b>
            <span>XP this week</span>
          </div>
        </div>
        <div className="learn-stat">
          <Sparkles size={18} strokeWidth={2.6} className="learn-stat__icon learn-stat__icon--xp" />
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

function HeroCard({ s, lessonId }: { s: GauntletState; lessonId: string }) {
  const lesson = CATALOG.lessons[lessonId]
  const course = COURSES.find((c) => c.id === lesson.courseId) as Course
  const prog = s.lessons[lessonId]
  const resume = !!prog && !prog.completedAt && prog.resumeStep > 0
  const n = course.lessons.length
  const k = lesson.index + 1
  return (
    <motion.section variants={item} className="learn-hero" style={courseStyle(course.color)} aria-label="Continue learning">
      <span className="learn-hero__glow" aria-hidden="true" />
      <div className="learn-hero__art">
        <CourseArt course={course} size={136} animated />
      </div>
      <div className="learn-hero__text">
        <div className="learn-hero__eyebrow">{resume ? 'Jump back in' : 'Up next'} · {course.title}</div>
        <h2 className="learn-hero__title">{lesson.title}</h2>
        <div className="learn-hero__meta">
          <span className="tabular">
            Lesson {k} of {n}
          </span>
          <span className="learn-hero__sep" aria-hidden="true" />
          <Clock size={14} strokeWidth={2.8} />
          <span className="tabular">{lesson.minutes} min</span>
        </div>
      </div>
      <div className="learn-hero__track" aria-hidden="true">
        {course.lessons.map((l, i) => (
          <span
            key={l.id}
            className={`learn-hero__seg ${s.lessons[l.id]?.completedAt ? 'is-done' : ''} ${i === lesson.index ? 'is-now' : ''}`}
          />
        ))}
      </div>
      {resume && (
        <div className="learn-hero__resume" aria-hidden="true">
          <span style={{ width: `${Math.min(100, (prog.resumeStep / Math.max(1, lesson.steps.length)) * 100)}%` }} />
        </div>
      )}
      <Button className="learn-hero__btn" block onClick={() => nav.openLesson(lessonId)}>
        {resume ? 'Resume' : 'Start'}
      </Button>
    </motion.section>
  )
}

function EndCard({ kind }: { kind: 'complete' | 'waiting' }) {
  const setTab = useNav((n) => n.setTab)
  return (
    <motion.section variants={item} className={`learn-end learn-end--${kind}`}>
      <div className="learn-end__badge">{kind === 'complete' ? <Trophy size={34} strokeWidth={2.4} /> : <Sparkles size={32} strokeWidth={2.4} />}</div>
      <div className="learn-end__text">
        <div className="eyebrow">{kind === 'complete' ? 'Path complete' : 'Nothing to start yet'}</div>
        <h2>{kind === 'complete' ? 'Every lesson done' : 'New lessons are on the way'}</h2>
        <p>
          {kind === 'complete'
            ? 'Keep it fresh: short daily reviews hold it in memory until the interview.'
            : 'You have finished everything that is ready. Practice and your Story Bank are open in the meantime.'}
        </p>
      </div>
      <Button variant="secondary" size="md" block onClick={() => setTab(kind === 'complete' ? 'practice' : 'stories')}>
        {kind === 'complete' ? 'Go to Practice' : 'Open Story Bank'}
      </Button>
    </motion.section>
  )
}

function ReviewCard({ s, now }: { s: GauntletState; now: number }) {
  const due = dueCardIds(s, now)
  if (!due.length) return null
  const reviewed = Object.values(s.cards).filter((c) => c.last != null)
  const strength = reviewed.length ? reviewed.reduce((a, c) => a + recallNow(c, now), 0) / reviewed.length : null
  const allNew = due.every((id) => s.cards[id]?.last == null)
  const n = due.length
  const sessionN = Math.min(n, s.settings.sessionSize)
  const mins = Math.max(1, Math.round(sessionN * 0.4))
  const title = allNew ? `${n} new card${n === 1 ? '' : 's'} to lock in` : `${n} card${n === 1 ? ' is' : 's are'} fading`
  return (
    <motion.section variants={item} className="learn-review" aria-label="Daily review">
      <div className="learn-review__row">
        <div className="learn-review__icon">
          <Brain size={26} strokeWidth={2.4} />
          <span className="learn-review__count tabular">{n > 99 ? '99+' : n}</span>
        </div>
        <div className="learn-review__body">
          <div className="eyebrow">Daily review</div>
          <h3 className="learn-review__title">{title}</h3>
          <div className="learn-review__meta">
            {strength != null && (
              <span>
                Memory <b className="tabular">{Math.round(strength * 100)}%</b>
              </span>
            )}
            <span className="tabular">≈ {mins} min</span>
          </div>
        </div>
      </div>
      {strength != null && <ProgressBar value={strength} tone="xp" height={10} label="Memory strength" />}
      <Button
        variant="primary"
        size="md"
        block
        onClick={() => {
          const t = Date.now()
          const plan = buildSession(useStore.getState(), CATALOG, t)
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
      className="learn-nudge"
      whileTap={{ y: 2 }}
      onClick={() => {
        sfx('tap')
        haptic('light')
        nav.openDrill(slots)
      }}
    >
      <span className="learn-nudge__icon">
        <NotebookPen size={22} strokeWidth={2.4} />
      </span>
      <span className="learn-nudge__body">
        <span className="learn-nudge__title">
          {n} {n === 1 ? 'story is' : 'stories are'} ready to rehearse
        </span>
        <span className="learn-nudge__sub">Say {n === 1 ? 'it' : 'them'} out loud before {n === 1 ? 'it goes' : 'they go'} stale</span>
      </span>
      <ChevronRight size={22} strokeWidth={2.6} className="learn-nudge__chev" />
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
        <Check size={13} strokeWidth={3.2} /> Done
      </span>
    )
  } else if (ready === 0) {
    chip = <span className="chip learn-course__chip">Coming soon</span>
  } else if (mastery && mastery.coverage > 0) {
    chip = (
      <span className="chip chip--course learn-course__chip tabular" title="Mastery">
        <Brain size={13} strokeWidth={2.8} /> {Math.round(mastery.mastery * 100)}%
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
        <CourseArt course={course} size={66} />
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
      <ChevronRight size={20} strokeWidth={2.6} className="learn-course__chev" />
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

  const totalReady = Object.values(playable.lessons).length
  const allReadyDone = Object.values(playable.lessons).every((l) => s.lessons[l.id]?.completedAt)
  const unauthored = Object.values(CATALOG.lessons).some((l) => !hasSteps(l))
  const endKind: 'complete' | 'waiting' = !unauthored && totalReady > 0 && allReadyDone ? 'complete' : 'waiting'

  const started = COURSES.filter((c) => courseProgress(s, c).done > 0).length

  let countdown: ReactNode = null
  if (s.profile.interviewDate) {
    const d = daysBetween(today, s.profile.interviewDate)
    if (Number.isFinite(d) && d >= 0) {
      countdown = (
        <span className={`learn-countdown ${d <= 3 ? 'is-soon' : ''}`}>
          <CalendarDays size={15} strokeWidth={2.6} />
          {d === 0 ? "Interview today — you've got this" : d === 1 ? 'Interview tomorrow' : `Interview in ${d} days`}
        </span>
      )
    }
  }

  const streakState = live.doneToday ? 'done' : live.count > 0 ? 'risk' : 'zero'
  const streakLabel =
    streakState === 'done'
      ? `${live.count}-day streak, done today`
      : streakState === 'risk'
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
              className={`learn-pill learn-pill--streak is-${streakState}`}
              whileTap={{ scale: 0.92 }}
              onClick={() => open('streak')}
              aria-label={streakLabel}
            >
              <Flame size={18} strokeWidth={2.6} fill={streakState === 'done' ? 'currentColor' : 'none'} />
              <span className="tabular">{live.count}</span>
            </motion.button>
            <motion.button
              type="button"
              className="learn-pill learn-pill--xp"
              whileTap={{ scale: 0.92 }}
              onClick={() => open('goal')}
              aria-label={`${fmt.format(s.xp)} XP total`}
            >
              <Zap size={17} strokeWidth={2.6} fill="currentColor" />
              <span className="tabular">{compact(s.xp)}</span>
            </motion.button>
            <motion.button
              type="button"
              className={`learn-goal ${goalMet ? 'is-met' : ''}`}
              whileTap={{ scale: 0.9 }}
              onClick={() => open('goal')}
              aria-label={`Daily goal: ${xpToday} of ${goal} XP${goalMet ? ', met' : ''}`}
            >
              <Ring value={xpToday / goal} size={38} stroke={5} color={goalMet ? 'var(--good)' : 'var(--xp)'}>
                {goalMet ? (
                  <span className="learn-goal__check">
                    <Check size={15} strokeWidth={3.6} />
                  </span>
                ) : (
                  <Target size={16} strokeWidth={2.6} className="learn-goal__icon" />
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
              {s.profile.name ? `, ${s.profile.name.split(' ')[0]}` : ''}
            </h1>
            {countdown}
          </motion.div>

          <motion.button
            variants={item}
            type="button"
            className="learn-streak"
            whileTap={{ y: 2 }}
            onClick={() => open('streak')}
            aria-label={`${streakLabel}. Show streak details`}
          >
            <span className="learn-streak__head">
              <span className={`learn-streak__flame is-${streakState}`}>
                <Flame size={20} strokeWidth={2.6} fill={streakState === 'done' ? 'currentColor' : 'none'} />
              </span>
              <span className="learn-streak__text">
                <b className="tabular">{live.count === 0 ? 'Start a streak' : `${live.count} day streak`}</b>
                <span>
                  {streakState === 'done'
                    ? 'Extended today. Nice work.'
                    : streakState === 'risk'
                      ? 'Do a lesson today to keep it'
                      : 'One lesson today starts it'}
                </span>
              </span>
              {s.streak.freezes > 0 && (
                <span className="learn-streak__freeze tabular" title="Streak freezes banked">
                  <Snowflake size={14} strokeWidth={2.8} />
                  {s.streak.freezes}
                </span>
              )}
            </span>
            <WeekStrip s={s} today={today} />
          </motion.button>

          {recId && CATALOG.lessons[recId] ? <HeroCard s={s} lessonId={recId} /> : <EndCard kind={endKind} />}

          <ReviewCard s={s} now={now} />
          <StoryNudge slots={storySlots} />

          <motion.div variants={item} className="learn-section">
            <h2>Courses</h2>
            <span className="learn-section__aside tabular">
              {started ? `${started} of ${COURSES.length} started` : `${COURSES.length} courses`}
            </span>
          </motion.div>
          <div className="learn-courses">
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
