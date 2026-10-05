import type { Step } from '../../core/types'

/** Predict-the-output fixtures: one line, multi-line generator, quotes leniency, separators/spacing. */
const steps: Step[] = [
  {
    kind: 'predict',
    id: 'fx-predict',
    eyebrow: 'Predict',
    prompt: 'What does this print?',
    code: ['def f(a, acc=[]):', '    acc.append(a)', '    return acc', '', 'f(1)', 'print(f(2))'].join('\n'),
    answers: ['[1, 2]'],
    explanation: 'The default list is created once and shared across calls, so the second call sees the `1` left by the first.',
    hint: 'Is `acc` a fresh list on every call?',
  },
  {
    kind: 'predict',
    id: 'fx-predict-gen',
    prompt: 'Generators are lazy. What does this print, line by line?',
    code: ['def gen():', '    print("start")', '    yield 1', '    print("end")', '', 'g = gen()', 'print("made")', 'print(next(g))'].join('\n'),
    answers: ['made\nstart\n1'],
    explanation: 'Calling `gen()` runs **none** of its body. `next(g)` runs it up to the first `yield`, so `start` prints before `1`, and `end` never prints.',
  },
  {
    kind: 'predict',
    id: 'fx-predict-str',
    eyebrow: 'Edge case',
    prompt: 'Quotes around a string answer are optional. What prints?',
    code: ['name = "  Ada Lovelace  "', 'print(name.strip().split()[-1].upper())'].join('\n'),
    answers: ['LOVELACE'],
    explanation: '`strip()` trims the spaces, `split()` gives `["Ada", "Lovelace"]`, `[-1]` takes the last word and `upper()` shouts it.',
  },
  {
    kind: 'predict',
    id: 'fx-predict-sep',
    prompt: 'What does `sep` do here?',
    code: 'print(*["a", "b", "c"], sep=" | ")',
    answers: ['a | b | c'],
    explanation: 'Unpacking passes three arguments to `print`, which joins them with `sep` instead of a single space.',
  },
]

export default steps
