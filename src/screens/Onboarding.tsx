import { AnimatePresence, motion, type Variants } from 'motion/react'
import { useId, useMemo, useState, type ReactNode } from 'react'
import {
  Brain,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Code2,
  Compass,
  FlaskConical,
  MousePointerClick,
  NotebookPen,
  Repeat,
  Server,
  Sparkles,
  Target,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { useStore, type Profile } from '../core/store'
import type { AreaId, Course, CourseColor } from '../core/types'
import { COURSES } from '../content'
import { addDays, dayKey, daysBetween, parseDayKey } from '../core/dates'
import { useNav } from '../app/nav'
import { Button, IconButton } from '../ui/Button'
import { ProgressBar } from '../ui/ProgressBar'
import { Ring } from '../ui/Ring'
import { Ticker } from '../ui/Ticker'
import { CourseIcon } from '../ui/Icon'
import { CourseArt } from '../ui/CourseArt'
import { courseStyle } from '../ui/course'
import { celebrate, haptic, sfx } from '../ui/fx'
import './Onboarding.css'

/* ------------------------------------------------------------------ data */

const STEPS = ['welcome', 'about', 'date', 'confidence', 'goal', 'plan'] as const
type StepId = (typeof STEPS)[number]

const ROLES: { value: Profile['role']; label: string; sub: string; icon: LucideIcon; color: CourseColor }[] = [
  { value: 'swe', label: 'Software Engineer', sub: 'Product, platform, full stack', icon: Code2, color: 'blue' },
  { value: 'research-eng', label: 'Research Engineer', sub: 'Training, evals, tooling', icon: FlaskConical, color: 'violet' },
  { value: 'infra', label: 'Infrastructure', sub: 'Systems, inference, reliability', icon: Server, color: 'teal' },
  { value: 'other', label: 'Other', sub: 'Something else', icon: Compass, color: 'slate' },
]
const ROLE_LABEL = Object.fromEntries(ROLES.map((r) => [r.value, r.label])) as Record<Profile['role'], string>

type DateChoice = '1w' | '2w' | '1m' | 'none' | 'custom'
const DATE_CHIPS: { id: Exclude<DateChoice, 'custom'>; label: string }[] = [
  { id: '1w', label: 'In 1 week' },
  { id: '2w', label: 'In 2 weeks' },
  { id: '1m', label: 'In 1 month' },
  { id: 'none', label: 'Not scheduled' },
]

const CONF_AREAS: AreaId[] = ['why', 'values', 'python', 'concurrency', 'builds', 'design']
const CONF_LABEL = ['', 'Shaky', 'Rusty', 'Okay', 'Good', 'Strong']

const GOALS = [
  { xp: 30, label: 'Casual', min: 5 },
  { xp: 60, label: 'Regular', min: 10 },
  { xp: 100, label: 'Serious', min: 15 },
  { xp: 150, label: 'Intense', min: 25 },
]

const COURSE_BY_ID = Object.fromEntries(COURSES.map((c) => [c.id, c])) as Record<AreaId, Course>

function dateFor(choice: DateChoice, today: string): string {
  if (choice === '1w') return addDays(today, 7)
  if (choice === '2w') return addDays(today, 14)
  if (choice === '1m') {
    const d = new Date(parseDayKey(today))
    d.setMonth(d.getMonth() + 1)
    return dayKey(d.getTime())
  }
  return ''
}

function prettyDate(key: string): string {
  return new Date(parseDayKey(key)).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function daysAway(n: number): string {
  if (n === 0) return 'today'
  if (n === 1) return 'tomorrow'
  return `in ${n} days`
}

/* ------------------------------------------------------------ animation */

const slide: Variants = {
  enter: (d: number) => ({ x: d > 0 ? '100%' : '-32%', opacity: d > 0 ? 1 : 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: d > 0 ? '-32%' : '100%', opacity: d > 0 ? 0 : 1 }),
}
const SPRING = { type: 'spring' as const, stiffness: 380, damping: 40 }

const rise = (i: number, base = 0.08) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { type: 'spring' as const, stiffness: 420, damping: 32, delay: base + i * 0.06 },
})

