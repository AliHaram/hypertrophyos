/**
 * The design-system rule set, extracted so it can be tested.
 *
 * These rules were previously inlined in `check-design-tokens.mjs`, which meant
 * they could only ever be observed *passing*. That is the state ADR 0006 exists
 * to prevent: a rule nothing exercises is indistinguishable from a rule whose
 * regex quietly stopped matching, and two of these were added only after the
 * defect they describe had already shipped.
 *
 * `design-rules.test.ts` now gives every rule a firing case and a near-miss, in
 * the same shape as the evidence-integrity suite.
 *
 * The filesystem walk stays in the checker. Everything here is pure: give
 * `scanSource` a path and some text, get violations back.
 */
import path from "node:path";

/**
 * Files permitted to use raw values.
 *
 * tokens.ts *is* the raw values. The generated CSS is emitted from it. The
 * shadcn primitives under ui/ are vendored third-party source being migrated
 * onto tokens component by component — every one that Phase 2 touches is
 * retokenized, and this allowlist shrinks as that proceeds.
 */
export const ALLOWLIST = [
  "src/lib/design/tokens.ts",
  "src/app/tokens.generated.css",
  "src/components/ui/", // vendored shadcn primitives, retokenized on touch
];

/** Files permitted to use backdrop-blur — true overlays only. */
export const BLUR_ALLOWLIST = [
  "src/components/ui/dialog.tsx",
  "src/components/ui/sheet.tsx",
];

export const RULES = [
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
    /*
      Opacity modifiers on text colours.

      `text-muted-foreground/80` composites the muted ramp step against whatever
      is behind it, which took paper muted text from its asserted 5.55:1 down to
      a measured 3.64:1 — below AA, on eleven list items, invisible to the token
      contrast tests because the token itself was never the problem. axe caught
      it on the rendered page.

      There is no half-step between body and muted, deliberately: if text needs
      to recede, it is muted, and if muted is too quiet the ramp step is wrong.
      Marks and hairlines are unaffected — `bg-` and `border-` may composite
      freely, since neither carries a text threshold.
    */
    id: "faded-text-colour",
    pattern: /\btext-(?:foreground|muted-foreground|text-(?:body|muted|strong)|card-foreground|primary|secondary)\/\d{1,3}\b/g,
    message: (m) =>
      `"${m}" composites away the contrast the token guarantees — use text-foreground or text-muted-foreground`,
  },
  {
    /*
      One page width, declared once.

      Five routes carried three different `max-w` values and the nav bar a
      fourth, so the content's left edge moved as you navigated and never lined
      up with the bar above it. The width now lives in `components/shell/page`
      and nothing else declares one.

      `mx-auto max-w-*` is the page-container idiom specifically, which is why
      this matches the pair rather than `max-w-*` alone: a lede constrained to
      `max-w-2xl` without `mx-auto` is a reading measure, not layout, and those
      are none of this rule's business.
    */
    id: "raw-page-container",
    pattern: /\bmx-auto\s+(?:w-full\s+)?max-w-[a-z0-9]+/g,
    message: (m) =>
      `"${m}" declares its own page width — use <Page> or PAGE_CONTAINER from components/shell/page so every route shares one left edge`,
    // Only route files. Components legitimately centre things inside a page.
    appliesTo: ["src/app/"],
  },
  {
    id: "oversized-radius",
    pattern: /\brounded-(?:2xl|3xl|full)\b/g,
    message: (m) =>
      `"${m}" — containers cap at 4px (rounded-md); rounded-full is for pills and avatars only`,
    // Pills and dots are genuine full-round cases.
    allowlist: [
      // The evidence-grade dot, in both the tooltip chip and the static mark.
      "src/components/evidence/evidence-chip.tsx",
      "src/components/evidence/evidence-mark.tsx",
      "src/components/ui/",
      "src/components/charts/",
    ],
  },
];

export function isAllowed(relative, list) {
  return list.some((entry) =>
    entry.endsWith("/") ? relative.startsWith(entry) : relative === entry,
  );
}

/**
 * Violations in one file's text. Pure — no filesystem, no process exit.
 *
 * `relative` is a repo-relative path; separators are normalised to POSIX
 * because every allowlist entry is written that way and a Windows separator
 * would silently match nothing.
 */
export function scanSource(relative, source) {
  const violations = [];
  const normalised = relative.split(path.sep).join("/");

  if (isAllowed(normalised, ALLOWLIST)) return violations;

  const lines = source.split("\n");

  for (const rule of RULES) {
    if (rule.allowlist && isAllowed(normalised, rule.allowlist)) continue;
    // `appliesTo` is the inverse of `allowlist`: the rule is scoped to these
    // paths and silent everywhere else.
    if (rule.appliesTo && !isAllowed(normalised, rule.appliesTo)) continue;

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

      // The patterns carry /g, so lastIndex must not leak between lines.
      rule.pattern.lastIndex = 0;
      const matches = line.match(rule.pattern);
      if (matches) {
        for (const match of matches) {
          violations.push({
            rule: rule.id,
            file: normalised,
            line: index + 1,
            message: rule.message(match),
          });
        }
      }
    });
  }

  return violations;
}
