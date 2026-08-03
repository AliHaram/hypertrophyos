import { describe, expect, it } from "vitest";

import {
  INVOLVEMENT_META,
  type Involvement,
  involvementFromLegacyWeight,
  involvementMultiplier,
  involvementSchema,
} from "./involvement";
import { tallyVolume, tallyVolumeByMuscle } from "./volume";

describe("involvementMultiplier", () => {
  it("maps the three tiers to Pelland's coding", () => {
    expect(involvementMultiplier("direct")).toBe(1);
    expect(involvementMultiplier("fractional")).toBe(0.5);
    expect(involvementMultiplier("indirect")).toBe(0);
  });

  it("exposes exactly three tiers — no room for a fourth", () => {
    expect(involvementSchema.options).toEqual([
      "direct",
      "fractional",
      "indirect",
    ]);
  });

  it("keeps INVOLVEMENT_META multipliers in step with the function", () => {
    for (const tier of involvementSchema.options) {
      expect(INVOLVEMENT_META[tier].multiplier).toBe(
        involvementMultiplier(tier),
      );
    }
  });

  it("rejects a value outside the enum at the parse boundary", () => {
    expect(involvementSchema.safeParse("synergist").success).toBe(false);
    expect(involvementSchema.safeParse(0.5).success).toBe(false);
  });
});

describe("involvementFromLegacyWeight", () => {
  it("maps the canonical Phase 1 floats exactly", () => {
    expect(involvementFromLegacyWeight(1)).toEqual({
      involvement: "direct",
      exact: true,
    });
    expect(involvementFromLegacyWeight(0.5)).toEqual({
      involvement: "fractional",
      exact: true,
    });
    expect(involvementFromLegacyWeight(0)).toEqual({
      involvement: "indirect",
      exact: true,
    });
  });

  it("flags a non-canonical float as inexact rather than rounding silently", () => {
    const result = involvementFromLegacyWeight(0.35);

    expect(result.involvement).toBe("fractional");
    expect(result.exact).toBe(false);
  });

  it("snaps to the nearest tier at each boundary", () => {
    expect(involvementFromLegacyWeight(0.8).involvement).toBe("direct");
    expect(involvementFromLegacyWeight(0.6).involvement).toBe("fractional");
    expect(involvementFromLegacyWeight(0.1).involvement).toBe("indirect");
  });
});

/**
 * The migration guarantee.
 *
 * The recoding must not move any number the app has already shown a user. This
 * replays the Phase 1 seed shape through the new enum path and asserts the
 * tallies match what the float path produced.
 */
describe("volume tallying is unchanged by the recoding", () => {
  const LEGACY_SEED: ReadonlyArray<{
    muscleId: string;
    weight: number;
    reps: number;
  }> = [
    { muscleId: "chest", weight: 1, reps: 3 },
    { muscleId: "triceps", weight: 0.5, reps: 3 },
    { muscleId: "front-delts", weight: 0.5, reps: 3 },
    { muscleId: "lats", weight: 1, reps: 4 },
    { muscleId: "biceps", weight: 0.5, reps: 4 },
    { muscleId: "spinal-erectors", weight: 0, reps: 4 },
    { muscleId: "quads", weight: 1, reps: 5 },
    { muscleId: "glutes", weight: 0.5, reps: 5 },
  ];

  /** What the Phase 1 float implementation computed, recomputed directly. */
  function legacyEffectiveSets(muscleId: string): number {
    const total = LEGACY_SEED.filter(
      (entry) => entry.muscleId === muscleId,
    ).reduce((sum, entry) => sum + entry.weight * entry.reps, 0);
    return Math.round(total * 100) / 100;
  }

  const sets = LEGACY_SEED.flatMap((entry) =>
    Array.from({ length: entry.reps }, () => ({
      muscleId: entry.muscleId,
      involvement: involvementFromLegacyWeight(entry.weight).involvement,
      correctedRir: 1,
      completed: true,
    })),
  );

  it("produces identical per-muscle effective sets for the seed set", () => {
    const tallied = tallyVolumeByMuscle(sets);

    for (const muscleId of new Set(LEGACY_SEED.map((e) => e.muscleId))) {
      // An indirect-only muscle keeps a zeroed entry rather than disappearing.
      // That is deliberate: it was loaded, it costs recovery, and the fatigue
      // ledger needs to see it even though it contributes no volume.
      expect(tallied[muscleId]?.effectiveSets).toBe(legacyEffectiveSets(muscleId));
    }
  });

  it("produces an identical whole-session total", () => {
    const expected =
      Math.round(
        LEGACY_SEED.reduce(
          (sum, entry) => sum + entry.weight * entry.reps,
          0,
        ) * 100,
      ) / 100;

    expect(tallyVolume(sets).effectiveSets).toBe(expected);
  });

  it("codes every Phase 1 seed weight exactly — no snapping was needed", () => {
    for (const entry of LEGACY_SEED) {
      expect(involvementFromLegacyWeight(entry.weight).exact).toBe(true);
    }
  });
});

describe("tallyVolume with enum involvement", () => {
  function set(involvement: Involvement) {
    return {
      muscleId: "chest",
      involvement,
      correctedRir: 1,
      completed: true,
    };
  }

  it("counts direct as one and fractional as a half", () => {
    expect(tallyVolume([set("direct"), set("fractional")]).effectiveSets).toBe(
      1.5,
    );
  });

  it("drops indirect entirely", () => {
    expect(tallyVolume([set("indirect")]).totalSets).toBe(0);
  });

  it("does not accumulate float drift across a week of fractional sets", () => {
    const sets = Array.from({ length: 21 }, () => set("fractional"));

    expect(tallyVolume(sets).effectiveSets).toBe(10.5);
  });
});
