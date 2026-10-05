import { createContext, useContext, useId, type ReactNode } from 'react'
import type { AreaId, Course } from '../core/types'
import { courseStyle } from './course'
import './CourseArt.css'

/**
 * Glossy isometric illustration for a course. Everything is drawn in the
 * course hue (--c / --c-edge) with lighter top faces, darker sides, a gloss
 * highlight and a soft ground shadow, so one component covers every course
 * in both themes. `animated` adds a gentle float plus one small ambient
 * motion per course (all CSS, switched off by reduced-motion settings).
 */

/* ------------------------------------------------------------ iso maths */

type Pt = [number, number]
type Tone = 'c' | 'c2' | 'deep' | 'soft' | 'paper' | 'gold' | 'screen'

const OX = 80
const OY = 104
const SQ2 = Math.SQRT2

/** 2:1 dimetric projection: +x runs right-down, +y runs left-down, +z up */
const P = (x: number, y: number, z = 0): Pt => [OX + x - y, OY + (x + y) / 2 - z]
const pts = (ps: Pt[]) => ps.map(([a, b]) => `${r1(a)},${r1(b)}`).join(' ')
const r1 = (n: number) => Math.round(n * 10) / 10

/** SVG matrices that map a flat 2D drawing onto a box face (local y runs down). */
const onTop = (x: number, y: number, z: number) => {
  const [e, f] = P(x, y, z)
  return `matrix(1 0.5 -1 0.5 ${r1(e)} ${r1(f)})`
}
/** the +y face (front-left); origin = top-left corner of the face */
const onFront = (x: number, yFront: number, zTop: number) => {
  const [e, f] = P(x, yFront, zTop)
  return `matrix(1 0.5 0 1 ${r1(e)} ${r1(f)})`
}
/** the +x face (front-right); origin = top-left corner of the face as seen */
const onSide = (xRight: number, yFront: number, zTop: number) => {
  const [e, f] = P(xRight, yFront, zTop)
  return `matrix(1 -0.5 0 1 ${r1(e)} ${r1(f)})`
}

/* ---------------------------------------------------------- primitives */

const Ctx = createContext('ca')
const useGid = () => useContext(Ctx)

function Box({
  x,
  y,
  z,
  w,
  d,
  h,
  tone = 'c',
  gloss = true,
  rim = true,
  className,
  children,
}: {
  x: number
  y: number
  z: number
  w: number
  d: number
  h: number
  tone?: Tone
  gloss?: boolean
  rim?: boolean
  className?: string
  children?: ReactNode
}) {
  const id = useGid()
  const top = [P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)]
  const left = [P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)]
  const right = [P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)]
  return (
    <g className={['ca-solid', `ca-${tone}`, className].filter(Boolean).join(' ')}>
      <polygon className="ca-fl" points={pts(left)} />
      <polygon className="ca-sheen" points={pts(left)} fill={`url(#${id}-sheen)`} />
      <polygon className="ca-fr" points={pts(right)} />
      <polygon className="ca-ft" points={pts(top)} />
      {gloss && <polygon className="ca-gloss" points={pts(top)} fill={`url(#${id}-gloss)`} />}
      {rim && <polyline className="ca-rim" points={pts([P(x, y + d, z + h), P(x + w, y + d, z + h), P(x + w, y, z + h)])} />}
      {children}
    </g>
  )
}

function Cyl({ x, y, z, r, h, tone = 'c', className }: { x: number; y: number; z: number; r: number; h: number; tone?: Tone; className?: string }) {
  const id = useGid()
  const [cx, by] = P(x, y, z)
  const ty = by - h
  const rx = r * SQ2
  const ry = rx / 2
  const side = `M${r1(cx - rx)},${r1(ty)} L${r1(cx - rx)},${r1(by)} A${r1(rx)},${r1(ry)} 0 0 0 ${r1(cx + rx)},${r1(by)} L${r1(cx + rx)},${r1(ty)} Z`
  return (
    <g className={['ca-solid', `ca-${tone}`, className].filter(Boolean).join(' ')}>
      <path className="ca-fl" d={side} />
      <path className="ca-sheen" d={side} fill={`url(#${id}-cyl)`} />
      <ellipse className="ca-ft" cx={r1(cx)} cy={r1(ty)} rx={r1(rx)} ry={r1(ry)} />
      <ellipse className="ca-gloss" cx={r1(cx)} cy={r1(ty)} rx={r1(rx)} ry={r1(ry)} fill={`url(#${id}-gloss)`} />
    </g>
  )
}

