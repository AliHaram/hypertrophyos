/**
 * Generates the Tailwind `@theme` block from lib/design/tokens.ts.
 *
 * Tailwind v4 is CSS-first — there is no tailwind.config.ts to import
 * TypeScript into. Rather than keep two hand-maintained copies of every token,
 * the TypeScript stays authoritative and this script emits the CSS.
 *
 *   pnpm design:tokens         regenerate
 *   pnpm design:tokens:check   fail if the committed CSS is stale
 *
 * CI runs the check, so the CSS cannot drift from the source.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const OUT = path.join(process.cwd(), "src/app/tokens.generated.css");

// tokens.ts is TypeScript; run it through tsx and print JSON.
const json = execFileSync(
  "npx",
  [
    "tsx",
    "-e",
    `import * as t from "./src/lib/design/tokens.ts";
     process.stdout.write(JSON.stringify({
       NEUTRAL: t.NEUTRAL, NEUTRAL_STEPS: t.NEUTRAL_STEPS, EVIDENCE: t.EVIDENCE,
       LANDMARK: t.LANDMARK, CHART: t.CHART, TYPE_PROSE: t.TYPE_PROSE,
       TYPE_UI: t.TYPE_UI, SPACE: t.SPACE, TRACKING: t.TRACKING, RADIUS: t.RADIUS, MOTION: t.MOTION,
       SHADOW: t.SHADOW, SURFACE_ROLES: t.SURFACE_ROLES,
       PROSE_MEASURE: t.PROSE_MEASURE, MIN_TARGET: t.MIN_TARGET,
       DENSITY: t.DENSITY,
     }));`,
  ],
  { encoding: "utf8", cwd: process.cwd() },
);

const t = JSON.parse(json);
const lines = [];

lines.push("/*");
lines.push(" * GENERATED FILE — do not edit.");
lines.push(" *");
lines.push(" * Source: src/lib/design/tokens.ts");
lines.push(" * Regenerate: pnpm design:tokens");
lines.push(" */");
lines.push("");
lines.push("@theme {");

lines.push("  /* Neutral ramp — all chrome draws from here. */");
for (const step of t.NEUTRAL_STEPS) {
  lines.push(`  --color-neutral-${step}: ${t.NEUTRAL[step]};`);
}

lines.push("");
lines.push("  /* Semantic colour — the only place hue is permitted. */");
for (const [grade, modes] of Object.entries(t.EVIDENCE)) {
  lines.push(`  --color-evidence-${grade}: ${modes.dark};`);
}
for (const [zone, value] of Object.entries(t.LANDMARK)) {
  lines.push(`  --color-landmark-${zone}: ${value};`);
}
for (const [slot, modes] of Object.entries(t.CHART)) {
  lines.push(`  --color-chart-${slot}: ${modes.dark};`);
}

lines.push("");
lines.push("  /* Typography. */");
lines.push("  --font-prose: var(--font-newsreader);");
lines.push("  --font-ui: var(--font-plex-sans);");
lines.push("  --font-mono: var(--font-plex-mono);");
lines.push("  --font-sans: var(--font-plex-sans);");
for (const [name, step] of Object.entries(t.TYPE_PROSE)) {
  lines.push(`  --text-prose-${name}: ${step.size};`);
  lines.push(`  --text-prose-${name}--line-height: ${step.lineHeight};`);
}
for (const [name, step] of Object.entries(t.TYPE_UI)) {
  lines.push(`  --text-ui-${name}: ${step.size};`);
  lines.push(`  --text-ui-${name}--line-height: ${step.lineHeight};`);
}

for (const [name, value] of Object.entries(t.TRACKING)) {
  lines.push(`  --tracking-${name}: ${value};`);
}

lines.push("");
lines.push("  /* 4px grid. */");
for (const [name, value] of Object.entries(t.SPACE)) {
  lines.push(`  --spacing-${name}: ${value};`);
}

