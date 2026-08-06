import { z } from "zod";

/**
 * Evidence grading.
 *
 * The grade describes the state of the *literature*, not our enthusiasm. A
 * claim can be practically useful and still be `mixed` — those are independent
 * axes, and conflating them is how fitness content goes wrong.
 */
export const evidenceGradeSchema = z.enum([
  "strong",
  "mixed",
  "mechanical-inference",
  "weak",
]);
export type EvidenceGrade = z.infer<typeof evidenceGradeSchema>;

/**
 * Note on `mixed` versus `mechanical-inference`.
 *
 * These two are the pair most easily confused, and confusing them is
 * destructive in one direction specifically. `mixed` means researchers looked
 * and disagreed. `mechanical-inference` means nobody looked, because the
 * question is answered by physics rather than by a trial.
 *
 * If biomechanical deductions were filed under `mixed`, every genuine `mixed`
 * would be diluted by claims that are not contested at all — and the reader
 * would lose the ability to tell "the field is split" from "this follows from
 * a moment arm". The definitions below are worded to keep that boundary sharp;
 * the earlier wording of both `mixed` and `weak` leaked into inference
 * territory and has been tightened.
 */
export const EVIDENCE_GRADE_META: Record<
  EvidenceGrade,
  { label: string; short: string; definition: string }
> = {
  strong: {
    label: "Strong",
    short: "S",
    definition:
      "Multiple meta-analyses or well-controlled RCTs agree on both the direction and the rough magnitude of the effect.",
  },
  mixed: {
    label: "Mixed",
    short: "M",
    definition:
      "Researchers have investigated this and disagree. The trials conflict, or the effect is small relative to its confidence interval. Contested, not merely uncertain.",
  },
  "mechanical-inference": {
    label: "Mechanical",
    short: "B",
    definition:
      "Derived from biomechanics — joint moment arms, resistance vector, muscle line of action — rather than from measured outcomes. The reasoning is inspectable and stated alongside the claim, but the conclusion has not been empirically verified.",
  },
  weak: {
    label: "Weak",
    short: "W",
    definition:
      "Commonly repeated in gyms and in fitness media, but poorly supported — contradicted by controlled data, or asserted with neither evidence nor a stated mechanical basis.",
  },
};

/**
 * Grades whose claims must carry a `derivation` naming the mechanical basis.
 *
 * A mechanical-inference claim without its derivation is the same failure as a
 * strong claim without a citation: an assertion presenting itself as reasoned
 * while withholding the reasoning.
 */
export const GRADES_REQUIRING_DERIVATION: readonly EvidenceGrade[] = [
  "mechanical-inference",
];

/** Grades whose claims must cite at least one verified paper. */
export const GRADES_REQUIRING_CITATION: readonly EvidenceGrade[] = ["strong"];

/** Grades whose claims must say what would change our mind. */
export const GRADES_REQUIRING_UNCERTAINTY: readonly EvidenceGrade[] = ["mixed"];

/** A single bibliographic record. */
export const citationSchema = z.object({
  id: z.string(),
  authors: z.string(),
  year: z.number().int(),
  title: z.string(),
  journal: z.string(),
  /** Digital Object Identifier, without the https://doi.org/ prefix. */
  doi: z.string().optional(),
  /** PubMed identifier, digits only. */
  pmid: z.string().optional(),
  /**
   * Whether the record was confirmed against PubMed/the publisher during
   * authoring. Unverified records are never rendered as supporting a claim —
   * see `assertVerifiedCitations` in ./citations.ts.
   */
  verified: z.boolean(),
  /** One sentence, in the paper's own terms. Not our interpretation of it. */
  keyFinding: z.string(),
  /** Design of the study, so the reader can weight it without opening it. */
  design: z.enum([
    "meta-analysis",
    "meta-regression",
    "systematic-review",
    "rct",
    "crossover",
    "mechanistic",
    "narrative-review",
  ]),
});

export type Citation = z.infer<typeof citationSchema>;

function doiUrl(citation: Citation): string | undefined {
  return citation.doi ? `https://doi.org/${citation.doi}` : undefined;
}

function pubmedUrl(citation: Citation): string | undefined {
  return citation.pmid
    ? `https://pubmed.ncbi.nlm.nih.gov/${citation.pmid}/`
    : undefined;
}

/** Preferred external link: DOI first, PubMed as fallback. */
export function citationUrl(citation: Citation): string | undefined {
  return doiUrl(citation) ?? pubmedUrl(citation);
}
