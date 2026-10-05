import { motion } from 'motion/react'
import { useMemo, useState, type CSSProperties } from 'react'
import { BookOpen, Brain, Check, ChevronLeft, Clock, Code2, Layers, Lock, PenLine, Shield, Sparkles, Star, Target, Trophy, Zap, type LucideIcon } from 'lucide-react'
import { ACHIEVEMENTS, type Achievement } from '../core/achievements'
import { useStore, type GauntletState } from '../core/store'
import type { Catalog } from '../core/adaptive'
import { CATALOG } from '../content'
import { nav } from '../app/nav'
import { Button, IconButton } from '../ui/Button'
import { ProgressBar } from '../ui/ProgressBar'
import { Sheet } from '../ui/Sheet'
import { sfx } from '../ui/fx'
import './AchievementsScreen.css'

type AchIcon = Achievement['icon']

/**
 * Icon names in core/achievements.ts mapped to lucide glyphs. The lightning
 * bolt always means streak (as in the streak counter), so streak badges
 * ('flame') get the bolt and XP / combo badges ('zap') get the XP sparkle.
 */
export const ACH_ICONS: Record<AchIcon, LucideIcon> = {
  flame: Zap,
  zap: Sparkles,
  target: Target,
  brain: Brain,
  book: BookOpen,
  trophy: Trophy,
  star: Star,
  pen: PenLine,
  code: Code2,
  shield: Shield,
  clock: Clock,
  layers: Layers,
}

/** glyphs drawn solid rather than outlined */
const FILLED = new Set<AchIcon>(['flame', 'star'])

/** medal hue per icon: [face, pressed edge, glyph ink] */
const DARK_INK = 'color-mix(in srgb, var(--m-edge) 35%, #000)'
const HUE: Record<AchIcon, [string, string, string]> = {
  flame: ['var(--streak)', 'var(--streak-2)', DARK_INK],
  zap: ['var(--good)', 'var(--good-edge)', '#fff'],
  target: ['var(--c-rose)', 'var(--c-rose-edge)', '#fff'],
  brain: ['var(--c-violet)', 'var(--c-violet-edge)', '#fff'],
  book: ['var(--c-blue)', 'var(--c-blue-edge)', '#fff'],
  trophy: ['var(--c-amber)', 'var(--c-amber-edge)', DARK_INK],
  star: ['var(--c-amber)', 'var(--c-amber-edge)', DARK_INK],
  pen: ['var(--c-teal)', 'var(--c-teal-edge)', '#fff'],
  code: ['var(--c-green)', 'var(--c-green-edge)', '#fff'],
  shield: ['var(--c-indigo)', 'var(--c-indigo-edge)', '#fff'],
  clock: ['var(--c-orange)', 'var(--c-orange-edge)', '#fff'],
  layers: ['var(--c-blue)', 'var(--c-blue-edge)', '#fff'],
}

/** Glossy medallion for an achievement; grey with a lock while locked. */
export function Medal({ a, unlocked, size, className }: { a: Achievement; unlocked: boolean; size?: number; className?: string }) {
  const Icon = ACH_ICONS[a.icon] ?? Trophy
  const [m, edge, ink] = HUE[a.icon] ?? HUE.trophy
  const style: CSSProperties = { ['--m' as string]: m, ['--m-edge' as string]: edge, ['--m-ink' as string]: ink }
  if (size) {
    style.width = size
    style.height = size
  }
  return (
    <span className={['ach-medal', unlocked ? 'is-on' : 'is-locked', className].filter(Boolean).join(' ')} style={style} aria-hidden>
      <span className="ach-medal__disc" />
      <Icon className="ach-medal__icon" size="44%" strokeWidth={2.4} fill={FILLED.has(a.icon) && unlocked ? 'currentColor' : 'none'} />
      {!unlocked && (
        <span className="ach-medal__lock">
          <Lock size="58%" strokeWidth={3} />
        </span>
      )}
    </span>
  )
}

