import Link from "next/link";

import { EvidenceMark } from "@/components/evidence/evidence-mark";
import type { GlossaryEntry } from "@/lib/content/glossary";

/**
 * A defined term, expanded in place.
 *
 * Built on the native `popover` API rather than a hover card, because hover is
 * not an interaction a phone has. The previous implementation opened on
 * pointer-over, which meant that on the viewport most of this product's readers
 * are actually holding, the definitions did not exist. That is the same defect
 * the nav tooltips had.
 *
 * `popovertarget` gives click-to-open, Escape-to-dismiss, click-outside-to-
 * dismiss, top-layer stacking, and focus that moves into the panel and back —
 * from the browser, with no JavaScript of ours and none shipped to the client.
 * It works before hydration and it works with hydration switched off. That
 * matches how the rest of this app handles disclosure: a real `<details>` for
 * the filter rail, a real range input for the sliders.
 *
 * The panel is phrasing content only — spans and one anchor. It renders inline
 * inside a paragraph, and a `<p>` or a `<div>` in there would be invalid HTML
 * that browsers silently reparent, moving the panel out of the paragraph and
 * away from its anchor.
 */
export function GlossaryTerm({
  term,
  entry,
}: {
  /** The text as it appears in the prose, casing preserved. */
  term: string;
  entry: GlossaryEntry;
}) {
  /*
    One id per concept per page. The pass annotates a concept's first
    occurrence and no others, so this cannot collide — and if that rule ever
    broke, the duplicate ids would break `aria-details` in a way the axe sweep
    reports rather than failing silently.
  */
  const panelId = `glossary-${entry.slug}`;
  /*
    The anchor is passed as a custom property rather than as `anchor-name`
    directly, so the stylesheet keeps ownership of *whether* anchoring applies
    — it only does above 48rem and only where the browser supports it — while
    the component supplies the one thing CSS cannot know, which pair this is.
  */
  const anchorName = `--glossary-${entry.slug}`;

  return (
    <>
      <button
        type="button"
        popoverTarget={panelId}
        aria-details={panelId}
        className="glossary-term"
        style={{ "--glossary-anchor": anchorName } as React.CSSProperties}
      >
        {term}
        {/*
          The visible term stays the start of the accessible name, so the
          control still matches what a reader would say out loud. The suffix is
          what makes it a control rather than an oddly underlined word — a
          button whose whole name is "tension" announces no affordance at all.
        */}
        <span className="glossary-term-hint sr-only"> — show definition</span>
      </button>

      <span
        popover="auto"
        id={panelId}
        className="glossary-panel"
        style={{ "--glossary-anchor": anchorName } as React.CSSProperties}
      >
        <span className="glossary-panel-head">
          <span className="glossary-panel-title">{entry.title}</span>
          <EvidenceMark grade={entry.evidenceGrade} />
        </span>
        <span className="glossary-panel-body">{entry.shortDefinition}</span>
        <Link href={`/knowledge/${entry.slug}`} className="glossary-panel-link">
          Read the concept
        </Link>
      </span>
    </>
  );
}
