/**
 * Content contract. Every course, lesson, step and review card in the app is
 * plain data shaped by these types; the UI renders them generically.
 *
 * Rich text ("Rich") is a tiny markdown dialect rendered by ui/Rich.tsx:
 *   **bold**  *italic*  `inline code`  ==highlight==  [link text](https://url)
 *   blank line = new paragraph, lines starting with "- " = bullet list,
 *   lines starting with "1. " = numbered list, "> " = quote line.
 */
export type Rich = string

export type AreaId =
  | 'map' // the interview loop itself
  | 'why' // recruiter screen: why Anthropic, risks, disagreement
  | 'values' // culture / values round
  | 'python' // practical python, testing, debugging, reading docs
  | 'concurrency' // threads, processes, asyncio, locks
  | 'builds' // the reported practical problems
  | 'design' // system design in a shared doc
  | 'agents' // working with and without AI
  | 'deepdive' // explaining a real project deeply

export type CourseColor =
  | 'violet'
  | 'blue'
  | 'teal'
  | 'green'
  | 'amber'
  | 'orange'
  | 'rose'
  | 'indigo'
  | 'slate'

export type Lang = 'python' | 'text' | 'json' | 'bash' | 'markdown'

export interface CodeBlock {
  code: string
  lang?: Lang // default python
  caption?: Rich
  /** 1-based line numbers to emphasise */
  highlight?: number[]
}

export interface Callout {
  tone: 'tip' | 'warn' | 'insight' | 'quote' | 'source'
  text: Rich
}

/* ------------------------------------------------------------------ steps */

interface StepBase {
  /** unique within the lesson, kebab-case */
  id: string
  /** small eyebrow label above the prompt, e.g. "Warm-up", "Your turn" */
  eyebrow?: string
}

/** One idea per screen. Read, optionally poke a visual, tap Continue. */
export interface ConceptStep extends StepBase {
  kind: 'concept'
  title?: string
  body: Rich
  code?: CodeBlock
  callout?: Callout
  /** optional interactive visual shown under the text (no goal required) */
  widget?: WidgetRef
}

export interface Choice {
  text: Rich
  correct?: boolean
  /** shown in the feedback sheet when this choice is picked */
  feedback?: Rich
}

export interface McqStep extends StepBase {
  kind: 'mcq'
  prompt: Rich
  code?: CodeBlock
  choices: Choice[]
  /** select-all-that-apply; then every `correct` choice must be picked */
  multi?: boolean
  explanation: Rich
  hint?: Rich
  /** default true */
  shuffle?: boolean
}

/** Put items in the right sequence (drag or tap-to-place). */
export interface OrderStep extends StepBase {
  kind: 'order'
  prompt: Rich
  /** listed in the CORRECT order; the UI shuffles */
  items: Rich[]
  explanation: Rich
  hint?: Rich
}

/** Drop each item into one of 2-3 buckets. */
export interface SortStep extends StepBase {
  kind: 'sort'
  prompt: Rich
  buckets: { id: string; label: string }[]
  items: { text: Rich; bucket: string; why?: Rich }[]
  explanation: Rich
}

/**
 * Fill blanks in code by tapping tokens. Blanks are written in `code` as
 * {{0}}, {{1}} ... and blanks[i] describes blank i.
 */
export interface ClozeStep extends StepBase {
  kind: 'cloze'
  prompt: Rich
  code: string
  lang?: Lang
  blanks: { options: string[]; answer: number }[]
  explanation: Rich
  hint?: Rich
}

/** Tap the buggy line(s). */
export interface SpotBugStep extends StepBase {
  kind: 'spotbug'
  prompt: Rich
  code: string
  lang?: Lang
  /** 1-based; the learner must select exactly these lines */
  bugLines: number[]
  explanation: Rich
  fix?: CodeBlock
  hint?: Rich
}

/** Predict what code prints. Free text, compared after normalisation. */
export interface PredictStep extends StepBase {
  kind: 'predict'
  prompt: Rich
  code: string
  lang?: Lang
  /** accepted answers (whitespace-trimmed, case-insensitive compare) */
  answers: string[]
  explanation: Rich
  hint?: Rich
}

/** Numeric estimate with tolerance (great for back-of-envelope math). */
export interface NumericStep extends StepBase {
  kind: 'numeric'
  prompt: Rich
  answer: number
  /** relative tolerance, e.g. 0.25 = within 25%. default 0.01 */
  tolerance?: number
  unit?: string
  explanation: Rich
  hint?: Rich
}

/** Match left items to right items. */
export interface MatchStep extends StepBase {
  kind: 'match'
  prompt: Rich
  pairs: { left: Rich; right: Rich }[]
  explanation: Rich
}

/** Two candidate answers to an interview question; pick the stronger one. */
export interface CompareStep extends StepBase {
  kind: 'compare'
  /** the interviewer's question */
  question: Rich
  a: Rich
  b: Rich
  better: 'a' | 'b'
  explanation: Rich
}

/**
 * A short simulated interview: the interviewer speaks, the learner picks a
 * reply each turn. Every turn is graded independently; the step passes when
 * no turn got a 'weak' pick on the final attempt.
 */
export interface InterviewStep extends StepBase {
  kind: 'interview'
  setup?: Rich
  turns: {
    interviewer: Rich
    options: { text: Rich; quality: 'strong' | 'okay' | 'weak'; feedback: Rich }[]
  }[]
  wrapUp: Rich
}

