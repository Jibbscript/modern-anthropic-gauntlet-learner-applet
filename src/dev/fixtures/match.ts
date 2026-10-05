import type { Step } from '../../core/types'

/** Match step fixtures: a typical 4-pair set, the 6-pair maximum with code on both sides, and 3 long-text pairs. */
const steps: Step[] = [
  {
    kind: 'match',
    id: 'fx-match-prims',
    eyebrow: 'Concurrency',
    prompt: 'Match each primitive to the job it does best.',
    pairs: [
      { left: '`Lock`', right: 'One thread at a time in a critical section' },
      { left: '`Semaphore(5)`', right: 'At most five callers at once' },
      { left: '`Event`', right: 'Wake every waiter when a flag flips' },
      { left: '`Queue`', right: 'Hand work from producers to consumers' },
    ],
    explanation:
      'A lock is a semaphore of one. Events broadcast a state change. Queues do the locking for you, which is why they are the default way to share work between threads.',
  },
  {
    kind: 'match',
    id: 'fx-match-max',
    prompt: 'What does each expression evaluate to?',
    pairs: [
      { left: '`len({1, 1, 2})`', right: '`2`' },
      { left: '`[1, 2] * 2`', right: '`[1, 2, 1, 2]`' },
      { left: '`"ab"[::-1]`', right: '`"ba"`' },
      { left: '`bool([])`', right: '`False`' },
      { left: '`3 // 2`', right: '`1`' },
      { left: '`{**{"a": 1}, "a": 2}`', right: '`{"a": 2}`' },
    ],
    explanation: 'Sets drop duplicates, list repetition copies references, slicing with a negative step reverses, empty containers are falsy, `//` floors, and later keys win in a dict literal.',
  },
  {
    kind: 'match',
    id: 'fx-match-long',
    eyebrow: 'Interview loop',
    prompt: 'Match each round to what the interviewer is really listening for.',
    pairs: [
      {
        left: 'Recruiter screen: “Why do you want to work here?”',
        right: 'A specific reason that would still be true if the job were harder than you expect',
      },
      {
        left: 'Culture round: “Tell me about a time you changed your mind”',
        right: 'Evidence that you update on new information instead of defending a position',
      },
      {
        left: 'System design in a shared doc',
        right: 'Clear trade-offs, stated out loud, before you commit to a component',
      },
    ],
    explanation: 'Every round has a question behind the question. Answer that one.',
  },
]

export default steps