function Ball({ cx, cy, r, tone = 'gold', className }: { cx: number; cy: number; r: number; tone?: 'c' | 'gold' | 'paper'; className?: string }) {
  const id = useGid()
  return (
    <g className={className}>
      <circle cx={r1(cx)} cy={r1(cy)} r={r} fill={`url(#${id}-ball-${tone})`} />
      <ellipse cx={r1(cx - r * 0.32)} cy={r1(cy - r * 0.4)} rx={r * 0.34} ry={r * 0.22} className="ca-spec" />
    </g>
  )
}

function Shadow({ cx, cy, rx, ry }: { cx: number; cy: number; rx: number; ry: number }) {
  const id = useGid()
  return <ellipse className="ca-shadow" cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${id}-shadow)`} />
}

function Spark({ x, y, s = 5, tone = 'paper', delay = 0 }: { x: number; y: number; s?: number; tone?: 'paper' | 'gold' | 'c'; delay?: number }) {
  const k = s * 0.22
  const d = `M${x},${y - s} Q${x + k},${y - k} ${x + s},${y} Q${x + k},${y + k} ${x},${y + s} Q${x - k},${y + k} ${x - s},${y} Q${x - k},${y - k} ${x},${y - s} Z`
  return <path className={`ca-spark ca-spark--${tone}`} d={d} style={{ animationDelay: `${delay}s` }} />
}

function Defs() {
  const id = useGid()
  return (
    <defs>
      <linearGradient id={`${id}-gloss`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity="0.62" />
        <stop offset="0.75" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
      <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity="0.22" />
        <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
      <linearGradient id={`${id}-cyl`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
        <stop offset="0.42" stopColor="#fff" stopOpacity="0" />
        <stop offset="0.6" stopColor="#000" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity="0.22" />
      </linearGradient>
      <linearGradient id={`${id}-face`} x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0" className="ca-c" style={{ stopColor: 'var(--t)' }} />
        <stop offset="0.6" className="ca-c" style={{ stopColor: 'var(--l)' }} />
        <stop offset="1" className="ca-c" style={{ stopColor: 'var(--r)' }} />
      </linearGradient>
      <radialGradient id={`${id}-shadow`}>
        <stop offset="0" className="ca-shadow-stop" />
        <stop offset="1" className="ca-shadow-stop" stopOpacity="0" />
      </radialGradient>
      {(['c', 'gold', 'paper'] as const).map((t) => (
        <radialGradient key={t} id={`${id}-ball-${t}`} className={`ca-${t}`} cx="0.38" cy="0.34" r="0.72">
          <stop offset="0" style={{ stopColor: 'var(--t)' }} />
          <stop offset="0.55" style={{ stopColor: 'var(--l)' }} />
          <stop offset="1" style={{ stopColor: 'var(--r)' }} />
        </radialGradient>
      ))}
    </defs>
  )
}

/* -------------------------------------------------------- compositions */

/** map: a winding route with checkpoints across a floating tile */
function MapArt() {
  const route: [number, number][] = [
    [-26, 24],
    [4, 24],
    [12, 6],
    [-10, -2],
    [-14, -20],
    [14, -24],
  ]
  const z = 10
  // Catmull-Rom through the route (in plan), projected: affine maps keep Béziers exact
  const proj = route.map(([x, y]) => P(x, y, z))
  let d = `M${r1(proj[0][0])},${r1(proj[0][1])}`
  for (let i = 0; i < proj.length - 1; i++) {
    const p0 = proj[i - 1] ?? proj[i]
    const p1 = proj[i]
    const p2 = proj[i + 1]
    const p3 = proj[i + 2] ?? p2
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C${r1(c1[0])},${r1(c1[1])} ${r1(c2[0])},${r1(c2[1])} ${r1(p2[0])},${r1(p2[1])}`
  }
  const [fx, fy] = P(14, -24, z)
  return (
    <>
      <Shadow cx={80} cy={142} rx={66} ry={14} />
      <g className="ca-float">
        <Box x={-36} y={-36} z={0} w={72} h={z} d={72} tone="soft" />
        {/* little blocks scattered on the tile */}
        <Box x={18} y={14} z={z} w={9} d={9} h={9} tone="c2" />
        <Box x={-30} y={-30} z={z} w={8} d={8} h={6} tone="c2" />
        <Box x={24} y={-6} z={z} w={6} d={6} h={13} tone="c" />
        <path d={d} className="ca-road-edge" transform="translate(0 1.6)" />
        <path d={d} className="ca-road" />
        <path d={d} className="ca-road-dash" />
        {/* start disc */}
        <Cyl x={-26} y={24} z={z} r={4.6} h={2.5} tone="gold" />
        {/* checkpoints */}
        <Cyl x={12} y={6} z={z} r={4} h={7} tone="c" />
        <Cyl x={-14} y={-20} z={z} r={4} h={7} tone="c" />
        {/* finish flag */}
        <Box x={13.2} y={-24.8} z={z} w={1.8} d={1.8} h={30} tone="paper" gloss={false} rim={false} />
        <path className="ca-flag" d={`M${fx + 1},${fy - 30} L${fx + 20},${fy - 25.5} L${fx + 1},${fy - 19} Z`} />
      </g>
      <Spark x={130} y={40} s={6} delay={0.4} />
      <Spark x={24} y={58} s={4.5} tone="gold" delay={1.3} />
    </>
  )
}