/* ----------------------------------------------------------------- flow */

export default function Onboarding() {
  const prev = useStore((s) => s.profile)
  const prevGoal = useStore((s) => s.settings.dailyXpGoal)
  const completeOnboarding = useStore((s) => s.completeOnboarding)
  const setSettings = useStore((s) => s.setSettings)
  const [today] = useState(() => dayKey(Date.now()))

  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [name, setName] = useState(prev.name)
  const [role, setRole] = useState<Profile['role'] | null>(prev.name ? prev.role : null)
  const [choice, setChoice] = useState<DateChoice | null>(prev.interviewDate ? 'custom' : null)
  const [date, setDate] = useState(prev.interviewDate)
  const [conf, setConf] = useState<Partial<Record<AreaId, number>>>(() => ({ ...prev.confidence }))
  const [goal, setGoal] = useState(GOALS.some((g) => g.xp === prevGoal) ? prevGoal : 60)
  const [finishing, setFinishing] = useState(false)
  /** set while revisiting a step from the plan summary: Continue returns to the plan */
  const [editing, setEditing] = useState(false)

  const id: StepId = STEPS[step]
  const go = (to: number) => {
    if (to < 0 || to >= STEPS.length) return
    setDir(to > step ? 1 : -1)
    setStep(to)
  }
  const next = () => {
    if (editing) {
      setEditing(false)
      go(STEPS.length - 1)
    } else go(step + 1)
  }
  const cta = editing ? 'Back to plan' : 'Continue'

  const days = date ? daysBetween(today, date) : null
  const pastDate = days != null && days < 0
  const rated = CONF_AREAS.filter((a) => conf[a] != null).length

  const first = useMemo(() => {
    const ranked = CONF_AREAS.map((a, i) => ({ a, v: conf[a] ?? 3, order: COURSES.findIndex((c) => c.id === a), i }))
      .filter((x) => COURSE_BY_ID[x.a])
      .sort((x, y) => x.v - y.v || x.order - y.order)
    const tied = ranked.length > 1 && ranked.every((x) => x.v === ranked[0].v)
    return ranked[0] ? { course: COURSE_BY_ID[ranked[0].a], v: ranked[0].v, tied } : null
  }, [conf])

  const finish = () => {
    if (finishing) return
    setFinishing(true)
    sfx('complete')
    haptic('success')
    celebrate('big')
    setTimeout(() => {
      setSettings({ dailyXpGoal: goal })
      completeOnboarding({
        name: name.trim(),
        role: role ?? 'swe',
        interviewDate: choice === 'none' || pastDate ? '' : date,
        confidence: conf,
      })
      // land on Learn with nothing stacked on top (matters after a reset from Settings)
      useNav.getState().setTab('learn')
    }, 260)
  }

  let body: ReactNode
  let foot: ReactNode
  switch (id) {
    case 'welcome':
      body = <Welcome />
      foot = (
        <>
          <Button block size="lg" onClick={next}>
            Get started
          </Button>
          <p className="onb-disclaimer">Unofficial · built from public candidate reports</p>
        </>
      )
      break
    case 'about':
      body = <About name={name} setName={setName} role={role} setRole={setRole} onEnter={() => role && next()} />
      foot = (
        <Button block size="lg" disabled={!role} onClick={next}>
          {role ? cta : 'Pick a role'}
        </Button>
      )
      break
    case 'date':
      body = (
        <InterviewDate
          today={today}
          date={date}
          choice={choice}
          days={days}
          onChip={(c) => {
            setChoice(c)
            setDate(dateFor(c, today))
          }}
          onDate={(v) => {
            setChoice(v ? 'custom' : null)
            setDate(v)
          }}
        />
      )
      foot = (
        <Button block size="lg" disabled={!choice || pastDate || (choice === 'custom' && !date)} onClick={next}>
          {cta}
        </Button>
      )
      break
    case 'confidence':
      body = <Confidence conf={conf} setConf={setConf} />
      foot = (
        <Button block size="lg" disabled={rated < CONF_AREAS.length} onClick={next}>
          {rated < CONF_AREAS.length ? `Rate ${CONF_AREAS.length - rated} more` : cta}
        </Button>
      )
      break
    case 'goal':
      body = <Goal goal={goal} setGoal={setGoal} />
      foot = (
        <Button block size="lg" onClick={next}>
          {cta}
        </Button>
      )
      break
    case 'plan':
      body = (
        <Plan
          name={name.trim()}
          role={role ?? 'swe'}
          date={choice === 'none' ? '' : date}
          days={choice === 'none' ? null : days}
          goal={goal}
          first={first}
          onEdit={(to) => {
            setEditing(true)
            go(to)
          }}
        />
      )
      foot = (
        <Button block size="lg" variant="good" disabled={finishing} iconRight={<ChevronRight size={22} strokeWidth={2.8} />} onClick={finish}>
          Start learning
        </Button>
      )
      break
  }

  return (
    <div className="onb">
      <AnimatePresence initial={false}>
        {step > 0 && (
          <motion.header
            className="onb-head safe-top"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            <IconButton
              label="Back"
              className="onb-head__back"
              onClick={() => {
                setEditing(false)
                go(step - 1)
              }}
            >
              <ChevronLeft size={28} strokeWidth={2.6} />
            </IconButton>
            <div className="onb-head__bar">
              <ProgressBar value={step / (STEPS.length - 1)} label={`Step ${step} of ${STEPS.length - 1}`} />
            </div>
            <span className="onb-head__count tabular" aria-hidden>
              {step}/{STEPS.length - 1}
            </span>
          </motion.header>
        )}
      </AnimatePresence>
      <div className="onb-stage">
        <AnimatePresence initial={false} custom={dir}>
          <motion.div
            key={id}
            className={`onb-step onb-step--${id}`}
            custom={dir}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
            transition={SPRING}
          >
            <div className={`onb-step__body scroll ${id === 'welcome' ? 'safe-top' : ''}`}>{body}</div>
            <div className="onb-step__foot safe-bottom">{foot}</div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------- welcome */

/** the app mark, assembled: tile pops in, three blocks rise, the gold dot drops */
function HeroMark() {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const blocks = [
    { x: 104, y: 292, h: 116, o: 0.72 },
    { x: 212, y: 214, h: 194, o: 0.86 },
    { x: 320, y: 128, h: 280, o: 1 },
  ]
  return (
    <div className="onb-mark" aria-hidden>
      <span className="onb-mark__glow" />
      {(['teal', 'rose', 'amber', 'blue'] as const).map((c, i) => (
        <motion.span
          key={c}
          className={`onb-mark__chip onb-mark__chip--${i}`}
          style={courseStyle(c)}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 420, damping: 14, delay: 0.9 + i * 0.08 }}
        >
          <span />
        </motion.span>
      ))}
      <motion.svg
        className="onb-mark__svg"
        width={128}
        height={128}
        viewBox="0 0 512 512"
        initial={{ scale: 0.4, rotate: -14, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 16 }}
      >
        <defs>
          <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#8b6dff" />
            <stop offset="1" stopColor="#4b5bff" />
          </linearGradient>
          <linearGradient id={`${uid}-gl`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity=".45" />
            <stop offset=".55" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width="512" height="512" rx="128" fill={`url(#${uid}-bg)`} />
        <rect width="512" height="512" rx="128" fill={`url(#${uid}-gl)`} />
        {blocks.map((b, i) => (
          <motion.rect
            key={i}
            x={b.x}
            width={88}
            rx={24}
            fill="#fff"
            opacity={b.o}
            initial={{ y: 408, height: 0 }}
            animate={{ y: b.y, height: b.h }}
            transition={{ type: 'spring', stiffness: 260, damping: 13, delay: 0.25 + i * 0.13 }}
          />
        ))}
        <motion.circle
          cx={364}
          cy={94}
          r={20}
          fill="#ffd02b"
          initial={{ y: -140, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 420, damping: 10, delay: 0.78 }}
        />
      </motion.svg>
    </div>
  )
}

const BENEFITS: { icon: LucideIcon; color: CourseColor; title: string; sub: string }[] = [
  { icon: MousePointerClick, color: 'teal', title: 'Interactive lessons & simulations', sub: 'Race threads, break locks, size systems.' },
  { icon: Brain, color: 'violet', title: 'Spaced review that adapts', sub: 'Tuned to your memory and your interview date.' },
  { icon: NotebookPen, color: 'rose', title: 'A story bank for the culture round', sub: 'Draft real stories, rehearse them out loud.' },
]

function Welcome() {
  return (
    <div className="onb-welcome">
      <HeroMark />
      <motion.div className="onb-welcome__brand" {...rise(0, 0.5)}>
        Gauntlet
      </motion.div>
      <motion.h1 className="onb-welcome__title" {...rise(1, 0.5)}>
        Train for the Anthropic loop by doing, not reading.
      </motion.h1>
      <ul className="onb-benefits">
        {BENEFITS.map((b, i) => (
          <motion.li key={b.title} style={courseStyle(b.color)} {...rise(i, 0.75)}>
            <span className="onb-gloss" aria-hidden>
              <b.icon size={22} strokeWidth={2.4} />
            </span>
            <span className="onb-benefits__text">
              <b>{b.title}</b>
              <span>{b.sub}</span>
            </span>
          </motion.li>
        ))}
      </ul>
    </div>
  )
}

/* ---------------------------------------------------------------- about */

function StepTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <motion.div className="onb-titles" {...rise(0, 0.05)}>
      <h2>{title}</h2>
      {sub && <p>{sub}</p>}
    </motion.div>
  )
}

