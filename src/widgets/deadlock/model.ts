/**
 * Pure model for the deadlock widget: threads A and B, locks L1 and L2.
 *
 * Stepping a thread runs its next instruction. ACQUIRE on a free lock takes
 * it; ACQUIRE on a lock held by the other thread parks the thread in
 * `waiting` (it stays on that instruction). RELEASE hands the lock straight
 * to a thread waiting for it, like a real mutex waking a waiter.
 * A deadlock is a cycle in the wait-for graph
 *   thread --waits for--> lock --held by--> thread.
 */

export type DOp = { kind: 'acquire'; lock: number } | { kind: 'release'; lock: number } | { kind: 'work' }

export type Scenario = 'opposite' | 'ordered'

export interface DState {
  pc: number[]
  /** owner thread of each lock, or null */
  owner: (number | null)[]
  /** lock each thread is blocked on, or null */
  waiting: (number | null)[]
  /** a thread had to wait at least once this run */
  contended: boolean
  /** the most recent hand-off: lock released by one thread and taken by a waiter */
  handoff: { lock: number; from: number; to: number } | null
  steps: number
}

export const THREADS = ['A', 'B'] as const
export const LOCKS = ['L1', 'L2'] as const

const acq = (lock: number): DOp => ({ kind: 'acquire', lock })
const rel = (lock: number): DOp => ({ kind: 'release', lock })
const work: DOp = { kind: 'work' }

export function programs(scenario: Scenario): DOp[][] {
  const a = [acq(0), acq(1), work, rel(1), rel(0)]
  const b = scenario === 'opposite' ? [acq(1), acq(0), work, rel(0), rel(1)] : [acq(0), acq(1), work, rel(1), rel(0)]
  return [a, b]
}

export function opLabel(op: DOp): string {
  if (op.kind === 'work') return 'WORK'
  return `${op.kind === 'acquire' ? 'ACQUIRE' : 'RELEASE'} ${LOCKS[op.lock]}`
}

export function initDeadlock(): DState {
  return { pc: [0, 0], owner: [null, null], waiting: [null, null], contended: false, handoff: null, steps: 0 }
}

export function isDone(s: DState, progs: DOp[][], t: number): boolean {
  return s.pc[t] >= progs[t].length
}

export function allDone(s: DState, progs: DOp[][]): boolean {
  return progs.every((_, t) => isDone(s, progs, t))
}

/**
 * Threads on a wait-for cycle, in order (t0 waits for a lock held by t1,
 * t1 waits for a lock held by t2, ...), or null when there is no cycle.
 */
export function findCycle(s: DState): number[] | null {
  for (let start = 0; start < s.pc.length; start++) {
    const path: number[] = []
    let t: number | null = start
    while (t !== null && !path.includes(t)) {
      path.push(t)
      const l: number | null = s.waiting[t]
      t = l === null ? null : s.owner[l]
    }
    if (t !== null) return path.slice(path.indexOf(t))
  }
  return null
}

export function isDeadlocked(s: DState): boolean {
  return findCycle(s) !== null
}

export function canStep(s: DState, progs: DOp[][], t: number): boolean {
  return !isDone(s, progs, t) && s.waiting[t] === null && !isDeadlocked(s)
}

/** Run thread t's next instruction (no-op when it cannot run). */
export function step(s: DState, progs: DOp[][], t: number): DState {
  if (!canStep(s, progs, t)) return s
  const op = progs[t][s.pc[t]]
  const pc = s.pc.slice()
  const owner = s.owner.slice()
  const waiting = s.waiting.slice()
  let contended = s.contended
  let handoff: DState['handoff'] = null
  if (op.kind === 'acquire') {
    if (owner[op.lock] === null || owner[op.lock] === t) {
      owner[op.lock] = t
      pc[t]++
    } else {
      waiting[t] = op.lock
      contended = true
    }
  } else if (op.kind === 'release') {
    owner[op.lock] = null
    pc[t]++
    const waiter = waiting.findIndex((w) => w === op.lock)
    if (waiter >= 0) {
      owner[op.lock] = waiter
      waiting[waiter] = null
      pc[waiter]++
      handoff = { lock: op.lock, from: t, to: waiter }
    }
  } else {
    pc[t]++
  }
  return { pc, owner, waiting, contended, handoff, steps: s.steps + 1 }
}

/** locks currently held by thread t */
export function heldBy(s: DState, t: number): number[] {
  return s.owner.flatMap((o, l) => (o === t ? [l] : []))
}
