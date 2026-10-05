import type { Step } from '../../core/types'

/** Numeric fixtures: estimate with tolerance + unit, huge number, small decimal with default tolerance, exact integer. */
const steps: Step[] = [
  {
    kind: 'numeric',
    id: 'fx-numeric',
    eyebrow: 'Back of the envelope',
    prompt: 'A service handles **100 million** requests a day, spread evenly. Roughly how many requests per second is that?',
    answer: 1157,
    tolerance: 0.25,
    unit: 'req/s',
    explanation: 'A day has 86,400 seconds, call it ~10⁵. 10⁸ / 10⁵ ≈ **1,000 req/s** (exactly ~1,157). Peak traffic is usually 2-3x the average.',
    hint: 'A day is about 100,000 seconds.',
  },
  {
    kind: 'numeric',
    id: 'fx-numeric-bytes',
    prompt: 'How much memory do **1 billion** 64-bit integers take, packed in a NumPy array?',
    answer: 8_000_000_000,
    tolerance: 0.1,
    unit: 'bytes',
    explanation: '64 bits = 8 bytes, so 10⁹ × 8 = **8 GB**. A Python `list` of ints would be several times larger.',
  },
  {
    kind: 'numeric',
    id: 'fx-numeric-prob',
    eyebrow: 'Edge case',
    prompt: 'You flip 4 fair coins. What is the probability that all four land heads? Give a decimal.',
    answer: 0.0625,
    explanation: '(1/2)⁴ = 1/16 = **0.0625**.',
  },
  {
    kind: 'numeric',
    id: 'fx-numeric-exact',
    prompt: 'How many seconds are in a day?',
    answer: 86400,
    tolerance: 0,
    unit: 's',
    explanation: '24 × 60 × 60 = **86,400**.',
  },
]

export default steps
