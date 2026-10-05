import { describe, expect, it } from 'vitest'
import { DEFAULT_FILES, HEAD_BYTES, bruteForceGroups, formatBytes, kindOf, naiveBytes, normalizeFiles, reclaimable, runFunnel, type DFile } from './model'

const LESSON: DFile[] = [
  { name: 'IMG_2041.jpg', size: 2400000, head: 'ffd8e0a1', body: '91c3' },
  { name: 'IMG_2041 (1).jpg', size: 2400000, head: 'ffd8e0a1', body: '91c3' },
  { name: 'beach.jpg', size: 2400000, head: 'ffd8e0b7', body: '04ae' },
  { name: 'report.pdf', size: 880000, head: '25504446', body: 'aa10' },
  { name: 'report-final.pdf', size: 880000, head: '25504446', body: 'aa27' },
  { name: 'report-v2.pdf', size: 880000, head: '25504446', body: 'aa10' },
  { name: 'song.mp3', size: 5100000, head: '49443303', body: '7d2e' },
  { name: 'song-backup.mp3', size: 5100000, head: '49443303', body: '7d2e' },
  { name: 'notes.txt', size: 1200, head: '4e6f7465', body: '' },
  { name: 'todo.md', size: 640, head: '2d205b20', body: '' },
  { name: 'demo.mp4', size: 48000000, head: '00000020', body: 'c0de' },
]

const names = (files: DFile[], idx: number[]) => idx.map((i) => files[i].name)

