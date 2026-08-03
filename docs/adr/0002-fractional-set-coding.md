# 0002 — Involvement is a three-tier enum, not a float

- **Status:** Accepted
- **Date:** 2026-08-04
- **Phase:** 2

## Context

Volume is counted per muscle per week, and a set of bench press is not one set
of chest and one set of triceps. Phase 1 handled this with a per-pair float
weight on `exercise_muscles.involvement`, defaulting to 1.0 / 0.5 / 0.0 by
role, with the column left free so individual pairs "could deviate where the
default is wrong."

That freedom is the problem. Nothing in the literature licenses a 0.35. Pelland
et al. (2026) — the paper the design cites — coded involvement in three tiers
and found that scheme predicted adaptation better than counting indirect work
fully or ignoring it. A float column invites per-exercise judgement calls that
no citation supports and that no two people coding a 48-exercise library would
assign identically.

The Phase 2 library makes this concrete: 48 exercises, each touching three to
six muscles, is roughly 200 involvement decisions. With a float, that is 200
opportunities to encode taste as data.

## Decision

Store the tier. Derive the multiplier.

```
involvement: enum('direct', 'fractional', 'indirect')  →  1.0 / 0.5 / 0.0
```

The enum lives in `exercise_muscles.involvement`; the mapping lives in
`src/lib/training/involvement.ts` and exists in exactly one place. `LoggedSet`
carries the tier, not a number, so an out-of-range weight is unrepresentable
rather than clamped.

`involvementFromLegacyWeight()` handles the backfill. Canonical values map
exactly; anything else snaps to the nearest tier and is reported as `exact:
false` so the migration surfaces it rather than rounding in silence.

## Consequences

**Good.** The coding is defensible by citation rather than by taste. Reviewing
a library entry becomes a three-way choice instead of an argument about
decimals. The clamping logic in `tallyVolume` disappeared — the type system now
does that work.

**Bad.** Genuine intermediate cases lose nuance. The rear delt in a
chest-supported row is arguably more than fractional and less than direct;
under this scheme it must be one or the other, and the `codingNote` column
carries the argument instead. We think that is the right trade: an honest
argument in a text field beats a false precision in a numeric one.

**Verification.** `involvement.test.ts` replays the Phase 1 seed through the
enum path and asserts per-muscle and whole-session tallies are byte-identical
to what the float implementation produced. All Phase 1 seed weights mapped
exactly; no snapping was required.

**Discovered during migration.** `tallyVolumeByMuscle` keeps a zeroed entry for
a muscle with only indirect involvement rather than dropping it. That is
correct — the muscle was loaded and costs recovery even though it contributes
no volume — and the fatigue ledger in Phase 5 will depend on it. The behaviour
is now covered by a test that states the reasoning.
