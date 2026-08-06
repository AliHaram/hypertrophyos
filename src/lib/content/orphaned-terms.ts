/**
 * The orphaned-term register.
 *
 * `<Term>` falls back to plain text when a term has no concept behind it. That
 * fallback is correct — prose should not break over a glossary gap — but it is
 * also silent, and a silent fallback is how a knowledge layer ends up with
 * permanent holes nobody is accountable for.
 *
 * So every orphan is registered here with a deadline. The fallback still
 * works; what changes is that the term now expires. Past its phase, the build
 * fails.
 *
 * The check that protects you from missing content must not become the thing
 * that hides it.
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

/**
 * The last phase that has *shipped* — not the one in progress.
 *
 * This distinction is load-bearing and was not obvious. The Phase 2 spec asked
 * for two things that cannot both hold at once: register "resistance profile"
 * as due in phase-2, and land the checker green before any content is written.
 * A term due in the phase you are currently building is by definition not
 * written yet, so the rule would fail the build from the moment it was added
 * until the last commit of the phase — turning a real gate into noise that
 * everyone learns to route around.
 *
 * Reading it as "last shipped" resolves it without weakening the rule. The
 * deadline still bites; it bites at the phase boundary. Bump this in the same
 * commit that lands the final content for a phase, and any orphan still
 * outstanding fails the build there — which is exactly the moment you want to
 * be stopped.
 */
export const CURRENT_PHASE: Phase = "phase-2";

export interface OrphanedTerm {
  /** The term as written in prose, lowercased for lookup. */
  term: string;
  /** The phase by the end of which a concept must exist. */
  resolveBy: Phase;
  /** Why it cannot be written yet. */
  reason: string;
}

export const ORPHANED_TERMS: readonly OrphanedTerm[] = [
  {
    term: "proximity to failure",
    resolveBy: "phase-3",
    reason:
      "Belongs with the RIR calibration trainer; the prose depends on the bias-correction maths existing.",
  },
  {
    term: "rir",
    resolveBy: "phase-3",
    reason: "Same concept as proximity to failure, written together.",
  },
  {
    term: "overload debt",
    resolveBy: "phase-3",
    reason:
      "Depends on the stall-diagnosis routing, which is not built until the logger has session history.",
  },
];

function phaseIndex(phase: Phase): number {
  return PHASES.indexOf(phase);
}

/**
 * Orphans that have come due: registered for this phase or an earlier one, and
 * still with no concept resolving them.
 */
export function overdueOrphans(
  resolvedTerms: ReadonlySet<string>,
  currentPhase: Phase = CURRENT_PHASE,
): OrphanedTerm[] {
  const now = phaseIndex(currentPhase);
  return ORPHANED_TERMS.filter(
    (orphan) =>
      phaseIndex(orphan.resolveBy) <= now &&
      !resolvedTerms.has(orphan.term.toLowerCase()),
  );
}

/**
 * Registered orphans that a concept now resolves. These should be removed from
 * the register — a stale entry is noise that makes the real deadlines easier
 * to ignore.
 */
export function staleRegistrations(
  resolvedTerms: ReadonlySet<string>,
): OrphanedTerm[] {
  return ORPHANED_TERMS.filter((orphan) =>
    resolvedTerms.has(orphan.term.toLowerCase()),
  );
}
