import { describe, expect, it } from 'vitest'
import { DEFAULT_PROGRAM, STEP_LIMIT, initVm, nextExec, parseProgram, runVm, stepVm } from './model'

const run = (src: string[]) => runVm(parseProgram(src))
const top = (src: string[]) => {
  const s = run(src)
  return s.stack[s.stack.length - 1]?.value
}

describe('parser', () => {
  it('reads labels, comments, blank lines and case-insensitive ops', () => {
    const p = parseProgram(['# setup', 'start:  push 2  # two', '', 'loop: DUP', 'HALT'])
    expect(p.labels).toEqual({ start: 1, loop: 3 })
    expect(p.lines[0].instr).toBeUndefined()
    expect(p.lines[0].comment).toBe('setup')
    expect(p.lines[1].instr).toEqual({ op: 'PUSH', arg: 2 })
    expect(p.lines[1].comment).toBe('two')
    expect(p.lines[3].instr).toEqual({ op: 'DUP' })
    expect(nextExec(p, 0)).toBe(1)
    expect(nextExec(p, 2)).toBe(3)
  })

  it('flags bad lines without throwing', () => {
    const p = parseProgram(['FOO', 'PUSH', 'PUSH x', 'ADD 1', 'JMP nowhere', 'a:', 'a:', 'LOAD 9'])
    expect(p.lines[0].error).toMatch(/Unknown instruction 'FOO'/)
    expect(p.lines[1].error).toMatch(/needs one number/)
    expect(p.lines[2].error).toMatch(/whole number/)
    expect(p.lines[3].error).toMatch(/takes no argument/)
    expect(p.lines[4].error).toMatch(/Unknown label 'nowhere'/)
    expect(p.lines[6].error).toMatch(/Duplicate label/)
    expect(p.lines[7].error).toMatch(/Bad name/)
  })
})

describe('interpreter', () => {
  it('SUB and friends pop b (the top) then a, and push a op b', () => {
    expect(top(['PUSH 10', 'PUSH 4', 'SUB', 'HALT'])).toBe(6)
    expect(top(['PUSH 4', 'PUSH 10', 'SUB', 'HALT'])).toBe(-6)
    expect(top(['PUSH 3', 'PUSH 4', 'ADD', 'HALT'])).toBe(7)
    expect(top(['PUSH -3', 'PUSH 4', 'MUL', 'HALT'])).toBe(-12)
  })

  it('runs the lesson predict program to 216', () => {
    const s = run(['PUSH 10', 'PUSH 4', 'SUB', 'DUP', 'DUP', 'MUL', 'MUL', 'PRINT', 'HALT'])
    expect(s.status).toBe('halted')
    expect(s.haltReason).toBe('halt')
    expect(s.output).toEqual([216])
    expect(s.stack).toEqual([])
  })

  it('DUP copies with a new identity; SWAP keeps identities', () => {
    const p = parseProgram(['PUSH 1', 'PUSH 2', 'SWAP', 'DUP', 'HALT'])
    let s = initVm(p)
    s = stepVm(p, stepVm(p, s))
    const ids = s.stack.map((x) => x.id)
    s = stepVm(p, s)
    expect(s.stack.map((x) => x.value)).toEqual([2, 1])
    expect(s.stack.map((x) => x.id)).toEqual([ids[1], ids[0]])
    s = stepVm(p, s)
    expect(s.stack.map((x) => x.value)).toEqual([2, 1, 1])
    expect(new Set(s.stack.map((x) => x.id)).size).toBe(3)
  })

  it('the default countdown prints 3, 2, 1 and halts', () => {
    const s = run(DEFAULT_PROGRAM)
    expect(s.output).toEqual([3, 2, 1])
    expect(s.status).toBe('halted')
    expect(s.vars).toEqual({ n: 0 })
    expect(s.stack).toEqual([])
    expect(s.steps).toBe(32)
  })

  it('JZ pops and jumps only on zero', () => {
    const p = parseProgram(['PUSH 0', 'JZ end', 'PUSH 99', 'end:', 'PUSH 1', 'HALT'])
    const s = runVm(p)
    expect(s.stack.map((x) => x.value)).toEqual([1])
    const p2 = parseProgram(['PUSH 5', 'JZ end', 'PUSH 99', 'end:', 'HALT'])
    expect(runVm(p2).stack.map((x) => x.value)).toEqual([99])
  })

  it('STORE pops into a variable; LOAD pushes it', () => {
    const s = run(['PUSH 7', 'STORE x', 'LOAD x', 'LOAD x', 'ADD', 'HALT'])
    expect(s.vars).toEqual({ x: 7 })
    expect(s.stack.map((x) => x.value)).toEqual([14])
    expect(s.varOrder).toEqual(['x'])
  })

  it('reports stack underflow on the failing line', () => {
    const s = run(['PUSH 1', 'ADD', 'HALT'])
    expect(s.status).toBe('error')
    expect(s.error?.line).toBe(1)
    expect(s.error?.message).toMatch(/underflow/)
    for (const op of ['POP', 'DUP', 'PRINT', 'JZ x', 'STORE v', 'SWAP']) {
      const r = run(['x:', op])
      expect(r.status, op).toBe('error')
      expect(r.error?.message, op).toMatch(/underflow/)
    }
  })

  it('fails on unknown labels / instructions / variables only when reached', () => {
    const s = run(['PUSH 1', 'PRINT', 'JMP nowhere'])
    expect(s.output).toEqual([1])
    expect(s.status).toBe('error')
    expect(s.error).toEqual({ line: 2, message: "Unknown label 'nowhere'" })
    expect(run(['BOGUS']).error?.line).toBe(0)
    expect(run(['LOAD y']).error?.message).toMatch(/not defined/)
  })

  it('stops infinite loops at the step limit', () => {
    const s = run(['top:', 'JMP top'])
    expect(s.status).toBe('error')
    expect(s.steps).toBe(STEP_LIMIT)
    expect(s.error?.message).toMatch(/Step limit/)
    expect(s.error?.line).toBe(1)
  })

  it('falling off the end halts', () => {
    const s = run(['PUSH 1'])
    expect(s.status).toBe('halted')
    expect(s.haltReason).toBe('end')
    expect(run([]).status).toBe('halted')
    expect(run(['# only a comment', 'x:']).haltReason).toBe('end')
  })

  it('HALT leaves the pc on the HALT line and further steps are no-ops', () => {
    const p = parseProgram(['PUSH 1', 'HALT', 'PUSH 2'])
    const s = runVm(p)
    expect(s.pc).toBe(1)
    expect(stepVm(p, s)).toBe(s)
  })

  it('narrates binary ops in operand order', () => {
    const p = parseProgram(['PUSH 10', 'PUSH 4', 'SUB'])
    let s = initVm(p)
    for (let i = 0; i < 3; i++) s = stepVm(p, s)
    expect(s.last?.text).toBe('pop 4, pop 10 → push 10 − 4 = 6')
    expect(s.last?.popped).toEqual([4, 10])
    expect(s.last?.pushed).toEqual([6])
  })
})
