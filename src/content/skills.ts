import type { Skill, StorySlot } from '../core/types'

/**
 * The skill graph. Every lesson and review card is tagged with skills from
 * this list; mastery on the profile is computed per skill and per area.
 */
export const SKILLS: Skill[] = [
  // map — the loop itself
  { id: 'map.loop', area: 'map', name: 'The loop', blurb: 'Stages of the process and what each one screens for' },
  { id: 'map.signals', area: 'map', name: 'Signals', blurb: 'What interviewers are actually scoring in each round' },
  { id: 'map.ai-policy', area: 'map', name: 'AI-use rules', blurb: 'When AI help is and is not allowed during the process' },

  // why — recruiter screen
  { id: 'why.mission', area: 'why', name: 'Mission & structure', blurb: 'Mission, public benefit corporation, Long-Term Benefit Trust' },
  { id: 'why.rsp', area: 'why', name: 'Responsible scaling', blurb: 'RSP, AI Safety Levels, capability thresholds' },
  { id: 'why.research', area: 'why', name: 'Safety research', blurb: 'Constitutional AI, interpretability, alignment science' },
  { id: 'why.differentiation', area: 'why', name: 'How it differs', blurb: 'Fair, specific contrasts with other labs' },
  { id: 'why.risks', area: 'why', name: 'AI risk map', blurb: 'Misuse, misalignment, structural and societal risks' },
  { id: 'why.disagree', area: 'why', name: 'Honest disagreement', blurb: 'Where you would push back on the company, and why' },
  { id: 'why.pitch', area: 'why', name: 'Your why', blurb: 'A specific, personal, falsifiable reason to join' },

  // values — culture round
  { id: 'values.judgment', area: 'values', name: 'Own judgment', blurb: 'Showing your real reasoning, not the expected answer' },
  { id: 'values.depth', area: 'values', name: 'Answer depth', blurb: 'What you thought then, what you think now, what changed' },
  { id: 'values.disagreement', area: 'values', name: 'Disagreeing well', blurb: 'Disagreeing with direction while staying constructive' },
  { id: 'values.ethics', area: 'values', name: 'Ethical conflicts', blurb: 'Naming tradeoffs and acting under uncertainty' },
  { id: 'values.speed-safety', area: 'values', name: 'Speed vs safety', blurb: 'Reasoning about when to slow down and when to ship' },
  { id: 'values.updating', area: 'values', name: 'Updating', blurb: 'Changing your mind visibly when the argument is better' },
  { id: 'values.self-knowledge', area: 'values', name: 'Self-knowledge', blurb: 'Work you dislike, failure, limits, honestly told' },
  { id: 'values.antipatterns', area: 'values', name: 'Anti-patterns', blurb: 'Sycophancy, rehearsed STAR, villain stories, hedging' },

  // python — practical python
  { id: 'py.idioms', area: 'python', name: 'Idioms', blurb: 'Comprehensions, unpacking, generators, context managers' },
  { id: 'py.collections', area: 'python', name: 'Collections', blurb: 'deque, defaultdict, Counter, OrderedDict, heapq, bisect' },
  { id: 'py.design', area: 'python', name: 'Usable code', blurb: 'Clean interfaces, dataclasses, small functions, errors' },
  { id: 'py.progressive', area: 'python', name: 'Progressive builds', blurb: 'Building in levels without rewriting from scratch' },
  { id: 'py.testing', area: 'python', name: 'Testing yourself', blurb: 'Edge cases, asserts, pytest, table-driven tests' },
  { id: 'py.debugging', area: 'python', name: 'Debugging', blurb: 'Reading tracebacks, bisecting, minimal repros' },
  { id: 'py.docs', area: 'python', name: 'Reading docs fast', blurb: 'Finding the signature, the gotcha, and the example' },

  // concurrency
  { id: 'conc.models', area: 'concurrency', name: 'Concurrency models', blurb: 'Threads vs processes vs asyncio, and the GIL' },
  { id: 'conc.races', area: 'concurrency', name: 'Race conditions', blurb: 'Interleavings, lost updates, check-then-act' },
  { id: 'conc.locks', area: 'concurrency', name: 'Locks & deadlock', blurb: 'Mutexes, lock ordering, contention, RLock' },
  { id: 'conc.executors', area: 'concurrency', name: 'Executors & futures', blurb: 'ThreadPoolExecutor, ProcessPoolExecutor, as_completed' },
  { id: 'conc.queues', area: 'concurrency', name: 'Queues & backpressure', blurb: 'Producer/consumer, bounded queues, shutdown' },
  { id: 'conc.async', area: 'concurrency', name: 'asyncio', blurb: 'Event loop, gather, semaphores, blocking pitfalls' },
  { id: 'conc.limits', area: 'concurrency', name: 'Rate limiting', blurb: 'Semaphores, token buckets, politeness' },

  // builds — reported practical problems
  { id: 'build.crawler', area: 'builds', name: 'Web crawler', blurb: 'BFS, URL normalisation, concurrent fetch, thread safety' },
  { id: 'build.image', area: 'builds', name: 'Image pipeline', blurb: 'Transform chains and parallelising CPU-bound work' },
  { id: 'build.stacktrace', area: 'builds', name: 'Stack traces', blurb: 'Parsing traces, sampling profiles into events' },
  { id: 'build.cache', area: 'builds', name: 'Caches', blurb: 'LRU, TTL, thread-safe caching, eviction' },
  { id: 'build.dedup', area: 'builds', name: 'File dedup', blurb: 'Size → partial hash → full hash, streaming IO' },
  { id: 'build.interpreter', area: 'builds', name: 'Interpreter', blurb: 'Parsing instructions, stack VM, jumps, errors' },
  { id: 'build.kvstore', area: 'builds', name: 'In-memory store', blurb: 'Leveled key-value store: TTL, scans, backups' },

  // design — system design in a doc
  { id: 'design.doc', area: 'design', name: 'Design in prose', blurb: 'Structuring a design doc a reader can follow' },
  { id: 'design.requirements', area: 'design', name: 'Requirements', blurb: 'Scoping, non-functionals, estimates' },
  { id: 'design.collab', area: 'design', name: 'Collaboration', blurb: 'Real-time editing, OT vs CRDT, presence' },
  { id: 'design.versioning', area: 'design', name: 'Versioning', blurb: 'Immutable versions, diffs, branching prompts' },
  { id: 'design.execution', area: 'design', name: 'LLM execution', blurb: 'Queues, streaming, rate limits, cost, caching' },
  { id: 'design.storage', area: 'design', name: 'Storage & scale', blurb: 'Data models, partitioning, hot paths' },
  { id: 'design.tradeoffs', area: 'design', name: 'Tradeoffs', blurb: 'Naming alternatives and why you chose' },

  // agents — working with and without AI
  { id: 'agents.policy', area: 'agents', name: 'When AI is allowed', blurb: 'Reading instructions, disclosure, take-home rules' },
  { id: 'agents.workflow', area: 'agents', name: 'Agentic workflow', blurb: 'Decompose, brief, review, verify, take the wheel' },
  { id: 'agents.review', area: 'agents', name: 'Reviewing AI code', blurb: 'Spotting plausible-but-wrong output' },

  // deepdive — project deep dive
  { id: 'deep.selection', area: 'deepdive', name: 'Picking the project', blurb: 'Choosing a project with real depth and ownership' },
  { id: 'deep.layers', area: 'deepdive', name: 'Layers of depth', blurb: 'Context, decisions, alternatives, numbers, failures' },
  { id: 'deep.drilldown', area: 'deepdive', name: 'Drill-downs', blurb: 'Handling "why not X?" and "what broke?"' },
]

