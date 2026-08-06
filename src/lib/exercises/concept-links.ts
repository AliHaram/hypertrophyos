import { getConcept } from "@/lib/content/concepts";

/**
 * The concepts an exercise page's claims rest on.
 *
 * Derived from the *fields* an exercise carries rather than written per
 * exercise. Every entry in the library makes the same five kinds of claim —
 * where the resistance peaks, what the muscle length is at that peak, how the
 * involvement was coded, what the failure protocol is, what the SFR is — so the
 * mapping is one declaration rather than eight, and adding an exercise cannot
 * forget to link its own reasoning.
 *
 * Hardcoded in one specific sense: the field-to-concept association is written
 * here, because nothing in the data expresses it. It is not hardcoded per
 * exercise, which is the failure mode that matters — a per-exercise list would
 * drift the moment a concept was renamed or a field was added.
 *
 * Slugs are resolved at render time, and an unresolved one is shown as
 * outstanding rather than dropped. A page that quietly omits the concept behind
 * its own failure protocol looks complete while being incomplete, which is the
 * failure the orphaned-term register exists to prevent everywhere else.
 */

interface ConceptDependency {
  /** The exercise field whose claim this concept underwrites. */
  field: string;
  slug: string;
  /** Why this page depends on that concept, in one line. */
  because: string;
  /** Set when the concept has not been written yet. */
  plannedFor?: string;
}

const DEPENDENCIES: readonly ConceptDependency[] = [
  {
    field: "Resistance profile",
    slug: "resistance-profile",
    because:
      "The curve, its peak position, and the claim that where a movement is hardest determines what it trains.",
  },
  {
    field: "Muscle involvement",
    slug: "volume-landmarks",
    because:
      "What a counted set means, and why fractional involvement is coded in three tiers rather than as a free weight.",
  },
  {
    field: "Stimulus-to-fatigue rating",
    slug: "stimulus-to-fatigue-ratio",
    because:
      "The framework the 1–5 rating expresses, and why it is a judgement rather than a measurement.",
  },
  {
    field: "Peak tension",
    slug: "mechanical-tension",
    because:
      "Why tension through a range is the stimulus the resistance profile is describing at all.",
  },
  {
    field: "Failure protocol",
    slug: "proximity-to-failure",
    because:
      "How close to failure a set should be taken, and what the cost of the last rep actually is.",
    plannedFor: "Phase 3",
  },
];

export interface ResolvedDependency extends ConceptDependency {
  title: string | undefined;
  written: boolean;
}

/**
 * Resolves each dependency against the written corpus.
 *
 * Unwritten concepts come back with `written: false` and keep their phase, so
 * the page can say what it is missing instead of hiding the gap.
 */
export function conceptDependencies(): readonly ResolvedDependency[] {
  return DEPENDENCIES.map((dependency) => {
    const concept = getConcept(dependency.slug);
    return {
      ...dependency,
      title: concept?.title,
      written: concept !== undefined,
    };
  });
}
