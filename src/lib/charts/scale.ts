/**
 * Plot geometry for static figures.
 *
 * The knowledge layer's figures are journal plates: fixed data, no interaction,
 * rendered once on the server. A charting library is pure cost there — 160 kB
 * of runtime to draw three shapes that never change. These are the few
 * functions a static plate actually needs, kept in `lib/` so the geometry is
 * unit-testable and the components stay markup.
 *
 * Everything projects into a 0–100 square. The consuming SVG uses
 * `preserveAspectRatio="none"` with `vector-effect="non-scaling-stroke"`, so
 * the plot stretches to whatever box it is given while stroke weights stay
 * honest. Axis labels are HTML positioned by percentage rather than SVG text:
 * text inside a stretched viewBox shears, and text inside an unstretched one
 * renders at about 6px on a phone.
 */

/** Edge of the projected square, in plot units. */
export const PLOT_MAX = 100;

export interface Domain {
  readonly min: number;
  readonly max: number;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Projects a data value onto 0–100. Values outside the domain extrapolate. */
export function project(value: number, domain: Domain): number {
  const span = domain.max - domain.min;
  if (span === 0) throw new RangeError("domain must have a non-zero span");
  return ((value - domain.min) / span) * PLOT_MAX;
}

/**
 * Projects onto 0–100 and flips: SVG's y axis grows downward, a value axis
 * grows upward. Every mistake this prevents is one that renders upside down and
 * still looks plausible at a glance.
 */
export function projectY(value: number, domain: Domain): number {
  return PLOT_MAX - project(value, domain);
}

/** Projects a data series into plot space. */
export function plotPoints(
  data: readonly Point[],
  x: Domain,
  y: Domain,
): Point[] {
  return data.map((point) => ({
    x: project(point.x, x),
    y: projectY(point.y, y),
  }));
}

/**
 * A straight-segment path through the points.
 *
 * Deliberately not smoothed. Spline interpolation invents values between
 * samples and can overshoot past the data's own maximum — on a curve whose
 * entire teaching purpose is its curvature, that would be drawing a claim the
 * model does not make. Sample densely enough and straight segments read as
 * smooth anyway.
 */
export function polyline(points: readonly Point[]): string {
  if (points.length === 0) return "";
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"}${fixed(point.x)} ${fixed(point.y)}`)
    .join(" ");
}

/** The same path, closed down to a baseline, for a filled area. */
export function area(
  points: readonly Point[],
  baseline: number = PLOT_MAX,
): string {
  if (points.length === 0) return "";
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return "";
  return `${polyline(points)} L${fixed(last.x)} ${fixed(baseline)} L${fixed(first.x)} ${fixed(baseline)} Z`;
}

/**
 * A domain ending on a round number, with evenly spaced ticks.
 *
 * An axis that stops at 10.8 because that is where the data stops makes the
 * reader do arithmetic to compare anything. Steps are chosen from 1, 2, 2.5 and
 * 5 times a power of ten — the set people read without thinking.
 */
export function niceScale(
  max: number,
  targetTicks = 4,
): { domain: Domain; ticks: number[]; step: number } {
  if (!(max > 0)) throw new RangeError("max must be > 0");
  if (!Number.isInteger(targetTicks) || targetTicks < 1) {
    throw new RangeError("targetTicks must be a positive integer");
  }

  const step = niceStep(max / targetTicks);
  const top = Math.ceil(max / step) * step;

  // Steps are decimal-fraction sized, so the product accumulates float error
  // (0.1 * 3 = 0.30000000000000004). Rounding to the step's own precision is
  // exact for every step this function can produce.
  const places = decimalPlaces(step);
  const ticks: number[] = [];
  for (let value = 0; value <= top + step / 2; value += step) {
    ticks.push(roundTo(value, places));
  }

  return { domain: { min: 0, max: roundTo(top, places) }, ticks, step };
}

/** Rounds up to the nearest 1, 2, 2.5 or 5 times a power of ten. */
function niceStep(raw: number): number {
  const exponent = Math.floor(Math.log10(raw));
  const magnitude = 10 ** exponent;
  const fraction = raw / magnitude;

  if (fraction <= 1) return magnitude;
  if (fraction <= 2) return 2 * magnitude;
  if (fraction <= 2.5) return 2.5 * magnitude;
  if (fraction <= 5) return 5 * magnitude;
  return 10 * magnitude;
}

function decimalPlaces(value: number): number {
  const text = String(value);
  const dot = text.indexOf(".");
  return dot === -1 ? 0 : text.length - dot - 1;
}

function roundTo(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

/** Path coordinates at plate precision. Two decimals is sub-pixel at any size. */
function fixed(value: number): string {
  return (Math.round(value * 100) / 100).toString();
}
