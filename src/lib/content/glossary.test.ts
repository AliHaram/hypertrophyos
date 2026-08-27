import { describe, expect, it } from "vitest";

import {
  type GlossarySource,
  buildGlossaryIndex,
  createGlossaryPass,
} from "./glossary";

/**
 * The matching rules, tested as rules rather than through a rendered page.
 *
 * Each of these encodes a way the ambient glossary could quietly corrupt
 * prose: the wrong concept claimed because a short alias ate a long one, a
 * term annotated inside a word it is only a substring of, or the same concept
 * marked eleven times in one essay. None of them is visible in a typecheck and
 * most are hard to see by reading a page.
 */

const SOURCES: readonly GlossarySource[] = [
  {
    slug: "mechanical-tension",
    title: "Mechanical tension",
    shortDefinition: "Force through a muscle under load.",
    evidenceGrade: "strong",
    terms: ["tension", "mechanotransduction"],
  },
  {
    slug: "volume-landmarks",
    title: "Volume landmarks",
    shortDefinition: "Thresholds bounding useful weekly volume.",
    evidenceGrade: "mixed",
    terms: ["MEV", "junk volume"],
  },
  {
    slug: "proximity-to-failure",
    title: "Proximity to failure",
    shortDefinition: "How near a set is taken to momentary failure.",
    evidenceGrade: "mixed",
    terms: ["RIR", "reps in reserve"],
  },
  {
    /*
      Registered so that a shorter alias sits inside a longer one owned by a
      *different* concept. Without it, "never match inside another glossary
      term" is untestable: every inner match would resolve to the same concept
      as the outer one and be dropped by the seen-set anyway, so the rule would
      look enforced while doing nothing.
    */
    slug: "failure-protocols",
    title: "Failure protocols",
    shortDefinition: "How a set is allowed to end, and under what supervision.",
    evidenceGrade: "mechanical-inference",
    terms: ["failure"],
  },
];

const index = buildGlossaryIndex(SOURCES);

function annotate(text: string, skipSlug?: string): string {
  const pass = createGlossaryPass(index, skipSlug ? { skipSlug } : {});
  return render(pass.segment(text));
}

/** `[term]` marks an annotated span, so assertions read as the prose does. */
function render(segments: ReturnType<ReturnType<typeof createGlossaryPass>["segment"]>): string {
  return segments
    .map((segment) =>
      segment.kind === "term" ? `[${segment.text}]` : segment.text,
    )
    .join("");
}

describe("buildGlossaryIndex", () => {
  it("orders aliases longest first, so a short alias cannot eat a long one", () => {
    const lengths = index.aliases.map(({ alias }) => alias.length);
    expect(lengths).toEqual([...lengths].sort((a, b) => b - a));
  });

  it("is deterministic across builds", () => {
    const again = buildGlossaryIndex(SOURCES);
    expect(again.aliases.map((a) => a.alias)).toEqual(
      index.aliases.map((a) => a.alias),
    );
  });

  it("keeps each alias's authored casing for display", () => {
    // The key is lowercased so matching is case-insensitive; the label is not.
    // "MEV" printed as "mev" in an index reads as a typo, not an abbreviation.
    const mev = index.aliases.find((entry) => entry.alias === "mev");
    expect(mev?.display).toBe("MEV");
    expect(
      index.aliases.find((entry) => entry.alias === "mechanical tension")
        ?.display,
    ).toBe("Mechanical tension");
  });

  it("indexes each concept's title as well as its declared terms", () => {
    expect(index.byAlias.get("mechanical tension")?.slug).toBe(
      "mechanical-tension",
    );
    expect(index.byAlias.get("mev")?.slug).toBe("volume-landmarks");
  });

  it("has no pattern when nothing is registered", () => {
    expect(buildGlossaryIndex([]).pattern).toBeUndefined();
  });
});

describe("matching", () => {
  it("annotates a registered term", () => {
    expect(annotate("Growth needs tension.")).toBe("Growth needs [tension].");
  });

  it("is case-insensitive but preserves the casing in the prose", () => {
    expect(annotate("Tension is the stimulus.")).toBe(
      "[Tension] is the stimulus.",
    );
  });

  it("prefers the longest alias at a given position", () => {
    // "tension" is also registered. Matching it here would annotate the second
    // half of a phrase whose first half is part of the same term.
    expect(annotate("Mechanical tension drives it.")).toBe(
      "[Mechanical tension] drives it.",
    );
  });

  it("resolves an abbreviation and its expansion to one concept", () => {
    expect(index.byAlias.get("rir")?.slug).toBe(
      index.byAlias.get("reps in reserve")?.slug,
    );
  });

  it("matches multi-word aliases", () => {
    expect(annotate("That is junk volume.")).toBe("That is [junk volume].");
  });
});

