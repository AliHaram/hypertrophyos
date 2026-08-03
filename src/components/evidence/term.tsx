import Link from "next/link";

import { EvidenceChip } from "@/components/evidence/evidence-chip";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { lookupTerm } from "@/lib/content/concepts";
import { cn } from "@/lib/utils";

/**
 * The ambient glossary.
 *
 * Wraps any technical term anywhere in the app — concept prose, the logger,
 * exercise notes — and expands it into its definition and evidence grade. The
 * education layer is not a tab you visit once; it is available wherever the
 * jargon appears.
 *
 * Rendered as a subtle dotted underline rather than a link colour: on a page
 * where most sentences contain a defined term, link-blue everywhere would be
 * unreadable.
 */
export function Term({
  children,
  name,
  className,
}: {
  children: React.ReactNode;
  /** Overrides the lookup key when the visible text is inflected. */
  name?: string;
  className?: string;
}) {
  const key = name ?? (typeof children === "string" ? children : "");
  const entry = lookupTerm(key);

  if (!entry) {
    // An undefined term renders as plain text. Failing loudly here would break
    // reading over a glossary gap, which is the wrong trade in prose.
    return <>{children}</>;
  }

  return (
    <HoverCard>
      <HoverCardTrigger
        delay={150}
        closeDelay={100}
        className={cn(
          "glossary-term cursor-help border-b border-dotted border-muted-foreground/60 bg-transparent p-0 text-left",
          "hover:border-text-muted hover:text-text-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-muted",
          className,
        )}
        aria-label={`${key}: show definition`}
      >
        {children}
      </HoverCardTrigger>
      <HoverCardContent side="top" className="w-80 font-sans">
        <div className="flex items-start justify-between gap-3">
          <p className="font-prose text-base font-semibold leading-tight">
            {entry.title}
          </p>
          <EvidenceChip grade={entry.evidenceGrade} showLabel={false} />
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {entry.shortDefinition}
        </p>
        <Link
          href={`/knowledge/${entry.slug}`}
          className="mt-3 inline-block font-mono text-ui-2xs uppercase tracking-eyebrow text-text-strong hover:underline"
        >
          Read the concept →
        </Link>
      </HoverCardContent>
    </HoverCard>
  );
}
