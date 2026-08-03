import type { Metadata } from "next";
import Link from "next/link";

import { EvidenceChip } from "@/components/evidence/evidence-chip";
import { getAllConcepts } from "@/lib/content/concepts";
import { CATEGORY_META, CONCEPT_CATEGORIES } from "@/lib/content/schema";

export const metadata: Metadata = {
  title: "Knowledge",
  description:
    "The mechanisms of muscle growth, what the evidence actually supports, and where it does not.",
};

/**
 * Topics with a written concept still to come.
 *
 * Listed rather than hidden. A knowledge layer that quietly omits the sections
 * it has not written yet is indistinguishable from one that thinks it is
 * complete, and the reader has no way to tell which they are looking at.
 */
const PLANNED: Record<string, readonly string[]> = {
  execution: [
    "Proximity to failure, RIR and RPE",
    "The calibration problem",
    "Velocity as a failure-proximity signal",
  ],
  programming: [
    "Frequency",
    "Periodization and mesocycle structure",
    "Deloads",
    "Exercise order",
    "Rest intervals",
    "Specificity",
    "The recovery and adaptation curve",
  ],
};

export default function KnowledgeIndex() {
  const concepts = getAllConcepts();

  return (
    <main id="main" className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-16">
      <header className="border-b border-border pb-8">
        <p className="eyebrow">The knowledge layer</p>
        <h1 className="mt-2 font-prose text-4xl font-semibold tracking-tight sm:text-5xl">
          What makes a muscle grow
        </h1>
        <p className="prose-concept mt-4 text-lg text-muted-foreground">
          Read in order. Mechanisms first, because the levers only make sense
          once you know what they act on. Every substantive claim carries an
          evidence grade, and the contested ones say where they might be wrong.
        </p>
      </header>

      <div className="mt-12 space-y-14">
        {CONCEPT_CATEGORIES.map((category) => {
          const inCategory = concepts.filter(
            (concept) => concept.category === category,
          );
          const planned = PLANNED[category] ?? [];

          if (inCategory.length === 0 && planned.length === 0) return null;

          return (
            <section key={category}>
              <h2 className="font-prose text-2xl font-semibold leading-tight">
                {CATEGORY_META[category].label}
              </h2>
              <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {CATEGORY_META[category].blurb}
              </p>

              {inCategory.length > 0 && (
                <ul className="mt-6 divide-y divide-border border-y border-border">
                  {inCategory.map((concept) => (
                    <li key={concept.slug}>
                      <Link
                        href={`/knowledge/${concept.slug}`}
                        className="group flex gap-4 py-5 transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-text-muted sm:gap-6"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                            <h3 className="font-prose text-lg font-semibold leading-snug transition-colors group-hover:text-text-strong">
                              {concept.title}
                            </h3>
                            <EvidenceChip grade={concept.evidenceGrade} />
                          </div>
                          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                            {concept.shortDefinition}
                          </p>
                        </div>
                        <span className="shrink-0 pt-1 font-mono text-ui-2xs tabular-nums text-muted-foreground">
                          {concept.readingMinutes} min
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              {planned.length > 0 && (
                <div className="mt-5 rounded-md border border-dashed border-border p-4">
                  <p className="eyebrow mb-2.5">Not yet written</p>
                  <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
                    {planned.map((topic) => (
                      <li
                        key={topic}
                        className="text-sm text-muted-foreground/80"
                      >
                        {topic}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          );
        })}
      </div>

      <footer className="mt-16 border-t border-border pt-8">
        <Link
          href="/knowledge/citations"
          className="font-mono text-xs uppercase tracking-eyebrow text-text-strong hover:underline"
        >
          Bibliography →
        </Link>
      </footer>
    </main>
  );
}