const SHIELD = 'M0,-38 C12,-31 24,-29 32,-29 L32,-2 C32,19 18,32 0,40 C-18,32 -32,19 -32,-2 L-32,-29 C-24,-29 -12,-31 0,-38 Z'

function ShieldLayer({ s, dx, dy, depth, tone }: { s: number; dx: number; dy: number; depth: number; tone: Tone }) {
  // extrusion: stack copies stepping back along the depth axis
  const steps = Array.from({ length: depth }, (_, i) => depth - i)
  return (
    <g className={`ca-${tone}`} transform={`translate(${dx} ${dy})`}>
      {steps.map((k) => (
        <path key={k} d={SHIELD} className="ca-ext" transform={`translate(${k * 0.9} ${-k * 0.42}) scale(${s})`} />
      ))}
      <path d={SHIELD} className="ca-ftl" transform={`scale(${s})`} />
    </g>
  )
}

/** why: a layered shield, each layer raised toward the viewer */
function WhyArt() {
  const id = useGid()
  return (
    <>
      <Shadow cx={84} cy={144} rx={46} ry={10} />
      <g className="ca-float">
        <g transform="translate(78 78) matrix(0.94 0.3 0 1 0 0)">
          <ShieldLayer s={1.18} dx={0} dy={0} depth={9} tone="deep" />
          <g>
            <path d={SHIELD} transform="scale(1.18)" fill={`url(#${id}-gloss)`} opacity="0.5" />
          </g>
          <ShieldLayer s={0.86} dx={-5} dy={2} depth={6} tone="c" />
          <ShieldLayer s={0.54} dx={-9} dy={4} depth={4} tone="paper" />
          <path
            className="ca-check"
            d="M-20,4 L-12,11 L2,-5"
            transform="translate(0 0)"
          />
          <path d={SHIELD} transform="translate(-5 2) scale(0.86)" fill={`url(#${id}-gloss)`} className="ca-sweep" />
        </g>
      </g>
      <Spark x={132} y={34} s={6.5} delay={0.2} />
      <Spark x={30} y={50} s={4.5} tone="gold" delay={1.1} />
      <Spark x={136} y={104} s={3.5} delay={2} />
    </>
  )
}

/** values: a balance scale */
function ValuesArt() {
  const [px, py] = P(0, 0, 66)
  const L = 44
  return (
    <>
      <Shadow cx={80} cy={138} rx={58} ry={11} />
      <g className="ca-float">
        <Cyl x={0} y={0} z={0} r={17} h={8} tone="c" />
        <Cyl x={0} y={0} z={8} r={10} h={5} tone="c2" />
        <Box x={-2.6} y={-2.6} z={13} w={5.2} d={5.2} h={50} tone="paper" gloss={false} />
        <g className="ca-beam" style={{ transformOrigin: `${px}px ${py}px` }}>
          <rect x={px - L - 2} y={py - 1} width={2 * L + 4} height={7} rx={3.5} className="ca-beam-edge" />
          <rect x={px - L - 2} y={py - 3} width={2 * L + 4} height={6.5} rx={3.25} className="ca-beam-face" />
        </g>
        <Ball cx={px} cy={py - 2} r={6} tone="gold" />
        <g className="ca-pan ca-pan--l">
          <Pan cx={px - L} top={py + 2} />
          <Box x={-3} y={-3} z={0} w={10} d={10} h={10} tone="gold" className="ca-onpan-l" />
        </g>
        <g className="ca-pan ca-pan--r">
          <Pan cx={px + L} top={py + 2} />
          <Ball cx={px + L} cy={py + 26} r={7.5} tone="c" />
        </g>
      </g>
      <Spark x={30} y={30} s={5} delay={0.6} />
      <Spark x={136} y={28} s={4} tone="gold" delay={1.6} />
    </>
  )
}

