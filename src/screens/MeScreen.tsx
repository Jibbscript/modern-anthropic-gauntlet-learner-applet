import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { BatteryCharging, BookOpen, Brain, CalendarDays, ChevronDown, ChevronRight, Settings, Sparkles, Target, Trophy, User, Zap, type LucideIcon } from 'lucide-react'
import { useStore, liveStreak, type Profile } from '../core/store'
import type { Course } from '../core/types'
import { CATALOG } from '../content'
import { SKILLS } from '../content/skills'
import { areaMastery, skillMastery, type Mastery } from '../core/adaptive'
import { ACHIEVEMENTS } from '../core/achievements'
import { addDays, dayKey, daysBetween, parseDayKey, weekOf } from '../core/dates'
import { nav } from '../app/nav'
import { IconButton } from '../ui/Button'
import { ProgressBar } from '../ui/ProgressBar'
import { Ticker } from '../ui/Ticker'
import { CourseArt } from '../ui/CourseArt'
import { courseStyle } from '../ui/course'
import { Medal } from './AchievementsScreen'
import './MeScreen.css'

const WEEKS = 12
const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const ROLE_LABEL: Record<Profile['role'], string> = {
  swe: 'Software engineer',
  'research-eng': 'Research engineer',
  infra: 'Infrastructure engineer',
  other: 'Engineer',
}

function useNow(ms = 60_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

const rise = (i: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { type: 'spring' as const, stiffness: 420, damping: 34, delay: 0.03 + i * 0.045 },
})

const fmtInt = (n: number) => Math.round(n).toLocaleString('en-US')

