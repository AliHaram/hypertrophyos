/**
 * Design-system enforcement.
 *
 * A design system that lives only in a document decays inside two weeks. These
 * checks make the rules mechanical:
 *
 *   1. No arbitrary Tailwind values (text-[13px], bg-[#1a1a1a], rounded-[10px])
 *      outside the allowlist. If a value is not a token, it is not available.
 *   2. No prohibited typefaces. Inter and Geist are fine faces and both are
 *      the default tell.
 *   3. No backdrop-blur outside the overlay allowlist. Glassmorphism on cards
 *      is the single most recognisable marker of an unconsidered interface.
 *   4. No decorative gradients.
 *   5. No malformed colour utilities — a class Tailwind does not recognise
 *      emits nothing and the element silently inherits its parent's colour.
 *   6. No opacity modifiers on text colours, which composite away the contrast
 *      the token guarantees.
 *   7. No oversized radii on containers.
 *
 * Rules 5 and 6 were each added after the defect they describe shipped. Both
 * are invisible to typecheck, to the build, and to the token contrast tests.
 *
 * The rules themselves live in `design-rules.mjs` so they can be unit-tested.
 * This file is the filesystem walk and the report — nothing more. A rule that
 * can only be watched passing is the defect ADR 0006 is about.
 *
 * Run: pnpm design:check
 */
import fs from "node:fs";
import path from "node:path";

import { scanSource } from "./design-rules.mjs";

const ROOT = process.cwd();
const SCAN_DIRS = ["src"];
const SCAN_EXT = new Set([".ts", ".tsx", ".css"]);

const VIOLATIONS = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      walk(full);
    } else if (SCAN_EXT.has(path.extname(entry.name))) {
      const relative = path.relative(ROOT, full);
      VIOLATIONS.push(...scanSource(relative, fs.readFileSync(full, "utf8")));
    }
  }
}

for (const dir of SCAN_DIRS) {
  walk(path.join(ROOT, dir));
}

if (VIOLATIONS.length > 0) {
  console.error(`Design-token check failed (${VIOLATIONS.length} violations):\n`);
  const byRule = new Map();
  for (const violation of VIOLATIONS) {
    const list = byRule.get(violation.rule) ?? [];
    list.push(violation);
    byRule.set(violation.rule, list);
  }
  for (const [rule, items] of byRule) {
    console.error(`  [${rule}]`);
    for (const item of items) {
      console.error(`    ${item.file}:${item.line}  ${item.message}`);
    }
    console.error("");
  }
  process.exit(1);
}

console.log("Design-token check passed.");
