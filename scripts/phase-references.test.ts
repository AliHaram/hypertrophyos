import { describe, expect, it } from "vitest";

import {
  budgetExceptionProblems,
  reservedProblems,
} from "./phase-references.mjs";

/**
 * The gate that enforces "an exception must name a phase" is itself exercised.
 *
 * Holding the older checkers to a proof-of-failure standard while exempting the
 * newest one would be the same defect in a fresh coat. The regexes here are the
 * fragile part — one of them matched prose *about* the convention on its first
 * run against the module documenting it — so both halves are pinned.
 */

const PHASES = ["phase-1", "phase-2", "phase-3"];

describe("@reserved tags", () => {
  it("accepts a tag naming a real phase", () => {
    const source = `/**\n * @reserved phase-2 — waiting on the dashboard.\n */`;

    expect(reservedProblems("a.ts", source, PHASES)).toEqual([]);
  });

  it("fires on a phase outside the vocabulary", () => {
    const source = `/**\n * @reserved phase-9 — someday.\n */`;
    const [problem] = reservedProblems("a.ts", source, PHASES);

    expect(problem).toMatch(/phase-9.*not in PHASES/);
  });

  it("fires on a tag that names no phase at all", () => {
    const source = `/**\n * @reserved because we might need it.\n */`;
    const [problem] = reservedProblems("a.ts", source, PHASES);

    expect(problem).toMatch(/names no phase/);
  });

  it("ignores prose describing the convention", () => {
    // The near-miss that matters: `src/lib/phases.ts` documents the tag, and an
    // anywhere-match flagged its own documentation on the first run.
    const source = `/**\n * 3. \`@reserved phase-N\` — an export written ahead of its consumer.\n */`;

    expect(reservedProblems("phases.ts", source, PHASES)).toEqual([]);
  });

  it("ignores the tag outside a JSDoc block", () => {
    expect(
      reservedProblems("a.ts", `const s = "@reserved nonsense";`, PHASES),
    ).toEqual([]);
  });

  it("reports every offending tag in a file, not just the first", () => {
    const source = [
      "/**",
      " * @reserved phase-9 — one.",
      " */",
      "/**",
      " * @reserved — two.",
      " */",
    ].join("\n");

    expect(reservedProblems("a.ts", source, PHASES)).toHaveLength(2);
  });

  it("names the file so the problem is findable", () => {
    const source = `/**\n * @reserved phase-9 — x.\n */`;

    expect(reservedProblems("src/lib/thing.ts", source, PHASES)[0]).toContain(
      "src/lib/thing.ts",
    );
  });
});

describe("budget exceptions", () => {
  it("accepts an empty exceptions object", () => {
    expect(
      budgetExceptionProblems(`const EXCEPTIONS = {};`, PHASES),
    ).toEqual([]);
  });

  it("accepts an entry naming a real phase", () => {
    const source = `const EXCEPTIONS = {\n  "/a/page": { limit: 1, phase: "phase-3", reason: "r", owner: "o" },\n};`;

    expect(budgetExceptionProblems(source, PHASES)).toEqual([]);
  });

  it("fires on an entry with no phase", () => {
    const source = `const EXCEPTIONS = {\n  "/a/page": { limit: 1, reason: "r", owner: "o" },\n};`;
    const [problem] = budgetExceptionProblems(source, PHASES);

    expect(problem).toMatch(/"\/a\/page".*no phase field/);
  });

  it("fires on an entry naming a phase outside the vocabulary", () => {
    const source = `const EXCEPTIONS = {\n  "/a/page": { limit: 1, phase: "phase-42", reason: "r" },\n};`;
    const [problem] = budgetExceptionProblems(source, PHASES);

    expect(problem).toMatch(/phase-42.*not in PHASES/);
  });

  it("fires when the EXCEPTIONS object cannot be found at all", () => {
    // The self-referential case: a checker that silently stops finding its
    // target reports green forever, which is the whole defect class.
    const [problem] = budgetExceptionProblems(`const RENAMED = {};`, PHASES);

    expect(problem).toMatch(/could not find the EXCEPTIONS object/);
  });
});
