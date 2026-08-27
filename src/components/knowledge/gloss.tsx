import { Fragment, type ReactNode } from "react";

import { GlossaryTerm } from "@/components/knowledge/glossary-term";
import { glossaryIndex } from "@/lib/content/concepts";
import {
  type GlossaryPassOptions,
  createGlossaryPass,
} from "@/lib/content/glossary";

/**
 * The ambient glossary for prose that is not MDX.
 *
 * Exercise pages carry as much explanatory text as concept pages do — setup
 * cues, failure-protocol rationales, the tradeoffs between one movement and
 * another — and none of it goes through a markdown pipeline. Without this, the
 * glossary would stop at the edge of the knowledge layer, which is the
 * opposite of ambient.
 *
 * Same index and the same matching rules as the remark pass, so a term behaves
 * identically wherever it appears. Two implementations of the same rules would
 * drift, and the reader would learn that the underlining means different
 * things in different places.
 */
export type Gloss = (text: string) => ReactNode;

/**
 * One gloss per page.
 *
 * The returned function is stateful — it carries the seen-set that makes
 * "first occurrence" mean the page rather than the paragraph — so it must be
 * created once at the top of a route and used for every run of prose on it, in
 * the order the reader meets them.
 *
 * **The output contains a `<button>`, so it can never be placed inside an
 * `<a>`.** Nesting interactive content is invalid HTML, and browsers recover
 * from it by reparenting nodes, which breaks the popover's relationship to its
 * trigger as well as the keyboard order. Prose that lives inside a link — the
 * summary lines on an index page, for instance — is left unglossed.
 */
export function createGloss(options: GlossaryPassOptions = {}): Gloss {
  const index = glossaryIndex();
  const pass = createGlossaryPass(index, options);

  return function gloss(text: string): ReactNode {
    const segments = pass.segment(text);

    return segments.map((segment, position) =>
      segment.kind === "term" ? (
        <GlossaryTerm
          key={`${segment.entry.slug}-${position}`}
          term={segment.text}
          entry={segment.entry}
        />
      ) : (
        <Fragment key={`text-${position}`}>{segment.text}</Fragment>
      ),
    );
  };
}
