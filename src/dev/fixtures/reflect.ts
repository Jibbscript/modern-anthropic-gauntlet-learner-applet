import type { Step } from '../../core/types'

/**
 * Reflect step fixtures:
 * - writes to a Story Bank slot, with a placeholder and four rubric items
 * - no slot, no placeholder, long guidance with a list, two long rubric items
 */
const steps: Step[] = [
  {
    kind: 'reflect',
    id: 'fx-reflect-disagree',
    eyebrow: 'Your story',
    prompt: 'Draft your answer to: “Tell me about a time you disagreed with your team’s direction.”',
    guidance: 'Write what you **actually thought at the time**, what you did about it, and how you see it now. Rough is fine; you will rehearse it later.',
    rubric: [
      'Says what I thought at the time',
      'Names what I did and through which channel',
      'Says what happened, including if I lost',
      'Ends with how I see it now',
    ],
    slot: 'disagree-company',
    placeholder: 'In 2023 my team decided to…',
  },
  {
    kind: 'reflect',
    id: 'fx-reflect-ai',
    prompt: 'Where would you **not** trust an AI coding tool on your current codebase?',
    guidance:
      'Pick one concrete area. Good answers usually mention:\n\n- what makes it risky (shared state, money, migrations, auth)\n- how you would notice the tool was confidently wrong\n- what you would check by hand every time',
    rubric: [
      'Names a specific area of a real codebase rather than a general category like “security”',
      'Explains how I would verify the output, not just that I would “review it carefully”',
    ],
  },
]

export default steps
