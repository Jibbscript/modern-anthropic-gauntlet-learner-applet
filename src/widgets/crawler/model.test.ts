import { describe, expect, it } from 'vitest'
import { GRAPHS } from './graphs'
import { crawlable, initCrawl, runCrawl, stepCrawl, type Dedupe } from './model'

const graphs = Object.values(GRAPHS)

describe('crawler model', () => {
  it('graphs are well formed and fit the viewBox', () => {
    for (const g of graphs) {
      for (const [a, b] of g.links) {
        expect(g.pages[a]).toBeDefined()
        expect(g.pages[b]).toBeDefined()
      }
      for (const p of g.pages) {
        expect(p.x).toBeGreaterThanOrEqual(14)
        expect(p.x).toBeLessThanOrEqual(306)
        expect(p.y).toBeGreaterThanOrEqual(14)
        expect(p.y).toBeLessThanOrEqual(210)
        expect(p.host).toBeLessThan(g.hosts.length)
      }
    }
    expect(GRAPHS.cyclic.links.some(([a, b]) => a === b)).toBe(true)
  })

  it('atomic dedupe never fetches a page twice and crawls every reachable page', () => {
    for (const g of graphs)
      for (const sameHost of [true, false])
        for (let w = 1; w <= 4; w++) {
          const s = runCrawl(g, { workers: w, dedupe: 'atomic', sameHost })
          expect(s.finished).toBe(true)
          expect(s.dupes).toBe(0)
          const reach = crawlable(g, sameHost)
          expect(s.done.filter(Boolean).length).toBe(reach.size)
          expect(s.totalFetches).toBe(reach.size)
        }
  })

  it('check-then-add is safe with one worker but races with 2+ workers on every bundled graph', () => {
    for (const g of graphs)
      for (const sameHost of [true, false]) {
        const one = runCrawl(g, { workers: 1, dedupe: 'check-then-add', sameHost })
        expect(one.dupes).toBe(0)
        expect(one.finished).toBe(true)
        for (let w = 2; w <= 4; w++) {
          const s = runCrawl(g, { workers: w, dedupe: 'check-then-add', sameHost })
          expect(s.finished, `${g.id} w=${w}`).toBe(true)
          expect(s.dupes, `${g.id} w=${w} sameHost=${sameHost}`).toBeGreaterThan(0)
          expect(s.done.filter(Boolean).length).toBe(crawlable(g, sameHost).size)
        }
      }
  })

  it('no dedupe re-fetches pages and terminates at the cap on cyclic graphs', () => {
    const cyc = runCrawl(GRAPHS.cyclic, { workers: 2, dedupe: 'none', sameHost: true })
    expect(cyc.finished).toBe(true)
    expect(cyc.capped).toBe(true)
    expect(cyc.totalFetches).toBe(cyc.cap)
    expect(cyc.cap).toBe(30)
    const small = runCrawl(GRAPHS.small, { workers: 1, dedupe: 'none', sameHost: true })
    expect(small.finished).toBe(true)
    expect(small.capped).toBe(false)
    expect(small.dupes).toBeGreaterThan(0)
  })

  it('same-host filter skips off-host pages', () => {
    const s = runCrawl(GRAPHS.wide, { workers: 2, dedupe: 'atomic', sameHost: true })
    GRAPHS.wide.pages.forEach((p, i) => {
      if (p.host !== 0) expect(s.done[i]).toBe(false)
    })
    expect(s.skipped.some(Boolean)).toBe(true)
    const all = runCrawl(GRAPHS.wide, { workers: 2, dedupe: 'atomic', sameHost: false })
    expect(all.done.every(Boolean)).toBe(true)
  })

  it('more workers finish sooner', () => {
    for (const g of graphs) {
      const t = [1, 2, 3, 4].map((w) => runCrawl(g, { workers: w, dedupe: 'atomic', sameHost: false }).tick)
      expect(t[3]).toBeLessThan(t[0])
    }
  })

  it('is deterministic and immutable', () => {
    const o = { workers: 3, dedupe: 'check-then-add' as Dedupe, sameHost: false }
    const a = runCrawl(GRAPHS.wide, o)
    const b = runCrawl(GRAPHS.wide, o)
    expect(a).toEqual(b)
    const s0 = initCrawl(GRAPHS.small, o)
    const snapshot = JSON.stringify(s0)
    stepCrawl(GRAPHS.small, o, s0)
    expect(JSON.stringify(s0)).toBe(snapshot)
  })

  it('reports crawl stats for tuning', () => {
    const rows: string[] = []
    for (const g of graphs)
      for (const dedupe of ['none', 'check-then-add', 'atomic'] as Dedupe[])
        for (const sameHost of [true, false])
          for (let w = 1; w <= 4; w++) {
            const s = runCrawl(g, { workers: w, dedupe, sameHost })
            rows.push(`${g.id} ${dedupe} same=${sameHost} w=${w}: ticks=${s.tick} fetches=${s.totalFetches} dupes=${s.dupes} capped=${s.capped}`)
          }
    if (process.env.CRAWL_STATS) console.log(rows.join('\n'))
    expect(rows.length).toBe(72)
  })
})

