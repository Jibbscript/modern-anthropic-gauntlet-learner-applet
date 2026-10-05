/**
 * A tiny stack machine: parser + single-step interpreter, pure and
 * deterministic so the widget can replay, test and animate it.
 *
 * Program lines are source strings. A line may hold a label (`loop:`), an
 * instruction, both (`loop: LOAD n`), a comment after `#`, or nothing.
 * The program counter is an index into the lines and always rests on an
 * executable line (an instruction or a line that failed to parse) or on
 * `lines.length` (the end).
 */

export type Op = 'PUSH' | 'POP' | 'ADD' | 'SUB' | 'MUL' | 'DUP' | 'SWAP' | 'JMP' | 'JZ' | 'PRINT' | 'HALT' | 'LOAD' | 'STORE'

const ARITY: Record<Op, 'none' | 'int' | 'label' | 'name'> = {
  PUSH: 'int',
  POP: 'none',
  ADD: 'none',
  SUB: 'none',
  MUL: 'none',
  DUP: 'none',
  SWAP: 'none',
  JMP: 'label',
  JZ: 'label',
  PRINT: 'none',
  HALT: 'none',
  LOAD: 'name',
  STORE: 'name',
}

export interface Instr {
  op: Op
  /** PUSH: the integer; JMP/JZ: the label; LOAD/STORE: the variable name */
  arg?: number | string
}

export interface Line {
  /** original source text */
  src: string
  /** code part (before `#`), trimmed, without the label */
  code: string
  comment?: string
  label?: string
  instr?: Instr
  /** set when the line fails to parse or names a missing label; it fails when executed */
  error?: string
}

export interface Program {
  lines: Line[]
  /** label name → line index of the label */
  labels: Record<string, number>
}

const NAME = /^[A-Za-z_][A-Za-z0-9_]*$/
const INT = /^[+-]?\d+$/

export function parseProgram(src: string[]): Program {
  const lines: Line[] = []
  const labels: Record<string, number> = {}
  src.forEach((raw, i) => {
    const text = String(raw ?? '')
    const hash = text.indexOf('#')
    const comment = hash >= 0 ? text.slice(hash + 1).trim() : undefined
    let code = (hash >= 0 ? text.slice(0, hash) : text).trim()
    const line: Line = { src: text, code: '', comment: comment || undefined }
    const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/.exec(code)
    if (m) {
      line.label = m[1]
      code = m[2].trim()
      if (labels[m[1]] !== undefined) line.error = `Duplicate label '${m[1]}'`
      else labels[m[1]] = i
    }
    line.code = code
    if (code && !line.error) {
      const parts = code.split(/\s+/)
      const op = parts[0].toUpperCase() as Op
      const args = parts.slice(1)
      const kind = ARITY[op]
      if (!kind) line.error = `Unknown instruction '${parts[0]}'`
      else if (kind === 'none') {
        if (args.length) line.error = `${op} takes no argument`
        else line.instr = { op }
      } else if (args.length !== 1) {
        line.error = kind === 'int' ? `${op} needs one number` : kind === 'label' ? `${op} needs a label` : `${op} needs a variable name`
      } else if (kind === 'int') {
        if (!INT.test(args[0])) line.error = `${op} needs a whole number, not '${args[0]}'`
        else if (!Number.isSafeInteger(Number(args[0]))) line.error = `${args[0]} is too big for this machine`
        else line.instr = { op, arg: Number(args[0]) + 0 }
      } else if (!NAME.test(args[0])) {
        line.error = `Bad ${kind} '${args[0]}'`
      } else line.instr = { op, arg: args[0] }
    }
    lines.push(line)
  })
  // unknown jump targets fail when that line runs, like a missing function
  for (const line of lines) {
    if (line.instr && (line.instr.op === 'JMP' || line.instr.op === 'JZ') && labels[line.instr.arg as string] === undefined) {
      line.error = `Unknown label '${line.instr.arg}'`
    }
  }
  return { lines, labels }
}

export function isExecutable(line: Line | undefined): boolean {
  return !!line && (!!line.instr || !!line.error)
}

/** first executable line at or after i, or lines.length */
export function nextExec(prog: Program, i: number): number {
  let j = Math.max(0, i)
  while (j < prog.lines.length && !isExecutable(prog.lines[j])) j++
  return j
}

export interface StackItem {
  /** stable identity for animation: a new value gets a new id */
  id: number
  value: number
}

export interface StepEvent {
  /** line index that ran */
  line: number
  op: Op
  popped: number[]
  pushed: number[]
  /** for JMP/JZ: whether control jumped */
  jumped?: boolean
  /** one-line narration, e.g. "pop 4 and 10 → push 10 − 4 = 6" */
  text: string
}

export type Status = 'ok' | 'halted' | 'error'

export interface VmState {
  pc: number
  stack: StackItem[]
  vars: Record<string, number>
  /** variable names in first-store order */
  varOrder: string[]
  output: number[]
  steps: number
  status: Status
  haltReason?: 'halt' | 'end'
  error?: { line: number; message: string }
  last?: StepEvent
  nextId: number
}

export const STEP_LIMIT = 500

export function initVm(prog: Program): VmState {
  const pc = nextExec(prog, 0)
  const end = pc >= prog.lines.length
  return {
    pc,
    stack: [],
    vars: {},
    varOrder: [],
    output: [],
    steps: 0,
    status: end ? 'halted' : 'ok',
    haltReason: end ? 'end' : undefined,
    nextId: 1,
  }
}

const SYM: Partial<Record<Op, string>> = { ADD: '+', SUB: '−', MUL: '×' }

