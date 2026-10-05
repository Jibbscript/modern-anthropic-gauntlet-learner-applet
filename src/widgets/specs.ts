/**
 * Widget contracts. Content references widgets as { id, config } and the
 * widget implementations in this folder read exactly these config shapes.
 * Every field is optional unless noted; widgets must render sensible
 * defaults with an empty config.
 *
 * Every widget receives WidgetProps and calls onComplete(true) once the
 * learner reaches the goal described for that widget below (a WidgetStep
 * keeps Continue disabled until then). Widgets shown inside a ConceptStep
 * have no goal; they may still call onComplete, which is ignored.
 */
import type { WidgetId } from '../core/types'

export interface WidgetProps<C = Record<string, unknown>> {
  config: C
  onComplete: (ok: boolean) => void
  /**
   * Set by a WidgetStep that shows the goal itself (its goal chip). The widget
   * then skips its own goal row, so the screen shows one goal, not two, and
   * reports any live counter for the goal (e.g. "1/3") via onGoalProgress.
   */
  hostGoal?: boolean
  onGoalProgress?: (progress: string | null) => void
}

/**
 * race — two or three threads each run `LOAD x / ADD 1 / STORE x` on a
 * shared counter. The learner taps a thread to execute its next
 * instruction, choosing the interleaving. Shows each thread's register,
 * shared memory, and expected vs actual result at the end.
 * With mode 'lock', each thread's program is wrapped in ACQUIRE/RELEASE and
 * a thread that tries to ACQUIRE a held lock shows as blocked.
 * goal 'lose-update': complete when all threads finish with counter < expected.
 * goal 'correct': complete when all threads finish with counter == expected.
 * mode 'lock' + goal 'lose-update' cannot lose an update; it completes after
 * any full run ("try to break it").
 */
export interface RaceConfig {
  threads?: 2 | 3
  /** increments per thread, default 1 */
  increments?: 1 | 2
  mode?: 'none' | 'lock'
  goal?: 'lose-update' | 'correct'
}

/**
 * deadlock — two threads (A, B) and two locks (L1, L2). The learner steps
 * threads. scenario 'opposite': A takes L1 then L2, B takes L2 then L1.
 * scenario 'ordered': both take L1 then L2. Visualise lock ownership and
 * the wait-for graph; flash a cycle when deadlocked.
 * goal 'deadlock': complete when a deadlock is reached.
 * goal 'finish': complete when both threads finish.
 * scenario 'ordered' + goal 'deadlock' cannot deadlock; it completes after a
 * run in which both threads contended for a lock ("try to break it").
 */
export interface DeadlockConfig {
  scenario?: 'opposite' | 'ordered'
  goal?: 'deadlock' | 'finish'
}

/**
 * crawler — animated BFS crawl over a small site graph (nodes = pages,
 * edges = links, some cross-host). Controls: play/pause/step, worker count
 * slider (1..4), dedupe mode, same-host toggle. Shows frontier queue,
 * visited set, pages fetched, duplicate fetches, elapsed ticks.
 * dedupe 'none' re-fetches pages; 'check-then-add' has a race (two workers
 * can both see "not visited" and fetch the same page); 'atomic' is correct.
 * goal 'no-dupes': complete after a full crawl with workers >= 2 and 0 duplicates.
 * goal 'finish': complete after any full crawl.
 */
export interface CrawlerConfig {
  graph?: 'small' | 'cyclic' | 'wide'
  workers?: number
  dedupe?: 'none' | 'check-then-add' | 'atomic'
  sameHost?: boolean
  /** controls fixed at their config value (shown read-only with a lock) */
  lockControls?: ('workers' | 'dedupe' | 'sameHost')[]
  goal?: 'no-dupes' | 'finish'
}

/**
 * lru — LRU cache playground. Keys are letters A..H. The learner taps
 * get(k) or put(k). The cache is drawn as a recency list (MRU left);
 * hits glow, misses insert, evictions fly off the LRU end.
 * If `sequence` is given the learner replays it step by step and, when
 * `predict` is true, must tap the key that will be evicted before each
 * eviction happens.
 * goal 'hits': complete when the hit counter reaches `targetHits`.
 * goal 'predict': complete after the sequence with all predictions right.
 * goal 'explore': complete after 6 operations.
 */
export interface LruConfig {
  capacity?: number
  sequence?: string[] // e.g. ["put A", "put B", "get A", "put C"]
  predict?: boolean
  targetHits?: number
  goal?: 'hits' | 'predict' | 'explore'
}

/**
 * pool — choose an executor for a batch of tasks and watch a Gantt timeline.
 * Controls: executor (thread | process | async), workers (1..8), task kind
 * (cpu | io). Model: CPU-bound tasks under threads serialise on the GIL
 * (draw the GIL token passing between threads); processes run in parallel
 * up to `cores` but pay a startup + pickling overhead; async interleaves IO
 * waits on one thread but cannot speed up CPU work. Show total wall time.
 * goal 'fastest': complete when the learner picks a config within 10% of
 * the best achievable wall time for the current task kind.
 * Units: one CPU task = 1 time unit, displayed as seconds.
 */
