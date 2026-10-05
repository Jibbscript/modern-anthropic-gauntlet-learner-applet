/**
 * Duplicate-file finder as a three-stage funnel. Each stage can only prove
 * files *different*; only the last one proves them the same.
 *   1. group by size (stat metadata, 0 bytes read)
 *   2. hash the first 4 KB of files that share a size
 *   3. hash the whole file for files that still collide
 * `head` stands for the first-4KB hash and `body` for the rest of the
 * content, so two files are identical iff size, head and body all match.
 */

export interface DFile {
  name: string
  size: number
  head: string
  body: string
}

export type Stage = 0 | 1 | 2 | 3

export interface Group {
  key: string
  files: number[]
}

export interface StageResult {
  stage: Stage
  /** candidate groups (2+ files) still in play after this stage, in file order */
  groups: Group[]
  /** stage at which each file was ruled out; files still in play are absent */
  ruledOut: Map<number, Stage>
  /** files ruled out by this stage */
  newlyRuledOut: number[]
  /** files read (partly or fully) during this stage */
  filesRead: number
  bytesThisStage: number
  /** cumulative bytes read up to and including this stage */
  bytesTotal: number
}

export const HEAD_BYTES = 4096

export const DEFAULT_FILES: DFile[] = [
  { name: 'beach.jpg', size: 3_100_000, head: 'ffd8ffe0', body: 'a7c1' },
  { name: 'beach copy.jpg', size: 3_100_000, head: 'ffd8ffe0', body: 'a7c1' },
  { name: 'sunset.jpg', size: 3_100_000, head: 'ffd8ffe1', body: '5b02' },
  { name: 'thesis.pdf', size: 1_800_000, head: '25504446', body: '33e0' },
  { name: 'thesis-old.pdf', size: 1_800_000, head: '25504446', body: '8b19' },
  { name: 'thesis (2).pdf', size: 1_800_000, head: '25504446', body: '33e0' },
  { name: 'podcast.mp3', size: 4_600_000, head: '49443304', body: 'e1f0' },
  { name: 'backup.zip', size: 52_000_000, head: '504b0304', body: '9d3a' },
  { name: 'notes.txt', size: 2_100, head: '2320546f', body: '' },
  { name: 'logo.png', size: 48_000, head: '89504e47', body: '17bb' },
]

export function normalizeFiles(files: unknown): DFile[] {
  if (!Array.isArray(files)) return DEFAULT_FILES
  const out = files
    .filter((f): f is Record<string, unknown> => !!f && typeof f === 'object')
    .map((f, i) => ({
      name: typeof f.name === 'string' && f.name ? f.name : `file-${i + 1}`,
      size: Math.max(0, Math.round(Number(f.size) || 0)),
      head: String(f.head ?? ''),
      body: String(f.body ?? ''),
    }))
  return out.length ? out : DEFAULT_FILES
}

const keyFns: Record<1 | 2 | 3, (f: DFile) => string> = {
  1: (f) => `s${f.size}`,
  2: (f) => `s${f.size}|h${f.head}`,
  3: (f) => `s${f.size}|h${f.head}|b${f.body}`,
}

/** bytes a stage reads from one file that reached it */
export function bytesFor(stage: Stage, f: DFile): number {
  if (stage === 2) return Math.min(f.size, HEAD_BYTES)
  // a file no bigger than the head was already read completely in stage 2
  if (stage === 3) return f.size > HEAD_BYTES ? f.size : 0
  return 0
}

export function runFunnel(files: DFile[]): StageResult[] {
  const all = files.map((_, i) => i)
  const results: StageResult[] = [
    { stage: 0, groups: [{ key: 'all', files: all }], ruledOut: new Map(), newlyRuledOut: [], filesRead: 0, bytesThisStage: 0, bytesTotal: 0 },
  ]
  for (const stage of [1, 2, 3] as const) {
    const prev = results[results.length - 1]
    const ruledOut = new Map(prev.ruledOut)
    const groups: Group[] = []
    const newly: number[] = []
    let bytes = 0
    let filesRead = 0
    for (const g of prev.groups) {
      const sub = new Map<string, number[]>()
      for (const i of g.files) {
        const b = bytesFor(stage, files[i])
        bytes += b
        if (b > 0) filesRead++
        const k = keyFns[stage](files[i])
        sub.set(k, [...(sub.get(k) ?? []), i])
      }
      for (const [key, members] of sub) {
        if (members.length > 1) groups.push({ key, files: members })
        else {
          ruledOut.set(members[0], stage)
          newly.push(members[0])
        }
      }
    }
    groups.sort((a, b) => a.files[0] - b.files[0])
    newly.sort((a, b) => a - b)
    results.push({ stage, groups, ruledOut, newlyRuledOut: newly, filesRead, bytesThisStage: bytes, bytesTotal: prev.bytesTotal + bytes })
  }
  return results
}

/** hashing every byte of every file */
export function naiveBytes(files: DFile[]): number {
  return files.reduce((s, f) => s + f.size, 0)
}

/** brute force: files with identical size, head and body, groups of 2+ */
export function bruteForceGroups(files: DFile[]): number[][] {
  const m = new Map<string, number[]>()
  files.forEach((f, i) => m.set(keyFns[3](f), [...(m.get(keyFns[3](f)) ?? []), i]))
  return [...m.values()].filter((g) => g.length > 1).sort((a, b) => a[0] - b[0])
}

/** bytes freed by keeping one copy of each group */
export function reclaimable(files: DFile[], groups: Group[]): number {
  return groups.reduce((s, g) => s + files[g.files[0]].size * (g.files.length - 1), 0)
}

export function formatBytes(n: number): string {
  if (n < 1000) return `${n} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let v = n / 1000
  let u = 0
  while (v >= 1000 && u < units.length - 1) {
    v /= 1000
    u++
  }
  return `${v < 100 ? v.toFixed(1).replace(/\.0$/, '') : Math.round(v)} ${units[u]}`
}

export type Kind = 'image' | 'doc' | 'audio' | 'video' | 'archive' | 'code' | 'other'

export function kindOf(name: string): Kind {
  const ext = name.toLowerCase().split('.').pop() ?? ''
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'svg', 'bmp'].includes(ext)) return 'image'
  if (['pdf', 'txt', 'md', 'doc', 'docx', 'rtf', 'csv'].includes(ext)) return 'doc'
  if (['mp3', 'wav', 'flac', 'm4a', 'ogg', 'aac'].includes(ext)) return 'audio'
  if (['mp4', 'mov', 'mkv', 'avi', 'webm'].includes(ext)) return 'video'
  if (['zip', 'tar', 'gz', 'tgz', 'rar', '7z', 'dmg', 'iso'].includes(ext)) return 'archive'
  if (['py', 'js', 'ts', 'json', 'html', 'css', 'go', 'rs', 'java', 'c', 'h'].includes(ext)) return 'code'
  return 'other'
}
