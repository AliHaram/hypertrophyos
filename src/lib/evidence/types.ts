import { z } from "zod";

/**
 * Evidence grading.
 *
 * The grade describes the state of the *literature*, not our enthusiasm. A
 * claim can be practically useful and still be `mixed` — those are independent
 * axes, and conflating them is how fitness content goes wrong.
 */
export const evidenceGradeSchema = z.enum(["strong", "mixed", "weak"]);
export type EvidenceGrade = z.infer<typeof evidenceGradeSchema>;

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
      "Plausible and often mechanistically supported, but the trials disagree, the effect is small relative to its confidence interval, or the evidence is mechanistic rather than outcome-based.",
  },
  weak: {
    label: "Weak",
    short: "W",
    definition:
      "Commonly repeated in gyms and in fitness media, but poorly supported — contradicted by controlled data, untested, or resting entirely on inference.",
  },
};

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

export function doiUrl(citation: Citation): string | undefined {
  return citation.doi ? `https://doi.org/${citation.doi}` : undefined;
}

export function pubmedUrl(citation: Citation): string | undefined {
  return citation.pmid
    ? `https://pubmed.ncbi.nlm.nih.gov/${citation.pmid}/`
    : undefined;
}

/** Preferred external link: DOI first, PubMed as fallback. */
export function citationUrl(citation: Citation): string | undefined {
  return doiUrl(citation) ?? pubmedUrl(citation);
}

/** "Schoenfeld et al. (2017)" — the inline form used in prose. */
export function formatInline(citation: Citation): string {
  return `${citation.authors} (${citation.year})`;
}