/** progress toward a locked achievement, when it is countable */
export function achievementProgress(id: string, s: GauntletState, cat: Catalog): { cur: number; goal: number; unit: string } | null {
  const completed = Object.values(s.lessons).filter((l) => l.completedAt).length
  const reviews = Object.values(s.days).reduce((a, d) => a + d.reviews, 0)
  const stories = Object.values(s.stories).filter((e) => e && Object.values(e.layers).filter((v) => v.trim().length > 20).length >= 2).length
  const course = (cid: string) => {
    const c = cat.courses.find((x) => x.id === cid)
    if (!c || !c.lessons.length) return null
    return { cur: c.lessons.filter((l) => s.lessons[l.id]?.completedAt).length, goal: c.lessons.length, unit: 'lessons' }
  }
  switch (id) {
    case 'first-step':
      return { cur: completed, goal: 1, unit: 'lesson' }
    case 'five-lessons':
      return { cur: completed, goal: 5, unit: 'lessons' }
    case 'twenty-lessons':
      return { cur: completed, goal: 20, unit: 'lessons' }
    case 'streak-3':
      return { cur: s.streak.best, goal: 3, unit: 'days' }
    case 'streak-7':
      return { cur: s.streak.best, goal: 7, unit: 'days' }
    case 'streak-30':
      return { cur: s.streak.best, goal: 30, unit: 'days' }
    case 'combo-10':
      return { cur: s.bestCombo, goal: 10, unit: 'in a row' }
    case 'reviews-50':
      return { cur: reviews, goal: 50, unit: 'reviews' }
    case 'reviews-250':
      return { cur: reviews, goal: 250, unit: 'reviews' }
    case 'story-1':
      return { cur: stories, goal: 1, unit: 'story' }
    case 'story-6':
      return { cur: stories, goal: 6, unit: 'stories' }
    case 'why-done':
      return course('why')
    case 'values-done':
      return course('values')
    case 'concurrency-done':
      return course('concurrency')
    case 'builds-done':
      return course('builds')
    case 'lab-1':
      return { cur: Math.max(0, ...Object.values(s.labs).map((l) => l.levelsPassed)), goal: 4, unit: 'levels' } // every lab has 4 levels
    case 'xp-1000':
      return { cur: s.xp, goal: 1000, unit: 'XP' }
    case 'night-owl':
      return { cur: Object.values(s.days).filter((d) => d.xp >= s.settings.dailyXpGoal).length, goal: 5, unit: 'days' }
    default:
      return null
  }
}

