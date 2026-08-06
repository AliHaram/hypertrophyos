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
 */
const EXCEPTIONS = {};

const ROOT = process.cwd();
const APP_DIR = path.join(ROOT, ".next");

if (!fs.existsSync(APP_DIR)) {
  console.error("No .next directory — run `pnpm build` first.");
  process.exit(1);
}

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
