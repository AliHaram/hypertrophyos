import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EvidenceMark } from "@/components/evidence/evidence-mark";
import { Breadcrumbs } from "@/components/shell/breadcrumbs";
import { Page } from "@/components/shell/page";
import { glossaryIndex } from "@/lib/content/concepts";
import { type Appearance, buildAppearances } from "@/lib/content/appearances";
import type { GlossaryEntry } from "@/lib/content/glossary";
import { allOrphanedTerms } from "@/lib/content/orphaned-terms";
import { EVIDENCE_GRADES, type EvidenceGrade, EVIDENCE_GRADE_META } from "@/lib/evidence/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Glossary",
  description:
    "Every defined term in the app, what it means, how well supported it is, and where it is used.",
};

/**
 * The glossary index.
 *
 * Every alias, not every concept. A reader who met "MEV" in a table and wants
 * to know what it was does not know it belongs to a concept called "Volume
 * landmarks", so an index of concept titles would not answer the question they
 * arrived with. Each alias is listed on its own line and resolves to its owner.
 *
 * Filtering is a search param, rendered on the server, for the reasons the
 * exercise library's is: it works without JavaScript, survives a reload, and
 * produces a URL someone can send to somebody else.
 */

/** The one interesting sort decision: aliases sort as a reader reads them. */
const collator = new Intl.Collator("en", { sensitivity: "base" });

interface Row {
  alias: string;
  display: string;
  entry: GlossaryEntry;
  /** True when the alias is the concept's own title rather than a synonym. */
  canonical: boolean;
  appears: readonly Appearance[];
}

function readGrade(
  value: string | string[] | undefined,
): EvidenceGrade | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return (EVIDENCE_GRADES as readonly string[]).includes(trimmed)
    ? (trimmed as EvidenceGrade)
    : undefined;
}

