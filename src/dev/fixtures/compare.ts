import type { Step } from '../../core/types'

/** Compare step fixtures: a short recruiter-screen pair (better = b) and long multi-paragraph answers with a list (better = a). */
const steps: Step[] = [
  {
    kind: 'compare',
    id: 'fx-compare-why',
    eyebrow: 'Recruiter screen',
    question: 'Why do you want to work here?',
    a: 'I have always been passionate about AI, and your company is a leader in the space. I would love to be part of such an amazing team.',
    b: 'I read the paper on interpretability features last spring and spent a weekend reproducing one result. I want to work where safety research changes what actually ships, and I think my backend work on eval pipelines would help with that.',
    better: 'b',
    explanation:
      'Answer B is specific and checkable: a real thing they did, why it mattered to them, and how their skills connect. Answer A could be said about any company.',
  },
  {
    kind: 'compare',
    id: 'fx-compare-long',
    eyebrow: 'Culture round',
    question: 'Tell me about a time you **disagreed** with a decision your team made. What did you do?',
    a: 'We planned to ship a caching layer without a way to invalidate entries. I wrote a one-page note with two failure cases and a cheaper alternative, and asked for 20 minutes in the planning meeting.\n\nThe team still chose the original design for the deadline. I said I disagreed, committed to it, and added an alert on stale reads. It fired in week two; we used my note to fix it in a day.\n\n- What I would change: raise it a sprint earlier.',
    b: 'Honestly, I usually go along with the team because I value harmony. There was one time I thought our caching approach was wrong, but the senior engineer had more context, so I trusted them. It worked out fine in the end, and I learned that it is important to be a team player.',
    better: 'a',
    explanation:
      'Answer A shows a real position, evidence, a proportionate way of raising it, and how they behaved after losing the argument. Answer B avoids the disagreement the question is asking about.',
  },
]

export default steps
