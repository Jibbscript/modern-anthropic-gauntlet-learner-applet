import { motion } from 'motion/react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowRight, Brain, Check, ChevronRight, Clock, Dumbbell, Layers, RotateCcw, TerminalSquare, Timer } from 'lucide-react'
import { useStore, type GauntletState } from '../core/store'
import type { AreaId, Course, Lab } from '../core/types'
import { CATALOG } from '../content'
import { SKILL_BY_ID } from '../content/skills'
import { LABS } from '../labs/data'
import { areaMastery, buildSession, forecast, leeches, skillMastery } from '../core/adaptive'
import { formatInterval, recallNow, type CardState } from '../core/fsrs'
import { parseDayKey } from '../core/dates'
import { nav, useNav } from '../app/nav'
import { Button } from '../ui/Button'
import { ProgressBar } from '../ui/ProgressBar'
import { Ring } from '../ui/Ring'
import { Ticker } from '../ui/Ticker'
import { CourseIcon } from '../ui/Icon'
import { CourseArt } from '../ui/CourseArt'
import { courseStyle } from '../ui/course'
import { renderInline } from '../ui/Rich'
import './PracticeScreen.css'

const DAY = 86_400_000
/** rough seconds per review card, for the time estimate */
const SECONDS_PER_CARD = 20

const COURSE_BY_ID = Object.fromEntries(CATALOG.courses.map((c) => [c.id, c])) as Record<AreaId, Course>