function Pan({ cx, top }: { cx: number; top: number }) {
  const rimY = top + 34
  return (
    <g>
      <path className="ca-string" d={`M${cx},${top} L${cx - 15},${rimY} M${cx},${top} L${cx + 15},${rimY}`} />
      <g className="ca-c">
        <path className="ca-bowl" d={`M${cx - 17},${rimY} A17,7 0 0 0 ${cx + 17},${rimY} L${cx + 13},${rimY + 5} A13,5 0 0 1 ${cx - 13},${rimY + 5} Z`} />
      </g>
      <g className="ca-paper">
        <ellipse className="ca-ft" cx={cx} cy={rimY} rx={17} ry={6.5} />
      </g>
      <ellipse cx={cx} cy={rimY} rx={17} ry={6.5} className="ca-pan-rim" />
    </g>
  )
}

/** python: stacked blocks with bracket glyphs */
function PythonArt() {
  return (
    <>
      <Shadow cx={80} cy={140} rx={56} ry={12} />
      <g className="ca-float">
        <Box x={-24} y={-20} z={0} w={44} d={38} h={22} tone="deep">
          <g transform={onFront(-24, 18, 22)}>
            <text x={22} y={17} className="ca-glyph" textAnchor="middle">{'{ }'}</text>
          </g>
          <g transform={onSide(20, 18, 22)} className="ca-lines">
            <rect x={6} y={6} width={18} height={3} rx={1.5} />
            <rect x={6} y={12} width={26} height={3} rx={1.5} />
          </g>
        </Box>
        <Box x={-18} y={-16} z={22} w={34} d={30} h={20} tone="c">
          <g transform={onFront(-18, 14, 42)}>
            <text x={17} y={15.5} className="ca-glyph" textAnchor="middle">{'[ ]'}</text>
          </g>
          <g transform={onSide(16, 14, 42)} className="ca-lines">
            <rect x={5} y={6} width={14} height={3} rx={1.5} />
            <rect x={5} y={12} width={20} height={3} rx={1.5} />
          </g>
        </Box>
        <g className="ca-bob">
          <Box x={-10} y={-12} z={48} w={22} d={22} h={18} tone="paper">
            <g transform={onFront(-10, 10, 66)}>
              <text x={11} y={13.5} className="ca-glyph ca-glyph--ink" textAnchor="middle">{'()'}</text>
            </g>
          </Box>
        </g>
      </g>
      <Spark x={130} y={36} s={6} delay={0.3} />
      <Spark x={28} y={44} s={4} tone="gold" delay={1.4} />
    </>
  )
}

/** concurrency: three parallel lanes with tokens moving down them */
function ConcurrencyArt() {
  const lanes = [
    { y: -22, tone: 'c' as Tone, at: -6, cls: 'ca-run1' },
    { y: -6, tone: 'gold' as Tone, at: 12, cls: 'ca-run2' },
    { y: 10, tone: 'c2' as Tone, at: -16, cls: 'ca-run3' },
  ]
  return (
    <>
      <Shadow cx={80} cy={140} rx={64} ry={13} />
      <g className="ca-float">
        <Box x={-34} y={-32} z={0} w={70} d={58} h={8} tone="soft" />
        {lanes.map((l) => (
          <Box key={l.y} x={-24} y={l.y} z={8} w={58} d={10} h={1.6} tone="paper" gloss={false} rim={false} />
        ))}
        {/* the fork: where work fans out */}
        <Box x={-34} y={-30} z={8} w={9} d={54} h={14} tone="deep" />
        {lanes.map((l) => (
          <g key={l.cls} className={`ca-token ${l.cls}`}>
            <Box x={l.at} y={l.y + 1} z={9.6} w={8} d={8} h={8} tone={l.tone} />
          </g>
        ))}
      </g>
      <Spark x={134} y={44} s={6} delay={0.8} />
      <Spark x={26} y={62} s={4} tone="gold" delay={0.1} />
    </>
  )
}

