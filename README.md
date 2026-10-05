# Gauntlet

Interactive, spaced-repetition prep for the Anthropic interview loop, in the
learn-by-doing style of the Brilliant iOS app. One idea per screen, hands-on
simulations, instant feedback, streaks, and a review deck that adapts to what
you forget and to your interview date.

> Unofficial. Not affiliated with Anthropic or Brilliant. Interview patterns
> come from public candidate reports and change over time; company facts are
> dated and sourced. Check anything time-sensitive before an interview.

## What's inside

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
- **Code Labs**: CodeSignal-style progressive problems with real Python
  tests, run in the browser (Pyodide).
- **Story Bank**: write your culture-round stories layer by layer, then
  rehearse them on a spaced schedule against likely follow-up questions.
- **Adaptive review**: an FSRS-4.5 memory model per card; sessions put the
  most-forgotten cards and weakest skills first; intervals are capped so
  everything is fresh on your interview day.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run check      # typecheck + content validation + unit tests
npm run build      # static build in dist/ (deployable anywhere; base is relative)
npm run build:artifact   # single self-contained HTML page in artifact/
```

Add it to your iPhone home screen from Safari (Share → Add to Home Screen)
for the full-screen app experience. Progress is stored locally in your
browser; export/import it from Me → Settings.

### Deploy

`.github/workflows/pages.yml` publishes `dist/` to GitHub Pages on pushes to
`main`. Enable it once under the repository's Settings → Pages → Source:
GitHub Actions.

## Project layout

```
src/core        content types, FSRS scheduler, store, adaptive session builder, achievements
src/content     skills + story slots, courses (units/) and lessons (lessons/), validator
src/steps       one view per step kind (mcq, order, sort, cloze, spotbug, ...)
src/widgets     interactive simulations + their config contracts (specs.ts)
src/lesson      lesson player, review session, feedback panel, completion screen
src/screens     tabs (Learn, Practice, Stories, Me), course path, onboarding, settings
src/labs        Pyodide runner, editor, lab definitions
src/ui          design primitives (Button, Tile, Sheet, Code, Rich, ...)
docs/           DESIGN.md (design language), CONTENT.md (lesson authoring guide)
```

Dev gallery for visual QA: `/?gallery=steps`, `/?gallery=step&kind=sort`,
`/?gallery=widgets`, `/?gallery=widget&id=race` (add `&theme=dark`).
