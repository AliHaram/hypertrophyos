import { ExternalLink } from "lucide-react";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { getCitation } from "@/lib/evidence/citations";
import { citationUrl } from "@/lib/evidence/types";
import { cn } from "@/lib/utils";

/**
 * Inline reference to a paper.
 *
 * Expands on hover or focus into the full record and, crucially, the paper's
 * own reported finding — so the reader can check what the study actually said
 * against the claim it is being used to support, without leaving the page.
 */
export function CitationRef({
  id,
  className,
}: {
  id: string;
  className?: string;
}) {
  const citation = getCitation(id);

  if (!citation) {
    // The content loader throws on unknown ids at build time, so this only
    // appears if a component is passed an id outside the MDX pipeline.
    return null;
  }

  const url = citationUrl(citation);

  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className={cn(
            "mx-0.5 inline-flex items-baseline gap-0.5 rounded-sm font-mono text-[0.7em] align-super",
            "text-primary underline decoration-dotted underline-offset-2",
            "hover:decoration-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            className,
          )}
        >
          {citation.authors.split(",")[0]} {citation.year}
        </a>
      </HoverCardTrigger>
      <HoverCardContent side="top" className="w-96 font-sans">
        <p className="eyebrow mb-2">{citation.design.replace(/-/g, " ")}</p>
        <p className="text-sm font-medium leading-snug">{citation.title}</p>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {citation.authors} · {citation.journal}
        </p>
        <p className="mt-3 border-t border-border pt-3 text-xs leading-relaxed text-foreground/85">
          {citation.keyFinding}
        </p>
        {url && (
          <p className="mt-3 flex items-center gap-1 font-mono text-[0.6875rem] text-primary">
            <ExternalLink className="size-3" aria-hidden="true" />
            {citation.doi ? `doi:${citation.doi}` : `PMID ${citation.pmid}`}
          </p>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
