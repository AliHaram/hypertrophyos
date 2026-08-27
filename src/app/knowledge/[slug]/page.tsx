import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EvidenceChip } from "@/components/evidence/evidence-chip";
import { Breadcrumbs } from "@/components/shell/breadcrumbs";
import { ConceptBody } from "@/components/knowledge/mdx";
import {
  getAllConcepts,
  getConcept,
  getConceptCitations,
} from "@/lib/content/concepts";
import { CATEGORY_META } from "@/lib/content/schema";
import { citationUrl } from "@/lib/evidence/types";
import { Page } from "@/components/shell/page";

export function generateStaticParams() {
  return getAllConcepts().map((concept) => ({ slug: concept.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const concept = getConcept(slug);
  if (!concept) return {};

  return {
    title: concept.title,
    description: concept.shortDefinition,
  };
}

export default async function ConceptPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const concept = getConcept(slug);

  if (!concept) notFound();

  const citations = getConceptCitations(slug);
  const related = getAllConcepts().filter((candidate) =>
    concept.related.includes(candidate.slug),
  );

  return (
    <Page>
      <Breadcrumbs
        pathname="/knowledge/[slug]"
        leafLabel={concept.title}
        interstitial={CATEGORY_META[concept.category].label}
      />

      <header className="mt-6 border-b border-border pb-8">
        <h1 className="mt-2 font-prose text-4xl font-semibold tracking-tight sm:text-5xl">
          {concept.title}
        </h1>
        <p className="prose-concept mt-4 text-lg text-muted-foreground">
          {concept.shortDefinition}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <EvidenceChip grade={concept.evidenceGrade} />
          <span className="font-mono text-ui-2xs uppercase tracking-eyebrow text-muted-foreground">
            {concept.readingMinutes} min read
          </span>
        </div>
      </header>

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <article>
          <ConceptBody slug={concept.slug} source={concept.body} />
        </article>

        <aside className="space-y-8 lg:sticky lg:top-10 lg:self-start">
          {citations.length > 0 && (
            <section>
              <h2 className="eyebrow mb-3">
                References ({citations.length})
              </h2>
              <ol className="space-y-3">
                {citations.map((citation) => {
                  const url = citationUrl(citation);
                  return (
                    <li key={citation.id} className="text-xs leading-relaxed">
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-foreground transition-colors hover:text-text-strong"
                      >
                        <span className="font-medium">
                          {citation.authors} ({citation.year})
                        </span>
                        <span className="block text-muted-foreground">
                          {citation.journal}
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ol>
              <Link
                href="/citations"
                className="mt-4 inline-block font-mono text-ui-2xs uppercase tracking-eyebrow text-text-strong hover:underline"
              >
                Full bibliography →
              </Link>
            </section>
          )}

          {related.length > 0 && (
            <section>
              <h2 className="eyebrow mb-3">Read next</h2>
              <ul className="space-y-2.5">
                {related.map((candidate) => (
                  <li key={candidate.slug}>
                    <Link
                      href={`/knowledge/${candidate.slug}`}
                      className="group flex items-start gap-2 text-sm transition-colors hover:text-text-strong"
                    >
                      <EvidenceChip
                        grade={candidate.evidenceGrade}
                        showLabel={false}
                        className="mt-0.5"
                      />
                      <span>{candidate.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </Page>
  );
}
