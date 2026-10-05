# Writing Gauntlet lessons

Each lesson is one file, `src/content/lessons/<lesson-id>.ts`, default-exporting
a `Lesson` (see `src/core/types.ts`). Units in `src/content/units/*.ts` compose
lessons into courses. Validate with `npm run validate -- <unit-id>`.

## What a lesson feels like

Gauntlet teaches like Brilliant: **learn by doing**. A learner should never
read more than ~70 words before they have to *do* something.

- **Length**: 10-14 steps, ~6-9 minutes. Roughly 40% concept, 60% interactive.
- **Open with a hook** (a `concept` step): a surprising fact, a tiny scenario,
  a question they can't answer yet. Not a definition.
- **Alternate**: concept → interaction → concept → interaction. Never 3
  concepts in a row. Each interaction should test the idea just introduced,
  then later ones should combine ideas.
- **Escalate**: early checks are recognition (mcq), later ones are
  production (cloze, spotbug, predict, order, interview, widget goals).
- **End with synthesis**: a harder applied step (interview sim, a bug in a
  realistic snippet, a design decision), then a short concept recap that
  names the 2-3 things to remember.
- **One idea per concept step**: 25-70 words of body, optional code ≤ 18
  lines, optional callout. Split anything longer.
- **Feedback teaches**: every wrong mcq choice gets its own `feedback`
  explaining *why it's tempting and why it's wrong*. Explanations are 1-3
  sentences, specific, never "Correct because it is correct."
- **Hints** nudge without giving the answer.

## Step kinds — when to use each

| kind | use for |
| --- | --- |
| concept | one idea; can embed a `widget` with no goal for exploration |
| mcq | recognition; `multi: true` for select-all (2-3 correct of 4-5) |
| order | sequences: steps of an algorithm, layers of an answer, interview stages |
| sort | 2-3 categories: strong vs weak signal, CPU vs IO bound, thread vs process |
| cloze | fill key tokens in code (`{{0}}`, `{{1}}` in order); 3-4 options per blank, plausible distractors |
| spotbug | realistic bug in 8-18 lines; `bugLines` 1-based; include `fix` |
| predict | "what does this print?" — VERIFY by running the code with python3 |
| numeric | back-of-envelope estimates; set `tolerance` (0.25-0.5 for estimates) and `unit` |
| match | 3-6 pairs: term ↔ meaning, problem ↔ data structure |
| compare | two candidate interview answers; pick the stronger; explanation names the difference |
| interview | 2-4 turn simulated interview; every turn one strong, one okay, one weak option (shuffle positions across turns!) with feedback |
| reflect | the learner writes their own answer; `slot` saves it to the Story Bank; rubric of 3-5 checkable criteria |
| widget | an interactive simulation with a goal (see `src/widgets/specs.ts` for ids, configs, goals) |

Avoid putting the correct mcq answer in the same position each time (the
UI shuffles by default, but keep option lengths similar so the longest
option isn't always right).

## Review cards (spaced repetition)

Each lesson has **5-8 cards** that enter the learner's FSRS deck when the
lesson is finished. Cards must:

- stand alone (no "as we saw above"), test one retrievable idea, and be
  answerable in ~10-20 seconds;
- be a mix: at most 40% `flash`, the rest auto-graded kinds (`mcq`, `cloze`,
  `spotbug`, `predict`, `numeric`, `order`, `sort`, `match`, `compare`);
- NOT duplicate a lesson step verbatim — rephrase or test from another angle
  (reverse the question, new example), so review is retrieval, not recognition;
- have ids `<lesson-id>.<slug>` and a `skill` from `src/content/skills.ts`.

Flash backs are short (≤ 40 words) and may include code.

## Rich text

`**bold**`, `*italic*`, `` `code` ``, `==highlight==` (sparingly — the one
phrase to remember), `[label](https://url)`, blank line between paragraphs,
`- ` bullets, `1. ` numbered, `> ` quote. No HTML, no headings, no emoji.

## Accuracy rules (non-negotiable)

- **Anthropic facts** (mission, structure, RSP, research, policy, products)
  come only from the verified research notes you are given. Time-sensitive
  claims carry a date ("as of mid-2026", "in May 2025"). When unsure, say
  less. Cite with a `callout` of tone `source` linking the primary source.
- **Interview patterns** are *reported by candidates* on public forums, not
  official. Say so ("candidates report…", "a commonly reported question…").
  Never claim insider knowledge or present a "real question bank" as
  official. Formats vary by role and change over time.
- **Code** is Python 3.11+, idiomatic, and correct. Run every snippet whose
  behavior a step depends on (predict answers, bug claims, cloze answers)
  with `python3` before committing it to content. Concurrency claims must
  match CPython semantics (GIL, free-threaded builds being optional).
- **No propaganda.** The culture and "why Anthropic" material teaches the
  learner to form and defend their *own* views, including fair critiques of
  Anthropic. A strong answer is honest, specific, and willing to disagree;
  a weak answer flatters.

## Voice

Direct, smart, a little wry. Second person. Short sentences. Concrete
examples over abstractions. Name the tradeoff. No filler ("It's important
to note that…"), no hype, no exclamation marks except in feedback praise.

## Skeleton

```ts
import type { Lesson } from '../../core/types'

const lesson: Lesson = {
  id: 'conc-races',
  title: 'Race conditions',
  summary: 'Find the interleaving that loses an update, then make it impossible.',
  minutes: 7,
  skills: ['conc.races', 'conc.locks'],
  steps: [
    { kind: 'concept', id: 'hook', title: 'Two threads walk into a counter', body: '…' },
    { kind: 'widget', id: 'lose-one', prompt: 'Make the final count wrong.', goal: 'Lose an update', widget: { id: 'race', config: { goal: 'lose-update' } }, explanation: '…' },
    // …
  ],
  cards: [
    { id: 'conc-races.rmw', skill: 'conc.races', kind: 'flash', front: 'Why is `x += 1` not atomic in Python threads?', back: '…' },
    // …
  ],
}

export default lesson
```
