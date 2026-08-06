# 0005 — Citations are shared infrastructure, not knowledge-layer content

- **Status:** Accepted
- **Date:** 2026-08-06
- **Phase:** 2

## Context

The bibliography shipped at `/knowledge/citations`, which was correct when the
knowledge layer was the only thing citing anything.

It no longer is. The exercise library grades `resistanceProfile` as
`mechanical-inference` and carries `sfrRationale` and `failureProtocolRationale`
per exercise; the glossary index surfaces evidence grades on terms; Phase 5's
autoregulation explanations will cite the recovery literature. Four sections
will point at one bibliography, and three of them are not the knowledge layer.

A URL nested under one section that four sections cite is wrong on the path
alone. An inline citation on an exercise detail page would resolve *upward into
an unrelated section*, and a reader following it would land somewhere that
looks like it belongs to the concepts they were not reading.

## Decision

The bibliography moves to `/citations`.

`/knowledge/citations` returns a **permanent 308 redirect**, declared in
`next.config.ts` via `redirects()` — not in middleware. A middleware redirect
costs a runtime hop on a route that is otherwise static, and `redirects()` is
what the framework provides for exactly this case.

The redirect is covered by a test asserting the old path still resolves. The
entire purpose of the redirect is that existing links survive; an untested
redirect is one that breaks quietly during an unrelated refactor and is noticed
by nobody, because the person who notices is a reader who already left.

`/citations` is declared as a **knowledge-register surface — paper-light** in
the route map, not left to inherit the app default. Under the follow-surface
rule `/knowledge/*` resolves to light; a root-level path would have resolved to
dark. A bibliography is long-form reading and belongs on paper, and this is the
kind of thing that is easy to miss in review and immediately obvious on screen.

In navigation, `/citations` remains grouped under the **Knowledge section**. The
section grouping answers "where does a reader browsing look for this"; the URL
answers "what owns this". Those have different answers here and the split is
deliberate.

### Declared order, not inherited order

Declaring a surface for `/citations` surfaced a latent bug and, with it, a rule
worth stating generally.

`routeSurface()` resolved by iterating `Object.keys(ROUTE_SURFACE)` and taking
the first prefix match. That makes correctness depend on object-literal key
order, which carries no ordering contract — a nested override could be shadowed
by its own parent depending on where someone happened to type it, and `"/"`
could not be added at all, because every path starts with it and the landing
rule would have claimed the entire app.

**This is the second time implicit key ordering has been a bug here.**
`NEUTRAL_STEPS` exists because `Object.keys(NEUTRAL)` hoists `"10"` and `"11"`
ahead of `"00"`–`"09"` — they are canonical array-index strings and the others
are not — so any consumer iterating the ramp object rendered it out of order.
Two instances is a pattern, so the rule is now written down rather than fixed
case by case:

> **Any structure whose correctness depends on order declares that order
> explicitly. Never inherit it from an object literal.**

The fix here derives an explicit longest-prefix-first `MATCH_ORDER` by sort, so
the declaration can stay grouped by surface — which is how a reader checks it —
while match order is computed rather than typed. `surface.test.ts` asserts the
sort produces what it claims, that a nested override resolves ahead of its
parent, and that matching happens on segment boundaries so `/designer` is not
inside `/design`.

The function had **no callers and no tests** — surfaces were applied by hand in
each route group's layout — which is why the bug was invisible. It goes live in
Part D when the app shell resolves surface from the pathname.

## Consequences

**Good.** Inline citations from any section resolve to a sibling of that
section rather than into an unrelated one. The path now matches what the
resource is.

**Bad.** One redirect to maintain, and one more case where the nav tree and the
URL tree do not have the same shape. Both are cheap; the second is documented in
`docs/information-architecture.md` §2 so it is not rediscovered as a bug.

**Precedent.** This is the first case of content moving out of a section into
shared infrastructure, and it will not be the last — the glossary is the same
shape of thing and ships at `/glossary` at root for the same reason, without
needing a redirect because it has no prior URL to honour. The rule this
establishes: **if more than one section will link to it, it lives at root.**

**Verification.** A test asserts `/knowledge/citations` still resolves to the
bibliography. The orphan-route check (`scripts/check-route-map.mjs`) asserts
`/citations` is in `NAV`. `test:a11y` scans the moved route on both surfaces.