export default function MeScreen() {
  const s = useStore()
  const now = useNow()
  const today = dayKey(now)
  const live = liveStreak(s.streak, today)

  const stats = useMemo(() => {
    const days = Object.values(s.days)
    const answered = days.reduce((a, d) => a + d.answered, 0)
    const correct = days.reduce((a, d) => a + d.correct, 0)
    return {
      lessons: Object.values(s.lessons).filter((l) => l.completedAt).length,
      totalLessons: Object.keys(CATALOG.lessons).length,
      reviews: days.reduce((a, d) => a + d.reviews, 0),
      accuracy: answered ? correct / answered : null,
    }
  }, [s.days, s.lessons])

  const mastery = useMemo(() => ({ skill: skillMastery(s, CATALOG, now), area: areaMastery(s, CATALOG, now) }), [s, now])

  const medals = useMemo(() => {
    const on = ACHIEVEMENTS.filter((a) => s.achievements[a.id]).sort((x, y) => s.achievements[y.id] - s.achievements[x.id])
    const off = ACHIEVEMENTS.filter((a) => !s.achievements[a.id])
    return { list: [...on, ...off].slice(0, 6), count: on.length }
  }, [s.achievements])

  let i = 0
  return (
    <div className="me">
      <div className="me-scroll scroll">
        <header className="me-head safe-top" style={courseStyle(avatarHue(s.profile.name))}>
          <div className="me-head__bar">
            <span className="me-head__label">Profile</span>
            <IconButton label="Settings" className="me-head__gear" onClick={nav.openSettings}>
              <Settings size={24} strokeWidth={2.4} />
            </IconButton>
          </div>
          <motion.div className="me-id" {...rise(i++)}>
            <Avatar name={s.profile.name} />
            <div className="me-id__text">
              <h1>{s.profile.name.trim() || 'You'}</h1>
              <div className="me-id__role">
                {ROLE_LABEL[s.profile.role] ?? 'Engineer'}
                {s.profile.createdAt ? <> · joined {new Date(s.profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</> : null}
              </div>
              <InterviewChip date={s.profile.interviewDate} today={today} />
            </div>
          </motion.div>
        </header>

        <div className="me-body">
          <motion.div className="me-stats" {...rise(i++)}>
            <Stat
              tone="streak"
              icon={Zap}
              filled
              value={live.count}
              label="Day streak"
              note={live.doneToday ? 'Done today' : live.atRisk ? 'Practice today to keep it' : live.count === 0 ? 'Start one today' : undefined}
              noteTone={live.atRisk ? 'warn' : live.doneToday ? 'good' : undefined}
            />
            <Stat
              tone="amber"
              icon={Trophy}
              value={s.streak.best}
              label="Best streak"
              note={s.streak.freezes ? `${s.streak.freezes} streak charge${s.streak.freezes > 1 ? 's' : ''}` : undefined}
            />
            <Stat tone="xp" icon={Sparkles} value={s.xp} label="Total XP" />
            <Stat tone="blue" icon={BookOpen} value={stats.lessons} label="Lessons done" note={stats.totalLessons ? `of ${stats.totalLessons}` : undefined} />
            <Stat tone="violet" icon={Brain} value={stats.reviews} label="Reviews done" />
            <Stat tone="teal" icon={Target} value={stats.accuracy == null ? null : Math.round(stats.accuracy * 100)} suffix="%" label="First-try accuracy" />
          </motion.div>

          <motion.section className="me-sec" {...rise(i++)}>
            <Heatmap now={now} />
          </motion.section>

          <motion.section className="me-sec" {...rise(i++)}>
            <SectionHead
              title="Achievements"
              aside={
                <button type="button" className="me-link" onClick={nav.openAchievements}>
                  <span className="tabular">
                    {medals.count}/{ACHIEVEMENTS.length}
                  </span>
                  <ChevronRight size={18} strokeWidth={2.8} />
                </button>
              }
            />
            <motion.button type="button" className="me-ach" onClick={nav.openAchievements} whileTap={{ y: 2 }} aria-label="See all achievements">
              {medals.list.map((a) => (
                <span key={a.id} className="me-ach__cell">
                  <Medal a={a} unlocked={!!s.achievements[a.id]} />
                </span>
              ))}
            </motion.button>
          </motion.section>

          <motion.section className="me-sec" {...rise(i++)}>
            <SectionHead title="Skills" aside={<SkillsAside skill={mastery.skill} />} />
            <div className="me-areas">
              {CATALOG.courses.map((c) => (
                <AreaGroup key={c.id} course={c} area={mastery.area[c.id]} skills={mastery.skill} />
              ))}
            </div>
          </motion.section>

          <footer className="me-foot">
            <p>
              Gauntlet is an unofficial study tool. It is not affiliated with, endorsed by, or sponsored by Anthropic or Brilliant. Interview patterns come from
              public candidate reports and may differ from your loop.
            </p>
          </footer>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------- header */

const AVATAR_HUES = ['violet', 'blue', 'teal', 'green', 'orange', 'rose', 'indigo'] as const

function avatarHue(name: string) {
  const n = name.trim()
  return n ? AVATAR_HUES[[...n].reduce((a, ch) => a + ch.charCodeAt(0), 0) % AVATAR_HUES.length] : 'slate'
}

function Avatar({ name }: { name: string }) {
  const n = name.trim()
  return (
    <span className="me-avatar" style={courseStyle(avatarHue(name))} aria-hidden>
      {n ? <span className="me-avatar__initial">{[...n][0].toUpperCase()}</span> : <User size={34} strokeWidth={2.4} />}
    </span>
  )
}

function InterviewChip({ date, today }: { date: string; today: string }) {
  if (!date || !Number.isFinite(parseDayKey(date))) {
    return (
      <button type="button" className="me-chip me-chip--add" onClick={nav.openSettings}>
        <CalendarDays size={15} strokeWidth={2.6} />
        Add interview date
      </button>
    )
  }
  const d = daysBetween(today, date)
  const text = d > 1 ? `Interview in ${d} days` : d === 1 ? 'Interview tomorrow' : d === 0 ? 'Interview today' : `Interview was ${-d} day${d === -1 ? '' : 's'} ago`
  const tone = d >= 0 && d <= 7 ? 'me-chip--soon' : d < 0 ? 'me-chip--past' : ''
  return (
    <button type="button" className={`me-chip ${tone}`} onClick={nav.openSettings}>
      <CalendarDays size={15} strokeWidth={2.6} />
      {text}
    </button>
  )
}

/* --------------------------------------------------------------- stats */

function Stat({
  tone,
  icon: Icon,
  filled,
  value,
  suffix = '',
  label,
  note,
  noteTone,
}: {
  tone: 'streak' | 'amber' | 'xp' | 'blue' | 'violet' | 'teal'
  icon: LucideIcon
  /** solid glyph (the streak bolt and XP sparkle are drawn filled) */
  filled?: boolean
  value: number | null
  suffix?: string
  label: string
  note?: string
  noteTone?: 'warn' | 'good'
}) {
  return (
    <div className={`me-stat me-stat--${tone}`}>
      <span className="me-stat__icon" aria-hidden>
        <Icon size={20} strokeWidth={2.4} fill={filled ? 'currentColor' : 'none'} />
      </span>
      <div className="me-stat__text">
        <div className="me-stat__value">{value == null ? '–' : <Ticker from={0} value={value} format={(n) => fmtInt(n) + suffix} />}</div>
        <div className="me-stat__label">{label}</div>
        {note && <div className={`me-stat__note ${noteTone ? `is-${noteTone}` : ''}`}>{note}</div>}
      </div>
    </div>
  )
}

function SectionHead({ title, aside }: { title: string; aside?: ReactNode }) {
  return (
    <div className="me-sec__head">
      <h2>{title}</h2>
      {aside && <span className="me-sec__aside">{aside}</span>}
    </div>
  )
}

/* ------------------------------------------------------------- heatmap */

function Heatmap({ now }: { now: number }) {
  const days = useStore((s) => s.days)
  const streak = useStore((s) => s.streak)
  const goal = useStore((s) => s.settings.dailyXpGoal)
  const today = dayKey(now)
  const [picked, setPicked] = useState<string>(today)

  const grid = useMemo(() => {
    const monday = weekOf(today)[0]
    const start = addDays(monday, -7 * (WEEKS - 1))
    const cols = Array.from({ length: WEEKS }, (_, c) => Array.from({ length: 7 }, (_, r) => addDays(start, c * 7 + r)))
    // month label on the first column that starts in a new month
    const months = cols.map((col, c) => {
      const m = new Date(parseDayKey(col[0])).getMonth()
      const prev = c ? new Date(parseDayKey(cols[c - 1][0])).getMonth() : -1
      return m !== prev ? new Date(parseDayKey(col[0])).toLocaleDateString('en-US', { month: 'short' }) : ''
    })
    // drop the first label when the next column already starts a new month (they would collide)
    if (months[0] && months[1]) months[0] = ''
    // days that make up the live streak, walking back from the last streak day
    const lit = new Set<string>()
    const frozen = new Set(streak.frozenDays)
    const live = liveStreak(streak, today)
    if (live.count > 0 && streak.lastDay) {
      let d = streak.lastDay
      let left = streak.current
      let guard = 0
      while (left > 0 && guard++ < 400) {
        if (frozen.has(d)) {
          d = addDays(d, -1)
          continue
        }
        lit.add(d)
        left--
        d = addDays(d, -1)
      }
    }
    let active = 0
    let xp = 0
    for (const col of cols)
      for (const k of col) {
        const log = days[k]
        if (log && log.xp > 0) {
          active++
          xp += log.xp
        }
      }
    return { cols, months, lit, frozen, active, xp }
  }, [today, days, streak])

  const level = (xp: number) => (xp <= 0 ? 0 : xp < goal / 3 ? 1 : xp < (goal * 2) / 3 ? 2 : xp < goal ? 3 : 4)
  const pick = days[picked]
  const pickedLabel = new Date(parseDayKey(picked)).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <>
      <SectionHead
        title="Activity"
        aside={
          <>
            <span className="tabular">{grid.active}</span> active {grid.active === 1 ? 'day' : 'days'}
          </>
        }
      />
      <div className="me-card me-heat">
        <div className="me-heat__months" aria-hidden>
          <span />
          {grid.months.map((m, c) => (
            <span key={c}>{m}</span>
          ))}
        </div>
        <div className="me-heat__grid" role="grid" aria-label={`Activity over the last ${WEEKS} weeks`}>
          {DOW.map((d, r) => (
            <span key={`d${r}`} className="me-heat__dow" style={{ gridColumn: 1, gridRow: r + 1 }} aria-hidden>
              {r === 0 || r === 2 || r === 4 ? d : ''}
            </span>
          ))}
          {grid.cols.map((col, c) =>
            col.map((k, r) => {
              if (k > today) return <span key={k} className="me-heat__cell is-future" style={{ gridColumn: c + 2, gridRow: r + 1 }} />
              const log = days[k]
              const lv = level(log?.xp ?? 0)
              const isLit = grid.lit.has(k)
              const isFrozen = grid.frozen.has(k)
              return (
                <button
                  key={k}
                  type="button"
                  className={`me-heat__cell lv${lv} ${k === today ? 'is-today' : ''} ${k === picked ? 'is-picked' : ''}`}
                  style={{ gridColumn: c + 2, gridRow: r + 1 }}
                  onClick={() => setPicked(k)}
                  aria-label={`${k}: ${log?.xp ?? 0} XP${isLit ? ', streak day' : ''}${isFrozen ? ', streak charge used' : ''}`}
                >
                  {isLit && <Zap className="me-heat__bolt" size="66%" strokeWidth={2.2} />}
                  {isFrozen && !isLit && <BatteryCharging className="me-heat__charge" size="70%" strokeWidth={2.4} />}
                </button>
              )
            }),
          )}
        </div>
        <div className="me-heat__detail" aria-live="polite">
          <b>{picked === today ? 'Today' : pickedLabel}</b>
          {pick && pick.xp > 0 ? (
            <span>
              {fmtInt(pick.xp)} XP
              {pick.lessons > 0 && ` · ${pick.lessons} lesson${pick.lessons > 1 ? 's' : ''}`}
              {pick.reviews > 0 && ` · ${pick.reviews} review${pick.reviews > 1 ? 's' : ''}`}
            </span>
          ) : grid.frozen.has(picked) ? (
            <span>Streak charge used</span>
          ) : (
            <span>No activity{picked === today ? ' yet' : ''}</span>
          )}
        </div>
        <div className="me-heat__legend">
          <span className="me-heat__scale">
            Less
            {[0, 1, 2, 3, 4].map((lv) => (
              <i key={lv} className={`me-heat__cell lv${lv}`} />
            ))}
            More
          </span>
          <span className="me-heat__key">
            <Zap size={15} strokeWidth={2.2} className="me-heat__bolt" />
            Streak day
          </span>
        </div>
      </div>
    </>
  )
}

/* -------------------------------------------------------------- skills */

function SkillsAside({ skill }: { skill: Record<string, Mastery> }) {
  const started = SKILLS.filter((k) => (skill[k.id]?.unlocked ?? 0) > 0).length
  return (
    <>
      <span className="tabular">{started}</span> of {SKILLS.length} started
    </>
  )
}

function AreaGroup({ course, area, skills }: { course: Course; area?: Mastery; skills: Record<string, Mastery> }) {
  const list = SKILLS.filter((k) => k.area === course.id)
  const [open, setOpen] = useState(false)
  if (!list.length) return null
  const started = list.filter((k) => (skills[k.id]?.unlocked ?? 0) > 0).length
  const due = list.reduce((a, k) => a + (skills[k.id]?.due ?? 0), 0)
  const m = area && area.unlocked > 0 ? area.mastery : null
  return (
    <div className={`me-area ${open ? 'is-open' : ''}`} style={courseStyle(course.color)}>
      <button type="button" className="me-area__head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="me-area__art" aria-hidden>
          <CourseArt course={course} size={56} />
        </span>
        <span className="me-area__text">
          <span className="me-area__title">{course.title}</span>
          <span className="me-area__sub">
            {started}/{list.length} started{due > 0 ? ` · ${due} due` : ''}
          </span>
        </span>
        <span className="me-area__pct tabular">{m == null ? '–' : `${Math.round(m * 100)}%`}</span>
        <motion.span className="me-area__chev" animate={{ rotate: open ? 180 : 0 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}>
          <ChevronDown size={20} strokeWidth={2.8} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="me-area__body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 40 }}
          >
            <ul className="me-skills">
              {list.map((k) => {
                const sm = skills[k.id]
                const has = !!sm && sm.unlocked > 0
                const status = has ? `${Math.round(sm.mastery * 100)}%` : sm && sm.total > 0 ? 'Not started' : 'No cards yet'
                return (
                  <li key={k.id} className="me-skill">
                    <div className="me-skill__line">
                      <span className="me-skill__name">{k.name}</span>
                      {sm && sm.due > 0 && <span className="chip chip--course me-skill__due">{sm.due} due</span>}
                      <span className={`me-skill__pct tabular ${has ? '' : 'is-none'}`}>{status}</span>
                    </div>
                    <ProgressBar value={has ? sm.mastery : 0} tone="course" height={8} label={`${k.name} mastery`} />
                    <div className="me-skill__blurb">{k.blurb}</div>
                  </li>
                )
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
