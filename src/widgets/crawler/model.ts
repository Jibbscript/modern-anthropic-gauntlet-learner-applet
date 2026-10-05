/**
 * Pure, deterministic BFS crawl simulation over a SiteGraph.
 *
 * Time advances in ticks. On every tick:
 *   1. busy workers make progress; a finished fetch marks the page done and
 *      enqueues its outlinks (filtered by host and by the dedupe rule);
 *   2. idle workers, in index order, dequeue the next URL and start a fetch
 *      that takes `fetchTicks(page)` ticks.
 *
 * Dedupe rules:
 *   none            no visited set. Every link is enqueued and fetched. Total
 *                   fetches are capped at 3 x crawlable pages so cycles end.
 *   check-then-add  the classic race: a worker checks `visited` when it
 *                   dequeues and only adds the page after its fetch
 *                   completes (enqueue also skips pages already visited).
 *                   A page enqueued twice can be fetched by two workers.
 *   atomic          check-and-add happens at enqueue time under a lock, so
 *                   each page is queued (and fetched) exactly once.
 */
import type { SiteGraph } from './graphs'

export type Dedupe = 'none' | 'check-then-add' | 'atomic'

export interface CrawlOptions {
  workers: number
  dedupe: Dedupe
  sameHost: boolean
}

export interface WorkerState {
  /** page being fetched, or -1 when idle */
  page: number
  left: number
  total: number
  /** this fetch is a duplicate (page fetched or in flight before) */
  dup: boolean
}

export type CrawlEvent =
  | { kind: 'start'; page: number; worker: number; dup: boolean }
  | { kind: 'done'; page: number; worker: number }
  | { kind: 'enqueue'; page: number; from: number }
  | { kind: 'skip'; page: number; from: number }
  | { kind: 'drop'; page: number; worker: number }

export interface CrawlState {
  tick: number
  queue: number[]
  /** the dedupe set (unused for 'none') */
  visited: boolean[]
  /** fetch starts per page */
  fetches: number[]
  /** at least one fetch of the page completed */
  done: boolean[]
  /** a link to this off-host page was filtered out */
  skipped: boolean[]
  workers: WorkerState[]
  totalFetches: number
  dupes: number
  /** fetch cap ('none' only) */
  cap: number
  capped: boolean
  finished: boolean
  /** events produced by the most recent tick */
  events: CrawlEvent[]
}

/** deterministic fetch latency: 2..4 ticks depending on the page */
export function fetchTicks(page: number): number {
  return 2 + ((page * 5 + 1) % 3)
}

export function outlinks(g: SiteGraph): number[][] {
  const out: number[][] = g.pages.map(() => [])
  for (const [a, b] of g.links) out[a].push(b)
  return out
}

/** pages a crawl can reach from the seed, honouring the same-host filter */
export function crawlable(g: SiteGraph, sameHost: boolean): Set<number> {
  const out = outlinks(g)
  const seen = new Set<number>([0])
  const q = [0]
  while (q.length) {
    const u = q.shift()!
    for (const v of out[u]) {
      if (sameHost && g.pages[v].host !== g.pages[0].host) continue
      if (!seen.has(v)) {
        seen.add(v)
        q.push(v)
      }
    }
  }
  return seen
}

export function initCrawl(g: SiteGraph, o: CrawlOptions): CrawlState {
  const n = g.pages.length
  const visited = new Array<boolean>(n).fill(false)
  if (o.dedupe === 'atomic') visited[0] = true
  return {
    tick: 0,
    queue: [0],
    visited,
    fetches: new Array<number>(n).fill(0),
    done: new Array<boolean>(n).fill(false),
    skipped: new Array<boolean>(n).fill(false),
    workers: Array.from({ length: Math.max(1, Math.min(4, Math.round(o.workers))) }, () => ({ page: -1, left: 0, total: 0, dup: false })),
    totalFetches: 0,
    dupes: 0,
    cap: 3 * crawlable(g, o.sameHost).size,
    capped: false,
    finished: false,
    events: [],
  }
}

export function stepCrawl(g: SiteGraph, o: CrawlOptions, prev: CrawlState): CrawlState {
  if (prev.finished) return prev
  const out = outlinks(g)
  const seedHost = g.pages[0].host
  const s: CrawlState = {
    ...prev,
    tick: prev.tick + 1,
    queue: prev.queue.slice(),
    visited: prev.visited.slice(),
    fetches: prev.fetches.slice(),
    done: prev.done.slice(),
    skipped: prev.skipped.slice(),
    workers: prev.workers.map((w) => ({ ...w })),
    events: [],
  }

  // 1. progress fetches; completions enqueue outlinks
  s.workers.forEach((w, wi) => {
    if (w.page < 0) return
    w.left -= 1
    if (w.left > 0) return
    const page = w.page
    s.done[page] = true
    s.events.push({ kind: 'done', page, worker: wi })
    if (o.dedupe === 'check-then-add') s.visited[page] = true
    for (const link of out[page]) {
      if (o.sameHost && g.pages[link].host !== seedHost) {
        s.skipped[link] = true
        s.events.push({ kind: 'skip', page: link, from: page })
        continue
      }
      if (o.dedupe === 'check-then-add' && s.visited[link]) continue
      if (o.dedupe === 'atomic') {
        if (s.visited[link]) continue
        s.visited[link] = true
      }
      s.queue.push(link)
      s.events.push({ kind: 'enqueue', page: link, from: page })
    }
    w.page = -1
    w.left = 0
    w.total = 0
    w.dup = false
  })

  // 2. idle workers pull from the frontier
  s.workers.forEach((w, wi) => {
    if (w.page >= 0) return
    while (s.queue.length && !(o.dedupe === 'none' && s.totalFetches >= s.cap)) {
      const page = s.queue.shift()!
      if (o.dedupe === 'check-then-add' && s.visited[page]) {
        s.events.push({ kind: 'drop', page, worker: wi })
        continue
      }
      const dup = s.fetches[page] > 0
      s.fetches[page] += 1
      s.totalFetches += 1
      if (dup) s.dupes += 1
      w.page = page
      w.total = fetchTicks(page)
      w.left = w.total
      w.dup = dup
      s.events.push({ kind: 'start', page, worker: wi, dup })
      break
    }
  })

  const idle = s.workers.every((w) => w.page < 0)
  if (o.dedupe === 'none' && s.totalFetches >= s.cap && s.queue.length) s.capped = true
  if (idle && (s.queue.length === 0 || s.capped)) s.finished = true
  return s
}

/** run a crawl to the end (bounded) — used by tests and summaries */
export function runCrawl(g: SiteGraph, o: CrawlOptions, maxTicks = 2000): CrawlState {
  let s = initCrawl(g, o)
  while (!s.finished && s.tick < maxTicks) s = stepCrawl(g, o, s)
  return s
}
