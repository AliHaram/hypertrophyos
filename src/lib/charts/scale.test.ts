import { describe, expect, it } from "vitest";

import {
  PLOT_MAX,
  area,
  niceScale,
  plotPoints,
  polyline,
  project,
  projectY,
} from "@/lib/charts/scale";

describe("project", () => {
  const domain = { min: 0, max: 30 };

  it("maps the domain onto 0–100", () => {
    expect(project(0, domain)).toBe(0);
    expect(project(15, domain)).toBe(50);
    expect(project(30, domain)).toBe(PLOT_MAX);
  });

  it("handles a non-zero minimum", () => {
    expect(project(2, { min: 1, max: 5 })).toBe(25);
  });

  it("rejects a zero-span domain rather than dividing by zero", () => {
    expect(() => project(1, { min: 4, max: 4 })).toThrow(RangeError);
  });
});

describe("projectY", () => {
  it("flips, so a larger value sits nearer the top of the plot", () => {
    const domain = { min: 0, max: 10 };
    expect(projectY(0, domain)).toBe(100);
    expect(projectY(10, domain)).toBe(0);
    expect(projectY(10, domain)).toBeLessThan(projectY(2, domain));
  });
});

describe("plotPoints", () => {
  it("projects both axes together", () => {
    const points = plotPoints(
      [
        { x: 0, y: 0 },
        { x: 10, y: 5 },
      ],
      { min: 0, max: 10 },
      { min: 0, max: 10 },
    );
    expect(points).toEqual([
      { x: 0, y: 100 },
      { x: 100, y: 50 },
    ]);
  });
});

describe("polyline", () => {
  it("opens with a move and continues with lines", () => {
    expect(
      polyline([
        { x: 0, y: 100 },
        { x: 50, y: 20 },
        { x: 100, y: 0 },
      ]),
    ).toBe("M0 100 L50 20 L100 0");
  });

  it("returns empty for no points instead of a malformed path", () => {
    expect(polyline([])).toBe("");
  });

  it("rounds to two decimals", () => {
    expect(polyline([{ x: 1 / 3, y: 2 / 3 }])).toBe("M0.33 0.67");
  });
});

describe("area", () => {
  it("closes the path down to the baseline", () => {
    expect(
      area([
        { x: 0, y: 50 },
        { x: 100, y: 10 },
      ]),
    ).toBe("M0 50 L100 10 L100 100 L0 100 Z");
  });

  it("accepts a baseline above the floor", () => {
    expect(area([{ x: 0, y: 10 }], 40)).toBe("M0 10 L0 40 L0 40 Z");
  });
});

describe("niceScale", () => {
  it("rounds the top of the axis up to a readable number", () => {
    // The dose-response curve tops out at 10.8% at thirty weekly sets. Fives,
    // not the arithmetically tighter thirds — 3 is not in the step set, because
    // an axis counted in thirds is one the reader has to decode.
    const scale = niceScale(10.8);
    expect(scale.step).toBe(5);
    expect(scale.domain.max).toBe(15);
    expect(scale.ticks).toEqual([0, 5, 10, 15]);
  });

  it("never truncates the data", () => {
    for (const max of [0.4, 1, 7, 23, 99, 101, 1234]) {
      expect(niceScale(max).domain.max).toBeGreaterThanOrEqual(max);
    }
  });

  it("produces steps free of float dust", () => {
    // 0.1 * 3 is 0.30000000000000004 in binary floating point; an axis label
    // reading "0.30000000000000004" is the classic tell.
    const scale = niceScale(0.5, 5);
    for (const tick of scale.ticks) {
      expect(String(tick).length).toBeLessThan(6);
    }
  });

  it("spaces ticks evenly", () => {
    const { ticks, step } = niceScale(25);
    for (let index = 1; index < ticks.length; index += 1) {
      const previous = ticks[index - 1];
      const current = ticks[index];
      expect(previous).toBeDefined();
      expect(current).toBeDefined();
      expect(current! - previous!).toBeCloseTo(step, 10);
    }
  });

  it("always starts at zero, so bar lengths stay proportional", () => {
    expect(niceScale(87).ticks[0]).toBe(0);
  });

  it("rejects a non-positive maximum", () => {
    expect(() => niceScale(0)).toThrow(RangeError);
    expect(() => niceScale(-3)).toThrow(RangeError);
  });

  it("rejects a fractional tick count", () => {
    expect(() => niceScale(10, 2.5)).toThrow(RangeError);
  });
});
