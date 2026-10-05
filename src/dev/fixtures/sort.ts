import type { Step } from '../../core/types'

/**
 * Sort step fixtures: 2 buckets with whys (side-by-side trays), 3 buckets with a
 * missing why (stacked trays), the 3-item minimum with long text, and 3 buckets
 * with long labels and no whys at all.
 */
const steps: Step[] = [
  {
    kind: 'sort',
    id: 'fx-sort-bound',
    eyebrow: 'Concurrency',
    prompt: 'Is each job **CPU-bound** or **I/O-bound**?',
    buckets: [
      { id: 'cpu', label: 'CPU-bound' },
      { id: 'io', label: 'I/O-bound' },
    ],
    items: [
      { text: 'Resizing 10k images', bucket: 'cpu', why: 'Pixel maths keeps the core busy the whole time.' },
      { text: 'Crawling 500 web pages', bucket: 'io', why: 'Most of the time is spent waiting on the network.' },
      { text: 'Hashing a 4 GB file', bucket: 'cpu', why: 'Reads are fast; the hash function is the bottleneck.' },
      { text: 'Calling an LLM API in a loop', bucket: 'io', why: 'Each call waits seconds for a remote server.' },
      { text: 'Parsing JSON in pure Python', bucket: 'cpu', why: 'The interpreter is doing the work, not the disk.' },
      { text: 'Querying Postgres', bucket: 'io', why: 'The database does the work; your process waits.' },
    ],
    explanation:
      'CPU-bound work needs more cores (processes), I/O-bound work needs more waiting in parallel (threads or asyncio).',
  },
  {
    kind: 'sort',
    id: 'fx-sort-tool',
    prompt: 'Pick the right tool for each job.',
    buckets: [
      { id: 'thread', label: 'Threads' },
      { id: 'proc', label: 'Processes' },
      { id: 'async', label: 'asyncio' },
    ],
    items: [
      { text: '`requests.get` calls you cannot rewrite', bucket: 'thread', why: 'Blocking I/O library: threads overlap the waiting without a rewrite.' },
      { text: 'Monte Carlo simulation in pure Python', bucket: 'proc', why: 'Pure-Python number crunching holds the GIL; you need separate processes.' },
      { text: '10,000 websocket connections', bucket: 'async', why: 'Thousands of idle connections are cheap as coroutines, expensive as threads.' },
      { text: 'Feature extraction across 8 cores', bucket: 'proc' },
      { text: 'An `aiohttp` crawler', bucket: 'async', why: 'The library is already async; stay on the event loop.' },
      { text: 'A GUI that must not freeze while saving', bucket: 'thread', why: 'Move the blocking save off the UI thread.' },
    ],
    explanation:
      'Threads for blocking I/O you cannot rewrite, processes for CPU-heavy Python, asyncio for huge numbers of concurrent waits with async-native libraries.',
  },
  {
    kind: 'sort',
    id: 'fx-sort-min',
    eyebrow: 'Values round',
    prompt: 'Which belong in a strong answer to “Tell me about a time you disagreed with your manager”?',
    buckets: [
      { id: 'keep', label: 'Keep' },
      { id: 'cut', label: 'Cut' },
    ],
    items: [
      {
        text: 'What you actually believed at the time and the evidence you had for it',
        bucket: 'keep',
        why: 'Interviewers probe for real judgment, so state your position plainly.',
      },
      {
        text: 'A long list of everything your manager got wrong that quarter',
        bucket: 'cut',
        why: 'It reads as blame rather than reflection.',
      },
      {
        text: 'What you would do differently, knowing what you know now',
        bucket: 'keep',
        why: 'Showing you can update is the whole point of the question.',
      },
    ],
    explanation: 'Keep the substance and the reflection; cut the grievance.',
  },
  {
    kind: 'sort',
    id: 'fx-sort-long-labels',
    eyebrow: 'Edge case',
    prompt: 'Where does each step of the incident review belong?',
    buckets: [
      { id: 'before', label: 'Before the meeting starts' },
      { id: 'during', label: 'In the room, together' },
      { id: 'after', label: 'Follow-up after' },
    ],
    items: [
      { text: 'Write a timeline from the logs, with timestamps and who saw what', bucket: 'before' },
      { text: 'Agree on the contributing factors without naming a person to blame', bucket: 'during' },
      { text: 'File one ticket per action item, each with an owner and a date', bucket: 'after' },
      { text: 'Share the draft so people can correct it', bucket: 'before' },
      { text: 'Check in two weeks that the alerts changed', bucket: 'after' },
    ],
    explanation: 'Facts before, judgment together, follow-through after.',
  },
]

export default steps
