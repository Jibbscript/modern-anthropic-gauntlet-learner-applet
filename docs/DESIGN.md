# Gauntlet design language

Gauntlet is a mobile-first learning app whose look and feel follows the
interaction design of the Brilliant iOS app (learn-by-doing, one idea per
screen, chunky tactile controls, instant feedback, streaks, a lesson path).
It must not use Brilliant's (or Anthropic's) logos, names or artwork.

## Brilliant specifics (from docs/research/brilliant-ux.md — follow these)

- **Canvas**: white `#FFFFFF` (dark `#141414`), secondary surfaces `#F8F8F8` (dark `#1E1E1E`), black text with alpha tints (70% / 45%).
- **Type**: Figtree for UI at weights **400 / 500 / 700 only** (no 800/900). Headings 700, body 400, labels and buttons 600-700. `--font-serif` (Besley, a Clarendon-style slab) is reserved for rare display moments: onboarding hero, lesson-complete title, course hero title. Code is Source Code Pro.
- **Buttons**: pill-shaped 3D buttons, 4px solid bottom edge, face drops flat on press over 100ms ease-out. Default CTA is dark `#383838` on a black edge (light gray in dark mode). Colour variants: hue-500 face on hue-600 edge. Disabled: 5% fill, 20% text, no edge.
- **Feedback**: correct = full-width green banner (`--good-soft`) with party-popper icon, "Correct!", a `+15 XP` chip, a "Why?" pill, green Continue. Wrong but retryable = **yellow** banner (`--retry-soft`, "Not quite." / "Try again!") with a yellow Try again button and a grey secondary ("Show answer"). Final miss / revealed = **neutral grey** (`--neutral-fb`), deliberately not red. Wrong picks shake horizontally (~9px decaying, 400ms) and turn yellow, not red. Correct picks get 2px green borders and green text.
- **Progress bar**: 8-10px, green fill on `#E5E5E5` track.
- **Streak**: a rounded **lightning bolt** (lucide `Zap`, filled) in pear `--streak` (#D8E82E); week row of filled circles; streak freezes are "streak charges" drawn as **batteries** (max 2, auto-applied). A day counts after 1 lesson or 3 reviews. Use a different icon for XP (e.g. `Sparkles`/`Star`) so the bolt always means streak.
- **XP**: +15 per first-try correct answer, shown as a green chip.
- **Course path**: vertical gently zig-zagging column of **isometric 3D "puck" nodes** (~92x56, ~120-164px apart, ±58px zig-zag) under a sticky "LEVEL" header card with a hue-400 2px border and 4px hue bottom edge. Not started = grey puck; done = course hue with a white check; current = glowing concentric rings in the course hue (portal) with a floating Start bubble; locked = grey with an iridescent padlock (`--iridescent` gradient 86deg #7491FF → #FF90E0 → #F9D25C); review nodes may use a gear.
- **End of lesson**: XP starburst of green four-point sparkles (`celebrate()`), counter pulse, streak bolt that charges (fills) then bursts, days of the week bounce.
- **Radii**: cards 12-16px, sheets 24px, buttons pill. Shadows are soft and ambient (`0 0 15px rgba(0,0,0,.1)`), never heavy drop shadows.
- **Hues**: one per course from the ramps in tokens.css (`--c-*`). Accents only; the canvas stays white.

## Principles

1. **One idea per screen.** Short text, then something to *do*. Never a wall
   of prose; split long concepts into several concept steps.
2. **Tactile.** Every tappable thing looks pressable: white card, 2px border,
   4px darker bottom edge that compresses on press (`Tile`, `Button`).
3. **Instant, kind feedback.** Correct = green + chime + a little bounce;
   wrong = yellow + shake + a specific nudge, never a lecture. Explanations sit
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
- feedback: `--good --good-soft --good-edge --good-ink`, `--retry --retry-soft --retry-edge --retry-ink` (wrong-but-retryable), `--neutral-fb --neutral-fb-ink` (revealed), `--bad ...` (reserve red for simulations: lost updates, deadlocks, 429s), `--warn --warn-soft`
- gamification: `--streak --streak-2 --xp --freeze`
- course hue (set by `courseStyle(color)` on a container): `--c --c-soft --c-edge --c-ink`
- code: `--code-bg --code-ink --code-kw --code-str --code-num --code-fn --code-com --code-builtin`
- type: `--font-ui --font-display --font-serif --font-code`, sizes `--fs-xs..--fs-3xl`
- shape: `--r-sm --r-md --r-lg --r-xl --r-pill --edge-h`
- space: `--s-1..--s-10 --gutter`
- depth: `--shadow-sm --shadow-md --shadow-lg --gloss`

Both themes must work: light is bare `:root`, dark comes from
`prefers-color-scheme` or `[data-theme="dark"]`. Check both.

## Primitives (src/ui) — use these, don't reinvent

- `Button` variants `primary | secondary | ghost | good | bad | retry | course | select`, sizes `sm | md | lg`, `block`.
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
- Headings: Figtree 700, slight negative letter-spacing. Labels: uppercase 11-12px, 700 weight, +0.04-0.06em tracking.

## Copy

Plain, direct, second person. Specific over clever. No exclamation spam
(one "Nice!" in feedback is fine). Name things the way an engineer would.

## Files

- Each component owns its CSS file next to it, with class names prefixed by
  the component (e.g. `.mcq-…`, `.race-…`) to avoid collisions.
- Do not edit shared files (`core/*`, `ui/*`, `styles/*`, `steps/types.ts`,
  `widgets/specs.ts`, registries) unless your task says so; if you need a
  change there, describe it in your final report instead.