function About(p: { name: string; setName: (v: string) => void; role: Profile['role'] | null; setRole: (r: Profile['role']) => void; onEnter: () => void }) {
  return (
    <div className="onb-pad">
      <StepTitle title="First, a little about you" />
      <motion.label className="onb-field" {...rise(1)}>
        <span className="onb-field__label">What should we call you?</span>
        <span className="onb-input-wrap">
          <UserRound className="onb-input-wrap__icon" size={20} strokeWidth={2.4} />
          <input
            className="onb-input"
            type="text"
            value={p.name}
            placeholder="First name (optional)"
            maxLength={40}
            autoComplete="given-name"
            enterKeyHint="next"
            onChange={(e) => p.setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                ;(e.target as HTMLInputElement).blur()
                p.onEnter()
              }
            }}
          />
        </span>
      </motion.label>
      <motion.div className="onb-field" {...rise(2)}>
        <span className="onb-field__label" id="onb-role-label">
          Which role are you interviewing for?
        </span>
        <div className="onb-roles" role="radiogroup" aria-labelledby="onb-role-label">
          {ROLES.map((r) => {
            const on = p.role === r.value
            return (
              <motion.button
                key={r.value}
                type="button"
                role="radio"
                aria-checked={on}
                className={`onb-role ${on ? 'is-on' : ''} ${p.role && !on ? 'is-dim' : ''}`}
                style={courseStyle(r.color)}
                whileTap={{ y: 2 }}
                onClick={() => {
                  sfx('select')
                  haptic('light')
                  p.setRole(r.value)
                }}
              >
                <span className="onb-gloss onb-gloss--sm" aria-hidden>
                  <r.icon size={20} strokeWidth={2.4} />
                </span>
                <span className="onb-role__label">{r.label}</span>
                <span className="onb-role__sub">{r.sub}</span>
                <AnimatePresence>
                  {on && (
                    <motion.span
                      className="onb-tick"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ type: 'spring', stiffness: 600, damping: 20 }}
                    >
                      <Check size={14} strokeWidth={3.6} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            )
          })}
        </div>
      </motion.div>
    </div>
  )
}

