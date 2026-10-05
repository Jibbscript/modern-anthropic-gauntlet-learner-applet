/** Deterministic shuffle so an item keeps its shuffled order across re-renders. */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  const rand = () => {
    h += 0x6d2b79f5
    let t = h
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Shuffle that guarantees the result differs from the original order when possible. */
export function shuffleNotIdentity<T>(items: T[], seed: string): T[] {
  if (items.length < 2) return items.slice()
  for (let k = 0; k < 8; k++) {
    const s = seededShuffle(items, `${seed}:${k}`)
    if (s.some((x, i) => x !== items[i])) return s
  }
  const s = items.slice()
  ;[s[0], s[1]] = [s[1], s[0]]
  return s
}
