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