describe('dedup funnel', () => {
  it('runs the lesson folder stage by stage', () => {
    const r = runFunnel(LESSON)
    expect(r).toHaveLength(4)
    // stage 1: unique sizes drop out, no bytes read
    expect(names(LESSON, r[1].newlyRuledOut)).toEqual(['notes.txt', 'todo.md', 'demo.mp4'])
    expect(r[1].bytesThisStage).toBe(0)
    expect(r[1].groups.map((g) => g.files.length)).toEqual([3, 3, 2])
    // stage 2: 8 heads read, the beach photo has a different header
    expect(r[2].filesRead).toBe(8)
    expect(r[2].bytesThisStage).toBe(8 * HEAD_BYTES)
    expect(names(LESSON, r[2].newlyRuledOut)).toEqual(['beach.jpg'])
    // stage 3: full reads of the 7 survivors; report-final differs in its body
    expect(r[3].filesRead).toBe(7)
    expect(r[3].bytesThisStage).toBe(2 * 2400000 + 3 * 880000 + 2 * 5100000)
    expect(names(LESSON, r[3].newlyRuledOut)).toEqual(['report-final.pdf'])
    expect(r[3].groups.map((g) => names(LESSON, g.files))).toEqual([
      ['IMG_2041.jpg', 'IMG_2041 (1).jpg'],
      ['report.pdf', 'report-v2.pdf'],
      ['song.mp3', 'song-backup.mp3'],
    ])
    expect(r[3].bytesTotal).toBe(8 * HEAD_BYTES + 17640000)
    expect(naiveBytes(LESSON)).toBe(68041840)
    expect(reclaimable(LESSON, r[3].groups)).toBe(2400000 + 880000 + 5100000)
  })

  it('default folder covers every elimination path', () => {
    const r = runFunnel(DEFAULT_FILES)
    expect(r[1].newlyRuledOut.length).toBeGreaterThan(0)
    expect(r[2].newlyRuledOut.length).toBeGreaterThan(0)
    expect(r[3].newlyRuledOut.length).toBeGreaterThan(0)
    expect(r[3].groups).toHaveLength(2)
    expect(r[3].bytesTotal).toBeLessThan(naiveBytes(DEFAULT_FILES) / 4)
  })

  it('never loses a duplicate and agrees with brute force', () => {
    let seed = 11
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
    for (let trial = 0; trial < 200; trial++) {
      const files: DFile[] = Array.from({ length: 2 + Math.floor(rnd() * 12) }, (_, i) => ({
        name: `f${i}`,
        size: [0, 100, 5000, 5000, 900000][Math.floor(rnd() * 5)],
        head: 'ab'[Math.floor(rnd() * 2)],
        body: 'xy'[Math.floor(rnd() * 2)],
      }))
      const r = runFunnel(files)
      expect(r[3].groups.map((g) => g.files)).toEqual(bruteForceGroups(files))
      // every file is either in a final group or ruled out exactly once
      const inGroups = r[3].groups.flatMap((g) => g.files)
      expect(inGroups.length + r[3].ruledOut.size).toBe(files.length)
      // bytes only grow
      expect(r[2].bytesTotal).toBeGreaterThanOrEqual(r[1].bytesTotal)
      expect(r[3].bytesTotal).toBeGreaterThanOrEqual(r[2].bytesTotal)
    }
  })

  it('treats small files as fully hashed by stage 2 and empty files as identical', () => {
    const files: DFile[] = [
      { name: 'a.txt', size: 300, head: 'ab', body: 'p' },
      { name: 'b.txt', size: 300, head: 'ab', body: 'q' },
      { name: 'c.txt', size: 300, head: 'cd', body: '' },
      { name: 'e1.log', size: 0, head: '', body: '' },
      { name: 'e2.log', size: 0, head: 'x', body: 'y' },
      { name: 'big1', size: 9000, head: 'ab', body: '1' },
      { name: 'big2', size: 9000, head: 'ab', body: '2' },
    ]
    const r = runFunnel(files)
    // the 300-byte files: stage 2 read all 300 bytes of each, a and b match, c differs
    expect(r[2].filesIn).toBe(7)
    expect(r[2].filesRead).toBe(5) // empty files have nothing to read
    expect(r[2].bytesThisStage).toBe(3 * 300 + 2 * HEAD_BYTES)
    expect(names(files, r[2].newlyRuledOut)).toEqual(['c.txt'])
    // stage 3 re-reads only the big files
    expect(r[3].filesIn).toBe(6)
    expect(r[3].filesRead).toBe(2)
    expect(r[3].bytesThisStage).toBe(18000)
    expect(r[3].groups.map((g) => names(files, g.files))).toEqual([
      ['a.txt', 'b.txt'],
      ['e1.log', 'e2.log'],
    ])
    expect(normalizeFiles(files).map((f) => [f.head, f.body])).toEqual([
      ['ab', ''],
      ['ab', ''],
      ['cd', ''],
      ['', ''],
      ['', ''],
      ['ab', '1'],
      ['ab', '2'],
    ])
  })

  it('agrees with an independent content oracle, including tiny and empty files', () => {
    let seed = 29
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
    const content = (f: DFile) => (f.size === 0 ? '' : f.size <= HEAD_BYTES ? f.head : `${f.head}|${f.body}`)
    for (let trial = 0; trial < 300; trial++) {
      const files: DFile[] = Array.from({ length: 2 + Math.floor(rnd() * 10) }, (_, i) => ({
        name: `f${i}`,
        size: [0, 0, 100, 4096, 4097, 900000][Math.floor(rnd() * 6)],
        head: 'ab'[Math.floor(rnd() * 2)],
        body: 'xy'[Math.floor(rnd() * 2)],
      }))
      const oracle = new Map<string, number[]>()
      files.forEach((f, i) => oracle.set(`${f.size}:${content(f)}`, [...(oracle.get(`${f.size}:${content(f)}`) ?? []), i]))
      const want = [...oracle.values()].filter((g) => g.length > 1).sort((a, b) => a[0] - b[0])
      const r = runFunnel(files)
      expect(r[3].groups.map((g) => g.files)).toEqual(want)
      // stage 3 never re-reads a file that fits in its head
      expect(r[3].bytesThisStage).toBe(r[2].groups.flatMap((g) => g.files).reduce((s, i) => s + (files[i].size > HEAD_BYTES ? files[i].size : 0), 0))
      // each stage only reads files that entered it
      expect(r[2].filesRead).toBeLessThanOrEqual(r[2].filesIn)
      expect(r[3].filesIn).toBe(r[2].groups.reduce((s, g) => s + g.files.length, 0))
    }
  })

  it('formats sizes and kinds', () => {
    expect(formatBytes(640)).toBe('640 B')
    expect(formatBytes(1200)).toBe('1.2 KB')
    expect(formatBytes(32768)).toBe('32.8 KB')
    expect(formatBytes(880000)).toBe('880 KB')
    expect(formatBytes(2400000)).toBe('2.4 MB')
    expect(formatBytes(48000000)).toBe('48 MB')
    expect(formatBytes(68041840)).toBe('68 MB')
    expect(kindOf('a.JPG')).toBe('image')
    expect(kindOf('song.mp3')).toBe('audio')
    expect(kindOf('README')).toBe('other')
  })

  it('normalizes config input', () => {
    expect(normalizeFiles(undefined)).toBe(DEFAULT_FILES)
    expect(normalizeFiles([{ size: '12', head: 1 }])).toEqual([{ name: 'file-1', size: 12, head: '1', body: '' }])
  })
})