/** re-render every minute so due counts stay fresh while the tab is open */
function useNow(ms = 60_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [w, setW] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setW(el.clientWidth)
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => setW(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

/** only cards that still exist in the catalog (content can change under saved progress) */
function scopedState(s: GauntletState): GauntletState {
  const cards: Record<string, CardState> = {}
  for (const [id, c] of Object.entries(s.cards)) if (CATALOG.cards[id]) cards[id] = c
  return { ...s, cards }
}

/**
 * A practice set that always has something in it when cards exist: due
 * cards and weak reviewed cards first (buildSession), then the soonest-due
 * unlocked cards (e.g. fresh cards from a lesson finished minutes ago).
 */
function practiceSet(s: GauntletState, now: number, opts: { skill?: string; area?: AreaId } = {}): string[] {
  const size = s.settings.sessionSize
  const ids = buildSession(s, CATALOG, now, { ...opts, topUp: true }).cardIds
  if (ids.length >= size) return ids
  const have = new Set(ids)
  const rest = Object.entries(s.cards)
    .filter(([id]) => {
      const c = CATALOG.cards[id]
      if (!c || have.has(id)) return false
      if (opts.skill && c.skill !== opts.skill) return false
      if (opts.area && CATALOG.lessons[c.lessonId]?.courseId !== opts.area) return false
      return true
    })
    .sort((a, b) => a[1].due - b[1].due)
    .slice(0, size - ids.length)
    .map(([id]) => id)
  return [...ids, ...rest]
}

const rise = (i: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { type: 'spring' as const, stiffness: 420, damping: 34, delay: 0.03 + i * 0.045 },
})

const pct = (v: number) => `${Math.round(v * 100)}%`

export default function PracticeScreen() {
  const raw = useStore()
  const now = useNow()
  const setTab = useNav((n) => n.setTab)
  const s = useMemo(() => scopedState(raw), [raw])

  const d = useMemo(() => {
    const ids = Object.keys(s.cards)
    const plan = buildSession(s, CATALOG, now)
    const reviewed = ids.map((id) => s.cards[id]).filter((c) => c.last != null)
    const strength = reviewed.length ? reviewed.reduce((a, c) => a + recallNow(c, now), 0) / reviewed.length : null
    const upcoming = ids.map((id) => s.cards[id].due).filter((t) => t > now)
    const nextDue = upcoming.length ? Math.min(...upcoming) : null
    const bySkill = skillMastery(s, CATALOG, now)
    const weak = Object.entries(bySkill)
      .filter(([id, m]) => m.unlocked > 0 && SKILL_BY_ID[id])
      .sort((a, b) => a[1].mastery - b[1].mastery || b[1].due - a[1].due)
      .slice(0, 3)
    const byArea = areaMastery(s, CATALOG, now)
    const courses = CATALOG.courses.filter((c) => byArea[c.id]?.total > 0).map((c) => ({ course: c, m: byArea[c.id] }))
    return {
      total: ids.length,
      plan,
      strength,
      nextDue,
      weak,
      courses,
      fc: forecast(s, now, 7),
      trouble: leeches(s),
      reviewedCount: reviewed.length,
    }
  }, [s, now])

  const empty = d.total === 0
  let i = 0

  return (
    <div className="prac">
      <header className="prac-head safe-top">
        <h1>Practice</h1>
        {!empty && (
          <span className="prac-head__deck">
            <Layers size={16} strokeWidth={2.6} />
            <span className="tabular">{d.total}</span> {d.total === 1 ? 'card' : 'cards'}
          </span>
        )}
      </header>
      <div className="prac-scroll scroll">
        <div className="prac-body">
          {empty ? (
            <motion.div {...rise(i++)}>
              <EmptyDeck onLearn={() => setTab('learn')} />
            </motion.div>
          ) : (
            <>
              <motion.div {...rise(i++)}>
                <Hero
                  due={d.plan.due}
                  sessionCount={d.plan.cardIds.length}
                  strength={d.strength}
                  nextDue={d.nextDue}
                  now={now}
                  onStart={() => nav.openReview(d.plan.cardIds, 'Daily review')}
                  onAnyway={() => {
                    const ids = practiceSet(s, now)
                    if (ids.length) nav.openReview(ids, 'Extra practice')
                  }}
                />
              </motion.div>

              {d.weak.length > 0 && (
                <motion.section className="prac-sec" {...rise(i++)}>
                  <SectionHead title="Weak spots" aside="Lowest mastery first" />
                  <div className="prac-card">
                    {d.weak.map(([id, m]) => {
                      const skill = SKILL_BY_ID[id]
                      const course = COURSE_BY_ID[skill.area]
                      return (
                        <div key={id} className="prac-row" style={course ? courseStyle(course.color) : undefined}>
                          <span className="prac-row__icon">{course && <CourseIcon name={course.icon} size={20} />}</span>
                          <div className="prac-row__main">
                            <div className="prac-row__title">{skill.name}</div>
                            <div className="prac-row__meter">
                              <ProgressBar value={m.mastery} tone="course" height={8} label={`${skill.name} mastery`} />
                              <span className="prac-row__pct tabular">{pct(m.mastery)}</span>
                            </div>
                            <div className="prac-row__meta">
                              {course?.title}
                              {m.due > 0 && <> · {m.due} due</>}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="prac-row__btn"
                            onClick={() => {
                              const ids = practiceSet(s, now, { skill: id })
                              if (ids.length) nav.openReview(ids, skill.name)
                            }}
                          >
                            Practice
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </motion.section>
              )}

              <motion.section className="prac-sec" {...rise(i++)}>
                <SectionHead title="Next 7 days" aside={`${d.fc.reduce((a, x) => a + x.count, 0)} reviews`} />
                <div className="prac-card prac-card--pad">
                  <ForecastChart data={d.fc} />
                  <p className="prac-note">Cards due each day. Today includes anything overdue.</p>
                </div>
              </motion.section>

              {d.courses.length > 0 && (
                <motion.section className="prac-sec" {...rise(i++)}>
                  <SectionHead title="Memory by course" aside="Recall" />
                  <div className="prac-card">
                    {d.courses.map(({ course, m }) => (
                      <button key={course.id} type="button" className="prac-row prac-row--tap" style={courseStyle(course.color)} onClick={() => nav.openCourse(course.id)}>
                        <span className="prac-row__art" aria-hidden>
                          <CourseArt course={course} size={60} />
                        </span>
                        <span className="prac-row__main">
                          <span className="prac-row__line">
                            <span className="prac-row__title">{course.title}</span>
                            <span className="prac-row__big tabular">{m.unlocked ? pct(m.recall) : '–'}</span>
                          </span>
                          <ProgressBar value={m.unlocked ? m.recall : 0} tone="course" height={8} label={`${course.title} recall`} />
                          <span className="prac-row__meta tabular">
                            {m.unlocked}/{m.total} unlocked{m.due > 0 ? ` · ${m.due} due` : ''}
                          </span>
                        </span>
                        <ChevronRight className="prac-row__chev" size={20} strokeWidth={2.6} />
                      </button>
                    ))}
                  </div>
                </motion.section>
              )}

              {d.trouble.length > 0 && (
                <motion.section className="prac-trouble" {...rise(i++)}>
                  <div className="prac-trouble__top">
                    <span className="prac-trouble__icon">
                      <RotateCcw size={22} strokeWidth={2.8} />
                    </span>
                    <div>
                      <div className="prac-trouble__title">
                        <span className="tabular">{d.trouble.length}</span> trouble {d.trouble.length === 1 ? 'card' : 'cards'}
                      </div>
                      <p className="prac-trouble__text">You have missed {d.trouble.length === 1 ? 'this' : 'these'} three or more times. A short focused pass helps them stick.</p>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="md"
                    block
                    onClick={() => nav.openReview(d.trouble.slice(0, Math.max(s.settings.sessionSize, 10)), 'Trouble cards')}
                  >
                    Review them
                  </Button>
                </motion.section>
              )}
            </>
          )}

          {LABS.length > 0 && (
            <motion.section className="prac-sec" {...rise(i++)}>
              <SectionHead title="Code Labs" aside="Timed builds, in levels" />
              <div className="prac-labs">
                {LABS.map((lab) => (
                  <LabCard key={lab.id} lab={lab} passed={raw.labs[lab.id]?.levelsPassed ?? 0} />
                ))}
              </div>
            </motion.section>
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ hero */

function Hero(p: {
  due: number
  sessionCount: number
  strength: number | null
  nextDue: number | null
  now: number
  onStart: () => void
  onAnyway: () => void
}) {
  const minutes = Math.max(1, Math.round((p.sessionCount * SECONDS_PER_CARD) / 60))
  const caughtUp = p.due === 0
  return (
    <section className={`prac-hero ${caughtUp ? 'prac-hero--done' : ''}`}>
      <div className="prac-hero__top">
        <div className="prac-hero__main">
          <div className="prac-hero__eyebrow">
            <Brain size={16} strokeWidth={2.8} />
            Daily review
          </div>
          {caughtUp ? (
            <>
              <motion.span
                className="prac-hero__check"
                initial={{ scale: 0.4, rotate: -25 }}
                animate={{ scale: 1, rotate: -6 }}
                transition={{ type: 'spring', stiffness: 420, damping: 15, delay: 0.15 }}
              >
                <Check size={32} strokeWidth={3.6} />
              </motion.span>
              <h2 className="prac-hero__title">All caught up</h2>
              <p className="prac-hero__sub">
                {p.nextDue ? (
                  <>
                    Next card due in <b>{formatInterval((p.nextDue - p.now) / DAY)}</b>
                  </>
                ) : (
                  'Nothing scheduled yet.'
                )}
              </p>
            </>
          ) : (
            <>
              <div className="prac-hero__count">
                <Ticker value={p.due} from={0} />
              </div>
              <p className="prac-hero__sub">{p.due === 1 ? 'card' : 'cards'} due now</p>
            </>
          )}
        </div>
        <div className="prac-hero__ring">
          <Ring value={p.strength ?? 0} size={92} stroke={10} color="var(--mem)" track="var(--prac-ring-track)" label="Memory strength">
            <span className="prac-hero__ring-in">
              <b className="tabular">{p.strength == null ? '–' : pct(p.strength)}</b>
              <span>memory</span>
            </span>
          </Ring>
        </div>
      </div>
      {caughtUp ? (
        <Button variant="secondary" size="lg" block icon={<Dumbbell size={20} strokeWidth={2.6} />} onClick={p.onAnyway}>
          Practice anyway
        </Button>
      ) : (
        <>
          <div className="prac-hero__chips">
            <span className="prac-chip">
              <Timer size={15} strokeWidth={2.6} />
              About {minutes} min
            </span>
            {p.due > p.sessionCount && <span className="prac-chip">{p.sessionCount} this session</span>}
          </div>
          <Button size="lg" block onClick={p.onStart}>
            Start review
          </Button>
        </>
      )}
    </section>
  )
}

/* ---------------------------------------------------------------- empty */

function EmptyDeck({ onLearn }: { onLearn: () => void }) {
  return (
    <section className="prac-empty">
      <div className="prac-empty__art" aria-hidden>
        <motion.span className="prac-empty__card prac-empty__card--a" initial={{ rotate: 0, x: 0 }} animate={{ rotate: -14, x: -34 }} transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.15 }} />
        <motion.span className="prac-empty__card prac-empty__card--b" initial={{ rotate: 0, x: 0 }} animate={{ rotate: 14, x: 34 }} transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.2 }} />
        <motion.span className="prac-empty__card prac-empty__card--c" initial={{ y: 10, scale: 0.9 }} animate={{ y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 380, damping: 16, delay: 0.1 }}>
          <Brain size={40} strokeWidth={2.3} />
        </motion.span>
      </div>
      <h2>Your review deck is empty</h2>
      <p className="prac-empty__lead">
        Each lesson you finish adds a few cards here. Gauntlet brings every card back right before you would forget it, so it is fresh on interview day.
      </p>
      <ol className="prac-empty__steps">
        <li>
          <span>1</span>Finish a lesson on the Learn tab
        </li>
        <li>
          <span>2</span>Its key ideas join your deck as cards
        </li>
        <li>
          <span>3</span>Review a few minutes a day
        </li>
      </ol>
      <Button block size="lg" iconRight={<ArrowRight size={20} strokeWidth={2.8} />} onClick={onLearn}>
        Go to Learn
      </Button>
    </section>
  )
}

/* -------------------------------------------------------------- pieces */

function SectionHead({ title, aside }: { title: string; aside?: ReactNode }) {
  return (
    <div className="prac-sec__head">
      <h2>{title}</h2>
      {aside && <span className="prac-sec__aside">{aside}</span>}
    </div>
  )
}

function ForecastChart({ data }: { data: { day: string; count: number }[] }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const H = 156
  const top = 24
  const bottom = 28
  const plotH = H - top - bottom
  const max = Math.max(1, ...data.map((x) => x.count))
  const n = Math.max(1, data.length)
  // keep the wider "Today" label clear of the left edge on narrow phones
  const padX = Math.max(0, 22 - width / n / 2)
  const band = (width - 2 * padX) / n
  const bw = Math.min(24, band * 0.58)
  const baseY = top + plotH
  // "Today" in a pill when there is room, else the weekday in the pill
  const roomy = band >= 50
  const todayLabel = roomy ? 'Today' : weekday(data[0]?.day ?? '')
  const pillW = roomy ? 52 : Math.min(band - 2, 40)
  return (
    <div ref={ref} className="prac-fc">
      {width > 0 && (
        <svg width={width} height={H} viewBox={`0 0 ${width} ${H}`} role="img" aria-label={data.map((x, i) => `${i === 0 ? 'Today' : weekday(x.day)}: ${x.count}`).join(', ')}>
          <line className="prac-fc__base" x1={0} x2={width} y1={baseY + 0.5} y2={baseY + 0.5} />
          {data.map((x, i) => {
            const h = x.count ? Math.max(8, (x.count / max) * plotH) : 0
            const cx = padX + i * band + band / 2
            const bx = cx - bw / 2
            const r = Math.min(4, h / 2, bw / 2)
            const today = i === 0
            return (
              <g key={x.day}>
                <title>{`${today ? 'Today' : weekday(x.day)}: ${x.count} ${x.count === 1 ? 'card' : 'cards'}`}</title>
                {h > 0 && (
                  <motion.path
                    className={`prac-fc__bar ${today ? 'prac-fc__bar--today' : ''}`}
                    d={`M${bx},${baseY} V${baseY - h + r} Q${bx},${baseY - h} ${bx + r},${baseY - h} H${bx + bw - r} Q${bx + bw},${baseY - h} ${bx + bw},${baseY - h + r} V${baseY} Z`}
                    style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 24, delay: 0.15 + i * 0.04 }}
                  />
                )}
                <text className={`prac-fc__val ${today ? 'is-today' : ''} ${x.count ? '' : 'is-zero'}`} x={cx} y={baseY - h - 7} textAnchor="middle">
                  {x.count}
                </text>
                {today && <rect className="prac-fc__pill" x={cx - pillW / 2} y={H - 21} width={pillW} height={21} rx={10.5} />}
                <text className={`prac-fc__day ${today ? 'is-today' : ''}`} x={cx} y={H - 6} textAnchor="middle">
                  {today ? todayLabel : weekday(x.day)}
                </text>
              </g>
            )
          })}
        </svg>
      )}
    </div>
  )
}

function weekday(key: string) {
  return new Date(parseDayKey(key)).toLocaleDateString('en-US', { weekday: 'short' })
}

function LabCard({ lab, passed }: { lab: Lab; passed: number }) {
  const course = COURSE_BY_ID[lab.area]
  const n = lab.levels.length
  const done = Math.min(passed, n)
  const summary = (lab.summary || '').split(/\n\s*\n/)[0].replace(/^[->]\s+/, '')
  return (
    <motion.button
      type="button"
      className={`prac-lab ${done >= n ? 'is-done' : ''}`}
      style={courseStyle(course?.color ?? 'green')}
      whileTap={{ y: 2 }}
      onClick={() => nav.openLab(lab.id)}
    >
      <span className="prac-lab__art" aria-hidden>
        <TerminalSquare size={26} strokeWidth={2.4} />
      </span>
      <span className="prac-lab__main">
        <span className="prac-lab__title">{lab.title}</span>
        {summary && <span className="prac-lab__sum">{renderInline(summary)}</span>}
        <span className="prac-lab__meta">
          <span className="prac-lab__pips" aria-hidden>
            {Array.from({ length: n }, (_, k) => (
              <i key={k} className={k < done ? 'on' : ''} />
            ))}
          </span>
          <span className="prac-lab__grp tabular">
            {done}/{n} levels
          </span>
          <span className="prac-lab__grp tabular">
            <Clock size={14} strokeWidth={2.6} />
            {lab.minutes} min
          </span>
        </span>
      </span>
      <ChevronRight className="prac-lab__chev" size={20} strokeWidth={2.6} />
    </motion.button>
  )
}
