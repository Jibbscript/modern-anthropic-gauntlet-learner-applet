/**
 * Bundled site graphs for the crawler widget. Coordinates are precomputed
 * for a 320 x 224 viewBox. Page 0 is always the seed on host 0.
 */
export interface SitePage {
  /** short label drawn in the node and the queue chips */
  label: string
  path: string
  host: number
  x: number
  y: number
}

export interface SiteGraph {
  id: 'small' | 'cyclic' | 'wide'
  hosts: string[]
  pages: SitePage[]
  /** directed links [from, to, bend?]; a self-link has from === to; bend scales/flips the curve (default 1) */
  links: [number, number, number?][]
}

const p = (label: string, path: string, host: number, x: number, y: number): SitePage => ({ label, path, host, x, y })

/** 8 pages on one host plus a link out to a CDN page. Acyclic, with diamonds. */
const SMALL: SiteGraph = {
  id: 'small',
  hosts: ['site.com', 'cdn.net'],
  pages: [
    p('A', '/', 0, 160, 26),
    p('B', '/about', 0, 64, 88),
    p('C', '/blog', 0, 160, 88),
    p('D', '/shop', 0, 256, 88),
    p('E', '/blog/1', 0, 112, 152),
    p('F', '/blog/2', 0, 208, 152),
    p('G', '/cart', 0, 290, 152),
    p('H', '/team', 0, 30, 152),
    p('I', 'cdn.net/js', 1, 262, 206),
  ],
  links: [
    [0, 1],
    [0, 2],
    [0, 3],
    [1, 7],
    [1, 2],
    [2, 4],
    [2, 5],
    [3, 5],
    [3, 6],
    [4, 5],
    [6, 8],
  ],
}

/** 10 pages, one host, with back-links, cycles and two self-links. */
const CYCLIC: SiteGraph = {
  id: 'cyclic',
  hosts: ['wiki.io'],
  pages: [
    p('A', '/', 0, 160, 24),
    p('B', '/intro', 0, 66, 82),
    p('C', '/topics', 0, 160, 82),
    p('D', '/faq', 0, 254, 82),
    p('E', '/intro/2', 0, 30, 146),
    p('F', '/topics/a', 0, 124, 146),
    p('G', '/topics/b', 0, 206, 146),
    p('H', '/faq?p=2', 0, 290, 146),
    p('I', '/search', 0, 58, 204),
    p('J', '/tags', 0, 242, 204),
  ],
  links: [
    [0, 1],
    [0, 2],
    [0, 3],
    [1, 1],
    [1, 4],
    [2, 5],
    [2, 0],
    [3, 6],
    [3, 7],
    [4, 8],
    [4, 1],
    [5, 8],
    [5, 6],
    [6, 9],
    [6, 2],
    [7, 7],
    [7, 9],
    [8, 0, -1],
    [9, 3],
  ],
}

/** 16 pages over two hosts: a wide home page and lots of shared children. */
const WIDE: SiteGraph = {
  id: 'wide',
  hosts: ['site.com', 'docs.org'],
  pages: [
    p('A', '/', 0, 160, 22),
    p('B', '/news', 0, 36, 80),
    p('C', '/blog', 0, 98, 80),
    p('D', '/shop', 0, 160, 80),
    p('E', 'docs.org/', 1, 222, 80),
    p('F', 'docs.org/api', 1, 284, 80),
    p('G', '/news/1', 0, 22, 142),
    p('H', '/news/2', 0, 68, 142),
    p('I', '/blog/1', 0, 114, 142),
    p('J', 'docs.org/faq', 1, 162, 142),
    p('K', 'docs.org/guide', 1, 208, 142),
    p('L', 'docs.org/ref', 1, 254, 142),
    p('M', 'docs.org/sdk', 1, 300, 142),
    p('N', '/archive', 0, 52, 202),
    p('O', '/about', 0, 132, 202),
    p('P', 'docs.org/v2', 1, 260, 202),
  ],
  links: [
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],
    [0, 5],
    [1, 6],
    [1, 7],
    [2, 7],
    [2, 8],
    [3, 8],
    [3, 9],
    [4, 10],
    [4, 11],
    [5, 11],
    [5, 12],
    [6, 13],
    [7, 13],
    [8, 14],
    [9, 14],
    [10, 15],
    [11, 15],
    [12, 15],
  ],
}

export const GRAPHS: Record<SiteGraph['id'], SiteGraph> = { small: SMALL, cyclic: CYCLIC, wide: WIDE }
