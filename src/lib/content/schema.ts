import { z } from "zod";

import { evidenceGradeSchema } from "@/lib/evidence/types";

/**
 * Concept categories, in reading order.
 *
 * The knowledge layer is a sequence, not a pile of articles — mechanisms
 * before the levers that exploit them, levers before the dosing that bounds
 * them. The order is load-bearing, so it lives in code rather than in each
 * file's frontmatter.
 */
export const CONCEPT_CATEGORIES = [
  "mechanisms",
  "overload",
  "dosing",
  "execution",
  "programming",
] as const;

export type ConceptCategory = (typeof CONCEPT_CATEGORIES)[number];

export const CATEGORY_META: Record<
  ConceptCategory,
  { label: string; blurb: string }
> = {
  mechanisms: {
    label: "Mechanisms",
    blurb:
      "What actually makes a muscle grow, and which of the things you have been told matter really do.",
  },
  overload: {
    label: "Progressive overload",
    blurb:
      "Six levers, not one. When each applies, and why the rate of overload has to decay with training age.",
  },
  dosing: {
    label: "Volume and dosing",
    blurb:
      "How much work per muscle per week, what the landmarks mean, and how wide the error bars really are.",
  },
  execution: {
    label: "Execution",
    blurb:
      "Proximity to failure, effort calibration, and the difference between a hard set and a wasted one.",
  },
  programming: {
    label: "Programming",
    blurb:
      "Frequency, exercise order, rest, periodization, and when to back off.",
  },
};

/**
 * Frontmatter contract for `content/concepts/*.mdx`.
 *
 * Parsed at build time. A malformed or incomplete header fails the build
 * rather than rendering a concept with a missing evidence grade — an untagged
 * claim is exactly the failure mode this app exists to avoid.
 */
export const conceptFrontmatterSchema = z.object({
  title: z.string().min(1),
  category: z.enum(CONCEPT_CATEGORIES),
  /** Ordering within the category. */
  position: z.number().int().nonnegative(),
  /**
   * One or two sentences, shown in the hover glossary. Must stand alone — the
   * reader seeing it has no surrounding context.
   */
  shortDefinition: z.string().min(20).max(400),
  /** Grade of the concept's central claim, shown next to the title. */
  evidenceGrade: evidenceGradeSchema,
  /**
   * Terms that should resolve to this concept anywhere in the app. Include
   * abbreviations and plurals; matching is case-insensitive.
   */
  terms: z.array(z.string().min(1)).default([]),
  /** Citation ids, validated against the bibliography at build time. */
  citations: z.array(z.string().min(1)).default([]),
  /**
   * Where this concept might be wrong. Optional in the type, expected in
   * practice for anything graded `mixed` — see `assertIntegrity`.
   */
  uncertainty: z.string().min(20).optional(),
  /** Slugs of concepts worth reading next. */
  related: z.array(z.string().min(1)).default([]),
});

export type ConceptFrontmatter = z.infer<typeof conceptFrontmatterSchema>;

export interface Concept extends ConceptFrontmatter {
  slug: string;
  /** Raw MDX body, frontmatter stripped. */
  body: string;
  readingMinutes: number;
}

/**
 * Editorial rules that the type system cannot express.
 *
 * These are the evidence-integrity requirements as executable checks. A
 * contested claim that does not say where it might be wrong, or a strong grade
 * with nothing behind it, is a build failure.
 */
export function assertIntegrity(concept: Concept): void {
  const problems: string[] = [];

  if (concept.evidenceGrade === "strong" && concept.citations.length === 0) {
    problems.push(
      'graded "strong" but cites nothing — either cite the meta-analyses or downgrade to "mixed"',
    );
  }

  if (concept.evidenceGrade === "mixed" && !concept.uncertainty) {
    problems.push(
      'graded "mixed" but has no `uncertainty` note — say what would change your mind',
    );
  }

  if (problems.length > 0) {
    throw new Error(
      `Evidence integrity check failed for "${concept.slug}":\n  - ${problems.join("\n  - ")}`,
    );
  }
}

/** ~200 wpm, rounded up. Prose here is dense, so this runs deliberately slow. */
export function estimateReadingMinutes(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}
