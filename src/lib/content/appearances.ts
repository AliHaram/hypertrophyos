import "server-only";

import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import { unified } from "unified";

import { getAllExercises } from "@/lib/exercises/library";
import { exerciseProse } from "@/lib/exercises/prose";

import { getAllConcepts } from "./concepts";
import { type GlossaryIndex, createGlossaryPass } from "./glossary";
import { remarkGlossary } from "./remark-glossary";

/**
 * Where each concept is actually referenced, derived rather than declared.
 *
 * The glossary index page claims to show where a term appears. That claim has
 * to be exact or it is worse than absent: a reader who follows it to a page
 * that does not mention the term learns not to trust the rest of the page.
 *
 * So this runs the *same* remark pass over the *same* prose, with the same
 * skip rules and the same per-page seen-set. It does not scan the markdown
 * with a regex and hope the answer is close. A term inside a heading, a code
 * span or an existing link is not annotated on the page, and so is not counted
 * here — because the code deciding both is one function.
 *
 * Parsing every concept twice per build is the cost. It is a handful of
 * milliseconds over a corpus this size, and the alternative is an index that
 * drifts from the pages it describes.
 */

export interface Appearance {
  href: string;
  label: string;
  kind: "concept" | "exercise";
}

const parser = unified().use(remarkParse).use(remarkMdx);

/**
 * Slug -> the pages that annotate it, in route order.
 *
 * Built once per process alongside the glossary index it describes.
 */
export function buildAppearances(
  index: GlossaryIndex,
): ReadonlyMap<string, readonly Appearance[]> {
  const appearances = new Map<string, Appearance[]>();

  function record(slugs: readonly string[], where: Appearance): void {
    for (const slug of slugs) {
      const list = appearances.get(slug) ?? [];
      list.push(where);
      appearances.set(slug, list);
    }
  }

  for (const concept of getAllConcepts()) {
    const pass = createGlossaryPass(index, { skipSlug: concept.slug });
    const tree = parser.parse(concept.body);
    remarkGlossary({ pass, componentName: "GlossaryTerm" })(
      tree as Parameters<ReturnType<typeof remarkGlossary>>[0],
    );

    record(pass.annotated(), {
      href: `/knowledge/${concept.slug}`,
      label: concept.title,
      kind: "concept",
    });
  }

  for (const exercise of getAllExercises()) {
    const pass = createGlossaryPass(index);
    /*
      The same runs of prose the exercise page glosses. `exerciseProse` is the
      one declaration of which fields those are, and `prose.test.ts` fails if
      the library grows a free-text field that is neither listed there nor
      explicitly excluded.

      What is *not* mechanically enforced is that the order here matches the
      page's DOM order. Both are written to reading order and they agree today;
      if they ever drift, the index would name the same set of pages but could
      attribute a term's first occurrence to a different one.
    */
    for (const run of exerciseProse(exercise)) pass.segment(run);

    record(pass.annotated(), {
      href: `/exercises/${exercise.id}`,
      label: exercise.name,
      kind: "exercise",
    });
  }

  return appearances;
}
