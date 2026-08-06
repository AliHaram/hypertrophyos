import {
  type OrphanedTerm,
  type Phase,
  CURRENT_PHASE,
  overdueOrphans,
  staleRegistrations,
} from "@/lib/content/orphaned-terms";

import { CITATIONS } from "./citations";
import {
  type EvidenceGrade,
  GRADES_REQUIRING_CITATION,
  GRADES_REQUIRING_DERIVATION,
  GRADES_REQUIRING_UNCERTAINTY,
} from "./types";

/**
 * The evidence-integrity checker.
 *
 * Eight rules, all of which fail the build rather than emitting a warning. The
 * distinction matters: a warning in a content pipeline is a claim that ships
 * unlabelled while somebody means to get to it. These run inside the content
 * loader, which runs during `next build`, so a violation stops the build.
 *
 * Phase 1 spread four of these across two modules. They are consolidated here
 * so the rule set can be read in one place and tested as a unit.
 */

export type IntegrityRuleId =
  | "strong-requires-citation"
  | "mixed-requires-uncertainty"
  | "mechanical-requires-derivation"
  | "citation-must-resolve"
  | "term-must-be-unique"
  | "orphaned-term-past-deadline"
  | "orphan-registration-is-stale"
  | "exercise-requires-graded-fields";

export interface IntegrityViolation {
  rule: IntegrityRuleId;
  /** What the violation is attached to — a concept slug, exercise id, or term. */
  subject: string;
  message: string;
}

export const INTEGRITY_RULES: Record<IntegrityRuleId, string> = {
  "strong-requires-citation":
    "A claim graded `strong` must cite at least one verified paper.",
  "mixed-requires-uncertainty":
    "A claim graded `mixed` must say what would change our mind.",
  "mechanical-requires-derivation":
    "A claim graded `mechanical-inference` must name its mechanical basis.",
  "citation-must-resolve":
    "Every citation id must exist in the bibliography and be marked verified.",
  "term-must-be-unique":
    "A glossary term must resolve to exactly one concept.",
  "orphaned-term-past-deadline":
    "A registered orphaned term must have a concept by the end of its phase.",
  "orphan-registration-is-stale":
    "A registered orphaned term that now has a concept must be removed from the register.",
  "exercise-requires-graded-fields":
    "Every exercise must carry prime mover, involvement coding, resistance profile, failure protocol, and SFR — each with an evidence grade.",
};

/** The minimal shape the checker needs. Concepts and exercises both satisfy it. */
export interface GradedSubject {
  id: string;
  grade: EvidenceGrade;
  citations?: readonly string[];
  uncertainty?: string | undefined;
  derivation?: string | undefined;
}

// ---------------------------------------------------------------------------
// Rules 1–3: a grade implies an obligation
// ---------------------------------------------------------------------------

export function checkGradedSubject(
  subject: GradedSubject,
): IntegrityViolation[] {
  const violations: IntegrityViolation[] = [];

  if (
    GRADES_REQUIRING_CITATION.includes(subject.grade) &&
    (subject.citations?.length ?? 0) === 0
  ) {
    violations.push({
      rule: "strong-requires-citation",
      subject: subject.id,
      message:
        'graded "strong" but cites nothing — either cite the meta-analyses or downgrade to "mixed"',
    });
  }

  if (
    GRADES_REQUIRING_UNCERTAINTY.includes(subject.grade) &&
    !subject.uncertainty
  ) {
    violations.push({
      rule: "mixed-requires-uncertainty",
      subject: subject.id,
      message:
        'graded "mixed" but has no `uncertainty` note — say what would change your mind',
    });
  }

  if (
    GRADES_REQUIRING_DERIVATION.includes(subject.grade) &&
    !subject.derivation
  ) {
    violations.push({
      rule: "mechanical-requires-derivation",
      subject: subject.id,
      message:
        'graded "mechanical-inference" but has no `derivation` — name the moment arm, resistance vector, or line of action the conclusion rests on',
    });
  }

  return violations;
}

