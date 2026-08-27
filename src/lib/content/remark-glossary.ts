import type { GlossaryPass } from "./glossary";

/**
 * The ambient glossary, as a remark transform.
 *
 * Runs over the mdast at build time. This is the whole reason the matching is
 * an AST pass and not a sweep over rendered HTML: the tree knows what a
 * heading is, what a code span is, and where an existing link starts and ends,
 * and a regex over markup knows none of those. A sweep would annotate inside
 * `<a href>` values, inside code samples, and inside the text of links that
 * already point somewhere else.
 *
 * Emits `mdxJsxTextElement` nodes naming a component the MDX scope provides,
 * so nothing here renders anything — it rewrites the tree and lets the normal
 * component mapping do the rest.
 */

/**
 * The subset of mdast this walker needs, declared structurally.
 *
 * The real types live in `@types/mdast`, which is not a dependency and would
 * be one more thing to keep in step with the MDX pipeline's own version. Three
 * fields is the entire contract being relied on.
 */
interface MdastNode {
  type: string;
  value?: string;
  children?: MdastNode[];
}

interface MdxJsxAttribute {
  type: "mdxJsxAttribute";
  name: string;
  value: string;
}

interface MdxJsxTextElement extends MdastNode {
  type: "mdxJsxTextElement";
  name: string;
  attributes: MdxJsxAttribute[];
}

/**
 * Node types the pass does not descend into.
 *
 * - `heading` — a heading is a label, not prose, and a dotted underline in one
 *   reads as damage. Headings are also link targets.
 * - `code` / `inlineCode` — annotating an identifier that happens to spell a
 *   registered term would be actively wrong.
 * - `link` / `linkReference` / `definition` — a link already goes somewhere.
 *   Nesting an interactive control inside an anchor is invalid HTML and breaks
 *   both keyboard and screen-reader behaviour.
 * - `mdxJsxTextElement` / `mdxJsxFlowElement` — a hand-placed `<Term>`, a
 *   `<Claim>`, or a chart. The author has already said what this is.
 * - the `mdx*Expression` types and `yaml` — not prose at all.
 * - `image` / `imageReference` — alt text is a description of a picture, and
 *   an annotation inside it cannot be rendered.
 */
const OPAQUE = new Set([
  "heading",
  "code",
  "inlineCode",
  "link",
  "linkReference",
  "definition",
  "image",
  "imageReference",
  "mdxJsxTextElement",
  "mdxJsxFlowElement",
  "mdxFlowExpression",
  "mdxTextExpression",
  "mdxjsEsm",
  "yaml",
  "html",
]);

export interface RemarkGlossaryOptions {
  /**
   * The page's pass, created by the caller.
   *
   * Passed in rather than created here so that prose outside the MDX body —
   * an exercise's setup cues, a substitution's tradeoff notes — shares one
   * seen-set with it. "First occurrence per page" has to mean the page.
   */
  pass: GlossaryPass;
  /** Component name to emit. Must exist in the MDX component scope. */
  componentName: string;
}

export function remarkGlossary(options: RemarkGlossaryOptions) {
  return function transform(tree: MdastNode): void {
    walk(tree, options);
  };
}

function walk(node: MdastNode, options: RemarkGlossaryOptions): void {
  /*
    The guard is on the node itself, not on its children.

    Written the other way round it reads identically for every tree the MDX
    pipeline actually produces — the root is always `root` — and is wrong for
    any subtree handed in directly, because the entry node's own type is never
    consulted. A rule enforced only one level down is a rule with a hole in it
    at the top.
  */
  if (OPAQUE.has(node.type)) return;

  const children = node.children;
  if (!children) return;

  const next: MdastNode[] = [];

  for (const child of children) {
    if (child.type === "text" && typeof child.value === "string") {
      next.push(...annotate(child.value, options));
      continue;
    }

    walk(child, options);
    next.push(child);
  }

  node.children = next;
}

function annotate(
  value: string,
  { pass, componentName }: RemarkGlossaryOptions,
): MdastNode[] {
  const segments = pass.segment(value);

  if (segments.every((segment) => segment.kind === "text")) {
    // Untouched prose keeps its original node rather than being rebuilt, so a
    // document with no matches comes out byte-identical.
    return [{ type: "text", value }];
  }

  return segments.map((segment) => {
    if (segment.kind === "text") {
      return { type: "text", value: segment.text } satisfies MdastNode;
    }

    const element: MdxJsxTextElement = {
      type: "mdxJsxTextElement",
      name: componentName,
      attributes: [
        { type: "mdxJsxAttribute", name: "term", value: segment.text },
        { type: "mdxJsxAttribute", name: "slug", value: segment.entry.slug },
      ],
      children: [{ type: "text", value: segment.text }],
    };
    return element;
  });
}