/** a negative operand reads better in brackets: 10 − (−4) */
function fmt(n: number): string {
  return n < 0 ? `(${n})`.replace('-', '−') : String(n)
}
export function showNum(n: number): string {
  return String(n).replace('-', '−')
}

/** Execute one instruction. Returns a new state; a finished machine is returned unchanged. */
export function stepVm(prog: Program, s: VmState): VmState {
  if (s.status !== 'ok') return s
  const at = s.pc
  const line = prog.lines[at]
  const fail = (message: string): VmState => ({ ...s, status: 'error', error: { line: at, message } })
  if (!line || at >= prog.lines.length) return { ...s, status: 'halted', haltReason: 'end' }
  if (s.steps >= STEP_LIMIT) return fail(`Step limit (${STEP_LIMIT}) reached. Is this an infinite loop?`)
  if (line.error || !line.instr) return fail(line.error ?? 'Cannot run this line')

  const { op, arg } = line.instr
  const stack = s.stack.slice()
  let nextId = s.nextId
  const popped: number[] = []
  const pushed: number[] = []
  const need = (n: number): boolean => stack.length >= n
  const pop = (): number => {
    const v = stack.pop()!.value
    popped.push(v)
    return v
  }
  const push = (v: number) => {
    stack.push({ id: nextId++, value: v })
    pushed.push(v)
  }
  let pc = at + 1
  let vars = s.vars
  let varOrder = s.varOrder
  let output = s.output
  let status: Status = 'ok'
  let haltReason: VmState['haltReason']
  let jumped: boolean | undefined
  let text = ''

  switch (op) {
    case 'PUSH':
      push(arg as number)
      text = `push ${showNum(arg as number)}`
      break
    case 'POP': {
      if (!need(1)) return fail('Stack underflow: POP needs 1 value')
      const v = pop()
      text = `discard ${showNum(v)}`
      break
    }
    case 'ADD':
    case 'SUB':
    case 'MUL': {
      if (!need(2)) return fail(`Stack underflow: ${op} needs 2 values, found ${stack.length}`)
      const b = pop()
      const a = pop()
      // + 0 folds −0 (from 0 × −n) into 0
      const r = (op === 'ADD' ? a + b : op === 'SUB' ? a - b : a * b) + 0
      // a doubling loop would otherwise reach Infinity; integers here are exact up to 2^53
      if (!Number.isSafeInteger(r)) return fail(`Overflow: ${showNum(a)} ${SYM[op]} ${showNum(b)} is too big for this machine`)
      push(r)
      text = `pop ${showNum(b)}, pop ${showNum(a)} → push ${fmt(a)} ${SYM[op]} ${fmt(b)} = ${showNum(r)}`
      break
    }
    case 'DUP': {
      if (!need(1)) return fail('Stack underflow: DUP needs 1 value')
      const v = stack[stack.length - 1].value
      push(v)
      text = `copy the top: push ${showNum(v)}`
      break
    }
    case 'SWAP': {
      if (!need(2)) return fail(`Stack underflow: SWAP needs 2 values, found ${stack.length}`)
      const n = stack.length
      ;[stack[n - 1], stack[n - 2]] = [stack[n - 2], stack[n - 1]]
      text = `swap ${showNum(stack[n - 2].value)} and ${showNum(stack[n - 1].value)}`
      break
    }
    case 'JMP':
      pc = prog.labels[arg as string]
      jumped = true
      text = `jump to ${arg}`
      break
    case 'JZ': {
      if (!need(1)) return fail('Stack underflow: JZ needs 1 value')
      const v = pop()
      jumped = v === 0
      if (jumped) pc = prog.labels[arg as string]
      text = jumped ? `pop 0 → zero, jump to ${arg}` : `pop ${showNum(v)} → not zero, fall through`
      break
    }
    case 'PRINT': {
      if (!need(1)) return fail('Stack underflow: PRINT needs 1 value')
      const v = pop()
      output = [...output, v]
      text = `pop ${showNum(v)} → print it`
      break
    }
    case 'HALT':
      status = 'halted'
      haltReason = 'halt'
      pc = at
      text = 'stop the machine'
      break
    case 'LOAD': {
      const name = arg as string
      if (!(name in s.vars)) return fail(`'${name}' is not defined. STORE it first`)
      push(s.vars[name])
      text = `push ${name} (${showNum(s.vars[name])})`
      break
    }
    case 'STORE': {
      if (!need(1)) return fail(`Stack underflow: STORE needs 1 value`)
      const name = arg as string
      const v = pop()
      vars = { ...s.vars, [name]: v }
      if (!varOrder.includes(name)) varOrder = [...varOrder, name]
      text = `pop ${showNum(v)} → ${name} = ${showNum(v)}`
      break
    }
  }

  if (status === 'ok') {
    pc = nextExec(prog, pc)
    if (pc >= prog.lines.length) {
      status = 'halted'
      haltReason = 'end'
    }
  }
  return {
    pc,
    stack,
    vars,
    varOrder,
    output,
    steps: s.steps + 1,
    status,
    haltReason,
    last: { line: at, op, popped, pushed, jumped, text },
    nextId,
  }
}

/** Run to completion (or error / step limit). For tests and previews. */
export function runVm(prog: Program, s: VmState = initVm(prog)): VmState {
  let cur = s
  while (cur.status === 'ok') cur = stepVm(prog, cur)
  return cur
}

/** The countdown loop shown when no program is configured: prints 3, 2, 1. */
export const DEFAULT_PROGRAM = [
  'PUSH 3',
  'STORE n',
  'loop:',
  'LOAD n',
  'JZ done',
  'LOAD n',
  'PRINT',
  'LOAD n',
  'PUSH 1',
  'SUB',
  'STORE n',
  'JMP loop',
  'done:',
  'HALT',
]
