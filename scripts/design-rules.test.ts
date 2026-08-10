import { describe, expect, it } from "vitest";

import { RULES, scanSource } from "./design-rules.mjs";

/**
 * Every design rule fires, and every design rule misses.
 *
 * These rules previously existed only inside the checker script, which meant
 * the only observable state was "passed". A regex that silently stopped
 * matching — after a Tailwind upgrade, a rename, a careless edit — would have
 * been indistinguishable from a codebase with no violations, and two of these
 * rules exist precisely because a defect got through once already.
 *
 * So each rule below gets a violation fixture and a near-miss. The near-miss is
 * the half that catches over-broad patterns: a rule that flags everything is as
 * useless as one that flags nothing, and louder about it.
 */

const FILE = "src/components/probe.tsx";

function ids(source: string, file = FILE): string[] {
  return scanSource(file, source).map((v: { rule: string }) => v.rule);
}

describe("the rule set is intact", () => {
  it("carries every rule the checker documents", () => {
    // Pinned so a rule cannot be dropped silently. Update deliberately.
    expect(RULES.map((r: { id: string }) => r.id)).toEqual([
      "arbitrary-value",
      "prohibited-font",
      "glassmorphism",
      "decorative-gradient",
      "malformed-color-utility",
      "faded-text-colour",
      "oversized-radius",
    ]);
  });

  it("gives every rule a message function", () => {
    for (const rule of RULES) {
      expect(typeof rule.message, rule.id).toBe("function");
      expect(rule.message("x").length, rule.id).toBeGreaterThan(10);
    }
  });
});

describe("rule — arbitrary values", () => {
  it("fires on an arbitrary size, colour and radius", () => {
    expect(ids(`<div className="text-[13px]" />`)).toContain("arbitrary-value");
    expect(ids(`<div className="bg-[#1a1a1a]" />`)).toContain("arbitrary-value");
    expect(ids(`<div className="rounded-[10px]" />`)).toContain(
      "arbitrary-value",
    );
  });

  it("does not fire on tokenised utilities", () => {
    expect(ids(`<div className="text-sm bg-card rounded-md p-4" />`)).toEqual(
      [],
    );
  });

  it("does not fire inside tokens.ts, which is the raw values", () => {
    expect(
      ids(`const x = "text-[13px]";`, "src/lib/design/tokens.ts"),
    ).toEqual([]);
  });
});

describe("rule — prohibited fonts", () => {
  it("fires on Inter and Geist", () => {
    expect(ids(`import { Inter } from "next/font/google";`)).toContain(
      "prohibited-font",
    );
    expect(ids(`const f = Geist_Mono;`)).toContain("prohibited-font");
  });

  it("does not fire on the project's own faces", () => {
    expect(ids(`import { Newsreader, IBM_Plex_Sans } from "x";`)).toEqual([]);
  });

  it("does not fire on a word merely containing the name", () => {
    // "Interface" and "Interactive" are everywhere in this codebase.
    expect(ids(`const Interface = 1; const interactive = 2;`)).toEqual([]);
  });
});

describe("rule — glassmorphism", () => {
  it("fires on backdrop-blur outside the overlay allowlist", () => {
    expect(ids(`<div className="backdrop-blur-sm" />`)).toContain(
      "glassmorphism",
    );
  });

  it("permits it on true overlays", () => {
    expect(
      ids(`<div className="backdrop-blur-sm" />`, "src/components/ui/dialog.tsx"),
    ).toEqual([]);
  });
});

describe("rule — decorative gradients", () => {
  it("fires on a Tailwind gradient and a raw CSS one", () => {
    expect(ids(`<div className="bg-gradient-to-r" />`)).toContain(
      "decorative-gradient",
    );
    expect(ids(`background: linear-gradient(red, blue);`)).toContain(
      "decorative-gradient",
    );
  });

  it("permits SVG area shading in charts", () => {
    expect(
      ids(`fill="url(#g)" linear-gradient(`, "src/components/charts/x.tsx"),
    ).toEqual([]);
  });
});

describe("rule — malformed colour utilities", () => {
  it("fires on a utility Tailwind would emit nothing for", () => {
    // The exact shape that shipped a near-invisible button: a hyphen is a word
    // boundary, so `\btext-primary\b` matched inside a longer class name.
    expect(ids(`<div className="text-text-strong-foreground" />`)).toContain(
      "malformed-color-utility",
    );
  });

  it("does not fire on the real utility", () => {
    expect(ids(`<div className="text-text-strong" />`)).toEqual([]);
  });
});

describe("rule — faded text colours", () => {
  it("fires on an opacity modifier applied to a text colour", () => {
    // This took paper muted text from an asserted 5.55:1 to a measured 3.64:1.
    expect(ids(`<p className="text-muted-foreground/80" />`)).toContain(
      "faded-text-colour",
    );
  });

  it("does not fire on the same modifier applied to a mark or hairline", () => {
    // Neither carries a text contrast threshold, so both may composite freely.
    expect(ids(`<div className="bg-muted/40 border-border/60" />`)).toEqual([]);
  });

  it("does not fire on an unmodified text colour", () => {
    expect(ids(`<p className="text-muted-foreground" />`)).toEqual([]);
  });
});

describe("rule — oversized radii", () => {
  it("fires on rounded-2xl and above", () => {
    expect(ids(`<div className="rounded-2xl" />`)).toContain(
      "oversized-radius",
    );
    expect(ids(`<div className="rounded-full" />`)).toContain(
      "oversized-radius",
    );
  });

  it("does not fire on the permitted ceiling", () => {
    expect(ids(`<div className="rounded-md rounded-xs rounded-sm" />`)).toEqual(
      [],
    );
  });

  it("permits genuine pills", () => {
    expect(
      ids(
        `<span className="rounded-full" />`,
        "src/components/evidence/evidence-chip.tsx",
      ),
    ).toEqual([]);
  });
});

describe("scanning behaviour", () => {
  it("skips comment lines, because the rules are discussed in prose here", () => {
    expect(ids(` * Never write text-[13px] in this codebase.`)).toEqual([]);
    expect(ids(`// bg-gradient-to-r is prohibited`)).toEqual([]);
  });

  it("reports the line number a violation is on", () => {
    const violations = scanSource(FILE, `a\nb\n<div className="rounded-2xl" />`);

    expect(violations[0].line).toBe(3);
  });

  it("reports every violation on a line, not just the first", () => {
    // The patterns are global; a shared lastIndex between lines would drop
    // matches silently, which is the failure mode this asserts against.
    const violations = scanSource(
      FILE,
      `<div className="text-[13px] bg-[#1a1a1a]" />`,
    );

    expect(violations.filter((v) => v.rule === "arbitrary-value")).toHaveLength(
      2,
    );
  });

  it("finds violations on consecutive lines", () => {
    const violations = scanSource(
      FILE,
      `<div className="rounded-2xl" />\n<div className="rounded-3xl" />`,
    );

    expect(violations.map((v) => v.line)).toEqual([1, 2]);
  });
});
