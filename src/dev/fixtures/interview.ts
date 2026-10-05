import type { Step } from '../../core/types'

/**
 * Interview step fixtures:
 * - a 3-turn coding-round sim with a setup line and inline code
 * - a single-turn culture-round sim with no setup and long, multi-sentence replies
 */
const steps: Step[] = [
  {
    kind: 'interview',
    id: 'fx-interview-cache',
    eyebrow: 'Interview sim',
    setup: 'The prompt: build a cache in front of a slow user-profile service.',
    turns: [
      {
        interviewer: 'Start with `get` and `put` and a fixed capacity.',
        options: [
          {
            text: 'I would decorate the fetch function with `@lru_cache(maxsize=1000)` and move on.',
            quality: 'weak',
            feedback: 'It dodges the exercise, and the TTL and threading follow-ups need control it does not give you.',
          },
          {
            text: 'A dict plus a list of keys in usage order: on each hit, remove the key from the list and append it.',
            quality: 'okay',
            feedback: 'Correct behaviour, but `list.remove` is O(n), so every hit scans the cache.',
          },
          {
            text: 'An `OrderedDict`: `get` moves the key to the end; `put` assigns, moves to the end, and pops the oldest past capacity. All O(1).',
            quality: 'strong',
            feedback: 'Structure, complexity, and the right altitude.',
          },
        ],
      },
      {
        interviewer: 'Profiles change. Entries should expire after 60 seconds. How do you test that?',
        options: [
          {
            text: 'Inject the clock: the cache takes a `clock` callable. Tests pass a fake and check that 59.9 s is a hit and 60 s is a miss.',
            quality: 'strong',
            feedback: 'Deterministic, fast, and it tests the exact boundary.',
          },
          {
            text: 'Expiry is simple enough that I would check it by hand.',
            quality: 'weak',
            feedback: 'Off-by-one at the boundary is the most likely bug here.',
          },
          {
            text: 'Set the TTL to 0.1 s in the test and `time.sleep(0.2)` before asserting.',
            quality: 'okay',
            feedback: 'Works, but slow and flaky under load, and it never tests the boundary.',
          },
        ],
      },
      {
        interviewer: 'Now two threads call `get` for the same missing key at once. What happens?',
        options: [
          {
            text: 'Both miss, both call the slow service, and both write. I would add a per-key lock so one loads and the other waits.',
            quality: 'strong',
            feedback: 'Names the thundering-herd problem and a proportionate fix.',
          },
          {
            text: 'Dicts are thread-safe in CPython, so nothing bad happens.',
            quality: 'weak',
            feedback: 'Single operations are atomic; check-then-load-then-put is not.',
          },
          {
            text: 'Wrap every method in one global lock.',
            quality: 'okay',
            feedback: 'Safe, but the slow load now runs under the lock and blocks every other key.',
          },
        ],
      },
    ],
    wrapUp:
      'Strong replies name the structure, its cost, and the next risk before the interviewer has to ask. Weak ones skip the exercise or trust the runtime to save you.',
  },
  {
    kind: 'interview',
    id: 'fx-interview-values',
    turns: [
      {
        interviewer:
          'Tell me about a time you disagreed with the direction your team took.\n\nI want what you actually thought at the time, not the polished version.',
        options: [
          {
            text: 'We were about to ship a migration without a rollback path. I wrote down two failure cases and a cheaper alternative, raised it in planning, and lost the argument. I committed anyway, added an alert, and it fired in week two. We used my note to fix it in a day.',
            quality: 'strong',
            feedback: 'A real position, a proportionate way of raising it, and how you behaved after losing. That is the signal.',
          },
          {
            text: 'I usually go along with the team because I value harmony, and the senior engineers tend to have more context than me anyway.',
            quality: 'weak',
            feedback: 'It avoids the disagreement the question is asking about, and reads as no judgment of your own.',
          },
          {
            text: 'I disagreed with our choice of database, so I documented the trade-offs and we went with my recommendation.',
            quality: 'okay',
            feedback: 'Fine, but there is no tension and no cost. Pick a story where you did not simply win.',
          },
        ],
      },
    ],
    wrapUp: 'Culture-round answers land when they show what you thought then, what you did, and how you feel about it now.',
  },
]

export default steps
