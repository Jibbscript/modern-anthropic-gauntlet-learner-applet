import type { Rich, Step } from '../core/types'

/** Result of grading a step. `feedback` is shown in the feedback panel above the explanation. */
export interface CheckResult {
  correct: boolean
  feedback?: Rich
  /** flashcards only: the learner's self-grade (1 again .. 4 easy) */
  grade?: 1 | 2 | 3 | 4
}

/**
 * What a graded step hands the player: whether the Check button is enabled
 * and how to grade the current answer.
 */
export interface StepController {
  ready: boolean
  check: () => CheckResult
}

/**
 * answer    – learner is working on it
 * correct   – graded correct; render locked, with correct styling
 * incorrect – graded wrong; render the learner's answer with wrong styling
 * revealed  – learner gave up; render locked and SHOW the correct answer
 */
export type StepPhase = 'answer' | 'correct' | 'incorrect' | 'revealed'

export interface StepProps<S extends { kind: string; id: string } = Step> {
  step: S
  phase: StepPhase
  /** 0-based attempt number. The player remounts the step on retry (key includes attempt). */
  attempt: number
  /** register/refresh the controller; call from an effect whenever the answer changes */
  setController: (c: StepController) => void
  /** self-grading steps (widget, interview) report their result here */
  complete: (r: CheckResult) => void
  mode: 'lesson' | 'review'
  /** lesson id, when in a lesson (reflect steps use it as a storage key) */
  lessonId?: string
  /** call when the learner opens a hint (pass to <Hint onOpen>); lowers the review grade */
  onHint?: () => void
}