/** builds: blocks rising level by level, a flag on the top level */
function BuildsArt() {
  const cols = [
    { y: 8, h: 18, tone: 'c2' as Tone, n: '1' },
    { y: -14, h: 34, tone: 'c' as Tone, n: '2' },
    { y: -36, h: 52, tone: 'deep' as Tone, n: '3' },
  ]
  const [fx, fy] = P(0, -25, 52)
  return (
    <>
      <Shadow cx={86} cy={138} rx={58} ry={12} />
      <g className="ca-float">
        {cols.map((c) => (
          <Box key={c.n} x={-10} y={c.y} z={0} w={20} d={20} h={c.h} tone={c.tone}>
            <g transform={onSide(10, c.y + 20, c.h)}>
              <text x={10} y={15} className="ca-num" textAnchor="middle">
                {c.n}
              </text>
            </g>
          </Box>
        ))}
        <g className="ca-wave">
          <rect x={fx - 0.9} y={fy - 26} width={1.8} height={26} rx={0.9} className="ca-pole" />
          <path className="ca-flag" d={`M${fx + 0.8},${fy - 26} L${fx + 19},${fy - 21.5} L${fx + 0.8},${fy - 15} Z`} />
        </g>
      </g>
      <Spark x={34} y={40} s={6} delay={0.5} />
      <Spark x={138} y={64} s={4} tone="gold" delay={1.5} />
    </>
  )
}

/** design: a document with a boxes-and-arrows diagram on it */
function DesignArt() {
  const id = useGid()
  const z = 6
  return (
    <>
      <Shadow cx={80} cy={140} rx={60} ry={13} />
      <g className="ca-float">
        <Box x={-26} y={-36} z={0} w={58} d={74} h={3} tone="c2" gloss={false} />
        <Box x={-30} y={-40} z={3} w={58} d={74} h={3} tone="paper" />
        <g transform={onTop(-30, -40, z)}>
          {/* arrows */}
          <path className="ca-arrow" d="M18,22 C18,32 24,36 29,42" />
          <path className="ca-arrow" d="M42,22 C42,32 37,36 33,42" />
          <path className="ca-arrowhead" d="M26,38 L30,44 L32,37" />
          {/* prose lines */}
          <g className="ca-prose">
            <rect x={8} y={58} width={42} height={3.4} rx={1.7} />
            <rect x={8} y={64} width={30} height={3.4} rx={1.7} />
          </g>
          <rect x={6} y={4} width={46} height={0.01} fill={`url(#${id}-gloss)`} />
        </g>
        <g className="ca-pop1">
          <Box x={-26} y={-36} z={z} w={14} d={12} h={6} tone="c" />
        </g>
        <g className="ca-pop2">
          <Box x={-2} y={-36} z={z} w={14} d={12} h={6} tone="gold" />
        </g>
        <g className="ca-pop3">
          <Box x={-12} y={-12} z={z} w={16} d={14} h={8} tone="deep" />
        </g>
        {/* pencil */}
        <g transform="translate(0 0)">
          <Box x={36} y={-30} z={0} w={6} d={46} h={6} tone="gold" />
          <path className="ca-tip" d={`M${P(36, 16, 6).join(',')} L${P(42, 16, 6).join(',')} L${P(42, 16, 0).join(',')} L${P(39, 25, 1.5).join(',')} Z`} />
        </g>
      </g>
      <Spark x={30} y={40} s={6} delay={0.2} />
      <Spark x={136} y={36} s={4.5} tone="gold" delay={1.2} />
    </>
  )
}

