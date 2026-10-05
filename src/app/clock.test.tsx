// @vitest-environment jsdom
import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useClock } from './clock'

function Probe({ id }: { id: string }) {
  return <span data-testid={id}>{useClock()}</span>
}

describe('useClock', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 5, 23, 58, 30))
  })
  afterEach(() => vi.useRealTimers())

  it('starts at the current time and ticks on the minute, shared by every subscriber', () => {
    const { getByTestId, unmount } = render(
      <>
        <Probe id="a" />
        <Probe id="b" />
      </>,
    )
    const read = (id: string) => Number(getByTestId(id).textContent)
    expect(read('a')).toBe(Date.now())
    // the first tick lands just after the minute boundary (23:59:00), not a full minute after mount
    act(() => void vi.advanceTimersByTime(31_000))
    expect(new Date(read('a')).getMinutes()).toBe(59)
    expect(read('b')).toBe(read('a'))
    // and the day rolls over at midnight
    act(() => void vi.advanceTimersByTime(60_000))
    expect(new Date(read('a')).getDate()).toBe(6)
    unmount()
  })

  it('refreshes when the app comes back to the foreground', () => {
    const { getByTestId, unmount } = render(<Probe id="c" />)
    const before = Number(getByTestId('c').textContent)
    vi.setSystemTime(Date.now() + 5_000)
    act(() => void document.dispatchEvent(new Event('visibilitychange')))
    expect(Number(getByTestId('c').textContent)).toBe(before + 5_000)
    unmount()
  })

  it('never starts a fresh screen from a stale time after a quiet spell', () => {
    const first = render(<Probe id="d" />)
    first.unmount()
    vi.setSystemTime(Date.now() + 3 * 3_600_000)
    const { getByTestId, unmount } = render(<Probe id="e" />)
    expect(Number(getByTestId('e').textContent)).toBe(Date.now())
    unmount()
  })
})