/* ----------------------------------------------------------------- date */

function CalendarArt({ date, days, none }: { date: string; days: number | null; none: boolean }) {
  const d = date ? new Date(parseDayKey(date)) : null
  const key = none ? 'none' : date || 'empty'
  return (
    <div className="onb-cal" aria-hidden>
      <div className="onb-cal__rings">
        <i />
        <i />
      </div>
      <div className="onb-cal__band">{d ? d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase() : none ? 'ANY DAY' : 'DATE'}</div>
      <div className="onb-cal__day">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={key}
            initial={{ y: 24, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -24, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 460, damping: 22 }}
          >
            {d ? d.getDate() : none ? '–' : '?'}
          </motion.span>
        </AnimatePresence>
      </div>
      <div className="onb-cal__foot">{d && days != null ? (days < 0 ? 'in the past' : daysAway(days)) : none ? 'no date yet' : 'pick one'}</div>
    </div>
  )
}

function InterviewDate(p: {
  today: string
  date: string
  choice: DateChoice | null
  days: number | null
  onChip: (c: Exclude<DateChoice, 'custom'>) => void
  onDate: (v: string) => void
}) {
  const none = p.choice === 'none'
  let note = 'Pick the day of your first technical round, or roughly when you expect it.'
  if (none) note = 'No problem. Add it later in Settings and the schedule will aim for it.'
  else if (p.days != null && p.date) {
    if (p.days < 0) note = 'That day has passed. Pick a date from today on.'
    else if (p.days <= 7) note = 'Tight but doable. We will start with your weakest areas and review every day.'
    else if (p.days <= 14) note = 'Reviews tighten over the final two weeks so it is all fresh on the day.'
    else note = 'Plenty of runway. Reviews space out now and tighten in the final two weeks.'
  }
  return (
    <div className="onb-pad">
      <StepTitle title="When is your interview?" sub="We pace your reviews so everything peaks on the day." />
      <motion.div {...rise(1)}>
        <CalendarArt date={none ? '' : p.date} days={p.days} none={none} />
      </motion.div>
      <motion.div className="onb-chips" role="radiogroup" aria-label="Quick picks" {...rise(2)}>
        {DATE_CHIPS.map((c) => {
          const on = p.choice === c.id
          return (
            <motion.button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={on}
              className={`onb-chip ${on ? 'is-on' : ''}`}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                sfx('select')
                haptic('light')
                p.onChip(c.id)
              }}
            >
              {c.label}
            </motion.button>
          )
        })}
      </motion.div>
      <motion.label className="onb-field" {...rise(3)}>
        <span className="onb-field__label">Or choose a date</span>
        <span className={`onb-input-wrap ${p.choice === 'custom' && p.date ? 'is-on' : ''}`}>
          <CalendarDays className="onb-input-wrap__icon" size={20} strokeWidth={2.4} />
          <input
            className="onb-input onb-input--date"
            type="date"
            min={p.today}
            value={none ? '' : p.date}
            onChange={(e) => p.onDate(e.target.value)}
          />
        </span>
      </motion.label>
      <motion.p className={`onb-note ${p.days != null && p.days < 0 && !none ? 'is-warn' : ''}`} {...rise(4)}>
        {note}
      </motion.p>
    </div>
  )
}

