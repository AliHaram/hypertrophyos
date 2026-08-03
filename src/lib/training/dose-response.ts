/**
 * The volume dose-response curve.
 *
 * Schoenfeld et al. (2017) reported a mean 0.37% additional hypertrophy per
 * added weekly set across the range their studies covered. That figure is
 * routinely misread as linear — as though 40 sets would do four times what 10
 * does. It is a regression slope averaged over a range, not a law, and both
 * Baz-Valle et al. (2022) and Pelland et al. (2026) describe returns that
 * flatten as volume climbs.
 *
 * We model the relationship as saturating:
 *
 *     gain(s) = A · ln(1 + s / k)
 *
 * calibrated so the marginal return near 10 weekly sets matches the 0.37%
 * figure, and so total gain across the studied range stays in the region the
 * trials actually observed.
 *
 * This curve is a teaching device, not a prediction engine. It exists so the
 * shape of diminishing returns is visible; it is not used to prescribe volume,
 * and any UI rendering it says so.
 */

/** Scale constant, in percent. Derived from the calibration below. */
const A = 5.55;

/** Half-saturation constant, in weekly sets. */
const K = 5;

/**
 * Marginal return, in percentage points of hypertrophy, from the next set
 * added at a given weekly volume. The derivative of `cumulativeGain`.
 */
export function marginalGainPerSet(weeklySets: number): number {
  if (weeklySets < 0) throw new RangeError("weeklySets must be >= 0");
  return A / (K + weeklySets);
}

/**
 * Modelled cumulative hypertrophy, in percent, at a given weekly set count
 * over a study-length training block.
 */
export function cumulativeGain(weeklySets: number): number {
  if (weeklySets < 0) throw new RangeError("weeklySets must be >= 0");
  return A * Math.log(1 + weeklySets / K);
}

/**
 * How much of the modelled gain at `referenceSets` is already captured at
 * `weeklySets`. Answers "what fraction of the available stimulus am I getting
 * for this many sets?" — the framing that actually changes behaviour.
 */
export function fractionOfAttainableGain(
  weeklySets: number,
  referenceSets = 20,
): number {
  const reference = cumulativeGain(referenceSets);
  if (reference === 0) return 0;
  return Math.min(1, cumulativeGain(weeklySets) / reference);
}

/** Sample points for plotting the curve. */
export function doseResponseCurve(
  maxSets = 30,
  step = 1,
): Array<{ sets: number; gain: number; marginal: number }> {
  if (step <= 0) throw new RangeError("step must be > 0");
  const points: Array<{ sets: number; gain: number; marginal: number }> = [];
  for (let sets = 0; sets <= maxSets; sets += step) {
    points.push({
      sets,
      gain: round(cumulativeGain(sets), 3),
      marginal: round(marginalGainPerSet(sets), 3),
    });
  }
  return points;
}

/**
 * Realistic annual muscle gain, in pounds, by year of consistent training —
 * the Lyle McDonald / Alan Aragon style model, which halves roughly each year.
 *
 * These figures describe a male novice training and eating well. They are
 * widely cited, broadly consistent with observed rates, and have never been
 * tested in a controlled trial — which is why anything rendering them carries
 * a `mixed` grade rather than a `strong` one. Female lifters gain roughly half
 * these absolute amounts, a similar proportion of starting lean mass.
 */
export const ANNUAL_GAIN_MODEL_LB: ReadonlyArray<{
  year: number;
  low: number;
  high: number;
}> = [
  { year: 1, low: 20, high: 25 },
  { year: 2, low: 10, high: 12 },
  { year: 3, low: 5, high: 6 },
  { year: 4, low: 2, high: 3 },
  { year: 5, low: 1, high: 2 },
];

/** Cumulative lean mass gained by the end of year `n`, as a low/high band. */
export function cumulativeGainByYear(
  year: number,
): { low: number; high: number } {
  if (!Number.isInteger(year) || year < 1) {
    throw new RangeError("year must be a positive integer");
  }
  return ANNUAL_GAIN_MODEL_LB.slice(0, year).reduce(
    (total, entry) => ({
      low: round(total.low + entry.low, 2),
      high: round(total.high + entry.high, 2),
    }),
    { low: 0, high: 0 },
  );
}

/**
 * Expected annual gain for a training year beyond the tabulated model,
 * continuing the halving. Kept explicit so the curve does not silently
 * flatten to zero at year 5.
 */
export function projectedAnnualGain(year: number): { low: number; high: number } {
  if (!Number.isInteger(year) || year < 1) {
    throw new RangeError("year must be a positive integer");
  }
  const tabulated = ANNUAL_GAIN_MODEL_LB[year - 1];
  if (tabulated) return { low: tabulated.low, high: tabulated.high };

  const last = ANNUAL_GAIN_MODEL_LB[ANNUAL_GAIN_MODEL_LB.length - 1];
  if (!last) throw new Error("ANNUAL_GAIN_MODEL_LB must not be empty");

  // Left unrounded: powers of two are exact in binary floating point, so the
  // decay introduces no drift, and rounding would floor late years to zero.
  const yearsBeyond = year - ANNUAL_GAIN_MODEL_LB.length;
  const decay = 0.5 ** yearsBeyond;
  return { low: last.low * decay, high: last.high * decay };
}

function round(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}
