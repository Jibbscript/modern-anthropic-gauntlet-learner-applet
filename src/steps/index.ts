import type { ComponentType } from 'react'
import type { StepProps } from './types'
import ConceptStep from './ConceptStep'
import McqStep from './McqStep'
import OrderStep from './OrderStep'
import SortStep from './SortStep'
import ClozeStep from './ClozeStep'
import SpotBugStep from './SpotBugStep'
import PredictStep from './PredictStep'
import NumericStep from './NumericStep'
import MatchStep from './MatchStep'
import CompareStep from './CompareStep'
import InterviewStep from './InterviewStep'
import ReflectStep from './ReflectStep'
import WidgetStep from './WidgetStep'
import FlashStep from './FlashStep'

/** step kind (plus 'flash' for flashcards) -> view */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const STEP_VIEWS: Record<string, ComponentType<StepProps<any>>> = {
  concept: ConceptStep,
  mcq: McqStep,
  order: OrderStep,
  sort: SortStep,
  cloze: ClozeStep,
  spotbug: SpotBugStep,
  predict: PredictStep,
  numeric: NumericStep,
  match: MatchStep,
  compare: CompareStep,
  interview: InterviewStep,
  reflect: ReflectStep,
  widget: WidgetStep,
  flash: FlashStep,
}

/** kinds that are not graded (no Check, no feedback panel) */
export const UNGRADED = new Set(['concept', 'reflect'])
/** kinds that grade themselves via complete() instead of a Check button */
export const SELF_GRADED = new Set(['widget', 'interview'])
