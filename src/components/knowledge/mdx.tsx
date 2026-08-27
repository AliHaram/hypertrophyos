import { MDXRemote } from "next-mdx-remote/rsc";
import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

import { AnnualGainChart } from "@/components/charts/annual-gain-chart";
import { DoseResponseChart } from "@/components/charts/dose-response-chart";
import { VolumeLandmarkScale } from "@/components/charts/volume-landmark-scale";
import { CitationRef } from "@/components/evidence/citation-ref";
import { Claim } from "@/components/evidence/claim";
import { EvidenceChip } from "@/components/evidence/evidence-chip";
import { Uncertainty } from "@/components/evidence/uncertainty";
import { GlossaryTerm } from "@/components/knowledge/glossary-term";
import { DoubleProgressionDemo } from "@/components/knowledge/double-progression-demo";
import { OverloadLeversModule } from "@/components/knowledge/overload-levers-module";
import { PeakPositionExamples } from "@/components/knowledge/peak-position-examples";
import { ResistanceProfileComparison } from "@/components/knowledge/resistance-profile-comparison";
import { glossaryIndex } from "@/lib/content/concepts";
import { createGlossaryPass } from "@/lib/content/glossary";
import { remarkGlossary } from "@/lib/content/remark-glossary";

/**
 * Everything concept MDX can use.
 *
 * The set is deliberately small. Prose gets the structural elements it needs
 * and the evidence primitives; anything else is a component built on purpose
 * and registered here, so no concept can invent its own visual language.
 */
type El<T extends keyof React.JSX.IntrinsicElements> =
  ComponentPropsWithoutRef<T>;

const components = {
  h2: ({ children, ...props }: El<"h2">) => (
    <h2
      className="mt-12 scroll-mt-24 border-t border-border pt-8 font-prose text-2xl font-semibold leading-tight text-foreground first:mt-0 first:border-0 first:pt-0"
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: El<"h3">) => (
    <h3
      className="mt-8 scroll-mt-24 font-prose text-lg font-semibold leading-snug text-foreground"
      {...props}
    >
      {children}
    </h3>
  ),
  p: ({ children, ...props }: El<"p">) => (
    <p className="prose-concept mt-4 first:mt-0" {...props}>
      {children}
    </p>
  ),
  ul: ({ children, ...props }: El<"ul">) => (
    <ul
      className="prose-concept mt-4 list-disc space-y-2 pl-6 marker:text-muted-foreground"
      {...props}
    >
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: El<"ol">) => (
    <ol
      className="prose-concept mt-4 list-decimal space-y-2 pl-6 marker:font-mono marker:text-sm marker:text-muted-foreground"
      {...props}
    >
      {children}
    </ol>
  ),
  li: ({ children, ...props }: El<"li">) => (
    <li className="pl-1" {...props}>
      {children}
    </li>
  ),
  strong: ({ children, ...props }: El<"strong">) => (
    <strong className="font-semibold text-foreground" {...props}>
      {children}
    </strong>
  ),
  blockquote: ({ children, ...props }: El<"blockquote">) => (
    <blockquote
      className="my-6 border-l-2 border-border pl-5 font-prose text-lg italic leading-relaxed text-muted-foreground"
      {...props}
    >
      {children}
    </blockquote>
  ),
  a: ({ href, children, ...props }: El<"a">) => {
    const isInternal = typeof href === "string" && href.startsWith("/");
    if (isInternal) {
      return (
        <Link href={href} className="text-text-strong underline underline-offset-2">
          {children}
        </Link>
      );
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="text-text-strong underline underline-offset-2"
        {...props}
      >
        {children}
      </a>
    );
  },
  table: ({ children, ...props }: El<"table">) => (
    <div className="my-6 overflow-x-auto" tabIndex={0}>
      <table className="w-full border-collapse text-sm" {...props}>
        {children}
      </table>
    </div>
  ),
  th: ({ children, ...props }: El<"th">) => (
    <th
      className="border-b border-border px-3 py-2 text-left font-mono text-ui-2xs uppercase tracking-eyebrow text-muted-foreground"
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }: El<"td">) => (
    <td
      className="border-b border-border/50 px-3 py-2 align-top text-sm leading-relaxed"
      {...props}
    >
      {children}
    </td>
  ),
  hr: () => <hr className="my-10 border-border" />,

  // Evidence primitives
  Claim,
  Cite: CitationRef,
  Uncertainty,
  EvidenceChip,

  // Purpose-built modules
  AnnualGainChart,
  DoseResponseChart,
  VolumeLandmarkScale,
  OverloadLeversModule,
  DoubleProgressionDemo,
  ResistanceProfileComparison,
  PeakPositionExamples,
};

/**
 * The name the remark pass emits. Must match the key in the MDX scope below —
 * a mismatch produces "Expected component X to be defined" at render, so this
 * is one constant rather than two string literals that have to agree.
 */
const GLOSSARY_COMPONENT = "GlossaryTerm";

export function ConceptBody({
  slug,
  source,
}: {
  /** The concept being rendered. Its own terms are not linked to itself. */
  slug: string;
  source: string;
}) {
  const index = glossaryIndex();
  const pass = createGlossaryPass(index, { skipSlug: slug });

  return (
    <MDXRemote
      source={source}
      components={{
        ...components,
        /*
          The remark pass can only put strings in JSX attributes, so it emits a
          slug and this closes over the index to resolve it. Doing the lookup
          here rather than inside `GlossaryTerm` keeps that component a pure
          function of an entry, which is what lets the plain-prose path reuse it.
        */
        [GLOSSARY_COMPONENT]: ({
          term,
          slug: termSlug,
        }: {
          term: string;
          slug: string;
        }) => {
          const entry = index.bySlug.get(termSlug);
          return entry ? <GlossaryTerm term={term} entry={entry} /> : <>{term}</>;
        },
      }}
      options={{
        mdxOptions: {
          /*
            Tuple form, not `remarkGlossary({...})`. unified calls each entry as
            an attacher and uses what it returns as the transformer; handing it
            an already-built transformer means it gets called with no arguments
            and walks `undefined`.
          */
          remarkPlugins: [
            [remarkGlossary, { pass, componentName: GLOSSARY_COMPONENT }],
          ],
        },
      }}
    />
  );
}
