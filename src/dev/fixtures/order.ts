import type { Step } from '../../core/types'

/** Order step fixtures: a typical 5-card sequence, the 3-card minimum, and a long 6-card list with code. */
const steps: Step[] = [
  {
    kind: 'order',
    id: 'fx-order-shutdown',
    eyebrow: 'Your turn',
    prompt: 'Put a clean `asyncio` worker shutdown in order.',
    items: [
      'Stop accepting new jobs',
      'Wait for the queue to drain with `await q.join()`',
      'Cancel the idle worker tasks',
      'Gather the cancelled tasks',
      'Close the HTTP session',
    ],
    explanation:
      'Stop the inflow first, then let in-flight work finish. Only then cancel workers (they are idle, blocked on `q.get()`), gather them so cancellation completes, and release shared resources last.',
    hint: 'Nothing should be torn down while a job could still be using it.',
  },
  {
    kind: 'order',
    id: 'fx-order-min',
    prompt: 'Order the phases of a lock-protected update.',
    items: ['Acquire', 'Mutate', 'Release'],
    explanation: 'Acquire, mutate, release. A `with lock:` block does this for you, including on exceptions.',
  },
  {
    kind: 'order',
    id: 'fx-order-long',
    eyebrow: 'System design',
    prompt: 'You have 45 minutes in a shared doc. Order how you spend them.',
    items: [
      'Restate the problem and confirm the scope with the interviewer',
      'Pin down rough numbers: requests per second, data size, read/write mix',
      'Sketch the API, for example `POST /jobs` and `GET /jobs/{id}`',
      'Draw the high-level components and the data flow between them',
      'Go deep on the one or two parts the interviewer cares about most',
      'Close with bottlenecks, failure modes and what you would build next',
    ],
    explanation:
      'Scope and numbers come first because every later choice depends on them. The API pins down the contract, the diagram shows the shape, and the deep dive is where most of the signal is. Always leave a few minutes to talk about failure.',
  },
]

export default steps