// ---------------------------------------------------------------------------
// Rule 4: citations resolve and are verified
// ---------------------------------------------------------------------------

export function checkCitationsResolve(
  subjectId: string,
  citationIds: readonly string[],
): IntegrityViolation[] {
  return citationIds.flatMap((id) => {
    const citation = CITATIONS[id];
    if (!citation) {
      return [
        {
          rule: "citation-must-resolve" as const,
          subject: subjectId,
          message: `unknown citation id "${id}" — add a verified record to src/lib/evidence/citations.ts, or drop the reference and grade the claim "mixed"`,
        },
      ];
    }
    if (!citation.verified) {
      return [
        {
          rule: "citation-must-resolve" as const,
          subject: subjectId,
          message: `citation "${id}" is marked unverified and cannot support a rendered claim`,
        },
      ];
    }
    return [];
  });
}

// ---------------------------------------------------------------------------
// Rule 5: glossary terms are unambiguous
// ---------------------------------------------------------------------------

export function checkTermUniqueness(
  entries: ReadonlyArray<{ slug: string; terms: readonly string[] }>,
): IntegrityViolation[] {
  const violations: IntegrityViolation[] = [];
  const owners = new Map<string, string>();

  for (const entry of entries) {
    for (const term of entry.terms) {
      const key = term.toLowerCase();
      const existing = owners.get(key);
      if (existing && existing !== entry.slug) {
        violations.push({
          rule: "term-must-be-unique",
          subject: term,
          message: `claimed by both "${existing}" and "${entry.slug}" — a term must resolve to exactly one concept`,
        });
      }
      owners.set(key, entry.slug);
    }
  }

  return violations;
}

// ---------------------------------------------------------------------------
// Rule 6: orphaned terms expire
// Rule 8: and registrations they satisfy are removed
//
// Numbered 8 rather than 6b because the rule ids are a flat set; it lives here
// because reading it apart from rule 6 would make neither of them make sense.
// ---------------------------------------------------------------------------

export function checkOrphanedTerms(
  resolvedTerms: ReadonlySet<string>,
  currentPhase: Phase = CURRENT_PHASE,
): IntegrityViolation[] {
  return overdueOrphans(resolvedTerms, currentPhase).map(
    (orphan: OrphanedTerm) => ({
      rule: "orphaned-term-past-deadline" as const,
      subject: orphan.term,
      message: `registered to resolve by ${orphan.resolveBy} and still has no concept (${orphan.reason})`,
    }),
  );
}

/**
 * The other half of the deadline rule: registrations that have been satisfied.
 *
 * `staleRegistrations` was written alongside `overdueOrphans` and then never
 * called, which left the register half-enforced — it could tell you a promise
 * was overdue but not that one had been kept. That gap is invisible until the
 * first orphan actually resolves, and its own doc comment names the cost: a
 * stale entry is noise that makes the real deadlines easier to ignore.
 *
 * Wired in as `resistance-profile` lands, which is the first time it can fire.
 */
export function checkStaleOrphanRegistrations(
  resolvedTerms: ReadonlySet<string>,
): IntegrityViolation[] {
  return staleRegistrations(resolvedTerms).map((orphan: OrphanedTerm) => ({
    rule: "orphan-registration-is-stale" as const,
    subject: orphan.term,
    message: `a concept now resolves this, so its entry in ORPHANED_TERMS is stale and should be deleted (was due ${orphan.resolveBy})`,
  }));
}

// ---------------------------------------------------------------------------
// Rule 7: exercises carry their evidence-bearing fields
// ---------------------------------------------------------------------------

/**
 * Fields an exercise cannot omit. Each is a claim about the movement, so each
 * carries a grade — an ungraded SFR rating is an opinion wearing a number.
 */
const REQUIRED_EXERCISE_FIELDS = [
  "primeMover",
  "muscleInvolvement",
  "resistanceProfile",
  "failureProtocol",
  "sfr",
] as const;