/** agents: a robot head with a pointer cursor */
function AgentsArt() {
  const [ax, ay] = P(0, -2, 64)
  return (
    <>
      <Shadow cx={80} cy={138} rx={52} ry={12} />
      <g className="ca-float">
        <Box x={-8} y={-8} z={0} w={16} d={16} h={10} tone="deep" />
        <Box x={-24} y={-22} z={10} w={46} d={42} h={38} tone="c">
          <g transform={onFront(-24, 20, 48)}>
            <rect x={5} y={7} width={36} height={22} rx={8} className="ca-visor" />
            <g className="ca-eyes">
              <rect x={12} y={13} width={7} height={10} rx={3.5} className="ca-eye" />
              <rect x={27} y={13} width={7} height={10} rx={3.5} className="ca-eye" />
            </g>
            <rect x={9} y={9} width={20} height={3} rx={1.5} className="ca-visor-gloss" />
          </g>
          <g transform={onSide(22, 20, 48)}>
            <circle cx={21} cy={19} r={8} className="ca-ear" />
            <circle cx={21} cy={19} r={4} className="ca-ear-in" />
          </g>
        </Box>
        <rect x={ax - 1.2} y={ay - 2} width={2.4} height={16} rx={1.2} className="ca-pole" />
        <Ball cx={ax} cy={ay - 4} r={5.5} tone="gold" className="ca-glow" />
      </g>
      <g className="ca-cursor">
        <ellipse cx={117} cy={110} rx={11} ry={5.5} className="ca-ripple" />
        <path
          className="ca-pointer"
          d="M117,110 L117,138 L124,131 L129.5,142.5 L135,140 L129.5,128.8 L139,128.8 Z"
        />
      </g>
      <Spark x={34} y={36} s={6} delay={0.7} />
      <Spark x={134} y={40} s={4.5} tone="gold" delay={1.7} />
    </>
  )
}

function Strata() {
  return (
    <>
      <Box x={-32} y={-32} z={0} w={60} d={62} h={9} tone="deep" />
      <Box x={-32} y={-32} z={9} w={60} d={46} h={9} tone="c" />
      <Box x={-32} y={-32} z={18} w={60} d={30} h={9} tone="c2" />
      <Box x={-32} y={-32} z={27} w={60} d={14} h={8} tone="soft" />
    </>
  )
}

/** deepdive: a magnifier hovering over terraced strata */
function DeepdiveArt() {
  const id = useGid()
  const cx = 102
  const cy = 64
  const R = 21
  return (
    <>
      <Shadow cx={78} cy={140} rx={62} ry={13} />
      <g className="ca-float">
        <Strata />
      </g>
      <g className="ca-lens">
        <clipPath id={`${id}-lens`}>
          <circle cx={cx} cy={cy} r={R - 2} />
        </clipPath>
        <rect
          x={cx + R * 0.55}
          y={cy + R * 0.55}
          width={9}
          height={30}
          rx={4.5}
          className="ca-handle"
          transform={`rotate(-45 ${cx + R * 0.55} ${cy + R * 0.55})`}
        />
        <circle cx={cx} cy={cy} r={R - 2} className="ca-glass-bg" />
        <g clipPath={`url(#${id}-lens)`}>
          <g transform={`translate(${cx} ${cy}) scale(1.9) translate(${-P(2, 8, 24)[0]} ${-P(2, 8, 24)[1]})`}>
            <Strata />
          </g>
        </g>
        <circle cx={cx} cy={cy} r={R - 2} className="ca-glass" />
        <path className="ca-glass-hi" d={`M${cx - 12},${cy - 7} A14,14 0 0 1 ${cx - 2},${cy - 14}`} />
        <circle cx={cx} cy={cy} r={R} className="ca-ring" />
      </g>
      <Spark x={30} y={44} s={6} delay={0.3} />
      <Spark x={140} y={110} s={4} tone="gold" delay={1.3} />
    </>
  )
}

const ARTS: Record<AreaId, () => ReactNode> = {
  map: MapArt,
  why: WhyArt,
  values: ValuesArt,
  python: PythonArt,
  concurrency: ConcurrencyArt,
  builds: BuildsArt,
  design: DesignArt,
  agents: AgentsArt,
  deepdive: DeepdiveArt,
}

export function CourseArt({ course, size = 120, animated = false, className }: { course: Course; size?: number; animated?: boolean; className?: string }) {
  const id = 'ca' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const Art = ARTS[course.id] ?? MapArt
  return (
    <svg
      className={['ca', `ca--${course.id}`, animated && 'ca--anim', className].filter(Boolean).join(' ')}
      style={courseStyle(course.color)}
      width={size}
      height={size}
      viewBox="0 0 160 160"
      role="img"
      aria-label={`${course.title} illustration`}
      focusable="false"
    >
      <Ctx.Provider value={id}>
        <Defs />
        <Art />
      </Ctx.Provider>
    </svg>
  )
}

export default CourseArt
