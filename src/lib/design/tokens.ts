/**
 * The design system's single source of truth.
 *
 * Every colour, size, radius, and duration in the app originates here. The
 * `@theme` block Tailwind consumes is generated from this file by
 * `pnpm design:tokens`; CI regenerates and diffs it, so the CSS cannot drift
 * from the TypeScript.
 *
 * Two rules govern everything below, and both exist to keep the interface out
 * of the register that AI-assisted projects converge on:
 *
 * 1. **Chrome is achromatic.** Backgrounds, surfaces, borders, body text,
 *    icons, buttons, and navigation all draw from one warm-neutral ramp. Hue
 *    appears only where it encodes meaning — evidence grades, volume zones,
 *    recovery states. When a user sees colour, it is carrying information.
 *
 * 2. **No arbitrary values in components.** If a size is not in this file, it
 *    is not available. `scripts/check-design-tokens.mjs` fails the build on
 *    arbitrary Tailwind values outside the allowlist.
 *
 * See docs/design-principles.md for the reasoning.
 */

// ---------------------------------------------------------------------------
// The neutral ramp
// ---------------------------------------------------------------------------

/**
 * Twelve warm-neutral steps, from near-black to paper.
 *
 * Warm rather than pure gray: a slight yellow bias (OKLCH hue 80, chroma
 * 0.003–0.008) reads as paper and ink rather than as screen. Neither end is
 * pure — `#0b0a08` not `#000`, `#f8f6f4` not `#fff` — because pure black and
 * pure white are the two values that make a screen look like a default.
 *
 * Contrast ratios are measured, not estimated. See `contrast.test.ts`.
 */
export const NEUTRAL = {
  "00": "#0b0a08", // dark surface base
  "01": "#171614", // dark raised surface
  "02": "#262421", // dark hairline
  "03": "#373531", // dark strong border
  "04": "#4d4a46",
  "05": "#66635e", // paper muted text — 5.55:1 on 11
  "06": "#807d78",
  "07": "#9a9893", // dark muted text — 6.87:1 on 00
  "08": "#b6b4b0",
  "09": "#d3d1cd", // dark body text — 12.98:1 on 00
  "10": "#e9e7e5", // paper raised surface
  "11": "#f8f6f4", // paper surface base
} as const;

export type NeutralStep = keyof typeof NEUTRAL;

/**
 * The ramp in ramp order.
 *
 * Needed because `Object.keys(NEUTRAL)` does *not* return these in sequence:
 * `"10"` and `"11"` are canonical array-index strings, so V8 hoists them ahead
 * of `"00"`–`"09"`, which are not. Any consumer that iterates the object
 * directly renders the ramp out of order. Always iterate this array.
 */
export const NEUTRAL_STEPS: readonly NeutralStep[] = [
  "00",
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "10",
  "11",
];

// ---------------------------------------------------------------------------
// Semantic colour — the only place hue is permitted
// ---------------------------------------------------------------------------

/**
 * Evidence grades.
 *
 * Reused from Phase 1's validated set rather than reinvented; the fourth grade
 * takes the validated blue. These are a *status* scale, not a categorical
 * palette: they always ship with a text label and a distinct gutter stroke, so
 * colour is never the only channel. That matters — measured against the
 * categorical CVD checks, green and red collapse to ΔE 3.8 under deuteranopia,
 * which is inherent to any good/bad status pair and is exactly why the
 * secondary encoding is mandatory rather than decorative.
 */
export const EVIDENCE = {
  strong: { dark: "#56bd78", light: "#137d41" },
  mixed: { dark: "#e5b15b", light: "#b27923" },
  mechanical: { dark: "#3987e5", light: "#2a78d6" },
  weak: { dark: "#ea6a64", light: "#c13c3b" },
} as const;

/** Volume-landmark zones. An ordered status scale, always with icon + label. */
export const LANDMARK = {
  below: "#898781",
  mev: "#0ca30c",
  mav: "#fab219",
  mrv: "#ec835a",
  over: "#d03b3b",
} as const;

/** Chart series. Phase 1's validated categorical slots, unchanged. */
export const CHART = {
  1: { dark: "#3987e5", light: "#2a78d6" },
  2: { dark: "#d95926", light: "#eb6834" },
  3: { dark: "#199e70", light: "#1baf7a" },
  4: { dark: "#c98500", light: "#eda100" },
  5: { dark: "#d55181", light: "#e87ba4" },
} as const;

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

/**
 * Three faces, three jobs, no overlap.
 *
 * Newsreader carries the knowledge layer because it is genuinely editorial —
 * a variable serif with an optical-size axis, which lets the display sizes
 * tighten without the body text losing its aperture. IBM Plex Sans carries the
 * interface: institutional and technical, drawn for a company that makes
 * mainframes, and specifically not the neutral grotesque every other product
 * reaches for. IBM Plex Mono carries every number in the product.
 */