/** A field value paired with the grade that qualifies it. */
interface GradedField {
  grade: EvidenceGrade;
  derivation?: string | undefined;
  citations?: readonly string[];
}

export interface CheckableExercise {
  id: string;
  primeMover?: GradedField & { muscleId?: string };
  muscleInvolvement?: GradedField & {
    entries?: ReadonlyArray<{ muscleId: string; involvement: string }>;
  };
  resistanceProfile?: GradedField & { samples?: readonly number[] };
  failureProtocol?: GradedField & { protocol?: string };
  sfr?: GradedField & { rating?: number; reasoning?: string };
}

export function checkExercise(
  exercise: CheckableExercise,
): IntegrityViolation[] {
  const violations: IntegrityViolation[] = [];

  for (const field of REQUIRED_EXERCISE_FIELDS) {
    const value = exercise[field];

    if (!value) {
      violations.push({
        rule: "exercise-requires-graded-fields",
        subject: exercise.id,
        message: `missing required field "${field}"`,
      });
      continue;
    }

    if (!value.grade) {
      violations.push({
        rule: "exercise-requires-graded-fields",
        subject: exercise.id,
        message: `field "${field}" has no evidence grade`,
      });
      continue;
    }

    // A graded field carries the same obligations as a graded claim.
    for (const violation of checkGradedSubject({
      id: `${exercise.id}.${field}`,
      grade: value.grade,
      citations: value.citations,
      derivation: value.derivation,
      // Exercise fields are never graded `mixed`; if one ever is, it must
      // supply an uncertainty note like any other contested claim.
      uncertainty: undefined,
    })) {
      violations.push({ ...violation, subject: exercise.id });
    }
  }

  // An involvement coding with no entries passes the presence check but says
  // nothing, which is the failure this rule exists to catch.
  if (
    exercise.muscleInvolvement &&
    (exercise.muscleInvolvement.entries?.length ?? 0) === 0
  ) {
    violations.push({
      rule: "exercise-requires-graded-fields",
      subject: exercise.id,
      message:
        'field "muscleInvolvement" is present but codes no muscles — every exercise must state what it trains and how directly',
    });
  }

  if (exercise.sfr && exercise.sfr.rating !== undefined) {
    const { rating } = exercise.sfr;
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      violations.push({
        rule: "exercise-requires-graded-fields",
        subject: exercise.id,
        message: `SFR rating ${rating} is outside the 1–5 scale`,
      });
    }
    if (!exercise.sfr.reasoning) {
      violations.push({
        rule: "exercise-requires-graded-fields",
        subject: exercise.id,
        message:
          "SFR rating has no reasoning — a bare number implies a precision this framework does not have",
      });
    }
  }

  return violations;
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

export class IntegrityError extends Error {
  constructor(public readonly violations: readonly IntegrityViolation[]) {
    super(formatViolations(violations));
    this.name = "IntegrityError";
  }
}

export function formatViolations(
  violations: readonly IntegrityViolation[],
): string {
  const byRule = new Map<IntegrityRuleId, IntegrityViolation[]>();
  for (const violation of violations) {
    const list = byRule.get(violation.rule) ?? [];
    list.push(violation);
    byRule.set(violation.rule, list);
  }

  const sections = [...byRule.entries()].map(([rule, items]) => {
    const lines = items
      .map((item) => `    ${item.subject}: ${item.message}`)
      .join("\n");
    return `  [${rule}] ${INTEGRITY_RULES[rule]}\n${lines}`;
  });

  return `Evidence integrity check failed (${violations.length} violation${
    violations.length === 1 ? "" : "s"
  }):\n\n${sections.join("\n\n")}`;
}

/** Throws if any violations were collected. */
export function assertNoViolations(
  violations: readonly IntegrityViolation[],
): void {
  if (violations.length > 0) throw new IntegrityError(violations);
}
