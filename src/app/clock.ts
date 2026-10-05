import { useSyncExternalStore } from 'react'

/**
 * One shared wall clock for every screen. Due counts, streak state and the
 * "today" key depend on the time, so screens re-render once a minute (on the
 * minute, so the day rolls over at local midnight) and whenever the app comes
 * back to the foreground. A single timer serves all subscribers, so every
 * screen and the tab badges agree on what "now" is.
 */
const TICK_MS = 60_000

let now = Date.now()
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setTimeout> | null = null

function emit() {
  now = Date.now()
  for (const l of listeners) l()
}

function schedule() {
  // land just after the next minute boundary
  timer = setTimeout(
    () => {
      emit()
      schedule()
    },
    TICK_MS - (Date.now() % TICK_MS) + 20,
  )
}

function onVisible() {
  if (document.visibilityState === 'visible') emit()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (listeners.size === 1) {
    // the first subscriber after a quiet spell: never start from a stale time
    now = Date.now()
    schedule()
    document.addEventListener('visibilitychange', onVisible)
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      if (timer) clearTimeout(timer)
      timer = null
      document.removeEventListener('visibilitychange', onVisible)
    }
  }
}

/** with nobody subscribed the stored time can be hours old; refresh it before a first render reads it */
const snapshot = () => {
  if (listeners.size === 0 && Date.now() - now >= TICK_MS) now = Date.now()
  return now
}

/** the current time in ms, refreshed every minute and on refocus */
export function useClock(): number {
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}