lines.push("");
lines.push("  /* Radii stay small — 4px ceiling on containers. */");
for (const [name, value] of Object.entries(t.RADIUS)) {
  lines.push(`  --radius-${name}: ${value};`);
}

lines.push("");
lines.push("  /* Motion: short, flat, two properties. */");
lines.push(`  --duration-fast: ${t.MOTION.fast};`);
lines.push(`  --duration-base: ${t.MOTION.base};`);
lines.push(`  --duration-slow: ${t.MOTION.slow};`);
lines.push(`  --ease-out-quint: ${t.MOTION.easing};`);

lines.push("");
lines.push("  /* Shadows exist only on true overlays. */");
lines.push(`  --shadow-overlay: ${t.SHADOW.overlay};`);
lines.push("}");
lines.push("");

// Surface roles as plain custom properties, switched by [data-surface].
lines.push("/* Surface roles. Switched by [data-surface] on the route shell. */");
for (const [surface, roles] of Object.entries(t.SURFACE_ROLES)) {
  const selector =
    surface === "dark" ? ':root, [data-surface="dark"]' : '[data-surface="light"]';
  lines.push(`${selector} {`);
  for (const [role, value] of Object.entries(roles)) {
    lines.push(`  --surface-${kebab(role)}: ${value};`);
  }
  // The vendored shadcn primitives read these raw names directly, and the
  // stylesheet paints the body from --background. Remapping only the Tailwind
  // utility names left those at shadcn's defaults, which is how the knowledge
  // layer ended up as light text on a white background.
  lines.push(`  --background: ${roles.background};`);
  lines.push(`  --foreground: ${roles.textBody};`);
  lines.push(`  --card: ${roles.surface};`);
  lines.push(`  --card-foreground: ${roles.textBody};`);
  lines.push(`  --popover: ${roles.surfaceRaised};`);
  lines.push(`  --popover-foreground: ${roles.textBody};`);
  lines.push(`  --primary: ${roles.textStrong};`);
  lines.push(`  --primary-foreground: ${roles.background};`);
  lines.push(`  --secondary: ${roles.surfaceRaised};`);
  lines.push(`  --secondary-foreground: ${roles.textBody};`);
  lines.push(`  --muted: ${roles.surfaceRaised};`);
  lines.push(`  --muted-foreground: ${roles.textMuted};`);
  lines.push(`  --accent: ${roles.surfaceRaised};`);
  lines.push(`  --accent-foreground: ${roles.textStrong};`);
  lines.push(`  --border: ${roles.hairline};`);
  lines.push(`  --input: ${roles.border};`);
  lines.push(`  --ring: ${roles.textMuted};`);
  for (const [grade, modes] of Object.entries(t.EVIDENCE)) {
    lines.push(`  --evidence-${grade}: ${modes[surface]};`);
  }
  for (const [slot, modes] of Object.entries(t.CHART)) {
    lines.push(`  --chart-${slot}: ${modes[surface]};`);
  }
  lines.push("}");
  lines.push("");
}

lines.push("/* Density tiers, applied via [data-density]. */");
for (const [tier, values] of Object.entries(t.DENSITY)) {
  lines.push(`[data-density="${tier}"] {`);
  for (const [key, value] of Object.entries(values)) {
    lines.push(`  --density-${kebab(key)}: ${value};`);
  }
  lines.push("}");
}
lines.push("");
lines.push(":root {");
lines.push(`  --prose-measure: ${t.PROSE_MEASURE};`);
lines.push(`  --min-target: ${t.MIN_TARGET};`);
lines.push("}");
lines.push("");

const output = lines.join("\n");

function kebab(value) {
  return value.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

if (process.argv.includes("--check")) {
  const existing = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (existing !== output) {
    console.error(
      "tokens.generated.css is stale. Run `pnpm design:tokens` and commit the result.",
    );
    process.exit(1);
  }
  console.log("tokens.generated.css is up to date.");
} else {
  fs.writeFileSync(OUT, output);
  console.log(`Wrote ${OUT}`);
}
