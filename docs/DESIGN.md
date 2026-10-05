# Gauntlet design language

Gauntlet is a mobile-first learning app whose look and feel follows the
interaction design of the Brilliant iOS app (learn-by-doing, one idea per
screen, chunky tactile controls, instant feedback, streaks, a lesson path).
It must not use Brilliant's (or Anthropic's) logos, names or artwork.

## Principles

1. **One idea per screen.** Short text, then something to *do*. Never a wall
   of prose; split long concepts into several concept steps.
2. **Tactile.** Every tappable thing looks pressable: white card, 2px border,
   4px darker bottom edge that compresses on press (`Tile`, `Button`).
3. **Instant, kind feedback.** Correct = green + chime + a little bounce;
   wrong = red + shake + a specific nudge, never a lecture. Explanations sit
   behind "Why?" when long.
4. **Visible progress everywhere.** Progress bars, rings, counters that tick
   up, streak flames, mastery percentages.
5. **Calm canvas, bold accents.** White (light) / deep ink (dark) canvas,
   near-black text, one course hue per course used for accents only.
6. **Springy, purposeful motion.** Springs (stiffness 380-600, damping
   18-40) for entrances and presses; nothing loops forever except
   deliberately ambient decoration; respect reduced motion.

## Tokens (src/styles/tokens.css)

Never hard-code colours. Use tokens:

- canvas/ink: `--bg --surface --surface-2 --surface-3 --ink --ink-2 --ink-3 --line --line-strong --edge`
- action: `--action --action-edge --action-ink` (primary button: near-black in light, near-white in dark)
- selection: `--select --select-soft --select-edge`
- feedback: `--good --good-soft --good-edge --good-ink`, `--bad ...`, `--warn --warn-soft`
- gamification: `--streak --streak-2 --xp --freeze`
- course hue (set by `courseStyle(color)` on a container): `--c --c-soft --c-edge --c-ink`
- code: `--code-bg --code-ink --code-kw --code-str --code-num --code-fn --code-com --code-builtin`
- type: `--font-ui --font-display --font-code`, sizes `--fs-xs..--fs-3xl`
- shape: `--r-sm --r-md --r-lg --r-xl --r-pill --edge-h`
- space: `--s-1..--s-10 --gutter`
- depth: `--shadow-sm --shadow-md --shadow-lg --gloss`

Both themes must work: light is bare `:root`, dark comes from
`prefers-color-scheme` or `[data-theme="dark"]`. Check both.

## Primitives (src/ui) — use these, don't reinvent

- `Button` variants `primary | secondary | ghost | good | bad | course | select`, sizes `sm | md | lg`, `block`.
- `IconButton` round icon-only button with label.
- `Tile` answer tile with states `idle | selected | correct | incorrect | dimmed | reveal`; optional `badge`.
- `ProgressBar` (tones `good | course | xp | streak | select`), `Ring`, `Ticker` (animated number).
- `Sheet` bottom sheet. `Callout` (tip/warn/insight/quote/source). `Rich` markdown-lite text.
- `Code` syntax-highlighted Python with line numbers; `renderLine`/`lineProps` hooks for interactive code.
- `fx.ts`: `sfx(kind)`, `haptic(kind)`, `celebrate(size)`.
- Icons: `lucide-react` (stroke width 2.2-2.8). No emoji in UI chrome.
- Animation: `motion/react` (`motion`, `AnimatePresence`, `layout`, springs).
- CSS classes available globally: `.chip .chip--course|good|bad|warn`, `.eyebrow`, `.tabular`, `.scroll`, `.screen`, `.safe-top`, `.safe-bottom`.

## Layout rules

- Designed at 390x844 (iPhone). Must work from 320px wide up to the 520px app column.
- Side gutter `var(--gutter)` (20px). No horizontal page scroll; wide code scrolls inside its own box.
- Minimum tap target 44px. Text at least 13px; body 16-18px.
- Headings: Figtree 800-900, slight negative letter-spacing. Labels: uppercase 11-12px, 800 weight, +0.06em tracking.

## Copy

Plain, direct, second person. Specific over clever. No exclamation spam
(one "Nice!" in feedback is fine). Name things the way an engineer would.

## Files

- Each component owns its CSS file next to it, with class names prefixed by
  the component (e.g. `.mcq-…`, `.race-…`) to avoid collisions.
- Do not edit shared files (`core/*`, `ui/*`, `styles/*`, `steps/types.ts`,
  `widgets/specs.ts`, registries) unless your task says so; if you need a
  change there, describe it in your final report instead.
