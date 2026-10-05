# Gauntlet

Interactive, spaced-repetition prep for the Anthropic interview loop, in the
learn-by-doing style of the Brilliant iOS app. One idea per screen, hands-on
simulations, instant feedback, streaks, and a review deck that adapts to what
you forget and to your interview date.

> Unofficial. Not affiliated with Anthropic or Brilliant. Interview patterns
> come from public candidate reports and change over time; company facts are
> dated and sourced. Check anything time-sensitive before an interview.

## What's inside

9 courses, 43 lessons (586 steps), 311 review cards, 12 simulations and 7
code labs. `npm run validate` prints the current counts.

| Course | Covers |
| --- | --- |
| The Gauntlet | the loop, what each round screens for, the AI-use rules |
| Why Anthropic | mission & structure, the Responsible Scaling Policy, research bets, AI risk, your own "why" and where you disagree |
| Values & Judgment | what the culture round probes, answer depth, disagreeing with direction, ethics and speed vs safety, updating live, honest self-knowledge |
| Practical Python | idioms, containers, building in levels, testing yourself, debugging unfamiliar code and reading docs fast |
| Concurrency | threads vs processes vs asyncio, races, locks and deadlock, executors, queues and backpressure, rate limits |
| Build Rounds | crawler, image pipeline, stack traces, caches, file dedup, a tiny interpreter, the leveled in-memory store |
| Design in Prose | designing in a shared doc, requirements and estimates, the Collaborative Prompt Playground (collaboration, versions, execution, scale) |
| With & Without AI | AI-free take-homes, driving a coding agent, reviewing AI-written code |
| Project Deep Dive | choosing the project, layers of depth, surviving drill-downs |

Plus:

- **Simulations**: race conditions, deadlock, BFS crawler with worker races,
  GIL-aware executor timelines, pipeline backpressure, LRU eviction, stack
  samples → trace events, dedup funnel, a stack-machine VM, OT vs CRDT
  merges, token buckets, and a back-of-envelope estimator.
- **Code Labs**: seven CodeSignal-style problems in four levels each (an
  in-memory database, LRU cache with TTL, stack samples to trace events, file
  dedup, web crawler, stack-machine interpreter, image pipeline), with real
  Python tests run in the browser by Pyodide. Without network access to the
  Pyodide CDN a lab falls back to self-check against the reference solution.
- **Story Bank**: write your culture-round stories layer by layer, then
  rehearse them on a spaced schedule against likely follow-up questions.
- **Adaptive review**: an FSRS-4.5 memory model per card; sessions put the
  most-forgotten cards and weakest skills first; intervals are capped so
  everything is fresh on your interview day (details below).

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run check      # typecheck + content and lab validation + unit tests
npm test           # unit tests only (vitest)
npm run validate   # content rules, plus every lab's tests run in CPython (needs python3 3.11+)
npm run smoke      # renders every lesson step and review card in Chromium (Playwright); add -- --dark
npm run build      # static build in dist/ (deployable anywhere; base is relative)
npm run build:artifact   # single self-contained HTML page: artifact/gauntlet.html
```

Add it to your iPhone home screen from Safari (Share → Add to Home Screen)
for the full-screen app experience; the hosted build also works offline after
one visit (a small service worker caches the app and, once a lab has loaded
it, the Python runtime). Progress is stored locally in your browser; export
and import it from Me → Settings, or restore a backup from the first
onboarding screen.

### Deploy

`.github/workflows/pages.yml` publishes `dist/` to GitHub Pages on pushes to
`main`. Enable it once under the repository's Settings → Pages → Source:
GitHub Actions.

## How the adaptive review works

- **Cards unlock with lessons.** Finishing a lesson adds its 5-8 review cards
  to your deck, first due about 20 hours later, so the first review tests
  recall rather than short-term memory.
- **Each card has a memory model** (FSRS-4.5): a stability (days until recall
  drops to 90%) and a difficulty. The next review lands when predicted recall
  falls to your target retention. Every review updates both
  from the grade and from how long it had been since the last review.
- **Grades come from how you answered.** Auto-graded cards grade themselves:
  wrong or more than two tries is *Again*, a second try or a hint is *Hard*,
  a slow answer is *Hard*, a fast answer on a card you have seen before is
  *Easy*, otherwise *Good*. Flashcards ask you to grade yourself.
- **Again comes back the same session** as a "second look" (no extra XP), and
  forgetting a graduated card counts as a lapse; cards with 3+ lapses show up
  as trouble cards on Practice.
- **Sessions are ordered by need**: due cards with the lowest predicted recall
  first, nudged earlier when their skill is weak or they keep lapsing, then
  interleaved so one skill doesn't run back to back. Practice tops a short
  session up with your weakest not-yet-due cards.
- **Your interview date bends the schedule.** Intervals never jump past the
  day before the interview (they split the remaining time instead), and in
  the last two weeks the target retention rises to at least 92%. Target
  retention (default 90%) and session size are in Settings.
- **Stories use the same scheduler**: once a Story Bank answer has content it
  gets a rehearsal schedule, and each rehearsal draws a different likely
  follow-up question.

## Project layout

```
src/app         app shell, tab/overlay navigation (synced with browser Back), shared clock
src/core        content types, FSRS scheduler, store, adaptive session builder, achievements
src/content     skills + story slots, courses (units/) and lessons (lessons/), validator
src/steps       one view per step kind (mcq, order, sort, cloze, spotbug, ...)
src/widgets     interactive simulations + their config contracts (specs.ts)
src/lesson      lesson player, review session, feedback panel, completion screen
src/screens     tabs (Learn, Practice, Stories, Me), course path, onboarding, settings
src/labs        Pyodide runner, editor, lab definitions
src/ui          design primitives (Button, Tile, Sheet, Code, Rich, ...)
src/dev         dev-only gallery for visual QA (not in the production build)
scripts/        content and lab validators, smoke renderer, screenshot helper, artifact packer
docs/           DESIGN.md (design language), CONTENT.md (lesson authoring guide)
```

Dev gallery for visual QA (dev server only): `/?gallery=steps`,
`/?gallery=step&kind=sort`, `/?gallery=widgets`, `/?gallery=widget&id=race`
(optionally `&config=<json>`), `/?gallery=lesson&id=<lessonId>&step=<n>`,
`/?gallery=card&id=<cardId>`; add `&theme=dark` to any of them.