export interface PoolConfig {
  kind?: 'cpu' | 'io'
  tasks?: number
  cores?: number
  /** controls fixed at their default/config value (shown read-only with a lock) */
  lockControls?: ('kind' | 'executor' | 'workers')[]
  goal?: 'fastest' | 'explore'
}

/**
 * pipeline — an image-processing pipeline: load → resize → filter → save.
 * Each stage has a cost; the learner sets workers per stage (1..4) and a
 * bounded queue size between stages. Images flow as tiles; queues fill and
 * show backpressure; the bottleneck stage is highlighted. Shows
 * throughput (images/sec) and total time for the batch.
 * goal 'throughput': complete when throughput >= `target` images per time unit.
 */
export interface PipelineConfig {
  images?: number
  /** relative cost per stage */
  costs?: { load: number; resize: number; filter: number; save: number }
  /** total workers the learner may distribute */
  budget?: number
  target?: number
  goal?: 'throughput' | 'explore'
}

/**
 * sampler — turn periodic stack samples into begin/end trace events.
 * Shows a timeline of samples (each a stack, root first). For each new
 * sample the learner taps which frames END and which BEGIN versus the
 * previous sample (common-prefix diff; frames are compared by position,
 * so a recursive call at a new depth is a new frame). Then the widget draws
 * the resulting flame chart.
 * goal 'events': complete when every sample's events are marked correctly.
 */
export interface SamplerConfig {
  /** each sample is a stack, root first, e.g. [["main"], ["main","a"], ["main","a","b"]] */
  samples?: string[][]
  goal?: 'events' | 'explore'
}

/**
 * dedup — a folder of files (name, size, content signature). Three stages
 * the learner advances through: group by size → hash first 4KB → full
 * hash. Each stage eliminates candidates; a meter shows bytes read vs a
 * naive full-hash-everything approach. Final screen lists duplicate groups.
 * goal 'groups': complete when the learner reaches the final stage and
 * taps every duplicate group.
 */
export interface DedupConfig {
  files?: { name: string; size: number; head: string; body: string }[]
  goal?: 'groups' | 'explore'
}

/**
 * vm — a tiny stack machine. Instructions: PUSH n, POP, ADD, SUB, MUL,
 * DUP, SWAP, JMP label, JZ label, PRINT, HALT, LOAD name, STORE name, and
 * `label:` lines. Shows program with PC arrow, the stack, variables and
 * output. Controls: step, run, reset. If `predict` is set, before stepping
 * past the instruction at `predict.line` the learner must choose the value
 * on top of the stack from options.
 * goal 'halt': complete when the program halts.
 * goal 'predict': complete when the prediction is right.
 */
export interface VmConfig {
  program?: string[]
  predict?: { line: number; options: number[]; answer: number }
  goal?: 'halt' | 'predict'
}

/**
 * tokenbucket — rate limiter. A bucket with `capacity` tokens refilling at
 * `rate`/sec. The learner taps "send request" (or holds for a burst);
 * requests consume a token or get rejected (429). Plots accepted/rejected
 * over time. Option to switch to a fixed-window counter to compare.
 * goal 'burst': complete after the learner observes a burst being
 * absorbed then throttled (>= capacity accepted quickly, then >= 1 reject).
 */
export interface TokenBucketConfig {
  capacity?: number
  rate?: number
  compareFixedWindow?: boolean
  goal?: 'burst' | 'explore'
}

/**
 * collab — two users edit the same prompt text concurrently while
 * offline, then sync. The learner picks a merge strategy: last-write-wins,
 * operational transform, or CRDT. Animate both edit streams and the
 * merged result; LWW visibly drops one user's edit.
 * goal 'preserve': complete when the learner merges with a strategy that
 * keeps both edits.
 */
export interface CollabConfig {
  base?: string
  editA?: { at: number; insert: string }
  editB?: { at: number; insert: string }
  goal?: 'preserve' | 'explore'
}

/**
 * estimator — back-of-envelope calculator with sliders: daily active users,
 * requests per user per day, tokens per request, peak factor, bytes per
 * stored version. Derived: average QPS, peak QPS, tokens/sec, storage/day,
 * storage/year. If `target` is set, the learner must set sliders to the
 * scenario values given in `scenario` text and then answer the question
 * about the derived metric within 25%.
 * goal 'answer' | 'explore'.
 */
export interface EstimatorConfig {
  scenario?: string
  preset?: Partial<{ dau: number; reqPerUser: number; tokensPerReq: number; peak: number; bytesPerVersion: number }>
  target?: { metric: 'avgQps' | 'peakQps' | 'tokensPerSec' | 'storagePerDay'; value: number }
  goal?: 'answer' | 'explore'
}

export type WidgetConfigMap = {
  race: RaceConfig
  deadlock: DeadlockConfig
  crawler: CrawlerConfig
  lru: LruConfig
  pool: PoolConfig
  pipeline: PipelineConfig
  sampler: SamplerConfig
  dedup: DedupConfig
  vm: VmConfig
  tokenbucket: TokenBucketConfig
  collab: CollabConfig
  estimator: EstimatorConfig
}

export const WIDGET_IDS: WidgetId[] = [
  'race',
  'deadlock',
  'crawler',
  'lru',
  'pool',
  'pipeline',
  'sampler',
  'dedup',
  'vm',
  'tokenbucket',
  'collab',
  'estimator',
]
