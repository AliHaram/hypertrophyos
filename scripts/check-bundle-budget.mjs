/**
 * Per-route JS budget.
 *
 * Reads the App Router build manifest and fails if any route's first-load
 * JavaScript exceeds the budget. Gzip is estimated from the on-disk size using
 * the ratio Next reports for its own chunks, which is close enough to catch a
 * regression and cheap enough to run on every push.
 *
 *   pnpm budget:check
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

/** Bytes, gzipped. */
const BUDGET = 180 * 1024;

/**
 * Recorded exceptions.
 *
 * A gate that is permanently red is a gate nobody reads, and a gate quietly
 * relaxed to green is worse. Exceptions are listed here with a reason and an
 * owner so the breach stays visible in every CI run.
 *
 * **Every entry must name the phase the breach is expected to close in**, from
 * the vocabulary in `src/lib/phases.ts`. That is the same rule the orphaned-term
 * register and `@reserved` exports follow, and
 * `scripts/check-phase-references.mjs` fails the build on an entry that omits
 * the phase or names one that does not exist. An exception with no deadline is
 * not an exception, it is a lowered budget.
 *
 *   "/some/route/page": {
 *     limit: 200 * 1024,
 *     phase: "phase-4",
 *     reason: "...",
 *     owner: "...",
 *   }
 */
const EXCEPTIONS = {};

const ROOT = process.cwd();
const APP_DIR = path.join(ROOT, ".next");

if (!fs.existsSync(APP_DIR)) {
  console.error("No .next directory — run `pnpm build` first.");
  process.exit(1);
}

/**
 * Refuse to measure anything but a clean production build.
 *
 * A dev server writes into the same `.next` directory with completely different
 * chunking, and the resulting numbers are neither right nor obviously wrong —
 * a stray `next dev` produced a 472 kB reading for `/layout` against a real
 * value of 141 kB. That was caught by luck and a rebuild. The next one would
 * have landed in a report with nothing to distinguish it from a real
 * regression, which is the worst property a measurement can have.
 *
 * The precondition was briefly written down as "remember to build first". That
 * is precisely what ADR 0006 says a gate is for: a precondition living in
 * someone's memory is not enforced, it is merely hoped for.
 *
 * Markers, verified empirically against both build modes:
 *   - `BUILD_ID` is written by `next build` and absent in dev.
 *   - `static/development/` is written by `next dev` and absent in a
 *     production build. Its presence means the tree is contaminated even if
 *     the production manifests are also there.
 */
function assertCleanProductionBuild() {
  const problems = [];

  if (!fs.existsSync(path.join(APP_DIR, "BUILD_ID"))) {
    problems.push(
      "no .next/BUILD_ID — this is not a production build (`next build` writes it; `next dev` does not).",
    );
  }
  if (!fs.existsSync(path.join(APP_DIR, "required-server-files.json"))) {
    problems.push(
      "no .next/required-server-files.json — the production build did not complete.",
    );
  }
  if (fs.existsSync(path.join(APP_DIR, "static", "development"))) {
    problems.push(
      "found .next/static/development — a dev server has written into this tree, so the chunking is not what ships.",
    );
  }

  if (problems.length > 0) {
    console.error("Refusing to measure this build:\n");
    for (const problem of problems) console.error(`  ${problem}`);
    console.error(
      "\nStop any `next dev` for this project, then:\n  rm -rf .next && pnpm build && pnpm budget:check\n",
    );
    process.exit(1);
  }
}

assertCleanProductionBuild();

const manifestPath = path.join(APP_DIR, "app-build-manifest.json");
if (!fs.existsSync(manifestPath)) {
  console.error(`Missing ${path.relative(ROOT, manifestPath)}.`);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const cache = new Map();

function gzippedSize(file) {
  if (cache.has(file)) return cache.get(file);
  const full = path.join(APP_DIR, file);
  if (!fs.existsSync(full)) return 0;
  const size = zlib.gzipSync(fs.readFileSync(full)).length;
  cache.set(file, size);
  return size;
}

const results = [];
for (const [route, files] of Object.entries(manifest.pages ?? {})) {
  const js = files.filter((f) => f.endsWith(".js"));
  const total = js.reduce((sum, file) => sum + gzippedSize(file), 0);
  results.push({ route, total });
}

results.sort((a, b) => b.total - a.total);

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} kB`;
const limitFor = (route) => EXCEPTIONS[route]?.limit ?? BUDGET;
const over = results.filter((r) => r.total > limitFor(r.route));

console.log(`Per-route first-load JS (gzipped), budget ${kb(BUDGET)}:\n`);
for (const { route, total } of results) {
  const exception = EXCEPTIONS[route];
  const flag = total > limitFor(route) ? "OVER" : exception ? "EXC" : "ok";
  console.log(`  ${flag.padEnd(5)} ${kb(total).padStart(10)}  ${route}`);
  if (exception) {
    console.log(`        \u21b3 exception to ${kb(exception.limit)}: ${exception.reason}`);
  }
}

if (over.length > 0) {
  console.error(
    `\n${over.length} route(s) over the ${kb(BUDGET)} budget.`,
  );
  process.exit(1);
}

console.log("\nAll routes within budget.");
