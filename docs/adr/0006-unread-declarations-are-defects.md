# 0006 — Defect classes become gates, not tests

- **Status:** Accepted
- **Date:** 2026-08-07
- **Phase:** 2

## Context

Three defects of the same shape have now shipped, and a fourth of a related
shape was caught by luck.

**The unread declaration.** A symbol is written to be authoritative, exported,
and then never imported. Nothing consumes it, so nothing can prove it wrong, so
it cannot fail until something else forces the issue:

- `staleRegistrations()` was written beside `overdueOrphans()` and never called.
  The orphaned-term register was therefore enforced in one direction only — it
  could report an overdue promise but not a kept one. Invisible until the first
  orphan actually resolved, which was about to happen.
- `routeSurface()` had no callers at all. Surfaces were applied by hand in each
  route group's layout. It contained a prefix-matching bug that made the landing
  page impossible to declare a surface for, and the bug had never fired because
  the function had never run.
- `volume.ts` re-exported the involvement tiers from `involvement.ts`. Nothing
  imported them by that path; consumers went direct. A second public route to
  the same symbols, kept in agreement for no one.

This class is worse here than it would be in most codebases. **This project's
safety argument rests on checkers** — eight evidence-integrity rules, a design
token check, a contrast suite, a bundle budget, an orphan register. A checker
that nothing calls reads as coverage while providing none, which is strictly
worse than no checker at all: it occupies the space where a real one would go.

**The falsy-versus-nullish confusion.** `substitutesFor(exercise, { limit: 0 })`
returned every result, because `options.limit ? slice(...) : all` treats `0` as
absent. A test caught it, but only because one was written for a case that
looked too boring to test. The next instance would not be so lucky.

## Decision

Both classes become mechanical gates rather than things reviewers or tests are
relied on to notice.

**`knip` runs in CI and fails on unused exports, types, files and dependencies.**
`pnpm deadcode:check`, wired in immediately after `pnpm lint`. Either knip or
`ts-prune` would have surfaced all three instances above on the day they landed
rather than the day they mattered.

**`@typescript-eslint/prefer-nullish-coalescing` is enabled as an error**, with
`ignoreTernaryTests: false` so the `a ? a : b` form is caught as well as `a || b`.
This required turning on the type-aware project service, which `next/typescript`
does not configure — that costs a slower lint and buys a family of bugs that
tests catch only by coincidence.

### The rule's one hit was a false alarm, and that is the important part

Enabling it flagged exactly one existing line, in the exercise index:

```ts
const active = Boolean(filters.muscle || filters.equipment || filters.peak);
```

**Here `||` was correct and `??` would have been a bug.** The values are
`string | undefined`, and `?muscle=` — an empty param — must read as *no filter
set*. `||` treats `""` as absent, which is the intended behaviour. `??` treats
it as present: `"" ?? undefined ?? "quads"` evaluates to `""`, so a blank param
would have counted as an active filter and the page would have offered to clear
a filter that was doing nothing.

Applying the rule mechanically would have shipped a real defect **while looking
like the rule was helping** — the diff would have been one operator, green
across every gate, and defensible in review by pointing at the lint rule.

The fix was neither operator. Blanks are normalised at the boundary:

```ts
function readParam(value: string | string[] | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

const active = [filters.muscle, filters.equipment, filters.peak].some(Boolean);
```

Now `?muscle=` and no `muscle` at all are the same value before anything
downstream has to decide, and the behaviour does not depend on which operator's
edge semantics the next reader happens to remember.

**The general point, which is why this is recorded rather than left in a commit
message:** a lint rule encodes what is usually right. When one fires on a line
that is deliberately doing the unusual thing, the answer is rarely to obey it
and rarely to suppress it — it is to remove the reader's need to know the edge
case at all. A gate that is followed without reading is not better than no gate;
it is a faster way to be wrong.

The general rule, stated so it is not rediscovered a fourth time:

> **When a defect turns out to be an instance of a class, close the class with a
> gate. A test closes one instance; a lint rule or a static check closes all of
> them, including the ones nobody has thought of yet.**

This is the same move as ADR 0005's ordering rule, applied to a different axis:
there the fix was declaring what was being inherited, here it is checking what
was being assumed.

### The reservation escape hatch

Some exports are genuinely written ahead of their consumer. `VOLUME_ZONE_META`
is reviewed reader-facing copy for the Phase 4 dashboard, authored beside
`classifyVolume` and displayed by nothing yet.

Deleting it discards real work; leaving it unmarked defeats the gate. So it
carries a `@reserved phase-N` JSDoc tag, and knip is configured with
`"tags": ["-@reserved"]` to skip them.

**A reservation must name a phase.** That is what makes it greppable, dated, and
arguable in review, and it is the same discipline the orphaned-term register
applies to unwritten concepts and the bundle budget applies to breached routes:
exceptions are declared with a reason so they stay visible instead of becoming
ambient. A `@reserved` with no phase is a permanent exemption wearing a
temporary one's clothes.

## Consequences

**Good.** Thirty-eight unread exports were removed or unexported in one pass —
most of them symbols used only inside their own file that had no reason to
advertise an API. The three real defects are now impossible to reintroduce
silently. `knip` also caught two dependencies that were listed and unused.

**Bad.** Type-aware linting is slower. `knip` needs configuration to avoid
false positives, and it got some wrong on the first run — `tokens.ts` is
consumed by `generate-tokens.mjs` through a `tsx -e` string that no static
analyser can see, so it is declared as an entry point rather than ignored.
Config that lies to a checker is the same defect one level up.

**A cost worth naming.** `getGlossary()` was unexported by this pass, and Part D
will need it for the command palette index and the ambient glossary. That is
the correct outcome, not an argument against the gate: it is unread *today*,
and re-exporting it is one keyword at the moment something actually reads it.
The alternative — keeping exports open against speculative future use — is how
the three defects above got written in the first place.

**A blind spot found by asking, not by the run being quiet.** `src/db` is
excluded from unused-export analysis and now says so in `knip.jsonc`.
`db/schema/index.ts` is an `export *` barrel consumed as `import * as schema`,
which is exactly the namespace Drizzle needs — and a namespace import marks
every export in the tree as used by construction. A planted export in
`db/schema/exercises.ts` went unflagged with the Drizzle plugin both on and off,
so this is a property of the barrel rather than of the plugin. It is listed as a
declared blind spot instead of being left to look covered, because "the run was
quiet" is not evidence that coverage is intact.

## Proof of failure is part of a gate

A gate that has only ever been observed passing is indistinguishable from one
whose rule silently stopped matching. Every gate in this repo therefore has to
be demonstrated failing, and that demonstration has to be repeatable rather than
a thing someone did once at a terminal.

| Gate | Proof of failure |
|---|---|
| Evidence integrity (8 rules) | `integrity.test.ts` — firing and near-miss per rule |
| Design system (7 rules) | `design-rules.test.ts` — firing and near-miss per rule |
| Phase references (3 cases) | `phase-references.test.ts` |
| Unused exports | Planted export, verified non-zero exit |
| Token freshness | Planted stale CSS, verified non-zero exit |
| Bundle budget | Planted over-budget limit, verified non-zero exit |

The first three are permanent, because their rules are pattern-matching and a
pattern can rot silently. The last three are one-line comparisons whose failure
mode is a wrong exit code, and a test for those would restate the
implementation — those are verified by probe and recorded here.

`design-rules.mjs` and `phase-references.mjs` exist purely to make this possible:
the rules were extracted from their scripts so they could be imported and
exercised, leaving the scripts as the filesystem walk and the exit code.
