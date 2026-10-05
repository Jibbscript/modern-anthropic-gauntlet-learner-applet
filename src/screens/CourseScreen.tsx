import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Check, ChevronLeft, Clock, Dumbbell, Footprints, Layers, Lock, Play, RotateCcw, Star, Trophy } from 'lucide-react'
import type { AreaId, Course, Lesson } from '../core/types'
import { useStore, type GauntletState } from '../core/store'
import { areaMastery, buildSession, courseProgress, lessonStatus, skillMastery, type LessonStatus } from '../core/adaptive'
import { CATALOG, COURSES } from '../content'
import { SKILLS } from '../content/skills'
import { nav } from '../app/nav'
import { useClock } from '../app/clock'
import { Button, IconButton } from '../ui/Button'
import { ProgressBar } from '../ui/ProgressBar'
import { Rich } from '../ui/Rich'
import { Ring } from '../ui/Ring'
import { Sheet } from '../ui/Sheet'
import { CourseArt } from '../ui/CourseArt'
import { courseStyle } from '../ui/course'
import { haptic, sfx } from '../ui/fx'
import './CourseScreen.css'

/* ---------------------------------------------------------------- model */

type NodeStatus = LessonStatus | 'soon'

interface PathNode {
  lesson: Lesson
  index: number
  status: NodeStatus
  level: number
}

const hasSteps = (l: Lesson) => l.steps.length > 0
const LEVEL_NAMES = ['Foundations', 'Going deeper', 'Interview ready', 'Mastery']

/**
 * Node states from lessonStatus(), computed over the authored lessons only so
 * an unwritten lesson never blocks the ones after it; unwritten lessons show
 * as "Coming soon".
 */
function pathNodes(s: GauntletState, course: Course): PathNode[] {
  const playable: Course = { ...course, lessons: course.lessons.filter(hasSteps) }
  const current = playable.lessons.find((l) => !s.lessons[l.id]?.completedAt)?.id ?? null
  const n = course.lessons.length
  const levels = n <= 4 ? 1 : Math.ceil(n / 4)
  const per = Math.ceil(n / levels)
  return course.lessons.map((lesson, index) => {
    let status: NodeStatus
    if (s.lessons[lesson.id]?.completedAt) status = 'done'
    else if (!hasSteps(lesson)) status = 'soon'
    else status = lessonStatus(s, playable, playable.lessons.indexOf(lesson), current)
    return { lesson, index, status, level: Math.floor(index / per) }
  })
}

function stars(acc: number): number {
  return acc >= 0.999 ? 3 : acc >= 0.8 ? 2 : 1
}

/* --------------------------------------------------------------- layout */