export const FONT_FAMILY = {
  prose: "var(--font-newsreader)",
  ui: "var(--font-plex-sans)",
  mono: "var(--font-plex-mono)",
} as const;

/**
 * Two scales, because prose and data have different jobs.
 *
 * The prose scale is a 1.2 modular scale off a 17px base, set at a measure of
 * 62–72 characters and a line height near 1.6. The UI scale is tighter — a
 * 1.125 ratio off 14px — because dense tables need steps that are close
 * together, and a table set on a prose scale wastes half the screen.
 *
 * Every line height is a multiple of 4 so type lands on the base grid.
 */
export const TYPE_PROSE = {
  xs: { size: "0.875rem", lineHeight: "1.25rem" }, // 14 / 20
  sm: { size: "0.9375rem", lineHeight: "1.5rem" }, // 15 / 24
  base: { size: "1.0625rem", lineHeight: "1.75rem" }, // 17 / 28 → 1.647
  lg: { size: "1.25rem", lineHeight: "2rem" }, // 20 / 32
  xl: { size: "1.5rem", lineHeight: "2rem" }, // 24 / 32
  "2xl": { size: "1.875rem", lineHeight: "2.5rem" }, // 30 / 40
  "3xl": { size: "2.25rem", lineHeight: "2.75rem" }, // 36 / 44
  "4xl": { size: "2.75rem", lineHeight: "3.25rem" }, // 44 / 52
} as const;

export const TYPE_UI = {
  "2xs": { size: "0.6875rem", lineHeight: "1rem" }, // 11 / 16
  xs: { size: "0.75rem", lineHeight: "1rem" }, // 12 / 16
  sm: { size: "0.8125rem", lineHeight: "1.25rem" }, // 13 / 20
  base: { size: "0.875rem", lineHeight: "1.25rem" }, // 14 / 20
  md: { size: "1rem", lineHeight: "1.5rem" }, // 16 / 24
  lg: { size: "1.125rem", lineHeight: "1.5rem" }, // 18 / 24
  xl: { size: "1.25rem", lineHeight: "1.75rem" }, // 20 / 28
} as const;

/**
 * Letter-spacing.
 *
 * `eyebrow` is the tracked-out mono used for structural labels. Tracking that
 * wide only works at small sizes in uppercase; it is not a general-purpose
 * step, which is why there are three values rather than a scale.
 */
export const TRACKING = {
  tight: "-0.01em",
  normal: "0em",
  eyebrow: "0.12em",
} as const;

/** The reading measure. Below 62 characters prose feels choppy; above 72 the eye loses the line. */
export const PROSE_MEASURE = "68ch";

// ---------------------------------------------------------------------------
// Structure
// ---------------------------------------------------------------------------

/** 4px base grid. Nothing in the app sits off it. */
export const SPACE = {
  0: "0px",
  1: "0.25rem", // 4
  2: "0.5rem", // 8
  3: "0.75rem", // 12
  4: "1rem", // 16
  5: "1.25rem", // 20
  6: "1.5rem", // 24
  8: "2rem", // 32
  10: "2.5rem", // 40
  12: "3rem", // 48
  16: "4rem", // 64
  20: "5rem", // 80
  24: "6rem", // 96
} as const;

/**
 * Radii stay small.
 *
 * 2px is the default and 4px is the ceiling on containers. Large radii on data
 * containers read as consumer-app softness, and this is an instrument. `full`
 * exists only for genuine pills and avatars.
 */
export const RADIUS = {
  none: "0px",
  sm: "2px",
  md: "4px",
  full: "9999px",
} as const;

/**
 * Three density tiers.
 *
 * `comfortable` for prose, `compact` for tables, `condensed` for the in-gym
 * logger — where a thumb with chalk on it matters more than elegance, so row
 * heights go up rather than down. Condensed is not "smaller"; it is
 * *bigger targets, less ornament*.
 */
export const DENSITY = {
  comfortable: { rowHeight: "3rem", paddingX: SPACE[5], paddingY: SPACE[3], fontSize: TYPE_UI.base.size },
  compact: { rowHeight: "2.25rem", paddingX: SPACE[3], paddingY: SPACE[2], fontSize: TYPE_UI.sm.size },
  condensed: { rowHeight: "3.5rem", paddingX: SPACE[4], paddingY: SPACE[3], fontSize: TYPE_UI.md.size },
} as const;

export type Density = keyof typeof DENSITY;

/** Minimum interactive target. 44px is the accessibility floor, not a goal. */
export const MIN_TARGET = "2.75rem";

