/**
 * The phase-reference rules, extracted so they can be tested.
 *
 * Same reasoning as `design-rules.mjs`: this gate was written to enforce a
 * project rule, and a gate that can only be watched passing is the defect
 * ADR 0006 is about. The regexes here are the fragile part — one of them
 * already matched prose *about* the convention on its first run — so they get a
 * firing case and a near-miss each.
 *
 * Pure functions only. The filesystem walk, the `tsx` call that reads PHASES,
 * and the exit code live in `check-phase-references.mjs`.
 */

/**
 * `@reserved` at JSDoc tag position — first thing on its line after the
 * asterisk.
 *
 * Matching the tag anywhere would also match prose describing the convention,
 * which is exactly how this checker first failed against `src/lib/phases.ts`,
 * the module that documents it.
 */
const RESERVED = /^[ \t]*\*[ \t]+@reserved(?<rest>[^\n]*)/gm;

/** Problems with the `@reserved` tags in one file. */
export function reservedProblems(relative, source, phases) {
  const problems = [];

  for (const match of source.matchAll(RESERVED)) {
    const rest = match.groups.rest.trim();
    const phase = rest.match(/^(phase-[a-z0-9]+)/)?.[1];

    if (!phase) {
      problems.push(
        `${relative}: @reserved names no phase — "${rest.slice(0, 60)}". A reservation without a phase is a permanent exemption wearing a temporary one's clothes.`,
      );
      continue;
    }
    if (!phases.includes(phase)) {
      problems.push(
        `${relative}: @reserved names "${phase}", which is not in PHASES (${phases.join(", ")}).`,
      );
    }
  }

  return problems;
}

/**
 * Problems with the bundle-budget `EXCEPTIONS` object.
 *
 * Takes the script's source text rather than importing it: importing would run
 * the budget check as a side effect, which needs a build to exist, and a gate
 * that only works after another gate has run is a gate that gets skipped.
 */
export function budgetExceptionProblems(budgetSource, phases) {
  const problems = [];

  const block = budgetSource.match(
    /const EXCEPTIONS = \{(?<body>[\s\S]*?)\};/,
  )?.groups.body;

  if (block === undefined) {
    return [
      "scripts/check-bundle-budget.mjs: could not find the EXCEPTIONS object. If it was renamed, update this checker — a checker that silently stops finding its target is the defect ADR 0006 is about.",
    ];
  }

  if (block.trim() === "") return problems;

  for (const entry of block.matchAll(
    /"(?<route>[^"]+)":\s*\{(?<body>[\s\S]*?)\}/g,
  )) {
    const { route, body } = entry.groups;
    const phase = body.match(/phase:\s*"(?<phase>[^"]+)"/)?.groups.phase;

    if (!phase) {
      problems.push(
        `budget exception "${route}": no phase field. Name the phase the breach closes in.`,
      );
    } else if (!phases.includes(phase)) {
      problems.push(
        `budget exception "${route}": phase "${phase}" is not in PHASES (${phases.join(", ")}).`,
      );
    }
  }

  return problems;
}
