import { describe, expect, it } from "vitest";

import {
  type GlossarySource,
  buildGlossaryIndex,
  createGlossaryPass,
} from "./glossary";
import { remarkGlossary } from "./remark-glossary";

/**
 * The structural rules.
 *
 * `glossary.test.ts` covers what counts as a match inside one run of prose.
 * This covers where the pass is allowed to look at all, which is the half a
 * regex sweep over rendered HTML could never get right.
 */

const SOURCES: readonly GlossarySource[] = [
  {
    slug: "mechanical-tension",
    title: "Mechanical tension",
    shortDefinition: "Force through a muscle under load.",
    evidenceGrade: "strong",
    terms: ["tension"],
  },
];

const index = buildGlossaryIndex(SOURCES);

interface Node {
  type: string;
  value?: string;
  name?: string;
  children?: Node[];
  attributes?: { type: string; name: string; value: string }[];
}

function run(tree: Node): Node {
  const pass = createGlossaryPass(index);
  remarkGlossary({ pass, componentName: "GlossaryTerm" })(tree);
  return tree;
}

function text(value: string): Node {
  return { type: "text", value };
}

function paragraph(...children: Node[]): Node {
  return { type: "paragraph", children };
}

/** Flattens a tree to a string, marking emitted components as `[term]`. */
function render(node: Node): string {
  if (node.type === "mdxJsxTextElement") {
    const term = node.attributes?.find((a) => a.name === "term")?.value ?? "";
    const slug = node.attributes?.find((a) => a.name === "slug")?.value ?? "";
    return `[${term}->${slug}]`;
  }
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(render).join("");
}

describe("prose", () => {
  it("annotates a term in a paragraph", () => {
    const tree = run(paragraph(text("Growth needs tension.")));
    expect(render(tree)).toBe("Growth needs [tension->mechanical-tension].");
  });

  it("descends into nested inline nodes", () => {
    const tree = run(
      paragraph({ type: "emphasis", children: [text("tension")] }),
    );
    expect(render(tree)).toBe("[tension->mechanical-tension]");
  });

  it("descends into list items", () => {
    const tree = run({
      type: "list",
      children: [
        { type: "listItem", children: [paragraph(text("Keep tension on."))] },
      ],
    });
    expect(render(tree)).toBe("Keep [tension->mechanical-tension] on.");
  });

  it("leaves a document with no matches structurally untouched", () => {
    const tree = run(paragraph(text("Nothing registered here.")));
    expect(tree.children).toEqual([
      { type: "text", value: "Nothing registered here." },
    ]);
  });
});

describe("nodes the pass does not enter", () => {
  it("skips headings", () => {
    const tree = run({ type: "heading", children: [text("Tension")] });
    expect(render(tree)).toBe("Tension");
  });

  it("skips inline code", () => {
    const tree = run(paragraph({ type: "inlineCode", value: "tension" }));
    expect(render(tree)).toBe("");
    expect(tree.children?.[0]?.type).toBe("inlineCode");
  });

  it("skips fenced code", () => {
    const tree = run({ type: "root", children: [{ type: "code", value: "tension" }] });
    expect(tree.children?.[0]).toEqual({ type: "code", value: "tension" });
  });

  it("skips the text of an existing link", () => {
    // Nesting a button inside an anchor is invalid HTML and breaks keyboard
    // behaviour in both directions.
    const tree = run(paragraph({ type: "link", children: [text("tension")] }));
    expect(render(tree)).toBe("tension");
  });

  it("skips a hand-placed component", () => {
    const tree = run(
      paragraph({
        type: "mdxJsxTextElement",
        name: "Term",
        children: [text("tension")],
      }),
    );
    expect(render(tree)).toBe("[->]");
    expect(tree.children?.[0]?.name).toBe("Term");
  });

  it("skips image alt text", () => {
    const tree = run({ type: "root", children: [{ type: "image", value: "tension" }] });
    expect(tree.children?.[0]).toEqual({ type: "image", value: "tension" });
  });

  it("still annotates prose that follows a skipped node", () => {
    // The skip must be a skip, not an abort.
    const tree = run(
      paragraph({ type: "inlineCode", value: "x" }, text(" holds tension.")),
    );
    expect(render(tree)).toBe(" holds [tension->mechanical-tension].");
  });
});

describe("the emitted node", () => {
  it("names the component the caller asked for", () => {
    const tree = run(paragraph(text("tension")));
    expect(tree.children?.[0]?.name).toBe("GlossaryTerm");
  });

  it("carries the matched text and the owning slug as string attributes", () => {
    const tree = run(paragraph(text("Tension.")));
    expect(tree.children?.[0]?.attributes).toEqual([
      { type: "mdxJsxAttribute", name: "term", value: "Tension" },
      { type: "mdxJsxAttribute", name: "slug", value: "mechanical-tension" },
    ]);
  });

  it("keeps the original text as the component's children", () => {
    const tree = run(paragraph(text("Tension.")));
    expect(tree.children?.[0]?.children).toEqual([
      { type: "text", value: "Tension" },
    ]);
  });
});

describe("one pass across the document", () => {
  it("annotates a term once even across separate paragraphs", () => {
    const tree = run({
      type: "root",
      children: [paragraph(text("First tension.")), paragraph(text("More tension."))],
    });
    expect(render(tree)).toBe(
      "First [tension->mechanical-tension].More tension.",
    );
  });

  it("does not spend the first occurrence on a heading it skipped", () => {
    // If the walker entered headings and then declined to annotate, the
    // seen-set would be consumed and the prose below would go unmarked.
    const tree = run({
      type: "root",
      children: [
        { type: "heading", children: [text("Tension")] },
        paragraph(text("Tension is the stimulus.")),
      ],
    });
    expect(render(tree)).toBe(
      "Tension[Tension->mechanical-tension] is the stimulus.",
    );
  });
});
