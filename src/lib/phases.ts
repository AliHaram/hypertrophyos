/**
 * The project's phase vocabulary. One source, three consumers.
 *
 * This module exists because the same convention has now been arrived at three
 * separate times, and three independent decisions that agree by coincidence are
 * one rename away from disagreeing:
 *
 * 1. `ORPHANED_TERMS` — a term with no concept names the phase it must be
 *    written by.
 * 2. `EXCEPTIONS` in `scripts/check-bundle-budget.mjs` — a route over budget
 *    names the phase the breach is expected to close in.
 * 3. A `reserved` JSDoc tag — an export written ahead of its consumer names
 *    the phase that consumer arrives in.
 *
 * The rule they are all instances of: **an exception must name a phase.** That
 * is what keeps it declared, dated, greppable and arguable in review, instead
 * of becoming ambient and permanent.
 *
 * Holding the vocabulary here means a reservation naming `phase-7`, or a
 * lingering `phase-2` after a renumbering, fails a check rather than sitting
 * there looking valid. TypeScript enforces it wherever `Phase` is used as a
 * type; `scripts/check-phase-references.mjs` enforces it in the two places that
 * are strings a compiler cannot see — a JSDoc tag and a `.mjs` config object.
 */

export const PHASES = [
  "phase-1",
  "phase-2",
  "phase-3",
  "phase-4",
  "phase-5",
  "phase-6",
] as const;

export type Phase = (typeof PHASES)[number];
