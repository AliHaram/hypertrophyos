# 0004 — Accessibility is verified against a rendered build, not tokens

- **Status:** Accepted
- **Date:** 2026-08-05
- **Phase:** 2

## Context

The design system asserts sixteen text and mark pairings against WCAG AA in
`contrast.test.ts`. Every one of them passed while three separate contrast
failures shipped:

1. `/knowledge` never received its light surface, because `routeSurface()` was
   written and never called. White text on white.
2. `text-primary-foreground` was rewritten to `text-text-strong-foreground` by a
   regex whose word boundary fell inside a longer class name. Tailwind emits
   nothing for a class it does not recognise, so the element inherited its
   parent's colour and the button became near-invisible.
3. `text-muted-foreground/80` composited paper muted text from its asserted
   5.55:1 down to a measured 3.64:1, on eleven list items.

The first two were reported by the user. All three are invisible to the token
tests, and necessarily so: the token tests assert that *if* a pairing is used it
conforms. They cannot see which pairings a page actually uses, whether a class
name resolved to any CSS at all, or what opacity did to the result. That gap is
not a hole in the assertions — it is the boundary of what a unit test on
constants can know.

## Decision

`pnpm test:a11y` runs axe-core through Playwright against a production build,
over every route, on both surfaces.

- **Routes are derived,** not listed. Concept routes come from reading
  `content/concepts`, so a new concept is covered the moment the file exists.
  A hand-maintained checklist is one that quietly stops covering things.
- **Both surfaces are scanned.** Dark and light resolve the same semantic role
  to different ramp steps, so a pairing can conform on one and fail on the
  other. The surface is set by cookie, the same mechanism a user's preference
  uses.
- **`<details>` are forced open before scanning.** axe skips hidden content, and
  every figure's data table lives inside a closed disclosure — precisely the
  content whose accessibility is being claimed.
- **Tags are WCAG 2.0/2.1 A and AA.** `best-practice` is excluded deliberately:
  it flags stylistic things like heading order inside MDX prose, and a gate that
  cries wolf is a gate somebody switches off.

Violations are flattened to one line per offending node — rule, reason,
element — because asserting on raw axe objects prints several hundred lines per
failure and turns the CI log into something nobody reads.

## Consequences

**Good.** The gate found eight failures on its first run, all real, all
traceable to one root cause the token tests could not have seen. That cause is
now also a build-failing lint rule (`faded-text-colour`), so the class of defect
is caught at the cheapest point and axe covers what static analysis cannot.

**Bad.** It needs a browser and a production build, so it is slow to start and
cannot run on save. It lives in `e2e/` and runs as a separate CI job rather than
alongside the unit tests. Vitest keeps `lib/`; this keeps the rendered page.

**Known limits.** Hover-card content only exists while hovered and is not
scanned. Neither are the exercise-library routes, which do not exist yet — they
will be covered automatically only if their routes are added to `ROUTES`, which
is a manual step for anything outside `content/concepts`.

**Operational note.** The suite takes about three seconds on an idle machine and
took fifteen minutes running next to a concurrent build, where `analyze()`
starved and timed out as three false failures. CI therefore allows one retry.
axe results are deterministic against a given DOM, so a retry cannot turn a real
violation into a pass — it only absorbs a stalled runner.