/* ------------------------------------------------------------ confidence */

function Confidence({ conf, setConf }: { conf: Partial<Record<AreaId, number>>; setConf: (f: (c: Partial<Record<AreaId, number>>) => Partial<Record<AreaId, number>>) => void }) {
  return (
    <div className="onb-pad">
      <StepTitle title="How ready do you feel?" sub="Rate each area honestly. Your plan starts where you are shakiest." />
      <motion.div className="onb-legend" {...rise(1)} aria-hidden>
        <span>1 · Shaky</span>
        <span>5 · Strong</span>
      </motion.div>
      <div className="onb-conf">
        {CONF_AREAS.map((a, i) => {
          const c = COURSE_BY_ID[a]
          if (!c) return null
          const v = conf[a]
          return (
            <motion.div key={a} className="onb-crow" style={courseStyle(c.color)} {...rise(i + 2)}>
              <div className="onb-crow__top">
                <span className="onb-gloss onb-gloss--xs" aria-hidden>
                  <CourseIcon name={c.icon} size={16} strokeWidth={2.6} />
                </span>
                <span className="onb-crow__title" id={`onb-conf-${a}`}>
                  {c.title}
                </span>
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={v ?? 0}
                    className={`onb-crow__val ${v ? 'is-set' : ''}`}
                    initial={{ y: 8, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -8, opacity: 0 }}
                    transition={{ duration: 0.16 }}
                  >
                    {v ? CONF_LABEL[v] : 'Not rated'}
                  </motion.span>
                </AnimatePresence>
              </div>
              <div className="onb-seg" role="radiogroup" aria-labelledby={`onb-conf-${a}`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <motion.button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={v === n}
                    aria-label={`${n}, ${CONF_LABEL[n]}`}
                    className={`onb-seg__btn ${v != null && n <= v ? 'is-on' : ''} ${v === n ? 'is-cur' : ''}`}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => {
                      sfx('select')
                      haptic('light')
                      setConf((cur) => ({ ...cur, [a]: n }))
                    }}
                  >
                    {n}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------- goal */

function Bars({ n }: { n: number }) {
  return (
    <span className="onb-bars" aria-hidden>
      {[1, 2, 3, 4].map((k) => (
        <i key={k} className={k <= n ? 'on' : ''} style={{ height: 6 + k * 4 }} />
      ))}
    </span>
  )
}

function Goal({ goal, setGoal }: { goal: number; setGoal: (n: number) => void }) {
  const g = GOALS.find((x) => x.xp === goal) ?? GOALS[1]
  return (
    <div className="onb-pad">
      <StepTitle title="Pick a daily goal" sub="Small and steady beats cramming. You can change it anytime." />
      <motion.div className="onb-goalart" {...rise(1)} aria-hidden>
        <span className="onb-goalart__glow" />
        <AnimatePresence>
          <motion.span key={goal} className="onb-goalart__burst" initial={{ scale: 0.6, opacity: 0.9 }} animate={{ scale: 1.5, opacity: 0 }} transition={{ duration: 0.6 }} />
        </AnimatePresence>
        <Ring value={goal / 150} size={140} stroke={14} color="var(--good)" track="var(--surface-3)">
          <span className="onb-goalart__in">
            <b className="tabular">
              <Ticker value={goal} duration={0.45} />
            </b>
            <span>XP a day</span>
          </span>
        </Ring>
        <span className="onb-goalart__min">
          <Target size={14} strokeWidth={2.8} />≈ {g.min} min a day
        </span>
      </motion.div>
      <div className="onb-goals" role="radiogroup" aria-label="Daily goal">
        {GOALS.map((x, i) => {
          const on = x.xp === goal
          return (
            <motion.div key={x.xp} {...rise(i + 2)}>
              <button
                type="button"
                role="radio"
                aria-checked={on}
                className={`onb-goal ${on ? 'is-on' : ''}`}
                onClick={() => {
                  sfx('select')
                  haptic('light')
                  setGoal(x.xp)
                }}
              >
                <Bars n={i + 1} />
                <span className="onb-goal__main">
                  <b>{x.label}</b>
                  <span>≈ {x.min} min a day</span>
                </span>
                <span className="onb-goal__xp tabular">{x.xp} XP</span>
              </button>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------- plan */

function Plan(p: {
  name: string
  role: Profile['role']
  date: string
  days: number | null
  goal: number
  first: { course: Course; v: number; tied: boolean } | null
  onEdit: (step: number) => void
}) {
  const g = GOALS.find((x) => x.xp === p.goal) ?? GOALS[1]
  const reason = !p.first
    ? ''
    : p.first.tied
      ? 'You rated every area the same, so start where the loop starts.'
      : p.first.v <= 2
        ? `You rated it ${CONF_LABEL[p.first.v]}, so it comes first.`
        : 'Your lowest-rated area, so it comes first.'
  const rows: { icon: LucideIcon; label: string; value: string; step: number }[] = [
    { icon: UserRound, label: 'Role', value: p.name ? `${p.name} · ${ROLE_LABEL[p.role]}` : ROLE_LABEL[p.role], step: 1 },
    {
      icon: CalendarDays,
      label: 'Interview',
      value: p.date && p.days != null && p.days >= 0 ? `${prettyDate(p.date)} · ${daysAway(p.days)}` : 'Not scheduled',
      step: 2,
    },
    { icon: Target, label: 'Daily goal', value: `${g.label} · ${g.xp} XP`, step: 4 },
  ]
  return (
    <div className="onb-pad">
      <StepTitle title={p.name ? `Your plan, ${p.name}` : 'Your plan'} sub="Here is where you start. It adapts as you go." />
      {p.first && (
        <motion.section className="onb-first" style={courseStyle(p.first.course.color)} {...rise(1)}>
          <span className="onb-first__art">
            <CourseArt course={p.first.course} size={104} animated />
          </span>
          <span className="onb-first__main">
            <span className="onb-first__eyebrow">Start here</span>
            <b>{p.first.course.title}</b>
            <span className="onb-first__sub">{p.first.course.subtitle}</span>
            <span className="onb-first__why">{reason}</span>
          </span>
        </motion.section>
      )}
      <motion.div className="onb-sum" {...rise(2)}>
        {rows.map((r) => (
          <button key={r.label} type="button" className="onb-sum__row" onClick={() => p.onEdit(r.step)} aria-label={`${r.label}: ${r.value}. Edit`}>
            <span className="onb-sum__icon" aria-hidden>
              <r.icon size={18} strokeWidth={2.6} />
            </span>
            <span className="onb-sum__text">
              <span className="onb-sum__label">{r.label}</span>
              <span className="onb-sum__value">{r.value}</span>
            </span>
            <ChevronRight className="onb-sum__chev" size={18} strokeWidth={2.6} aria-hidden />
          </button>
        ))}
      </motion.div>
      <motion.h3 className="onb-how__title" {...rise(3)}>
        How review works
      </motion.h3>
      <ol className="onb-how">
        {[
          { icon: Sparkles, title: 'Lessons unlock cards', text: 'Finish a lesson and its key ideas join your review deck.' },
          { icon: Repeat, title: 'Cards return before you forget', text: 'Each one comes back on a schedule fitted to your memory.' },
          {
            icon: CalendarDays,
            title: p.date ? 'Tightens before the interview' : 'Aims for your date',
            text: p.date ? 'In the final two weeks reviews come sooner, so it is all fresh on the day.' : 'Add your interview date in Settings and the schedule will peak on it.',
          },
        ].map((x, i) => (
          <motion.li key={x.title} {...rise(i + 4)}>
            <span className="onb-how__n">{i + 1}</span>
            <span className="onb-how__text">
              <b>{x.title}</b>
              <span>{x.text}</span>
            </span>
          </motion.li>
        ))}
      </ol>
    </div>
  )
}
