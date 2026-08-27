import { ExternalLink } from "lucide-react";
import Link from "next/link";

import { getCitation } from "@/lib/evidence/citations";
import { citationUrl } from "@/lib/evidence/types";

/**
 * Inline reference to a paper.
 *
 * Expands into the full record and, crucially, the paper's own reported
 * finding — so a reader can check what the study actually said against the
 * claim it is being used to support, without leaving the page.
 *
 * That was previously a hover card wrapped around a link to the DOI, which
 * meant the crucial part did not exist on a phone: a tap followed the link and
 * the reader arrived at a publisher's abstract having never seen the finding
 * the app was resting on. Now the marker is a button over a native popover,
 * and the DOI is a link *inside* it. Going to the paper takes one more tap and
 * is now a decision rather than an accident.
 *
 * Two routes out, deliberately: the paper itself, and the bibliography entry,
 * which lists everything else in the app resting on the same source.
 */
export function CitationRef({
  id,
  occurrence = 1,
}: {
  id: string;
  /**
   * Which appearance of this citation on the page this is, counting from one.
   *
   * A paper cited three times in one essay would otherwise produce three
   * elements sharing an id, which breaks `popovertarget` — the second and
   * third markers would open the first one's panel. The caller counts, because
   * only the caller knows what "the page" is.
   */
  occurrence?: number;
}) {
  const citation = getCitation(id);

  if (!citation) {
    // The content loader throws on unknown ids at build time, so this only
    // appears if a component is passed an id outside the MDX pipeline.
    return null;
  }

  const url = citationUrl(citation);
  const panelId = `citation-${id}-${occurrence}`;
  const anchorName = `--citation-${id}-${occurrence}`;
  const firstAuthor = citation.authors.split(",")[0];

  return (
    <>
      <button
        type="button"
        popoverTarget={panelId}
        aria-details={panelId}
        // Sizing and the baseline lift live in .citation-ref: full superscript
        // at this density opened visible gaps in the leading of every
        // paragraph containing a reference.
        className="citation-ref glossary-term"
        style={{ "--glossary-anchor": anchorName } as React.CSSProperties}
      >
        {firstAuthor} {citation.year}
        <span className="glossary-term-hint sr-only"> — show this reference</span>
      </button>

      <span
        popover="auto"
        id={panelId}
        className="glossary-panel citation-panel"
        style={{ "--glossary-anchor": anchorName } as React.CSSProperties}
      >
        <span className="eyebrow block">{citation.design.replace(/-/g, " ")}</span>
        <span className="glossary-panel-title mt-2 block">{citation.title}</span>
        <span className="glossary-panel-body">
          {citation.authors} · {citation.journal}
        </span>
        {/*
          The paper's own reported result, kept separate from the app's reading
          of it by a rule. The distinction is the point of showing it at all.
        */}
        <span className="citation-panel-finding">{citation.keyFinding}</span>
        <span className="citation-panel-links">
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="glossary-panel-link inline-flex items-center gap-1.5"
            >
              <ExternalLink className="size-3" aria-hidden="true" />
              {citation.doi ? `doi:${citation.doi}` : `PMID ${citation.pmid}`}
            </a>
          )}
          <Link href={`/citations#${id}`} className="glossary-panel-link">
            What else cites this
          </Link>
        </span>
      </span>
    </>
  );
}
