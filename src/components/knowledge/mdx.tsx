import { MDXRemote } from "next-mdx-remote/rsc";
import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

import { AnnualGainChart } from "@/components/charts/annual-gain-chart";
import { DoseResponseChart } from "@/components/charts/dose-response-chart";
import { VolumeLandmarkScale } from "@/components/charts/volume-landmark-scale";
import { CitationRef } from "@/components/evidence/citation-ref";
import { Claim } from "@/components/evidence/claim";
import { EvidenceChip } from "@/components/evidence/evidence-chip";
import { Term } from "@/components/evidence/term";
import { Uncertainty } from "@/components/evidence/uncertainty";
import { DoubleProgressionDemo } from "@/components/knowledge/double-progression-demo";
import { OverloadLeversModule } from "@/components/knowledge/overload-levers-module";

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
    <div className="my-6 overflow-x-auto">
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
  Term,
  Uncertainty,
  EvidenceChip,

  // Purpose-built modules
  AnnualGainChart,
  DoseResponseChart,
  VolumeLandmarkScale,
  OverloadLeversModule,
  DoubleProgressionDemo,
};

export function ConceptBody({ source }: { source: string }) {
  return <MDXRemote source={source} components={components} />;
}
