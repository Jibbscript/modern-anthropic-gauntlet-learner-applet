import confetti from 'canvas-confetti'
import { useStore } from '../core/store'

/**
 * Feedback effects: synthesized sounds (no audio files), haptics where the
 * platform supports them, and confetti. All respect user settings.
 */

let ctx: AudioContext | null = null
function audio(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      ctx = new AC()
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.12) {
  const a = audio()
  if (!a) return
  const t0 = a.currentTime + start
  const osc = a.createOscillator()
  const g = a.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g).connect(a.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

export type Sfx = 'tap' | 'select' | 'correct' | 'wrong' | 'complete' | 'streak' | 'combo' | 'flip' | 'unlock'

export function sfx(kind: Sfx) {
  if (!useStore.getState().settings.sound) return
  switch (kind) {
    case 'tap':
      tone(520, 0, 0.05, 'triangle', 0.05)
      break
    case 'select':
      tone(660, 0, 0.06, 'triangle', 0.06)
      break
    case 'flip':
      tone(440, 0, 0.05, 'triangle', 0.05)
      tone(700, 0.04, 0.06, 'triangle', 0.05)
      break
    case 'correct':
      tone(784, 0, 0.12, 'sine', 0.12)
      tone(1175, 0.08, 0.22, 'sine', 0.1)
      break
    case 'wrong':
      tone(220, 0, 0.16, 'triangle', 0.1)
      tone(185, 0.09, 0.22, 'triangle', 0.08)
      break
    case 'combo':
      ;[784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.05, 0.14, 'sine', 0.08))
      break
    case 'unlock':
      tone(880, 0, 0.1, 'sine', 0.08)
      tone(1320, 0.07, 0.18, 'sine', 0.08)
      break
    case 'complete':
      ;[523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.35, 'sine', 0.09))
      tone(1568, 0.42, 0.5, 'sine', 0.05)
      break
    case 'streak':
      ;[392, 523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.07, 0.3, 'triangle', 0.07))
      break
  }
}

export function haptic(pattern: 'light' | 'success' | 'error' = 'light') {
  if (!useStore.getState().settings.haptics) return
  try {
    const p = pattern === 'light' ? 8 : pattern === 'success' ? [12, 40, 18] : [30, 40, 30]
    navigator.vibrate?.(p)
  } catch {
    /* unsupported */
  }
}

function reduced(): boolean {
  if (useStore.getState().settings.reduceMotion) return true
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/** green + pear sparkles, the end-of-lesson burst */
const PALETTE = ['#29cc57', '#5ed981', '#d8e82e', '#b0d828', '#15b441', '#ffffff']

let sparkle: confetti.Shape | null = null
function sparkleShape(): confetti.Shape | undefined {
  try {
    // four-point star
    sparkle ??= confetti.shapeFromPath({ path: 'M10 0 C11 7 13 9 20 10 C13 11 11 13 10 20 C9 13 7 11 0 10 C7 9 9 7 10 0 Z' })
    return sparkle
  } catch {
    return undefined
  }
}

export function celebrate(intensity: 'small' | 'big' = 'big', origin?: { x: number; y: number }) {
  if (reduced()) return
  try {
    const s = sparkleShape()
    const shapes: confetti.Shape[] = s ? [s, s, 'circle'] : ['circle', 'square']
    if (intensity === 'small') {
      void confetti({ particleCount: 40, spread: 60, startVelocity: 32, scalar: 1, ticks: 120, origin: origin ?? { x: 0.5, y: 0.8 }, colors: PALETTE, shapes, disableForReducedMotion: true })
      return
    }
    const fire = (ratio: number, opts: confetti.Options) =>
      void confetti({ origin: { y: 0.55 }, colors: PALETTE, shapes, disableForReducedMotion: true, particleCount: Math.floor(200 * ratio), ...opts })
    fire(0.25, { spread: 26, startVelocity: 55 })
    fire(0.2, { spread: 60 })
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 })
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 })
    fire(0.1, { spread: 120, startVelocity: 45 })
  } catch {
    /* canvas unavailable */
  }
}
