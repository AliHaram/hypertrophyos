# 0003 — Knowledge-layer figures are static plates, not charts

- **Status:** Accepted
- **Date:** 2026-08-05
- **Phase:** 2

## Context

`/knowledge/[slug]` shipped at 300 kB gzipped against a 180 kB budget. Recharts
accounted for roughly 160 kB of it, imported by three of seven concepts to draw
the dose-response curve, the annual-gain bars and the volume-landmark scale.

Phase 1 recorded this as a deferred exception on the grounds that the real fix
was a client-boundary wrapper with `ssr: false`. That framing was wrong twice
over. It treated a 66% budget overrun as a packaging problem, and the fix it
proposed would have traded away server-rendered figure markup — the thing that
makes the figures readable before hydration — to buy back bytes.

The prior question was never asked: what do these figures actually do? Their
data is fixed at build time. Nothing responds to a pointer. Nothing filters,
zooms, brushes or refetches. They are illustrations in a document — journal
plates — and every byte of charting runtime was being spent redrawing something
that never changes.

## Decision

Knowledge-layer figures are hand-authored and server-rendered. Recharts is
removed from the dependency tree.

The geometry lives in `src/lib/charts/scale.ts` — projection, path building and
axis rounding as pure functions, unit-tested, with no rendering concerns. The
components are markup over that.

Two rendering techniques, chosen per figure:

- **Curves** (dose-response) use an SVG with `preserveAspectRatio="none"` and
  `vector-effect="non-scaling-stroke"`, so the plot stretches to its container
  while stroke weights stay true.
- **Bars and bands** (annual gain, volume landmarks) are CSS. A bar anchored to
  a baseline is what a block element already is; routing it through a drawing
  surface buys nothing.

In both cases **every text label is HTML positioned by percentage, never SVG
text.** Text in a stretched viewBox shears; text in an unstretched one renders
around 6px on a phone. As HTML it stays on the type scale and inside the token
system.

Paths are drawn as straight segments between samples rather than splines.
Spline interpolation invents values between data points and can overshoot the
series maximum — on a curve whose entire teaching purpose is its curvature,
that would draw a claim the model does not make.

This decision is scoped to the knowledge layer. Phase 5 and 6 analytics —
where the user filters, brushes and compares their own history — have genuine
interaction, and a charting library is the right tool there.

## Consequences

**Good.** `/knowledge/[slug]` went from 300 kB to 169 kB, inside budget with
room, and the exception was deleted rather than raised. Figures render without
JavaScript. `ChartFigure` became a Server Component, and its data table moved
from a `useState` toggle to a native `<details>` — the table was documented as
"the accessible path" while being gated on a bundle arriving, and now it is not.
Axis geometry is unit-tested, which no charting-library configuration ever is.

**Bad.** Each new figure type costs real authoring effort where a library would
have taken a prop. That is the correct trade at seven figures and would be the
wrong one at seventy — if the knowledge layer ever needs many figure types, this
should be revisited rather than ground out by hand.

**Also removed.** The Base UI `Slider` in the double-progression demo, replaced
by a styled native `input[type=range]`. Not part of the same argument, but the
same shape of one: 10 kB of JavaScript reimplementing keyboard stepping,
pointer capture and screen-reader semantics the platform already ships. That
change is what took the route from 181 kB to 169 kB, and it fixed an orphaned
`<label>` on the way.

**Verification.** `scale.test.ts` covers projection, axis rounding and path
construction, including that ticks come out free of binary-float dust and that a
nice axis never truncates the data. The rendered result is covered by
`test:a11y`, which scans both figures on both surfaces.
