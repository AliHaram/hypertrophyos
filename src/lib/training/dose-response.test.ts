import { describe, expect, it } from "vitest";

import {
  ANNUAL_GAIN_MODEL_LB,
  cumulativeGain,
  cumulativeGainByYear,
  doseResponseCurve,
  fractionOfAttainableGain,
  marginalGainPerSet,
  projectedAnnualGain,
} from "./dose-response";

describe("marginalGainPerSet", () => {
  it("matches the Schoenfeld 2017 figure of ~0.37% near the middle of the studied range", () => {
    expect(marginalGainPerSet(10)).toBeCloseTo(0.37, 2);
  });

  it("decreases monotonically as weekly volume rises", () => {
    const points = [0, 5, 10, 15, 20, 25, 30].map(marginalGainPerSet);
    for (let i = 1; i < points.length; i += 1) {
      expect(points[i]!).toBeLessThan(points[i - 1]!);
    }
  });

  it("returns far more for the first set than for the twentieth", () => {
    expect(marginalGainPerSet(0) / marginalGainPerSet(20)).toBeGreaterThan(4);
  });

  it("stays positive — the model has diminishing returns, not a hard ceiling", () => {
    expect(marginalGainPerSet(200)).toBeGreaterThan(0);
  });

  it("rejects negative volume", () => {
    expect(() => marginalGainPerSet(-1)).toThrow(RangeError);
  });
});

describe("cumulativeGain", () => {
  it("is zero at zero sets", () => {
    expect(cumulativeGain(0)).toBe(0);
  });

  it("increases monotonically", () => {
    expect(cumulativeGain(20)).toBeGreaterThan(cumulativeGain(10));
    expect(cumulativeGain(10)).toBeGreaterThan(cumulativeGain(5));
  });

  it("is concave — doubling sets does not double the gain", () => {
    expect(cumulativeGain(20)).toBeLessThan(cumulativeGain(10) * 2);
  });

  it("lands in the range the underlying trials observed", () => {
    expect(cumulativeGain(20)).toBeGreaterThan(5);
    expect(cumulativeGain(20)).toBeLessThan(12);
  });

  it("rejects negative volume", () => {
    expect(() => cumulativeGain(-0.5)).toThrow(RangeError);
  });
});

describe("fractionOfAttainableGain", () => {
  it("captures most of the available stimulus well before the reference volume", () => {
    expect(fractionOfAttainableGain(10, 20)).toBeGreaterThan(0.65);
  });

  it("is exactly 1 at the reference volume", () => {
    expect(fractionOfAttainableGain(20, 20)).toBe(1);
  });

  it("never exceeds 1, even far above the reference", () => {
    expect(fractionOfAttainableGain(60, 20)).toBe(1);
  });

  it("is 0 with no sets", () => {
    expect(fractionOfAttainableGain(0)).toBe(0);
  });

  it("returns 0 rather than dividing by zero at a zero reference", () => {
    expect(fractionOfAttainableGain(10, 0)).toBe(0);
  });
});

describe("doseResponseCurve", () => {
  it("samples inclusively from zero to the maximum", () => {
    const curve = doseResponseCurve(30, 1);

    expect(curve).toHaveLength(31);
    expect(curve[0]).toMatchObject({ sets: 0, gain: 0 });
    expect(curve.at(-1)?.sets).toBe(30);
  });

  it("honours a custom step", () => {
    expect(doseResponseCurve(10, 5).map((p) => p.sets)).toEqual([0, 5, 10]);
  });

  it("rejects a non-positive step rather than looping forever", () => {
    expect(() => doseResponseCurve(10, 0)).toThrow(RangeError);
  });
});

describe("annual gain model", () => {
  it("roughly halves each year through the years where the heuristic holds", () => {
    // Only asserted through year 4. The halving is a description of the early
    // decay, and by the tail the model is flattening toward an asymptote
    // rather than continuing to halve — 3 lb to 2 lb is a ratio of 0.67.
    for (let i = 1; i < 4; i += 1) {
      const previous = ANNUAL_GAIN_MODEL_LB[i - 1]!;
      const current = ANNUAL_GAIN_MODEL_LB[i]!;
      const ratio = current.high / previous.high;

      expect(ratio).toBeGreaterThan(0.35);
      expect(ratio).toBeLessThan(0.65);
    }
  });

  it("decreases every year without exception", () => {
    for (let i = 1; i < ANNUAL_GAIN_MODEL_LB.length; i += 1) {
      expect(ANNUAL_GAIN_MODEL_LB[i]!.high).toBeLessThan(
        ANNUAL_GAIN_MODEL_LB[i - 1]!.high,
      );
    }
  });

  it("keeps every band ordered low <= high", () => {
    for (const entry of ANNUAL_GAIN_MODEL_LB) {
      expect(entry.low).toBeLessThanOrEqual(entry.high);
    }
  });

  it("puts first-year novice gain at the widely cited 20–25 lb", () => {
    expect(ANNUAL_GAIN_MODEL_LB[0]).toEqual({ year: 1, low: 20, high: 25 });
  });

  it("accumulates across years", () => {
    expect(cumulativeGainByYear(1)).toEqual({ low: 20, high: 25 });
    expect(cumulativeGainByYear(3)).toEqual({ low: 35, high: 43 });
  });

  it("shows the fourth year adding less than a tenth of the first", () => {
    const yearOne = cumulativeGainByYear(1);
    const yearFour = ANNUAL_GAIN_MODEL_LB[3]!;

    expect(yearFour.high / yearOne.high).toBeLessThan(0.15);
  });

  it("rejects non-positive or fractional years", () => {
    expect(() => cumulativeGainByYear(0)).toThrow(RangeError);
    expect(() => cumulativeGainByYear(2.5)).toThrow(RangeError);
  });

  it("continues halving beyond the tabulated years instead of dropping to zero", () => {
    expect(projectedAnnualGain(5)).toEqual({ low: 1, high: 2 });
    expect(projectedAnnualGain(6)).toEqual({ low: 0.5, high: 1 });
    expect(projectedAnnualGain(7)).toEqual({ low: 0.25, high: 0.5 });
    expect(projectedAnnualGain(20).high).toBeGreaterThan(0);
  });
});