export const SKILL_BY_ID: Record<string, Skill> = Object.fromEntries(SKILLS.map((s) => [s.id, s]))

/** Story Bank slots — the culture-round stories worth preparing. */
export const STORY_SLOTS: StorySlot[] = [
  {
    id: 'why-anthropic',
    title: 'Why Anthropic',
    question: 'Why Anthropic specifically, and why now?',
    layers: [
      'The specific thing at Anthropic you would work on or learn from',
      'What in your own history makes this the next step',
      'What you would give up by not joining another lab',
      'What would make you leave',
    ],
    followUps: [
      'What would you work on if not this team?',
      'How is that different from what other labs say?',
      'What did you read of ours that changed your mind about something?',
    ],
  },
  {
    id: 'disagree-anthropic',
    title: 'Where I disagree',
    question: 'Where do you personally disagree with Anthropic?',
    layers: [
      'The specific position or decision you disagree with',
      'The strongest version of Anthropic’s reasoning',
      'Why you still land differently',
      'What evidence would change your mind',
    ],
    followUps: ['Would you still join?', 'How would you raise this internally?', 'What if you are wrong?'],
  },
  {
    id: 'ai-risks',
    title: 'Biggest AI risks',
    question: 'What do you think are the biggest risks from advanced AI?',
    layers: [
      'Your ranked top risks, with a reason for the ranking',
      'One risk you think is overrated, and why',
      'What would reduce the risk you rank first',
      'Where your own work touches this',
    ],
    followUps: ['How confident are you?', 'What would change your ranking?', 'What is your timeline view?'],
  },
  {
    id: 'disagree-company',
    title: 'Disagreed with direction',
    question: 'Tell me about a time you disagreed with the direction of your company or team.',
    layers: [
      'What the direction was, and what you actually thought at the time',
      'What you did about it, and through which channel',
      'What happened',
      'How you feel about it now, and whether you were right',
    ],
    followUps: ['What did you think at the time?', 'Would you do it differently?', 'What did the other side see that you missed?'],
  },
  {
    id: 'ethical-conflict',
    title: 'Ethical conflict',
    question: 'Have you faced an ethical conflict at work?',
    layers: [
      'The situation and the competing obligations',
      'The options you saw',
      'What you did and the cost to you',
      'What you would do now',
    ],
    followUps: ['Who else knew?', 'What if your manager had said no?', 'Where is your line?'],
  },
  {
    id: 'speed-vs-safety',
    title: 'Speed vs safety',
    question: 'Tell me about a time speed and safety (or quality) were in tension.',
    layers: [
      'The deadline pressure and the risk',
      'How you sized the risk',
      'The call you made and who you brought in',
      'The outcome, and how you judge the call now',
    ],
    followUps: ['What was reversible?', 'Who carried the risk?', 'Would you make the same call at 10x the stakes?'],
  },
  {
    id: 'changed-mind',
    title: 'Changed my mind',
    question: 'Tell me about a time someone changed your mind.',
    layers: [
      'What you believed and how strongly',
      'The argument or evidence that moved you',
      'How you updated, and how fast',
      'What it taught you about your blind spots',
    ],
    followUps: ['What were you most wrong about?', 'What belief are you holding loosely right now?'],
  },
  {
    id: 'dislike-work',
    title: 'Work I dislike',
    question: 'What kind of work do you dislike doing?',
    layers: [
      'The honest answer, specifically',
      'Why you dislike it',
      'How you handle it when it is needed anyway',
      'What it says about where you do your best work',
    ],
    followUps: ['What if this role is 30% that?', 'When did you last do it?'],
  },
  {
    id: 'failure',
    title: 'A real failure',
    question: 'Tell me about something that went badly and was your fault.',
    layers: ['What happened, with your part named plainly', 'What you thought at the time', 'What you changed afterwards', 'Evidence the change stuck'],
    followUps: ['What did it cost others?', 'What would your manager say about it?'],
  },
  {
    id: 'conflict',
    title: 'Hard collaboration',
    question: 'Tell me about a difficult working relationship.',
    layers: ['The situation without making anyone a villain', 'Their perspective, steelmanned', 'What you did', 'Where it landed and what you learned'],
    followUps: ['What would they say about you?', 'What did you get wrong?'],
  },
  {
    id: 'project-deep-dive',
    title: 'Project deep dive',
    question: 'Walk me through a project you are proud of, in depth.',
    layers: [
      'Context and why it mattered (one minute)',
      'Your specific ownership vs the team’s',
      'The two hardest technical decisions and their alternatives',
      'Numbers: scale, latency, cost, impact',
      'What broke, and what you would change now',
    ],
    followUps: ['Why not the obvious alternative?', 'What would break at 10x?', 'What did you personally write?'],
  },
  {
    id: 'agent-workflow',
    title: 'How I work with AI',
    question: 'How do you use AI coding tools, and where do you not trust them?',
    layers: ['Your actual workflow', 'Where it saves you real time', 'A time it was confidently wrong', 'How you verify its output'],
    followUps: ['What would you never delegate?', 'How do you review a large AI-written diff?'],
  },
]

export const STORY_BY_ID = Object.fromEntries(STORY_SLOTS.map((s) => [s.id, s])) as Record<string, StorySlot>