const SPACING = 132
const TOP_PAD = 36

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [w, setW] = useState(350)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    // content-box width (the levels container carries the side gutter as padding)
    const measure = () => {
      const cs = getComputedStyle(el)
      setW(el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

function geometry(width: number) {
  const puck = width >= 330 ? 88 : 78
  const amp = Math.max(16, Math.min(44, width * 0.12))
  const cx = puck / 2 + amp + 6
  const x = (i: number) => cx + Math.sin(i * 0.9) * amp
  return { puck, amp, cx, x }
}

/* ----------------------------------------------------------------- puck */

function Puck({ status, size, progress = 0 }: { status: NodeStatus; size: number; progress?: number }) {
  // drawn in a 92x64 box: top face ellipse (rx 44, ry 22) sitting on a 12px rim
  const h = (size / 92) * 64
  const ring = 2 * Math.PI * 27
  return (
    <svg className={`cs-puck cs-puck--${status}`} width={size} height={h} viewBox="0 0 92 64" aria-hidden="true">
      <ellipse className="cs-puck__shadow" cx="46" cy="52" rx="42" ry="10" />
      <path className="cs-puck__rim" d="M2,24 L2,36 A44,22 0 0 0 90,36 L90,24 Z" />
      <g className="cs-puck__top">
        <ellipse className="cs-puck__face" cx="46" cy="24" rx="44" ry="22" />
        <ellipse className="cs-puck__gloss" cx="40" cy="15" rx="26" ry="8" />
        {status === 'current' && (
          <>
            <ellipse className="cs-puck__portal cs-puck__portal--1" cx="46" cy="24" rx="33" ry="16.5" />
            <ellipse className="cs-puck__portal cs-puck__portal--2" cx="46" cy="24" rx="22" ry="11" />
            <ellipse className="cs-puck__portal cs-puck__portal--3" cx="46" cy="24" rx="11" ry="5.5" />
            {progress > 0 && (
              <circle
                className="cs-puck__prog"
                cx="46"
                cy="24"
                r="27"
                transform="translate(46 24) scale(1 0.5) rotate(-90) translate(-46 -24)"
                strokeDasharray={`${ring * progress} ${ring}`}
              />
            )}
          </>
        )}
        {status === 'done' && <path className="cs-puck__check" d="M33,24 L42,30.5 L59,17" />}
        {(status === 'available' || status === 'locked' || status === 'soon') && <ellipse className="cs-puck__inner" cx="46" cy="24" rx="27" ry="13.5" />}
      </g>
    </svg>
  )
}

function Stars({ n }: { n: number }) {
  return (
    <span className="cs-stars" aria-label={`${n} of 3 stars`}>
      {[0, 1, 2].map((i) => (
        <Star key={i} size={13} strokeWidth={2.4} className={i < n ? 'is-on' : ''} fill={i < n ? 'currentColor' : 'none'} />
      ))}
    </span>
  )
}

function PathNodeView({
  node,
  s,
  x,
  y,
  puck,
  width,
  onOpen,
  nodeRef,
}: {
  node: PathNode
  s: GauntletState
  x: number
  y: number
  puck: number
  width: number
  onOpen: () => void
  nodeRef?: (el: HTMLDivElement | null) => void
}) {
  const { lesson, status, index } = node
  const prog = s.lessons[lesson.id]
  const resume = status === 'current' && !!prog && prog.resumeStep > 0
  const progress = resume ? Math.min(1, prog.resumeStep / Math.max(1, lesson.steps.length)) : 0
  const labelLeft = x + puck / 2 + (status === 'current' ? 18 : 12)
  const ph = (puck / 92) * 64
  let sub: ReactNode
  if (status === 'done') {
    sub = (
      <>
        <Stars n={stars(prog?.bestAccuracy ?? 0)} />
        <span className="tabular">{Math.round((prog?.bestAccuracy ?? 0) * 100)}%</span>
      </>
    )
  } else if (status === 'soon') sub = <span>Coming soon</span>
  else if (status === 'locked') sub = <span>Lesson {index + 1}</span>
  else
    sub = (
      <span className="tabular">
        {resume ? `${Math.round(progress * 100)}% done` : `Lesson ${index + 1}`} · {lesson.minutes} min
      </span>
    )

  return (
    <div className={`cs-node cs-node--${status}`} style={{ top: y }} ref={nodeRef}>
      <motion.button
        type="button"
        className="cs-node__btn"
        style={{ left: x - puck / 2, width: puck, height: ph }}
        onClick={onOpen}
        aria-label={`Lesson ${index + 1}, ${lesson.title}: ${
          status === 'done'
            ? `completed, best ${Math.round((prog?.bestAccuracy ?? 0) * 100)}%`
            : status === 'soon'
              ? 'coming soon'
              : status === 'locked'
                ? 'locked'
                : resume
                  ? `in progress, ${Math.round(progress * 100)}% done`
                  : status === 'current'
                    ? 'up next'
                    : 'ready to start'
        }`}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 460, damping: 20, delay: 0.08 + index * 0.05 }}
        key={`${lesson.id}:${status}`}
      >
        {status === 'current' && (
          <>
            <span className="cs-node__beam" aria-hidden="true" />
            <span className="cs-node__halo" aria-hidden="true" />
            <span className="cs-node__halo cs-node__halo--2" aria-hidden="true" />
          </>
        )}
        <Puck status={status} size={puck} progress={progress} />
        {status === 'locked' && (
          <span className="cs-node__lock" aria-hidden="true">
            <Lock size={14} strokeWidth={2.8} />
          </span>
        )}
        {status === 'soon' && (
          <span className="cs-node__soon" aria-hidden="true">
            <Clock size={16} strokeWidth={2.6} />
          </span>
        )}
        {status === 'current' && (
          <motion.span
            className="cs-node__bubble"
            aria-hidden="true"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            {resume ? 'Resume' : 'Start'}
          </motion.span>
        )}
      </motion.button>
      <button
        type="button"
        className="cs-node__label"
        style={{ left: labelLeft, width: Math.max(80, width - labelLeft), top: ph * 0.42 }}
        onClick={onOpen}
        tabIndex={-1}
        aria-hidden="true"
      >
        <span className="cs-node__title">{lesson.title}</span>
        <span className="cs-node__sub">{sub}</span>
      </button>
    </div>
  )
}

