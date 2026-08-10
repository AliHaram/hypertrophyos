/**
 * Every declared exception names a real phase.
 *
 * The project has arrived at the same convention three times — the orphaned-term
 * register, the bundle-budget exceptions, and `@reserved` exports all defer work
 * by naming the phase it lands in. That is a project rule, not three
 * coincidences, and a rule that only one of the three enforces is a rule that
 * drifts the first time a phase is renumbered.
 *
 * TypeScript already covers the register, where `resolveBy` is typed `Phase`.
 * It cannot cover the other two: one is a JSDoc tag and the other is an object
 * in a `.mjs` file, and both are strings the compiler never looks at. This
 * closes that gap.
 *
 * Fails on:
 *   - `@reserved` with no phase        — a permanent exemption in disguise
 *   - `@reserved phase-9`              — a phase that does not exist
 *   - a budget exception with no phase — same, in the other mechanism
 *
 * The rules live in `phase-references.mjs` and are unit-tested; this file is
 * the walk, the vocabulary lookup, and the exit code.
 *
 *   pnpm phases:check
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  budgetExceptionProblems,
  reservedProblems,
} from "./phase-references.mjs";

const ROOT = process.cwd();

/*
  Read the vocabulary from the TypeScript that owns it, rather than restating it
  here. A second copy of the phase list inside the checker that exists to stop
  the phase list being copied would be its own punchline.
*/
const PHASES = JSON.parse(
  execFileSync(
    "npx",
    [
      "tsx",
      "-e",
      `import { PHASES } from "./src/lib/phases.ts";
       process.stdout.write(JSON.stringify(PHASES));`,
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
  ),
);

const problems = [];

/** Every .ts/.tsx under src, minus the vendored primitives. */
function sourceFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "ui" && dir.endsWith("components")) continue;
      out.push(...sourceFiles(full));
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

for (const file of sourceFiles(path.join(ROOT, "src"))) {
  problems.push(
    ...reservedProblems(
      path.relative(ROOT, file),
      fs.readFileSync(file, "utf8"),
      PHASES,
    ),
  );
}

problems.push(
  ...budgetExceptionProblems(
    fs.readFileSync(
      path.join(ROOT, "scripts", "check-bundle-budget.mjs"),
      "utf8",
    ),
    PHASES,
  ),
);

if (problems.length > 0) {
  console.error(
    `Phase reference check failed (${problems.length} problem${problems.length === 1 ? "" : "s"}):\n`,
  );
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}

console.log(`Phase references check passed. Vocabulary: ${PHASES.join(", ")}.`);
