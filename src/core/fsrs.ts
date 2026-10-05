/**
 * FSRS-4.5 spaced-repetition scheduler (Free Spaced Repetition Scheduler,
 * open-spaced-repetition). Each card carries a memory model:
 *   stability  S: days until recall probability decays to 90%
 *   difficulty D: 1 (easy) .. 10 (hard)
 * Recall probability after t days is R(t) = (1 + FACTOR * t / S) ^ DECAY.
 *
 * On top of plain FSRS this adds two personalisation hooks:
 *   - desired retention is configurable (higher = shorter intervals)
 *   - an interview date caps intervals so material is fresh on the day
 */

export type Grade = 1 | 2 | 3 | 4 // again | hard | good | easy

export type CardPhase = 'new' | 'learning' | 'review' | 'relearning'

export interface CardState {
  phase: CardPhase
  /** epoch ms when the card is next due */
  due: number
  stability: number
  difficulty: number
  reps: number
  lapses: number
  /** epoch ms of the last review, null if never reviewed */
  last: number | null
  /** recent grades, newest last (capped) */
  history: { t: number; g: Grade }[]
}

export const W = [
  0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461, 2.1072,
  0.0793, 0.3246, 1.587, 0.2272, 2.8755,
] as const

const DECAY = -0.5
const FACTOR = 19 / 81
const DAY = 86_400_000
const MINUTE = 60_000
const HISTORY_CAP = 24

export interface ScheduleOptions {
  /** target recall probability at review time, 0.7..0.97 */
  retention?: number
  /** hard cap on intervals, days */
  maxInterval?: number
  /** epoch ms of the learner's interview; intervals avoid overshooting it */
  interviewAt?: number | null
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))

export function newCard(now: number, firstDueInMs = 20 * 60 * 60 * 1000): CardState {
  return {
    phase: 'new',
    due: now + firstDueInMs,
    stability: 0,
    difficulty: 0,
    reps: 0,
    lapses: 0,
    last: null,
    history: [],
  }
}

/** probability of recall t days after the last review */
export function retrievability(elapsedDays: number, stability: number): number {
  if (stability <= 0) return 0
  return Math.pow(1 + (FACTOR * Math.max(0, elapsedDays)) / stability, DECAY)
}

/** current recall probability of a card (0 for never-reviewed cards) */
export function recallNow(card: CardState, now: number): number {
  if (card.last == null || card.stability <= 0) return 0
  return retrievability((now - card.last) / DAY, card.stability)
}

/** interval in days that brings recall down to `retention` */
export function intervalFor(stability: number, retention: number): number {
  return (stability / FACTOR) * (Math.pow(retention, 1 / DECAY) - 1)
}

const initStability = (g: Grade) => W[g - 1]
const initDifficulty = (g: Grade) => clamp(W[4] - (g - 3) * W[5], 1, 10)

function nextDifficulty(d: number, g: Grade): number {
  const next = d - W[6] * (g - 3)
  return clamp(W[7] * initDifficulty(3) + (1 - W[7]) * next, 1, 10)
}

function stabilityAfterSuccess(d: number, s: number, r: number, g: Grade): number {
  const hardPenalty = g === 2 ? W[15] : 1
  const easyBonus = g === 4 ? W[16] : 1
  return (
    s *
    (1 +
      Math.exp(W[8]) *
        (11 - d) *
        Math.pow(s, -W[9]) *
        (Math.exp(W[10] * (1 - r)) - 1) *
        hardPenalty *
        easyBonus)
  )
}

function stabilityAfterLapse(d: number, s: number, r: number): number {
  const next =
    W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r))
  return Math.min(next, s)
}

/** returns a NEW card state after grading at time `now` */
export function review(card: CardState, grade: Grade, now: number, opts: ScheduleOptions = {}): CardState {
  const retention = clamp(opts.retention ?? 0.9, 0.7, 0.97)
  const maxInterval = opts.maxInterval ?? 365

  let { stability: s, difficulty: d, lapses, phase } = card
  const firstReview = card.last == null || s <= 0

  if (firstReview) {
    s = initStability(grade)
    d = initDifficulty(grade)
  } else {
    const elapsed = (now - (card.last as number)) / DAY
    const r = retrievability(elapsed, s)
    d = nextDifficulty(d, grade)
    s = grade === 1 ? stabilityAfterLapse(d, s, r) : stabilityAfterSuccess(d, s, r, grade)
  }
  s = clamp(s, 0.05, 36500)

  let due: number
  if (grade === 1) {
    // failed: see it again soon (same session if still practising). Only
    // forgetting a graduated card is a lapse; missing it again while it is
    // still (re)learning is not a new lapse.
    if (!firstReview && phase === 'review') lapses += 1
    phase = firstReview || phase === 'new' || phase === 'learning' ? 'learning' : 'relearning'
    due = now + 10 * MINUTE
  } else {
    phase = 'review'
    let days = clamp(Math.round(intervalFor(s, retention)), 1, maxInterval)
    days = capForInterview(days, now, opts.interviewAt)
    due = now + days * DAY
  }

  const history = [...card.history, { t: now, g: grade }].slice(-HISTORY_CAP)
  return { phase, due, stability: s, difficulty: d, reps: card.reps + 1, lapses, last: now, history }
}

/**
 * Before an interview, never schedule past the day before it; once the
 * interval would cross it, split the remaining time so there is one more
 * touch shortly before the interview.
 */
export function capForInterview(days: number, now: number, interviewAt?: number | null): number {
  if (!interviewAt || interviewAt <= now) return days
  const daysLeft = (interviewAt - now) / DAY
  if (daysLeft <= 1.5) return Math.min(days, 1)
  if (days >= daysLeft - 1) return Math.max(1, Math.floor((daysLeft - 1) / 2))
  return days
}

/** preview the interval (days) each grade would give, for button labels */
export function previewIntervals(card: CardState, now: number, opts: ScheduleOptions = {}): Record<Grade, number> {
  const out = {} as Record<Grade, number>
  for (const g of [1, 2, 3, 4] as Grade[]) {
    const next = review(card, g, now, opts)
    out[g] = (next.due - now) / DAY
  }
  return out
}

/** human label for an interval in days */
export function formatInterval(days: number): string {
  if (days < 1 / 24) return `${Math.max(1, Math.round(days * 24 * 60))}m`
  if (days < 1) return `${Math.round(days * 24)}h`
  if (days < 30) return `${Math.round(days)}d`
  if (days < 365) return `${Math.round(days / 30)}mo`
  return `${(days / 365).toFixed(1)}y`
}

/**
 * Derive a grade from an interactive answer, since auto-graded cards have no
 * self-rating buttons.
 */
export function gradeFromAnswer(opts: {
  correct: boolean
  attempts: number
  usedHint: boolean
  ms: number
  /** rough expected time for this card */
  expectedMs: number
  previouslySeen: boolean
}): Grade {
  if (!opts.correct || opts.attempts > 2) return 1
  if (opts.attempts > 1 || opts.usedHint) return 2
  if (opts.previouslySeen && opts.ms < opts.expectedMs * 0.5) return 4
  if (opts.ms > opts.expectedMs * 2.5) return 2
  return 3
}