/* --------------------------------------------------------------- level */

function Level({
  level,
  nodes,
  s,
  width,
  geo,
  onOpen,
  currentRef,
}: {
  level: number
  nodes: PathNode[]
  s: GauntletState
  width: number
  geo: ReturnType<typeof geometry>
  onOpen: (n: PathNode) => void
  currentRef: (el: HTMLDivElement | null) => void
}) {
  const done = nodes.filter((n) => n.status === 'done').length
  const complete = done === nodes.length
  const ph = (geo.puck / 92) * 64
  // leave headroom for the floating Start bubble when a level opens on the current lesson
  const top = nodes[0]?.status === 'current' ? TOP_PAD + 44 : TOP_PAD
  const ys = nodes.map((_, i) => top + i * SPACING)
  const height = top + (nodes.length - 1) * SPACING + ph + 36
  const cy = ph * 0.6
  // dotted connectors between consecutive nodes; a segment is lit once its start is done
  const segs = nodes.slice(0, -1).map((n, i) => {
    const x1 = geo.x(n.index)
    const y1 = ys[i] + cy
    const x2 = geo.x(nodes[i + 1].index)
    const y2 = ys[i + 1] + cy
    const my = (y2 - y1) * 0.5
    return { d: `M${x1},${y1} C${x1},${y1 + my} ${x2},${y2 - my} ${x2},${y2}`, lit: n.status === 'done', key: n.lesson.id }
  })
  return (
    <section className="cs-level" aria-label={`Level ${level + 1}`}>
      <div className="cs-level__head">
        <div className="cs-level__text">
          <span className="cs-level__eyebrow">Level {level + 1}</span>
          <span className="cs-level__title">{LEVEL_NAMES[level] ?? `Level ${level + 1}`}</span>
        </div>
        {complete ? (
          <span className="cs-level__done">
            <Check size={14} strokeWidth={3.2} /> Complete
          </span>
        ) : (
          <span className="cs-level__count tabular">
            {done}/{nodes.length}
          </span>
        )}
      </div>
      <div className="cs-path" style={{ height }}>
        <svg className="cs-path__line" width={width} height={height} aria-hidden="true">
          {segs.map((sg) => (
            <path key={sg.key} d={sg.d} className={sg.lit ? 'is-lit' : ''} />
          ))}
        </svg>
        {nodes.map((n, i) => (
          <PathNodeView
            key={n.lesson.id}
            node={n}
            s={s}
            x={geo.x(n.index)}
            y={ys[i]}
            puck={geo.puck}
            width={width}
            onOpen={() => onOpen(n)}
            nodeRef={n.status === 'current' ? currentRef : undefined}
          />
        ))}
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------- sheet */

function NodeSheet({ node, course, s, onClose }: { node: PathNode; course: Course; s: GauntletState; onClose: () => void }) {
  const { lesson, status, index } = node
  // the playable lesson right before this one (unwritten lessons never gate the path)
  const blocker = course.lessons.slice(0, index).reverse().find((l) => hasSteps(l) && !s.lessons[l.id]?.completedAt)
  const prog = s.lessons[lesson.id]
  const resume = !!prog && !prog.completedAt && prog.resumeStep > 0
  const skills = lesson.skills.map((id) => SKILLS.find((k) => k.id === id)).filter((k): k is NonNullable<typeof k> => !!k)
  const steps = lesson.steps.length
  const start = () => {
    onClose()
    nav.openLesson(lesson.id)
  }

  let statusLine: ReactNode
  if (status === 'done')
    statusLine = (
      <>
        <span className="cs-sheet__status-icon is-done">
          <Check size={14} strokeWidth={3.2} />
        </span>
        <span>
          Completed{prog && prog.completions > 1 ? ` ${prog.completions} times` : ''} · best <b className="tabular">{Math.round((prog?.bestAccuracy ?? 0) * 100)}%</b>
        </span>
        <Stars n={stars(prog?.bestAccuracy ?? 0)} />
      </>
    )
  else if (status === 'locked')
    statusLine = (
      <>
        <span className="cs-sheet__status-icon is-locked">
          <Lock size={13} strokeWidth={2.8} />
        </span>
        <span>{blocker ? <>Unlocks when you finish <b>{blocker.title}</b></> : 'Locked until you finish the lesson before it'}</span>
      </>
    )
  else if (status === 'soon')
    statusLine = (
      <>
        <span className="cs-sheet__status-icon">
          <Clock size={14} strokeWidth={2.6} />
        </span>
        <span>This lesson is still being written</span>
      </>
    )
  else if (resume)
    statusLine = (
      <>
        <span className="cs-sheet__status-icon is-now">
          <Play size={12} strokeWidth={3} fill="currentColor" />
        </span>
        <span className="tabular">
          In progress · step {Math.min(prog.resumeStep + 1, steps)} of {steps}
        </span>
      </>
    )
  else
    statusLine = (
      <>
        <span className="cs-sheet__status-icon is-now">
          <Play size={12} strokeWidth={3} fill="currentColor" />
        </span>
        <span>{status === 'current' ? 'Up next on your path' : 'Ready to start'}</span>
      </>
    )

  return (
    <div className="cs-sheet" style={courseStyle(course.color)}>
      <div className="cs-sheet__head">
        <div className="cs-sheet__puck">
          <Puck status={status} size={64} progress={resume ? prog.resumeStep / Math.max(1, steps) : 0} />
        </div>
        <div className="cs-sheet__titles">
          <span className="cs-sheet__eyebrow">
            {course.title} · Lesson {index + 1}
          </span>
          <h2>{lesson.title}</h2>
        </div>
      </div>
      {lesson.summary ? <p className="cs-sheet__summary">{lesson.summary}</p> : null}
      <div className="cs-sheet__meta">
        <span className="chip">
          <Clock size={13} strokeWidth={2.6} /> {lesson.minutes} min
        </span>
        {steps > 0 && (
          <span className="chip tabular">
            <Footprints size={13} strokeWidth={2.6} /> {steps} steps
          </span>
        )}
        {lesson.cards.length > 0 && (
          <span className="chip tabular">
            <Layers size={13} strokeWidth={2.6} /> {lesson.cards.length} review cards
          </span>
        )}
      </div>
      {skills.length > 0 && (
        <div className="cs-sheet__skills">
          {skills.map((k) => (
            <span key={k.id} className="chip chip--course">
              {k.name}
            </span>
          ))}
        </div>
      )}
      <div className="cs-sheet__status">{statusLine}</div>
      {status === 'locked' ? (
        <Button block disabled icon={<Lock size={18} strokeWidth={2.6} />}>
          Finish the previous lesson first
        </Button>
      ) : status === 'soon' ? (
        <Button block disabled>
          Coming soon
        </Button>
      ) : status === 'done' ? (
        <Button variant="course" block onClick={start} icon={<RotateCcw size={18} strokeWidth={2.6} />}>
          Practice again
        </Button>
      ) : (
        <Button variant="course" block onClick={start}>
          {resume ? 'Resume' : 'Start'}
        </Button>
      )}
    </div>
  )
}

/* --------------------------------------------------------------- screen */

export default function CourseScreen({ courseId }: { courseId: AreaId }) {
  const s = useStore()
  const course = COURSES.find((c) => c.id === courseId) ?? COURSES[0]
  const [openId, setOpenId] = useState<string | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const currentEl = useRef<HTMLDivElement | null>(null)

  // a pushed page takes keyboard focus, so Tab doesn't wander the Learn tab underneath
  useEffect(() => {
    rootRef.current?.querySelector<HTMLElement>('.cs-top__back')?.focus({ preventScroll: true })
  }, [])
  const [pathRef, width] = useWidth<HTMLDivElement>()

  const nodes = useMemo(() => pathNodes(s, course), [s, course])
  // the sheet reads the live node, so it never shows a stale status
  const open = openId ? (nodes.find((n) => n.lesson.id === openId) ?? null) : null
  const levels = useMemo(() => {
    const out: PathNode[][] = []
    for (const n of nodes) (out[n.level] ??= []).push(n)
    return out
  }, [nodes])
  const { done, total } = courseProgress(s, course)
  const now = useClock()
  const mastery = useMemo(() => areaMastery(s, CATALOG, now)[course.id], [s, course.id, now])
  const skillM = useMemo(() => skillMastery(s, CATALOG, now), [s, now])
  const skills = SKILLS.filter((k) => k.area === course.id)
  const geo = geometry(width)
  const steps = course.lessons.reduce((a, l) => a + l.steps.length, 0)
  const minutes = course.lessons.reduce((a, l) => a + l.minutes, 0)
  const complete = total > 0 && done === total
  const unlockedCards = Object.keys(s.cards).filter((id) => CATALOG.lessons[CATALOG.cards[id]?.lessonId]?.courseId === course.id)
  const courseIndex = COURSES.indexOf(course)

  // bring the current node into view once the page has slid in, and again
  // when finishing a lesson moves "current" further down the path
  const currentId = nodes.find((n) => n.status === 'current')?.lesson.id ?? null
  const mounted = useRef(false)
  useEffect(() => {
    const first = !mounted.current
    mounted.current = true
    const t = setTimeout(
      () => {
        const sc = scrollRef.current
        const el = currentEl.current
        if (!sc || !el) return
        const r = el.getBoundingClientRect()
        const box = sc.getBoundingClientRect()
        const top = r.top - box.top + sc.scrollTop
        const visible = r.top - box.top > 90 && r.top - box.top + 120 < sc.clientHeight
        if (first ? top + 120 > sc.clientHeight * 0.85 : !visible) sc.scrollTo({ top: Math.max(0, top - sc.clientHeight * 0.42), behavior: 'smooth' })
      },
      first ? 480 : 700,
    )
    return () => clearTimeout(t)
  }, [currentId])

  const practice = () => {
    const st = useStore.getState()
    let ids = buildSession(st, CATALOG, Date.now(), { area: course.id, topUp: true }).cardIds
    if (!ids.length) ids = unlockedCards.slice(0, st.settings.sessionSize)
    if (ids.length) nav.openReview(ids, `${course.title} practice`)
  }

  const openNode = (n: PathNode) => {
    sfx('tap')
    haptic('light')
    setOpenId(n.lesson.id)
  }

  return (
    <div className={`cs cs--${course.color}`} style={courseStyle(course.color) as CSSProperties} ref={rootRef}>
      <header className={`cs-top safe-top ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="cs-top__row">
          <IconButton label="Back" className="cs-top__back" onClick={() => nav.back()}>
            <ChevronLeft size={26} strokeWidth={2.6} />
          </IconButton>
          <div className="cs-top__title">{course.title}</div>
          <span className="cs-top__count tabular" aria-label={`${done} of ${total} lessons done`}>
            {done}/{total}
          </span>
        </div>
      </header>

      <div className="scroll cs-scroll" ref={scrollRef} onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 150)}>
        <section className="cs-hero">
          <motion.div
            className="cs-hero__art"
            initial={{ scale: 0.85, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          >
            <CourseArt course={course} size={184} animated />
          </motion.div>
          <motion.div className="cs-hero__text" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, type: 'spring', stiffness: 380, damping: 30 }}>
            <span className="cs-hero__eyebrow">Course {courseIndex + 1}</span>
            <h1 className="cs-hero__title">{course.title}</h1>
            <p className="cs-hero__sub">{course.subtitle}</p>
            <p className="cs-hero__meta tabular">
              {total} lesson{total === 1 ? '' : 's'}
              {steps > 0 && ` · ${steps} steps`}
              {minutes > 0 && ` · ${minutes} min`}
            </p>
          </motion.div>
          {course.why ? <Rich text={course.why} className="cs-hero__why" /> : null}
          <motion.div className="cs-hero__stats" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14, type: 'spring', stiffness: 380, damping: 30 }}>
            <div className="cs-hero__prog">
              <div className="cs-hero__prog-label">
                <b className="tabular">
                  {done} of {total}
                </b>{' '}
                lessons {complete ? 'complete' : 'done'}
              </div>
              <ProgressBar value={total ? done / total : 0} tone="course" height={10} label="Course progress" />
            </div>
            <div className="cs-hero__mastery">
              <Ring value={mastery?.mastery ?? 0} size={56} stroke={6} color="var(--c)" label={`Mastery ${Math.round((mastery?.mastery ?? 0) * 100)}%`}>
                <span className="cs-hero__mastery-num tabular">{Math.round((mastery?.mastery ?? 0) * 100)}%</span>
              </Ring>
              <span className="cs-hero__mastery-label">Mastery</span>
            </div>
          </motion.div>
        </section>

        <div className="cs-levels" ref={pathRef}>
          {levels.map((lv, i) => (
            <Level key={i} level={i} nodes={lv} s={s} width={width} geo={geo} onOpen={openNode} currentRef={(el) => (currentEl.current = el)} />
          ))}
          {total > 0 && (
            <div className={`cs-finish ${complete ? 'is-complete' : ''}`}>
              <div className="cs-finish__badge" style={{ marginLeft: geo.x(total) - 30 }}>
                <Trophy size={28} strokeWidth={2.2} />
              </div>
              <div className="cs-finish__text">
                <b>{complete ? 'Course complete' : 'Finish line'}</b>
                <span>{complete ? 'Every lesson done. Reviews keep it fresh.' : `${total - done} lesson${total - done === 1 ? '' : 's'} to go`}</span>
              </div>
            </div>
          )}
          {total === 0 && <p className="cs-empty">Lessons for this course are on the way.</p>}
        </div>

        <section className="cs-skills" aria-label="Skills in this course">
          <h2>Skills in this course</h2>
          <ul className="cs-skills__list">
            {skills.map((k) => {
              const m = skillM[k.id]
              const pct = Math.round((m?.mastery ?? 0) * 100)
              return (
                <li key={k.id} className="cs-skill">
                  <div className="cs-skill__top">
                    <span className="cs-skill__name">{k.name}</span>
                    <span className="cs-skill__pct tabular">{m && m.unlocked > 0 ? `${pct}%` : '—'}</span>
                  </div>
                  <span className="cs-skill__blurb">{k.blurb}</span>
                  <ProgressBar value={m?.mastery ?? 0} tone="course" height={8} label={`${k.name} mastery`} />
                </li>
              )
            })}
          </ul>
          {unlockedCards.length > 0 ? (
            <Button variant="secondary" block onClick={practice} icon={<Dumbbell size={20} strokeWidth={2.4} />}>
              Practice this course
            </Button>
          ) : (
            <p className="cs-skills__hint">Finish a lesson to unlock practice cards for these skills.</p>
          )}
        </section>
      </div>

      <Sheet open={open !== null} onClose={() => setOpenId(null)} label={open?.lesson.title}>
        <AnimatePresence>{open && <NodeSheet node={open} course={course} s={s} onClose={() => setOpenId(null)} />}</AnimatePresence>
      </Sheet>
    </div>
  )
}