describe('crawler model invariants (QA)', () => {
  const opts = (w: number, dedupe: Dedupe, sameHost: boolean) => ({ workers: w, dedupe, sameHost })
  const combos = graphs.flatMap((g) =>
    (['none', 'check-then-add', 'atomic'] as Dedupe[]).flatMap((d) => [true, false].flatMap((sh) => [1, 2, 3, 4].map((w) => ({ g, o: opts(w, d, sh) })))),
  )

  it('check-then-add duplicates only ever start while another worker is fetching the same page', () => {
    for (const { g, o } of combos.filter((c) => c.o.dedupe === 'check-then-add')) {
      let s = initCrawl(g, o)
      while (!s.finished) {
        const prev = s
        s = stepCrawl(g, o, s)
        for (const e of s.events) {
          if (e.kind !== 'start' || !e.dup) continue
          // the page was never completed before this tick (else the dequeue check would drop it)...
          expect(prev.done[e.page], `${g.id} ${JSON.stringify(o)} t=${s.tick}`).toBe(false)
          // ...and some other worker holds it in flight right now
          expect(s.workers.some((w, i) => i !== e.worker && w.page === e.page)).toBe(true)
        }
      }
    }
  })

  it('atomic enqueues each page at most once; nobody ever fetches an off-host page with same-host on', () => {
    for (const { g, o } of combos) {
      let s = initCrawl(g, o)
      const enq = new Array(g.pages.length).fill(0)
      enq[0] = 1
      while (!s.finished) {
        s = stepCrawl(g, o, s)
        for (const e of s.events) {
          if (e.kind === 'enqueue') enq[e.page]++
          if (e.kind === 'start' && o.sameHost) expect(g.pages[e.page].host).toBe(g.pages[0].host)
        }
        // no worker is ever idle while there is work it may take
        if (!s.finished && !(o.dedupe === 'none' && s.totalFetches >= s.cap)) expect(s.queue.length === 0 || s.workers.every((w) => w.page >= 0)).toBe(true)
      }
      if (o.dedupe === 'atomic') expect(Math.max(...enq)).toBe(1)
      // a finished crawl leaves nothing in flight, and nothing queued unless the fetch cap stopped it
      expect(s.workers.every((w) => w.page < 0)).toBe(true)
      if (!s.capped) expect(s.queue.length).toBe(0)
      expect(s.totalFetches - s.dupes).toBe(s.fetches.filter((f) => f > 0).length)
    }
  })

  it('without a visited set pages are re-fetched after they completed (not just raced)', () => {
    const s = runCrawl(GRAPHS.cyclic, opts(1, 'none', true))
    expect(s.dupes).toBeGreaterThan(0)
    expect(s.capped).toBe(true)
  })

  it('the build-crawler lesson config races, and switching to atomic fixes it', () => {
    expect(runCrawl(GRAPHS.small, opts(3, 'check-then-add', true)).dupes).toBeGreaterThan(0)
    const fixed = runCrawl(GRAPHS.small, opts(3, 'atomic', true))
    expect(fixed.dupes).toBe(0)
    expect(fixed.finished && !fixed.capped).toBe(true)
  })
})
