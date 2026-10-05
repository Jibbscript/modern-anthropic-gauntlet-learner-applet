import { describe, expect, it } from 'vitest'
import { DEFAULT_A, DEFAULT_B, DEFAULT_BASE, crdtMerge, localCopy, lwwMerge, merge, otMerge, textOf, transformInsert } from './model'

describe('defaults', () => {
  it('B appends at the end of the base text', () => {
    expect(DEFAULT_BASE.length).toBe(21)
    expect(DEFAULT_B.at).toBe(21)
  })
  it('local copies hold only their own edit', () => {
    expect(textOf(localCopy(DEFAULT_BASE, DEFAULT_A, 'A'))).toBe('Briefly: Summarize the report.')
    expect(textOf(localCopy(DEFAULT_BASE, DEFAULT_B, 'B'))).toBe('Summarize the report. Cite sources.')
  })
})

describe('operational transform', () => {
  it('shifts B past an earlier insert and shows the arithmetic', () => {
    const r = otMerge(DEFAULT_BASE, DEFAULT_A, DEFAULT_B)
    expect(textOf(r.segs)).toBe('Briefly: Summarize the report. Cite sources.')
    expect(r.bOnA).toMatchObject({ from: 21, to: 30, shift: 9, reason: 'before' })
    expect(r.aOnB).toMatchObject({ from: 0, to: 0, shift: 0, reason: 'after' })
    expect(r.converged).toBe(true)
  })
  it('matches the lesson example (insert before the period)', () => {
    const r = otMerge('Summarize the ticket.', { at: 0, insert: 'You are a support lead. ' }, { at: 20, insert: ' in 3 bullets' })
    expect(textOf(r.segs)).toBe('You are a support lead. Summarize the ticket in 3 bullets.')
    expect(r.bOnA.to).toBe(44)
  })
  it('matches the predict step in the lesson (0 29)', () => {
    const a = { at: 0, insert: 'Be brief. ' }
    const b = { at: 19, insert: ' in French' }
    expect(transformInsert(a, 'A', b).to).toBe(0)
    expect(transformInsert(b, 'B', a).to).toBe(29)
    expect(textOf(otMerge('Answer the question.', a, b).segs)).toBe('Be brief. Answer the question in French.')
  })
  it('breaks ties by user id: A first', () => {
    const r = otMerge('ab', { at: 1, insert: 'X' }, { at: 1, insert: 'Y' })
    expect(textOf(r.segs)).toBe('aXYb')
    expect(r.bOnA.reason).toBe('tie')
    expect(r.aOnB.reason).toBe('tie')
    expect(r.aOnB.to).toBe(1)
    expect(r.converged).toBe(true)
  })
  it('clamps out-of-range positions', () => {
    expect(textOf(otMerge('abc', { at: -5, insert: 'X' }, { at: 99, insert: 'Y' }).segs)).toBe('XabcY')
  })
})

describe('CRDT', () => {
  it('keeps both edits and anchors inserts on the left neighbour id', () => {
    const r = crdtMerge(DEFAULT_BASE, DEFAULT_A, DEFAULT_B)
    expect(textOf(r.segs)).toBe('Briefly: Summarize the report. Cite sources.')
    expect(r.anchorA).toBe('⊢')
    expect(r.anchorB).toBe('o21')
    expect(r.ids).toBe(44)
    expect(r.chain.map((l) => [l.who, l.first, l.last, l.after ?? ''])).toEqual([
      ['A', 'a1', 'a9', '⊢'],
      ['base', 'o1', 'o21', ''],
      ['B', 'b1', 'b14', 'o21'],
    ])
  })
  it('splits the base run around an insert in the middle', () => {
    const r = crdtMerge('Summarize the ticket.', { at: 0, insert: 'Hi ' }, { at: 20, insert: ' now' })
    expect(r.chain.map((l) => `${l.first}-${l.last}`)).toEqual(['a1-a3', 'o1-o20', 'b1-b4', 'o21-o21'])
    expect(r.chain[2].after).toBe('o20')
  })

  it('agrees with OT on every pair of positions (deterministic sweep)', () => {
    const bases = ['', 'a', 'abc', 'Summarize the report.']
    const inserts = ['X', 'YZ', ' hello ']
    for (const base of bases)
      for (let i = 0; i <= base.length; i++)
        for (let j = 0; j <= base.length; j++)
          for (const sa of inserts)
            for (const sb of inserts) {
              const a = { at: i, insert: sa }
              const b = { at: j, insert: sb }
              const ot = otMerge(base, a, b)
              const cr = crdtMerge(base, a, b)
              expect(ot.converged).toBe(true)
              expect(textOf(cr.segs), `${base}|${i}:${sa}|${j}:${sb}`).toBe(textOf(ot.segs))
              // authorship survives too
              expect(cr.segs).toEqual(ot.segs)
            }
  })
})

describe('last write wins', () => {
  it('keeps the last copy and ghosts the other insert where it would have gone', () => {
    const r = lwwMerge(DEFAULT_BASE, DEFAULT_A, DEFAULT_B, 'B')
    expect(textOf(r.segs)).toBe('Summarize the report. Cite sources.')
    expect(r.segs[0]).toEqual({ text: 'Briefly: ', who: 'A', lost: true })
    const r2 = lwwMerge(DEFAULT_BASE, DEFAULT_A, DEFAULT_B, 'A')
    expect(textOf(r2.segs)).toBe('Briefly: Summarize the report.')
    expect(r2.segs[r2.segs.length - 1]).toEqual({ text: ' Cite sources.', who: 'B', lost: true })
  })
  it('summarises how many edits survive', () => {
    expect(merge('lww', DEFAULT_BASE, DEFAULT_A, DEFAULT_B).kept).toBe(1)
    expect(merge('ot', DEFAULT_BASE, DEFAULT_A, DEFAULT_B).kept).toBe(2)
    expect(merge('crdt', DEFAULT_BASE, DEFAULT_A, DEFAULT_B).kept).toBe(2)
    expect(merge('ot', DEFAULT_BASE, DEFAULT_A, DEFAULT_B).text).toBe(merge('crdt', DEFAULT_BASE, DEFAULT_A, DEFAULT_B).text)
  })
})
