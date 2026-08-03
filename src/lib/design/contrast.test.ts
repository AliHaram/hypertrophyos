import { describe, expect, it } from "vitest";

import { contrastRatio, contrastRatioRounded, parseHex } from "./contrast";
import {
  CONTRAST_REQUIREMENTS,
  NEUTRAL,
  NEUTRAL_STEPS,
  RADIUS,
  SPACE,
  TYPE_PROSE,
  TYPE_UI,
} from "./tokens";

describe("contrastRatio", () => {
  it("returns 21 for black on white", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
  });

  it("returns 1 for a colour against itself", () => {
    expect(contrastRatio("#4d4a46", "#4d4a46")).toBeCloseTo(1, 5);
  });

  it("is order-independent", () => {
    expect(contrastRatio(NEUTRAL["09"], NEUTRAL["00"])).toBeCloseTo(
      contrastRatio(NEUTRAL["00"], NEUTRAL["09"]),
      10,
    );
  });

  it("expands three-digit hex", () => {
    expect(parseHex("#fff")).toEqual([255, 255, 255]);
  });

  it("rejects a malformed colour rather than returning a wrong ratio", () => {
    expect(() => parseHex("not-a-colour")).toThrow(/Not a hex colour/);
    expect(() => parseHex("#12345")).toThrow();
  });
});

/**
 * The accessibility gate.
 *
 * Every declared text and mark pairing is asserted here rather than checked by
 * eye. A token change that breaks a pairing fails this test, which is the
 * point — the ramp is not allowed to drift into being pretty and unreadable.
 */
describe("every declared pairing meets its WCAG minimum", () => {
  it.each(CONTRAST_REQUIREMENTS)(
    "$name meets $minimum:1",
    ({ foreground, background, minimum }) => {
      expect(contrastRatioRounded(foreground, background)).toBeGreaterThanOrEqual(
        minimum,
      );
    },
  );

  it("covers both surfaces", () => {
    const names = CONTRAST_REQUIREMENTS.map((r) => r.name).join(" ");

    expect(names).toMatch(/dark/);
    expect(names).toMatch(/paper/);
  });

  it("covers all four evidence grades on both surfaces", () => {
    for (const grade of ["strong", "mixed", "mechanical", "weak"]) {
      const forGrade = CONTRAST_REQUIREMENTS.filter((r) =>
        r.name.includes(grade),
      );
      expect(forGrade).toHaveLength(2);
    }
  });
});

describe("the neutral ramp", () => {
  it("has twelve steps", () => {
    expect(Object.keys(NEUTRAL)).toHaveLength(12);
  });

  it("increases in luminance monotonically along NEUTRAL_STEPS", () => {
    const steps = NEUTRAL_STEPS.map((step) => NEUTRAL[step]);
    for (let i = 1; i < steps.length; i += 1) {
      expect(contrastRatio(steps[i]!, "#000000")).toBeGreaterThan(
        contrastRatio(steps[i - 1]!, "#000000"),
      );
    }
  });

  it("exposes an explicit step order, because object key order is not ramp order", () => {
    // "10" and "11" are canonical array indices; "00".."09" are not. V8 hoists
    // the former, so Object.keys(NEUTRAL) starts at "10". This assertion
    // documents the trap that caught us.
    expect(Object.keys(NEUTRAL)[0]).toBe("10");
    expect(NEUTRAL_STEPS[0]).toBe("00");
    expect(NEUTRAL_STEPS).toHaveLength(Object.keys(NEUTRAL).length);
  });

  it("uses neither pure black nor pure white at its ends", () => {
    expect(NEUTRAL["00"]).not.toBe("#000000");
    expect(NEUTRAL["11"]).not.toBe("#ffffff");
  });

  it("is warm — the red channel leads the blue at every step", () => {
    for (const [step, hex] of Object.entries(NEUTRAL)) {
      const [r, , b] = parseHex(hex);
      expect(r, `step ${step} should be warm`).toBeGreaterThan(b);
    }
  });

  it("keeps hairlines subtle enough to read as rules, not borders", () => {
    expect(contrastRatio(NEUTRAL["02"], NEUTRAL["00"])).toBeLessThan(2);
    expect(contrastRatio(NEUTRAL["09"], NEUTRAL["11"])).toBeLessThan(2);
  });
});

describe("structural tokens", () => {
  it("keeps every spacing step on the 4px grid", () => {
    for (const [name, value] of Object.entries(SPACE)) {
      const px = Number.parseFloat(value) * (value.endsWith("rem") ? 16 : 1);
      expect(px % 4, `space.${name} = ${value}`).toBe(0);
    }
  });

  it("keeps every line height on the 4px grid", () => {
    for (const scale of [TYPE_PROSE, TYPE_UI]) {
      for (const [name, step] of Object.entries(scale)) {
        const px = Number.parseFloat(step.lineHeight) * 16;
        expect(px % 4, `${name} line height ${step.lineHeight}`).toBe(0);
      }
    }
  });

  it("caps container radii at 4px", () => {
    expect(RADIUS.sm).toBe("2px");
    expect(RADIUS.md).toBe("4px");
    // `full` is permitted only on pills and avatars, which are not containers.
    expect(Object.keys(RADIUS)).toEqual(["none", "sm", "md", "full"]);
  });

  it("sets prose base near a 1.6 line height", () => {
    const ratio =
      Number.parseFloat(TYPE_PROSE.base.lineHeight) /
      Number.parseFloat(TYPE_PROSE.base.size);

    expect(ratio).toBeGreaterThan(1.55);
    expect(ratio).toBeLessThan(1.7);
  });
});
