# Design principles

The reference register is scientific publishing and clinical instrumentation.
The typography of a well-set journal, the density of a professional terminal,
the draftsmanship of an anatomical atlas.

The product's argument is that it is more rigorous than its competitors. The
interface has to make that argument before a word is read.

---

## 1. Chrome is achromatic

**Backgrounds, surfaces, borders, body text, icons, buttons, and navigation all
draw from one warm-neutral ramp. Hue appears only where it encodes meaning.**

This is the most important rule in the system, and the one most likely to be
"improved" away by someone who thinks a primary colour is missing. It is not
missing. It was removed.

Colour in this app means: an evidence grade, a volume-landmark zone, a recovery
state, a progression or a stall. Nothing else. When a user sees hue, it is
carrying information, and that is only true if hue is scarce.

Phase 1 shipped a cyan accent on buttons, links, and focus rings. Phase 2
removed it. Links are now `text-strong` with a hairline underline; the primary
button is `text-strong` on `background`. Both read as deliberate rather than
as unstyled, because the ramp is warm and the weight relationships are set.

**If you are reaching for a colour and it is not encoding data, the answer is a
different ramp step, not a different hue.**

## 2. No arbitrary values

`src/lib/design/tokens.ts` is the single source. Everything Tailwind consumes
is generated from it into `src/app/tokens.generated.css`; CI regenerates and
diffs, so the CSS cannot drift.

`pnpm design:check` fails the build on arbitrary Tailwind values
(`text-[13px]`, `bg-[#1a1a1a]`, `rounded-[10px]`) outside a documented
allowlist. If a value is not a token, it is not available. Add the token.

The allowlist currently covers `tokens.ts` itself, the generated CSS, and the
vendored shadcn primitives under `components/ui/` — which are retokenized as
each one is touched. That list should shrink over time, never grow.

## 3. What we are not

There is a house style that AI-assisted projects converge on. It is immediately
recognizable and it reads as unconsidered regardless of the engineering
underneath. Prohibited here, and enforced where enforcement is possible:

| Prohibited | Enforced by |
|---|---|
| Inter or Geist as primary typeface | `design:check` |
| Decorative gradients of any kind | `design:check` |
| Glassmorphism / backdrop-blur on cards | `design:check` (overlay allowlist) |
| `rounded-2xl` / `rounded-3xl` on containers | `design:check` |
| Pure `#000` or `#fff` backgrounds | `contrast.test.ts` |
| Emoji as iconography | review |
| Centered marketing hero with stacked CTAs | review |
| Floating cards with soft drop shadows as layout | review |
| Animated gradient blobs, aurora, particles | review |
| Untouched shadcn defaults | review |

The test: if a screenshot of this app could be swapped with a screenshot of an
unrelated project and nobody would notice, the design has failed.

## 4. Typography

Three faces, three jobs, no overlap.

| Role | Face | Why |
|---|---|---|
| Long-form prose | **Newsreader** | Variable with an optical-size axis, so display sizes tighten without body text losing aperture. Editorial serif; separates the knowledge layer from app chrome instantly. |
| Interface | **IBM Plex Sans** | Technical and institutional. Drawn for a company that makes mainframes, and specifically not the neutral grotesque every other product reaches for. |
| Numerics and code | **IBM Plex Mono** | Every number in the product. |

**Every number uses tabular figures.** Loads, reps, RIR, volumes, percentages,
dates — no exceptions. This is set globally in `globals.css` on `.tabular`,
`[data-numeric]`, and all table cells. Columns of numbers that do not align are
the clearest signal that nobody was paying attention.

Two scales, because prose and data have different jobs. Prose is a 1.2 modular
scale off a 17px base at a 62–72 character measure and ~1.6 line height. UI is
a tighter 1.125 ratio off 14px, because dense tables need close steps and a
table set on a prose scale wastes half the screen.

Every line height is a multiple of 4 so type lands on the base grid.

## 5. Structure

- **4px base grid**, strictly. Asserted in `contrast.test.ts`.
- **Hairline rules, not shadows.** 1px borders at low-contrast ramp steps are
  the primary means of separating regions. Shadows appear only on true overlays
  — popover, dialog, sheet — and are tight and neutral.
- **Radii stay small.** 2px default, 4px ceiling on containers, `full` only for
  genuine pills and avatars. Large radii on data containers read as consumer-app
  softness, and this is an instrument.
- **Left-aligned, grid-based.** Centered layouts only for genuine full-page
  states: empty, error, auth.
- **Three density tiers.** `comfortable` for prose, `compact` for tables,
  `condensed` for the in-gym logger. Note that condensed is *bigger*, not
  smaller — a thumb with chalk on it matters more than elegance, so targets go
  up and ornament comes down.

## 6. Motion

120–180ms, ease-out, opacity and 2–4px transforms only. No spring physics, no
staggered reveals, no scroll-triggered animation. All three read as decoration,
and decoration is what this interface argues against. `prefers-reduced-motion`
is fully respected.

## 7. Surfaces

Dark is primary for the logger and dashboard. Light — genuinely paper, `#f8f6f4`
— is primary for the knowledge layer, **because long-form reading in dark mode
is worse and we should be honest about that.**

The surface follows the route by default. A user preference, when set,
overrides every route: someone who needs dark for photophobia or light for
contrast must not have to fight the app section by section. Three states:
`auto`, `dark`, `light`. Resolved server-side from a cookie so there is no
flash.

## 8. Colour accessibility, stated honestly

Every declared text and mark pairing is asserted in `contrast.test.ts` against
WCAG AA. Body text is 12.98:1 on dark and 16.77:1 on paper; muted text is
6.87:1 and 5.55:1. Hairlines sit at 1.28:1 and 1.41:1 — deliberately below
text thresholds, because they are rules, not content.

**The evidence palette does not pass a categorical CVD check, and this is
known.** Measured with the palette validator, evidence-strong (green) and
evidence-weak (red) collapse to ΔE 3.8 under deuteranopia on the dark surface,
5.4 on paper. That is inherent to any good/bad status pair and is not fixable
by re-stepping the hues.

What makes it legal is that colour is never the only channel:

- Every evidence chip carries a **text label**, always.
- Every claim gutter carries a **distinct stroke style** — solid, dashed,
  double, dotted — which survives grayscale entirely.
- The `/design` route renders all four adjacent with saturation stripped, so
  the grayscale distinction can be checked rather than assumed.

Treating this as a status scale with mandatory secondary encoding is the
correct reading, and it is why the chips are figure-legend markers rather than
filled badges. But the numbers are recorded here rather than hidden, because
"it passes" would have been false.

## 9. The `/design` route is the test suite

Every primitive in every state, both surfaces, all three densities, the full
type scale, the ramp with measured contrast ratios, and all four evidence
gutters shown adjacent in grayscale.

It is not a throwaway. When a component gains a state, it gains an entry. A
design system whose gallery has rotted is a design system nobody is checking.
