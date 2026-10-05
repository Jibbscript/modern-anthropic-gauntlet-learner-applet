import type { Step } from '../../core/types'

/**
 * Widget step fixtures:
 * - required goal (race, lose an update) with a goal chip and explanation
 * - optional widget (requireComplete: false): Continue is available right away
 * - required goal with no goal text and no explanation (deadlock)
 */
const steps: Step[] = [
  {
    kind: 'widget',
    id: 'fx-widget-race',
    eyebrow: 'Your turn',
    prompt: 'Two threads each run `counter += 1`. Step them so that one update is **lost**.',
    goal: 'Finish with the counter below 2',
    widget: { id: 'race', config: { threads: 2, goal: 'lose-update' } },
    explanation: 'Both threads loaded `0` before either stored, so the second `STORE` overwrote the first. That is a lost update.',
  },
  {
    kind: 'widget',
    id: 'fx-widget-bucket',
    eyebrow: 'Explore',
    prompt: 'Send a burst of requests and watch the bucket absorb it, then start rejecting.',
    goal: 'See a burst absorbed, then throttled',
    widget: { id: 'tokenbucket', config: { capacity: 5, rate: 1, goal: 'burst' } },
    requireComplete: false,
  },
  {
    kind: 'widget',
    id: 'fx-widget-deadlock',
    prompt: 'A takes L1 then L2; B takes L2 then L1. Step them into a deadlock.',
    widget: { id: 'deadlock', config: { scenario: 'opposite', goal: 'deadlock' } },
  },
]

export default steps
