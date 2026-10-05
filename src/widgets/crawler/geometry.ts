import type { SiteGraph } from './graphs'

export const NODE_R = 12
export const VIEW_W = 320
export const VIEW_H = 226

export interface EdgeGeom {
  from: number
  to: number
  d: string
  /** arrowhead polygon points */
  head: string
}

const fmt = (n: number) => Math.round(n * 10) / 10

/**
 * Curved directed edges. Every edge bends slightly clockwise, so a pair of
 * opposite links (A→B, B→A) separates into two arcs; self-links are loops
 * above the node. Endpoints stop at the node rim, the arrow tip just outside it.
 */
export function edgeGeometry(g: SiteGraph): EdgeGeom[] {
  return g.links.map(([a, b]) => {
    const A = g.pages[a]
    const B = g.pages[b]
    if (a === b) {
      const ang = (deg: number) => (deg * Math.PI) / 180
      const s = { x: A.x + NODE_R * Math.cos(ang(-150)), y: A.y + NODE_R * Math.sin(ang(-150)) }
      const e = { x: A.x + (NODE_R + 1.5) * Math.cos(ang(-30)), y: A.y + (NODE_R + 1.5) * Math.sin(ang(-30)) }
      const c1 = { x: A.x + 2.9 * NODE_R * Math.cos(ang(-140)), y: A.y + 2.9 * NODE_R * Math.sin(ang(-140)) }
      const c2 = { x: A.x + 2.9 * NODE_R * Math.cos(ang(-40)), y: A.y + 2.9 * NODE_R * Math.sin(ang(-40)) }
      return { from: a, to: b, d: `M${fmt(s.x)} ${fmt(s.y)} C${fmt(c1.x)} ${fmt(c1.y)} ${fmt(c2.x)} ${fmt(c2.y)} ${fmt(e.x)} ${fmt(e.y)}`, head: arrow(e, c2) }
    }
    const dx = B.x - A.x
    const dy = B.y - A.y
    const len = Math.hypot(dx, dy)
    const bend = Math.min(22, 0.14 * len)
    const c = { x: (A.x + B.x) / 2 - (dy / len) * bend, y: (A.y + B.y) / 2 + (dx / len) * bend }
    const s = toward(A, c, NODE_R)
    const e = toward(B, c, NODE_R + 1.5)
    return { from: a, to: b, d: `M${fmt(s.x)} ${fmt(s.y)} Q${fmt(c.x)} ${fmt(c.y)} ${fmt(e.x)} ${fmt(e.y)}`, head: arrow(e, c) }
  })
}

function toward(p: { x: number; y: number }, q: { x: number; y: number }, dist: number) {
  const dx = q.x - p.x
  const dy = q.y - p.y
  const l = Math.hypot(dx, dy) || 1
  return { x: p.x + (dx / l) * dist, y: p.y + (dy / l) * dist }
}

/** small triangle with its tip at `tip`, pointing away from `from` */
function arrow(tip: { x: number; y: number }, from: { x: number; y: number }) {
  const dx = tip.x - from.x
  const dy = tip.y - from.y
  const l = Math.hypot(dx, dy) || 1
  const ux = dx / l
  const uy = dy / l
  const bx = tip.x - ux * 6
  const by = tip.y - uy * 6
  const px = -uy * 3.2
  const py = ux * 3.2
  return `${fmt(tip.x)},${fmt(tip.y)} ${fmt(bx + px)},${fmt(by + py)} ${fmt(bx - px)},${fmt(by - py)}`
}