/**
 * Shadows exist only on true overlays.
 *
 * Regions are separated by hairline rules at low-contrast ramp steps, not by
 * floating cards. When a shadow does appear it is tight and neutral — never a
 * soft coloured glow.
 */
export const SHADOW = {
  overlay: "0 4px 12px rgb(0 0 0 / 0.28), 0 1px 2px rgb(0 0 0 / 0.2)",
} as const;

// ---------------------------------------------------------------------------
// Motion
// ---------------------------------------------------------------------------

/**
 * Short, flat, and only two properties.
 *
 * 120–180ms ease-out on opacity and 2–4px transforms. No spring physics, no
 * staggered reveals, no scroll-triggered animation — all three read as
 * decoration, and decoration is what this interface is arguing against.
 */
export const MOTION = {
  fast: "120ms",
  base: "150ms",
  slow: "180ms",
  easing: "cubic-bezier(0.16, 1, 0.3, 1)",
  nudge: "2px",
  nudgeLarge: "4px",
} as const;

// ---------------------------------------------------------------------------
// Theme mapping
// ---------------------------------------------------------------------------

/**
 * Which ramp step plays which role, per surface.
 *
 * Dark is primary for the logger and dashboard. Light is primary for the
 * knowledge layer — long-form reading is genuinely worse in dark mode, and
 * saying so is more honest than shipping one theme and calling it a
 * preference.
 */
export const SURFACE_ROLES = {
  dark: {
    background: NEUTRAL["00"],
    surface: NEUTRAL["01"],
    surfaceRaised: NEUTRAL["02"],
    hairline: NEUTRAL["02"],
    border: NEUTRAL["03"],
    textMuted: NEUTRAL["07"],
    textBody: NEUTRAL["09"],
    textStrong: NEUTRAL["11"],
  },
  light: {
    background: NEUTRAL["11"],
    surface: NEUTRAL["11"],
    surfaceRaised: NEUTRAL["10"],
    hairline: NEUTRAL["09"],
    border: NEUTRAL["08"],
    textMuted: NEUTRAL["05"],
    textBody: NEUTRAL["01"],
    textStrong: NEUTRAL["00"],
  },
} as const;

export type Surface = keyof typeof SURFACE_ROLES;

/**
 * Text pairings that must meet WCAG AA, asserted in `contrast.test.ts`.
 *
 * Listed explicitly rather than derived so that adding a pairing is a
 * deliberate act that comes with a contrast assertion attached.
 */
export const CONTRAST_REQUIREMENTS: ReadonlyArray<{
  name: string;
  foreground: string;
  background: string;
  /** 4.5 for body text, 3.0 for large text and non-text marks. */
  minimum: number;
}> = [
  { name: "dark body text", foreground: NEUTRAL["09"], background: NEUTRAL["00"], minimum: 4.5 },
  { name: "dark muted text", foreground: NEUTRAL["07"], background: NEUTRAL["00"], minimum: 4.5 },
  { name: "dark body on raised surface", foreground: NEUTRAL["09"], background: NEUTRAL["01"], minimum: 4.5 },
  { name: "dark muted on raised surface", foreground: NEUTRAL["07"], background: NEUTRAL["01"], minimum: 4.5 },
  { name: "paper body text", foreground: NEUTRAL["01"], background: NEUTRAL["11"], minimum: 4.5 },
  { name: "paper muted text", foreground: NEUTRAL["05"], background: NEUTRAL["11"], minimum: 4.5 },
  { name: "paper body on raised surface", foreground: NEUTRAL["01"], background: NEUTRAL["10"], minimum: 4.5 },
  { name: "paper muted on raised surface", foreground: NEUTRAL["05"], background: NEUTRAL["10"], minimum: 4.5 },
  { name: "evidence strong dot on dark", foreground: EVIDENCE.strong.dark, background: NEUTRAL["00"], minimum: 3 },
  { name: "evidence mixed dot on dark", foreground: EVIDENCE.mixed.dark, background: NEUTRAL["00"], minimum: 3 },
  { name: "evidence mechanical dot on dark", foreground: EVIDENCE.mechanical.dark, background: NEUTRAL["00"], minimum: 3 },
  { name: "evidence weak dot on dark", foreground: EVIDENCE.weak.dark, background: NEUTRAL["00"], minimum: 3 },
  { name: "evidence strong dot on paper", foreground: EVIDENCE.strong.light, background: NEUTRAL["11"], minimum: 3 },
  { name: "evidence mixed dot on paper", foreground: EVIDENCE.mixed.light, background: NEUTRAL["11"], minimum: 3 },
  { name: "evidence mechanical dot on paper", foreground: EVIDENCE.mechanical.light, background: NEUTRAL["11"], minimum: 3 },
  { name: "evidence weak dot on paper", foreground: EVIDENCE.weak.light, background: NEUTRAL["11"], minimum: 3 },
];
