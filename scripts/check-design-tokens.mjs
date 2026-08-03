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
 *   5. No oversized radii on containers.
 *
 * Run: pnpm design:check
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["src"];
const SCAN_EXT = new Set([".ts", ".tsx", ".css"]);

/**
 * Files permitted to use raw values.
 *
 * tokens.ts *is* the raw values. The generated CSS is emitted from it. The
 * shadcn primitives under ui/ are vendored third-party source being migrated
 * onto tokens component by component — every one that Phase 2 touches is
 * retokenized, and this allowlist shrinks as that proceeds.
 */
const ALLOWLIST = [
  "src/lib/design/tokens.ts",
  "src/app/tokens.generated.css",
  "src/components/ui/", // vendored shadcn primitives, retokenized on touch
];

/** Files permitted to use backdrop-blur — true overlays only. */
const BLUR_ALLOWLIST = [
  "src/components/ui/dialog.tsx",
  "src/components/ui/sheet.tsx",
];

const VIOLATIONS = [];

const RULES = [
  {
    id: "arbitrary-value",
    // Tailwind arbitrary values: text-[13px], bg-[#aabbcc], rounded-[10px], w-[37rem]
    pattern:
      /\b(?:text|bg|border|rounded|w|h|min-w|min-h|max-w|max-h|p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|top|right|bottom|left|inset|leading|tracking|size)-\[[^\]]+\]/g,
    message: (m) => `arbitrary Tailwind value "${m}" — add a token instead`,
  },
  {
    id: "prohibited-font",
    pattern: /\b(Inter|Geist|Geist_Mono|Geist Sans)\b/g,
    message: (m) => `prohibited typeface "${m}" — this project uses Newsreader / IBM Plex Sans / IBM Plex Mono`,
  },
  {
    id: "glassmorphism",
    pattern: /\bbackdrop-blur(?:-\w+)?\b/g,
    message: (m) => `"${m}" outside the overlay allowlist — no glassmorphism on cards or panels`,
    allowlist: BLUR_ALLOWLIST,
  },
  {
    id: "decorative-gradient",
    pattern: /\bbg-gradient-to-|\bfrom-\w+-\d{2,3}\b|\blinear-gradient\(/g,
    message: (m) => `decorative gradient "${m}" — chrome is achromatic and flat`,
    // Chart fills legitimately use SVG gradients for area shading.
    allowlist: ["src/components/charts/"],
  },
  {
    /*
      Catches malformed colour utilities — the class of damage a careless
      find-and-replace produces. `text-text-strong-foreground` is not a real
      utility, so Tailwind emits nothing and the element silently inherits its
      parent's colour. That shipped a near-invisible button on the landing
      page: the regex `\btext-primary\b` matched inside
      `text-primary-foreground`, because a hyphen is a word boundary.
    */
    id: "malformed-color-utility",
    pattern:
      /\b(?:text|bg|border|outline|decoration|fill|stroke)-(?:text|bg|surface)-(?:strong|body|muted|raised)-[a-z]+\b/g,
    message: (m) =>
      `"${m}" is not a real utility — Tailwind emits nothing and the element inherits its parent's colour`,
  },
  {
    id: "oversized-radius",
    pattern: /\brounded-(?:2xl|3xl|full)\b/g,
    message: (m) =>
      `"${m}" — containers cap at 4px (rounded-md); rounded-full is for pills and avatars only`,
    // Pills and dots are genuine full-round cases.
    allowlist: [
      "src/components/evidence/evidence-chip.tsx",
      "src/components/ui/",
      "src/components/charts/",
    ],
  },
];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      walk(full);
    } else if (SCAN_EXT.has(path.extname(entry.name))) {
      check(full);
    }
  }
}

function isAllowed(relative, list) {
  return list.some((entry) =>
    entry.endsWith("/") ? relative.startsWith(entry) : relative === entry,
  );
}

function check(file) {
  const relative = path.relative(ROOT, file);
  if (isAllowed(relative, ALLOWLIST)) return;

  const source = fs.readFileSync(file, "utf8");
  const lines = source.split("\n");

  for (const rule of RULES) {
    if (rule.allowlist && isAllowed(relative, rule.allowlist)) continue;

    lines.forEach((line, index) => {
      // Skip comment lines — rules are discussed in prose throughout this repo.
      const trimmed = line.trim();
      if (
        trimmed.startsWith("*") ||
        trimmed.startsWith("//") ||
        trimmed.startsWith("/*")
      ) {
        return;
      }

      const matches = line.match(rule.pattern);
      if (matches) {
        for (const match of matches) {
          VIOLATIONS.push({
            rule: rule.id,
            file: relative,
            line: index + 1,
            message: rule.message(match),
          });
        }
      }
    });
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
