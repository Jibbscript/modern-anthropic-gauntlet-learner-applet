import type { Step } from '../core/types'

/**
 * Sample steps used by the dev gallery for visual QA. Step-component authors
 * add fixtures in src/dev/fixtures/<kind>.ts exporting `default: Step[]`.
 */
const mods = import.meta.glob<{ default: Step[] }>('./fixtures/*.ts', { eager: true })

const BASE: Step[] = [
  {
    kind: 'concept',
    id: 'fx-concept',
    eyebrow: 'Concurrency',
    title: 'Two threads, one counter',
    body: 'When two threads run `counter += 1`, each does **three** things: load, add, store.\n\nIf they interleave badly, one update is ==lost==.',
    code: { code: 'counter = 0\n\ndef work():\n    global counter\n    counter += 1  # load, add, store', highlight: [5] },
    callout: { tone: 'insight', text: 'The GIL makes each bytecode atomic, not each line.' },
  },
  {
    kind: 'mcq',
    id: 'fx-mcq',
    prompt: 'Which executor speeds up a **CPU-bound** image filter in CPython?',
    choices: [
      { text: '`ThreadPoolExecutor`', feedback: 'Threads serialise on the GIL for pure-Python CPU work.' },
      { text: '`ProcessPoolExecutor`', correct: true, feedback: 'Separate processes, separate GILs.' },
      { text: '`asyncio.gather`', feedback: 'asyncio interleaves waiting, it does not add CPU.' },
    ],
    explanation: 'CPU-bound pure-Python work needs multiple processes (or a library that releases the GIL, like NumPy).',
    hint: 'What does the GIL serialise?',
  },
  {
    kind: 'mcq',
    id: 'fx-mcq-multi',
    multi: true,
    prompt: 'Which are signs of a **strong** culture-round answer?',
    choices: [
      { text: 'Says what they actually thought at the time', correct: true },
      { text: 'Agrees with every company position', feedback: 'Blind agreement reads as no judgment.' },
      { text: 'Names what would change their mind', correct: true },
      { text: 'Polished STAR format with no reflection', feedback: 'Structure without reflection is shallow.' },
    ],
    explanation: 'Interviewers probe for real judgment and the ability to update.',
  },
]

export const FIXTURES: Step[] = [...BASE, ...Object.values(mods).flatMap((m) => m.default)]