export function shortDate(t: number) {
  const d = new Date(t)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString('en-US', sameYear ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' })
}

const FRESH_MS = 2 * 86_400_000

export default function AchievementsScreen() {
  const s = useStore()
  const [openId, setOpenId] = useState<string | null>(null)
  const [now] = useState(() => Date.now())

  const { unlocked, locked, nextUp } = useMemo(() => {
    const unlocked = ACHIEVEMENTS.filter((a) => s.achievements[a.id]).sort((x, y) => s.achievements[y.id] - s.achievements[x.id])
    // closest to earning first, so the next badge is always at the top
    const frac = (a: Achievement) => {
      const p = achievementProgress(a.id, s, CATALOG)
      return p ? Math.min(1, p.cur / p.goal) : 0
    }
    const locked = ACHIEVEMENTS.filter((a) => !s.achievements[a.id])
      .map((a, i) => ({ a, i, f: frac(a) }))
      .sort((x, y) => y.f - x.f || x.i - y.i)
      .map((x) => x.a)
    let nextUp: { a: Achievement; frac: number } | null = null
    for (const a of locked) {
      const f = frac(a)
      if (f > 0 && f < 1 && (!nextUp || f > nextUp.frac)) nextUp = { a, frac: f }
    }
    if (!nextUp && locked[0]) nextUp = { a: locked[0], frac: 0 }
    return { unlocked, locked, nextUp }
  }, [s])

  const total = ACHIEVEMENTS.length
  const open = openId ? ACHIEVEMENTS.find((a) => a.id === openId) : undefined
  const openAt = open ? s.achievements[open.id] : undefined
  const openProg = open && !openAt ? achievementProgress(open.id, s, CATALOG) : null

  const badge = (a: Achievement, i: number) => {
    const at = s.achievements[a.id]
    const prog = at ? null : achievementProgress(a.id, s, CATALOG)
    const frac = prog ? Math.min(1, prog.cur / prog.goal) : 0
    return (
      <motion.button
        key={a.id}
        type="button"
        className={`ach-badge ${at ? 'is-on' : 'is-locked'}`}
        onClick={() => {
          sfx(at ? 'unlock' : 'tap')
          setOpenId(a.id)
        }}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 460, damping: 26, delay: Math.min(i, 14) * 0.025 }}
        whileTap={{ scale: 0.94 }}
        aria-label={`${a.title}${at ? `, unlocked ${shortDate(at)}` : ', locked'}. ${a.desc}${prog && frac > 0 ? `. ${Math.min(prog.cur, prog.goal)} of ${prog.goal} ${prog.unit}` : ''}`}
      >
        <span className="ach-badge__art">
          <Medal a={a} unlocked={!!at} />
          {at && now - at < FRESH_MS && <span className="ach-badge__new">New</span>}
        </span>
        <span className="ach-badge__title">{a.title}</span>
        <span className="ach-badge__sub">{at ? shortDate(at) : a.desc}</span>
        {prog && frac > 0 && (
          <span className="ach-badge__prog" aria-hidden>
            <i style={{ width: `${Math.max(6, frac * 100)}%` }} />
          </span>
        )}
      </motion.button>
    )
  }

  return (
    <div className="ach">
      <header className="ach-head safe-top">
        <IconButton label="Back" className="ach-head__back" onClick={nav.back}>
          <ChevronLeft size={28} strokeWidth={2.6} />
        </IconButton>
        <h1>Achievements</h1>
        <span className="ach-head__spacer" />
      </header>
      <div className="ach-scroll scroll">
        <div className="ach-body">
          <section className="ach-summary">
            <span className="ach-summary__art" aria-hidden>
              <Trophy size={34} strokeWidth={2.4} />
            </span>
            <div className="ach-summary__main">
              <div className="ach-summary__count">
                <b className="tabular">{unlocked.length}</b> of {total} unlocked
              </div>
              <ProgressBar value={unlocked.length / total} tone="good" height={10} label="Achievements unlocked" />
              {nextUp && (
                <div className="ach-summary__next">
                  Next up: <b>{nextUp.a.title}</b>
                </div>
              )}
            </div>
          </section>

          {unlocked.length > 0 && (
            <section className="ach-sec">
              <h2 className="eyebrow">Unlocked</h2>
              <div className="ach-grid">{unlocked.map((a, i) => badge(a, i))}</div>
            </section>
          )}
          {locked.length > 0 && (
            <section className="ach-sec">
              <h2 className="eyebrow">{unlocked.length ? 'Still to earn' : 'Your first badges'}</h2>
              <div className="ach-grid">{locked.map((a, i) => badge(a, unlocked.length + i))}</div>
            </section>
          )}
        </div>
      </div>

      <Sheet open={!!open} onClose={() => setOpenId(null)} label={open?.title}>
        {open && (
          <div className="ach-sheet">
            <div className={`ach-sheet__art ${openAt ? 'is-on' : ''}`}>
              {openAt && <span className="ach-sheet__rays" aria-hidden />}
              <motion.span
                initial={{ scale: 0.5, rotate: -18 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 14 }}
              >
                <Medal a={open} unlocked={!!openAt} size={116} />
              </motion.span>
            </div>
            <div className="eyebrow">{openAt ? 'Achievement' : 'Locked'}</div>
            <h3>{open.title}</h3>
            <p className="ach-sheet__desc">{open.desc}</p>
            {openAt ? (
              <span className="ach-sheet__date">
                <Check size={16} strokeWidth={3} />
                Earned {new Date(openAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            ) : (
              openProg && (
                <div className="ach-sheet__prog">
                  <ProgressBar value={openProg.cur / openProg.goal} tone="good" height={10} label="Progress" />
                  <span className="tabular">
                    {Math.min(openProg.cur, openProg.goal).toLocaleString('en-US')} / {openProg.goal.toLocaleString('en-US')} {openProg.unit}
                  </span>
                </div>
              )
            )}
            <Button block size="lg" onClick={() => setOpenId(null)}>
              {openAt ? 'Nice' : 'Got it'}
            </Button>
          </div>
        )}
      </Sheet>
    </div>
  )
}