/**
 * Free-text reflection that is saved to the learner's Story Bank. Not
 * auto-graded: the learner self-checks against the rubric.
 */
export interface ReflectStep extends StepBase {
  kind: 'reflect'
  prompt: Rich
  guidance: Rich
  rubric: string[]
  /** story bank slot this writes to (see content/stories.ts) */
  slot?: StorySlotId
  placeholder?: string
}

/** An interactive simulation with a goal. */
export interface WidgetStep extends StepBase {
  kind: 'widget'
  prompt: Rich
  widget: WidgetRef
  /** what the learner must achieve, shown as a goal chip */
  goal?: string
  explanation?: Rich
  /** default true: Continue unlocks only after the widget reports success */
  requireComplete?: boolean
}

export type Step =
  | ConceptStep
  | McqStep
  | OrderStep
  | SortStep
  | ClozeStep
  | SpotBugStep
  | PredictStep
  | NumericStep
  | MatchStep
  | CompareStep
  | InterviewStep
  | ReflectStep
  | WidgetStep

export type StepKind = Step['kind']
export type GradedStep = Exclude<Step, ConceptStep | ReflectStep>

/* -------------------------------------------------------------- widgets */

/** see src/widgets/specs.ts for each widget's config shape */
export interface WidgetRef {
  id: WidgetId
  config?: Record<string, unknown>
}

export type WidgetId =
  | 'race'
  | 'deadlock'
  | 'crawler'
  | 'lru'
  | 'pool'
  | 'pipeline'
  | 'sampler'
  | 'dedup'
  | 'vm'
  | 'tokenbucket'
  | 'collab'
  | 'estimator'

/* --------------------------------------------------------------- review */

/** Plain flashcard: recall, flip, self-grade. */
export interface FlashCard {
  kind: 'flash'
  front: Rich
  back: Rich
  code?: CodeBlock
}

type ReviewBody =
  | FlashCard
  | Omit<McqStep, 'id' | 'eyebrow'>
  | Omit<OrderStep, 'id' | 'eyebrow'>
  | Omit<SortStep, 'id' | 'eyebrow'>
  | Omit<ClozeStep, 'id' | 'eyebrow'>
  | Omit<SpotBugStep, 'id' | 'eyebrow'>
  | Omit<PredictStep, 'id' | 'eyebrow'>
  | Omit<NumericStep, 'id' | 'eyebrow'>
  | Omit<MatchStep, 'id' | 'eyebrow'>
  | Omit<CompareStep, 'id' | 'eyebrow'>

/**
 * Spaced-repetition card. Unlocked when its lesson is completed, then
 * scheduled by the FSRS model in core/fsrs.ts.
 */
export type ReviewCard = ReviewBody & {
  /** globally unique: `${lessonId}.${slug}` */
  id: string
  skill: SkillId
}

/* --------------------------------------------------------------- courses */

export type SkillId = string

export interface Skill {
  id: SkillId
  area: AreaId
  name: string
  /** one-line description shown on the profile */
  blurb: string
}

export interface Lesson {
  /** globally unique, kebab-case, e.g. "conc-race-conditions" */
  id: string
  title: string
  /** one sentence, shown on the path node sheet */
  summary: string
  /** estimated minutes */
  minutes: number
  skills: SkillId[]
  steps: Step[]
  cards: ReviewCard[]
}

export interface Course {
  id: AreaId
  title: string
  subtitle: string
  color: CourseColor
  /** lucide icon name, see ui/Icon.tsx */
  icon: IconName
  /** 2-3 sentences: why this matters in the Anthropic loop */
  why: Rich
  lessons: Lesson[]
}

export type IconName =
  | 'compass'
  | 'shield'
  | 'heart'
  | 'code'
  | 'cpu'
  | 'layers'
  | 'pen'
  | 'bot'
  | 'search'
  | 'network'
  | 'database'
  | 'brain'
  | 'target'
  | 'flask'
  | 'terminal'
  | 'route'

/* ---------------------------------------------------------- story bank */

export type StorySlotId =
  | 'why-anthropic'
  | 'disagree-anthropic'
  | 'ai-risks'
  | 'disagree-company'
  | 'ethical-conflict'
  | 'speed-vs-safety'
  | 'changed-mind'
  | 'dislike-work'
  | 'failure'
  | 'conflict'
  | 'project-deep-dive'
  | 'agent-workflow'

export interface StorySlot {
  id: StorySlotId
  title: string
  /** the interview question as typically asked */
  question: string
  /** layers interviewers probe; shown as fill-in prompts */
  layers: string[]
  /** likely follow-up questions used in rehearsal drills */
  followUps: string[]
}

/* ------------------------------------------------------------------ labs */

export interface LabLevel {
  title: string
  spec: Rich
  /** python test functions named test_*; run against the learner's code */
  tests: string
  hints: Rich[]
  solution: string
}

export interface Lab {
  id: string
  title: string
  area: AreaId
  summary: Rich
  /** suggested total minutes (CodeSignal-style progressive format) */
  minutes: number
  starter: string
  levels: LabLevel[]
  /** discussion prompts for the "now make it concurrent/scale" follow-up */
  followUps: Rich[]
}
