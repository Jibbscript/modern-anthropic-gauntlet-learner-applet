/** Local-calendar date helpers. Streaks and daily goals follow the learner's local day. */

export const DAY_MS = 86_400_000

export function dayKey(t: number): string {
  const d = new Date(t)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function parseDayKey(key: string): number {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).getTime()
}

/** whole calendar days from a to b (b later => positive) */
export function daysBetween(a: string, b: string): number {
  return Math.round((parseDayKey(b) - parseDayKey(a)) / DAY_MS)
}

export function addDays(key: string, n: number): string {
  const t = parseDayKey(key)
  const d = new Date(t)
  d.setDate(d.getDate() + n)
  return dayKey(d.getTime())
}

/** the 7 day keys of the week containing `key`, Monday first */
export function weekOf(key: string): string[] {
  const d = new Date(parseDayKey(key))
  const dow = (d.getDay() + 6) % 7 // 0 = Monday
  const monday = addDays(key, -dow)
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}