describe("boundaries", () => {
  it("does not match inside a longer word", () => {
    expect(annotate("Hypertension is unrelated.")).toBe(
      "Hypertension is unrelated.",
    );
  });

  it("does not match across a hyphen", () => {
    // A hyphenated compound is a different word, and `\b` would match here.
    expect(annotate("A tension-free setup.")).toBe("A tension-free setup.");
  });

  it("does not match a plural that was not registered", () => {
    // Plurals are the author's job — declared in frontmatter, not guessed.
    expect(annotate("Two tensions.")).toBe("Two tensions.");
  });

  it("matches at the very start and end of a run", () => {
    expect(annotate("tension")).toBe("[tension]");
  });

  it("matches next to punctuation", () => {
    expect(annotate("(tension), yes.")).toBe("([tension]), yes.");
  });
});

describe("first occurrence only", () => {
  it("annotates a term once per pass", () => {
    expect(annotate("Tension, then more tension, then tension again.")).toBe(
      "[Tension], then more tension, then tension again.",
    );
  });

  it("counts a concept once even across different aliases", () => {
    // Both resolve to the same page. Sending the reader there twice under two
    // names is the noise this rule exists to prevent.
    expect(annotate("Stop at 2 RIR — reps in reserve is the unit.")).toBe(
      "Stop at 2 [RIR] — reps in reserve is the unit.",
    );
  });

  it("carries the seen-set across separate runs of prose in one pass", () => {
    // A page is many text nodes. "Once per page" is meaningless if the pass
    // resets between them.
    const pass = createGlossaryPass(index);
    expect(render(pass.segment("First: tension."))).toBe("First: [tension].");
    expect(render(pass.segment("Second: tension."))).toBe("Second: tension.");
  });

  it("starts clean for a new pass", () => {
    expect(annotate("tension")).toBe("[tension]");
    expect(annotate("tension")).toBe("[tension]");
  });

  it("reports what it annotated, in order", () => {
    const pass = createGlossaryPass(index);
    pass.segment("MEV, then tension.");
    expect(pass.annotated()).toEqual([
      "volume-landmarks",
      "mechanical-tension",
    ]);
  });
});

describe("skipSlug", () => {
  it("does not annotate the concept the page is about", () => {
    expect(annotate("Mechanical tension is the stimulus.", "mechanical-tension"))
      .toBe("Mechanical tension is the stimulus.");
  });

  it("still annotates other concepts on that page", () => {
    expect(annotate("Tension above MEV.", "mechanical-tension")).toBe(
      "Tension above [MEV].",
    );
  });

  it("does not re-scan a skipped term for a shorter one inside it", () => {
    /*
      The subtle one, and the one this suite originally got wrong.

      "Proximity to failure" is skipped as the page's own subject. "failure" is
      a registered alias of a *different* concept sitting inside it. If
      scanning resumed at the match start rather than past it, the reader would
      get "Proximity to [failure]" — half a term, annotated, pointing somewhere
      the sentence was not talking about.

      The first version of this test used "mechanical tension" containing
      "tension", which belongs to the same concept and so was dropped by the
      skip a second time. It passed under a deliberately broken cursor. A test
      that cannot fail is not covering the rule it names.
    */
    expect(annotate("Proximity to failure matters.", "proximity-to-failure"))
      .toBe("Proximity to failure matters.");
  });

  it("does not annotate a shorter alias inside a term it already annotated", () => {
    expect(annotate("Proximity to failure matters.")).toBe(
      "[Proximity to failure] matters.",
    );
  });
});

describe("unregistered terms", () => {
  it("leaves prose untouched when nothing matches", () => {
    const text = "Nothing here is in the glossary.";
    expect(annotate(text)).toBe(text);
  });

  it("returns a single text segment rather than an empty list", () => {
    // Callers render segments directly; dropping the run would delete prose.
    const pass = createGlossaryPass(index);
    expect(pass.segment("plain")).toEqual([{ kind: "text", text: "plain" }]);
  });

  it("handles an empty run", () => {
    expect(createGlossaryPass(index).segment("")).toEqual([]);
  });
});