export default async function GlossaryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const grade = readGrade(params.grade);

  const index = glossaryIndex();
  const appearances = buildAppearances(index);

  const rows: Row[] = index.aliases
    .map(({ alias, display, entry }) => ({
      alias,
      display,
      entry,
      canonical: alias === entry.title.toLowerCase(),
      appears: appearances.get(entry.slug) ?? [],
    }))
    .sort((a, b) => collator.compare(a.alias, b.alias));

  const visible = grade
    ? rows.filter((row) => row.entry.evidenceGrade === grade)
    : rows;

  const orphans = [...allOrphanedTerms()].sort((a, b) =>
    collator.compare(a.term, b.term),
  );

  return (
    <Page>
      <Breadcrumbs pathname="/glossary" />

      <header className="mt-6 border-b border-border pb-8">
        <h1 className="font-prose text-4xl font-semibold tracking-tight sm:text-5xl">
          Glossary
        </h1>
        <p className="prose-concept mt-4 text-lg text-muted-foreground">
          Every term the app defines, including the abbreviations and synonyms
          that resolve to the same concept. The grade is the grade of that
          concept&rsquo;s central claim, not of the definition — a well-defined
          term can still describe something the evidence is split on.
        </p>
        <p className="mt-4 font-mono text-xs uppercase tracking-eyebrow text-muted-foreground">
          {rows.length} terms · {index.bySlug.size} concepts
        </p>
      </header>

      <nav
        aria-label="Filter by evidence grade"
        className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2"
      >
        <h2 className="eyebrow">Grade</h2>
        {EVIDENCE_GRADES.map((candidate) => {
          const count = rows.filter(
            (row) => row.entry.evidenceGrade === candidate,
          ).length;
          const selected = grade === candidate;

          return (
            <Link
              key={candidate}
              href={selected ? "/glossary" : `/glossary?grade=${candidate}`}
              aria-current={selected ? "true" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-xs text-sm transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-muted",
                selected
                  ? "font-medium text-text-strong"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <EvidenceMark grade={candidate} />
              <span className="font-mono tabular-nums">{count}</span>
            </Link>
          );
        })}
        {grade && (
          <Link
            href="/glossary"
            className="inline-flex min-h-11 items-center font-mono text-ui-2xs uppercase tracking-eyebrow text-text-strong underline underline-offset-2"
          >
            Clear
          </Link>
        )}
      </nav>

      {visible.length > 0 ? (
        /*
          One alphabetical sequence, with two kinds of entry — the shape a
          printed index has for good reason. A synonym gets a cross-reference
          line, not a second copy of the definition: "DOMS" and "cell swelling"
          both belong to one concept, and repeating four hundred characters
          under each alias turns a page you scan into a page you scroll.
        */
        <dl className="mt-8 divide-y divide-border border-y border-border">
          {visible.map((row) => (
            <div
              key={row.alias}
              className="grid gap-x-8 gap-y-2 py-5 sm:grid-cols-[14rem_minmax(0,1fr)]"
            >
              <dt className="min-w-0">
                <Link
                  href={`/knowledge/${row.entry.slug}`}
                  className={cn(
                    "underline underline-offset-2",
                    row.canonical
                      ? "font-prose text-lg font-semibold leading-snug text-text-strong"
                      : "font-prose text-lg leading-snug text-foreground",
                  )}
                >
                  {row.display}
                </Link>
              </dt>
              <dd className="min-w-0">
                {row.canonical ? (
                  <>
                    <EvidenceMark grade={row.entry.evidenceGrade} />
                    <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
                      {row.entry.shortDefinition}
                    </p>
                    <Appears where={row.appears} />
                  </>
                ) : (
                  /*
                    The grade appears on cross-references too. Without it a
                    grade-filtered view would show a bare pointer on most rows
                    and the filter's effect would be invisible on exactly the
                    entries a reader is most likely to have arrived at.
                  */
                  <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm leading-relaxed text-muted-foreground">
                    <EvidenceMark grade={row.entry.evidenceGrade} />
                    <span className="italic">see</span>
                    <Link
                      href={`/knowledge/${row.entry.slug}`}
                      className="text-text-strong underline underline-offset-2"
                    >
                      {row.entry.title}
                    </Link>
                  </p>
                )}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <EmptyState grade={grade} />
      )}

      <section className="mt-16 border-t border-border pt-8">
        <h2 className="font-prose text-2xl font-semibold leading-tight">
          Used but not yet defined
        </h2>
        <p className="prose-concept mt-3 max-w-2xl text-sm text-muted-foreground">
          These appear in the app&rsquo;s own writing and have no concept behind
          them yet. They are listed rather than hidden, with the phase each is
          due in — the build fails if one is still missing when that phase
          closes. Until then they read as ordinary prose: no underline, no
          definition, and no pretence that one exists.
        </p>
        <ul className="mt-6 divide-y divide-border border-y border-border">
          {orphans.map((orphan) => (
            <li
              key={orphan.term}
              className="grid gap-x-8 gap-y-1 py-4 sm:grid-cols-[14rem_minmax(0,1fr)]"
            >
              <span className="font-prose text-lg font-semibold leading-snug text-muted-foreground">
                {orphan.term}
              </span>
              <span className="min-w-0">
                <span className="font-mono text-ui-2xs uppercase tracking-eyebrow text-text-strong">
                  Due {orphan.resolveBy.replace("-", " ")}
                </span>
                <span className="mt-1 block max-w-prose text-sm leading-relaxed text-muted-foreground">
                  {orphan.reason}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </Page>
  );
}

/**
 * Where a term is used, derived from the same pass that annotates it.
 *
 * A term with nowhere to go is not an error — a concept can define vocabulary
 * that no other page has needed yet — but it is worth saying out loud rather
 * than rendering an empty row the reader has to interpret.
 */
function Appears({ where }: { where: readonly Appearance[] }) {
  if (where.length === 0) {
    return (
      <p className="mt-2 font-mono text-ui-2xs uppercase tracking-eyebrow text-muted-foreground">
        Not yet used outside its own concept
      </p>
    );
  }

  return (
    <p className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-ui-2xs uppercase tracking-eyebrow text-muted-foreground">
      <span>Used in</span>
      {where.map((appearance) => (
        <Link
          key={appearance.href}
          href={appearance.href}
          className="text-foreground underline underline-offset-2 hover:text-text-strong"
        >
          {appearance.label}
        </Link>
      ))}
    </p>
  );
}

function EmptyState({ grade }: { grade: EvidenceGrade | undefined }) {
  return (
    <div className="mt-8 border-y border-border py-14 text-center">
      <p className="font-prose text-lg font-semibold text-foreground">
        No term is graded {grade ? EVIDENCE_GRADE_META[grade].label : "that"}.
      </p>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        Grades describe the concept a term belongs to, and the corpus is small
        enough that whole grades can be empty. That is a gap in what has been
        written, not a filter that failed.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-3">
        <Link
          href="/glossary"
          className="inline-flex min-h-11 items-center gap-2 text-sm text-text-strong underline underline-offset-2"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Show every term
        </Link>
        <Link
          href="/knowledge"
          className="inline-flex min-h-11 items-center text-sm text-text-strong underline underline-offset-2"
        >
          Read the knowledge layer
        </Link>
      </div>
    </div>
  );
}
