import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/shell/breadcrumbs";
import { getCitationBacklinks } from "@/lib/content/concepts";
import { ALL_CITATIONS } from "@/lib/evidence/citations";
import { citationUrl } from "@/lib/evidence/types";
import { Page } from "@/components/shell/page";

export const metadata: Metadata = {
  title: "Bibliography",
  description:
    "Every paper cited in the knowledge layer, with its reported finding and a resolvable DOI.",
};

export default function CitationsPage() {
  const backlinks = getCitationBacklinks();
  const sorted = [...ALL_CITATIONS].sort((a, b) => b.year - a.year);

  return (
    <Page>
      <Breadcrumbs pathname="/citations" />

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

      {sorted.length === 0 && (
        <p className="mt-10 border-y border-border py-14 text-center font-prose text-lg text-foreground">
          The bibliography is empty. Every claim in the app is currently graded
          on reasoning rather than on a paper —{" "}
          <Link
            href="/knowledge"
            className="text-text-strong underline underline-offset-2"
          >
            the knowledge layer
          </Link>{" "}
          says which, on each one.
        </p>
      )}

      <ol className="mt-10 space-y-8">
        {sorted.map((citation) => {
          const url = citationUrl(citation);
          const citing = backlinks.get(citation.id) ?? [];

          return (
            /*
              A stable anchor per entry, so an inline reference anywhere in the
              app can point at the exact record rather than at the top of a
              bibliography the reader then has to search. `scroll-mt` keeps the
              heading clear of the sticky bar when one is followed.
            */
            <li
              key={citation.id}
              id={citation.id}
              className="scroll-mt-24 border-b border-border/60 pb-8 last:border-0"
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
                <a
                  href={`#${citation.id}`}
                  className="font-mono text-ui-2xs uppercase tracking-eyebrow text-muted-foreground hover:text-foreground"
                >
                  <span className="sr-only">Permanent link to </span>#
                  {citation.id}
                </a>
              </div>

              {/*
                The other direction. A reader arriving from a claim can see
                everything else in the app resting on the same paper — which is
                the fastest way to find out whether one source is carrying more
                weight than it should.
              */}
              <div className="mt-4 border-t border-border/60 pt-3">
                {citing.length > 0 ? (
                  <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5 font-mono text-ui-2xs uppercase tracking-eyebrow text-muted-foreground">
                    <span>Cited in</span>
                    {citing.map((concept) => (
                      <Link
                        key={concept.slug}
                        href={`/knowledge/${concept.slug}`}
                        className="text-foreground underline underline-offset-2 hover:text-text-strong"
                      >
                        {concept.title}
                      </Link>
                    ))}
                  </p>
                ) : (
                  <p className="font-mono text-ui-2xs uppercase tracking-eyebrow text-muted-foreground">
                    Verified, not yet cited
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </Page>
  );
}
