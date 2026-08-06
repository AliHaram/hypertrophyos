import { ArrowLeft, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { getCitationBacklinks } from "@/lib/content/concepts";
import { ALL_CITATIONS } from "@/lib/evidence/citations";
import { citationUrl } from "@/lib/evidence/types";

export const metadata: Metadata = {
  title: "Bibliography",
  description:
    "Every paper cited in the knowledge layer, with its reported finding and a resolvable DOI.",
};

export default function CitationsPage() {
  const backlinks = getCitationBacklinks();
  const sorted = [...ALL_CITATIONS].sort((a, b) => b.year - a.year);

  return (
    <main id="main" className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-16">
      <Link
        href="/knowledge"
        className="eyebrow inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3" aria-hidden="true" />
        Knowledge
      </Link>

      <header className="mt-6 border-b border-border pb-8">
        <h1 className="font-prose text-4xl font-semibold tracking-tight sm:text-5xl">
          Bibliography
        </h1>
        <p className="prose-concept mt-4 text-lg text-muted-foreground">
          Every paper cited in the knowledge layer. Each was checked against
          PubMed or the publisher before it was used — if a claim in this app
          has no citation, that is deliberate, and the claim is graded
          accordingly rather than propped up by an invented reference.
        </p>
        <p className="mt-4 font-mono text-xs uppercase tracking-eyebrow text-muted-foreground">
          {sorted.length} references
        </p>
      </header>

      <ol className="mt-10 space-y-8">
        {sorted.map((citation) => {
          const url = citationUrl(citation);
          const citing = backlinks.get(citation.id) ?? [];

          return (
            <li
              key={citation.id}
              className="border-b border-border/60 pb-8 last:border-0"
            >
              <p className="eyebrow">{citation.design.replace(/-/g, " ")}</p>
              <h2 className="mt-2 font-prose text-lg font-semibold leading-snug">
                {url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="transition-colors hover:text-text-strong"
                  >
                    {citation.title}
                  </a>
                ) : (
                  citation.title
                )}
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {citation.authors} ({citation.year}) · {citation.journal}
              </p>
              <p className="mt-3 max-w-3xl border-l-2 border-border pl-4 font-prose text-prose-sm leading-relaxed text-foreground">
                {citation.keyFinding}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                {url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 font-mono text-ui-2xs text-text-strong hover:underline"
                  >
                    <ExternalLink className="size-3" aria-hidden="true" />
                    {citation.doi ? `doi:${citation.doi}` : `PMID ${citation.pmid}`}
                  </a>
                )}
                {citing.length > 0 && (
                  <p className="flex flex-wrap items-center gap-x-2 font-mono text-ui-2xs text-muted-foreground">
                    <span>Cited in</span>
                    {citing.map((concept, index) => (
                      <span key={concept.slug}>
                        <Link
                          href={`/knowledge/${concept.slug}`}
                          className="text-foreground hover:text-text-strong hover:underline"
                        >
                          {concept.title}
                        </Link>
                        {index < citing.length - 1 && ","}
                      </span>
                    ))}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
