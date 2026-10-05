import { describe, expect, it } from 'vitest'
import { allDone, canStep, findCycle, initDeadlock, isDeadlocked, programs, step, type DState, type Scenario } from './model'

function run(scenario: Scenario, order: number[]): DState {
  const p = programs(scenario)
  return order.reduce((s, t) => step(s, p, t), initDeadlock())
}

/** outcome of every schedule: 'deadlock' or 'done' */
function outcomes(scenario: Scenario): Set<string> {
  const p = programs(scenario)
  const out = new Set<string>()
  const go = (s: DState, depth: number) => {
    expect(depth).toBeLessThan(40)
    if (isDeadlocked(s)) return void out.add('deadlock')
    if (allDone(s, p)) return void out.add('done')
    const runnable = [0, 1].filter((t) => canStep(s, p, t))
    expect(runnable.length).toBeGreaterThan(0)
    for (const t of runnable) go(step(s, p, t), depth + 1)
  }
  go(initDeadlock(), 0)
  return out
}

describe('deadlock model', () => {
  it('opposite order deadlocks when each thread takes its first lock', () => {
    const s = run('opposite', [0, 1, 0, 1])
    expect(s.owner).toEqual([0, 1])
    expect(s.waiting).toEqual([1, 0])
    expect(isDeadlocked(s)).toBe(true)
    expect(findCycle(s)).toEqual([0, 1])
  })

  it('a single waiter is not a deadlock', () => {
    const s = run('opposite', [0, 1, 0])
    expect(s.waiting).toEqual([1, null])
    expect(isDeadlocked(s)).toBe(false)
    expect(canStep(s, programs('opposite'), 0)).toBe(false)
    expect(canStep(s, programs('opposite'), 1)).toBe(true)
  })

  it('opposite order finishes when A runs to completion first', () => {
    const s = run('opposite', [0, 0, 0, 0, 0, 1, 1, 1, 1, 1])
    expect(allDone(s, programs('opposite'))).toBe(true)
    expect(s.owner).toEqual([null, null])
  })

  it('release hands the lock to a waiting thread', () => {
    // A takes L1, B waits for L1, A runs to the end and releases L1 -> B owns it
    const p = programs('ordered')
    let s = run('ordered', [0, 1])
    expect(s.waiting).toEqual([null, 0])
    for (let i = 0; i < 4; i++) s = step(s, p, 0)
    expect(s.owner[0]).toBe(1)
    expect(s.waiting[1]).toBe(null)
    expect(s.pc[1]).toBe(1)
    expect(s.handoff).toEqual({ lock: 0, from: 0, to: 1 })
    expect(s.contended).toBe(true)
  })

  it('opposite order can both deadlock and finish', () => {
    expect(outcomes('opposite')).toEqual(new Set(['deadlock', 'done']))
  })

  it('a consistent lock order can never deadlock', () => {
    expect(outcomes('ordered')).toEqual(new Set(['done']))
  })
})
