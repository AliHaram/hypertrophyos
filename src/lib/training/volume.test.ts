import { describe, expect, it } from "vitest";

import {
  DEFAULT_LANDMARKS,
  INVOLVEMENT_WEIGHTS,
  JUNK_VOLUME_RIR_THRESHOLD,
  type LoggedSet,
  classifyVolume,
  tallyVolume,
  tallyVolumeByMuscle,
} from "./volume";

function set(overrides: Partial<LoggedSet> = {}): LoggedSet {
  return {
    muscleId: "chest",
    involvement: 1,
    correctedRir: 1,
    completed: true,
    ...overrides,
  };
}

describe("tallyVolume", () => {
  it("counts a direct set as one and a synergist set as a half", () => {
    const tally = tallyVolume([
      set({ involvement: INVOLVEMENT_WEIGHTS.prime }),
      set({ involvement: INVOLVEMENT_WEIGHTS.synergist }),
    ]);

    expect(tally.effectiveSets).toBe(1.5);
    expect(tally.totalSets).toBe(1.5);
  });

  it("ignores stabiliser involvement entirely", () => {
    const tally = tallyVolume([
      set({ involvement: INVOLVEMENT_WEIGHTS.stabilizer }),
    ]);

    expect(tally.totalSets).toBe(0);
    expect(tally.effectiveSets).toBe(0);
  });

  it("excludes sets past the junk-volume threshold from effective volume", () => {
    const tally = tallyVolume([
      set({ correctedRir: JUNK_VOLUME_RIR_THRESHOLD }),
      set({ correctedRir: JUNK_VOLUME_RIR_THRESHOLD + 1 }),
    ]);

    expect(tally.totalSets).toBe(2);
    expect(tally.effectiveSets).toBe(1);
    expect(tally.junkSets).toBe(1);
  });

  it("treats the threshold itself as still effective", () => {
    const tally = tallyVolume([set({ correctedRir: 4 })]);

    expect(tally.effectiveSets).toBe(1);
    expect(tally.junkSets).toBe(0);
  });

  it("counts unrated sets as effective but reports them separately", () => {
    const tally = tallyVolume([set({ correctedRir: null })]);

    expect(tally.effectiveSets).toBe(1);
    expect(tally.unratedSets).toBe(1);
    expect(tally.junkSets).toBe(0);
  });

  it("skips sets that were never completed", () => {
    const tally = tallyVolume([set({ completed: false })]);

    expect(tally.totalSets).toBe(0);
  });

  it("clamps involvement outside 0–1 rather than propagating it", () => {
    expect(tallyVolume([set({ involvement: 4 })]).totalSets).toBe(1);
    expect(tallyVolume([set({ involvement: -2 })]).totalSets).toBe(0);
    expect(tallyVolume([set({ involvement: Number.NaN })]).totalSets).toBe(0);
  });

  it("does not accumulate float drift across a week of half-sets", () => {
    const sets = Array.from({ length: 21 }, () => set({ involvement: 0.5 }));

    expect(tallyVolume(sets).effectiveSets).toBe(10.5);
  });

  it("returns a zeroed tally for no sets", () => {
    expect(tallyVolume([])).toEqual({
      effectiveSets: 0,
      totalSets: 0,
      junkSets: 0,
      unratedSets: 0,
    });
  });
});

describe("tallyVolumeByMuscle", () => {
  it("splits a compound lift across its muscles at their own weights", () => {
    const byMuscle = tallyVolumeByMuscle([
      set({ muscleId: "chest", involvement: 1 }),
      set({ muscleId: "triceps", involvement: 0.5 }),
      set({ muscleId: "front-delts", involvement: 0.5 }),
    ]);

    expect(byMuscle.chest?.effectiveSets).toBe(1);
    expect(byMuscle.triceps?.effectiveSets).toBe(0.5);
    expect(byMuscle["front-delts"]?.effectiveSets).toBe(0.5);
  });

  it("omits muscles with no logged sets", () => {
    const byMuscle = tallyVolumeByMuscle([set({ muscleId: "chest" })]);

    expect(Object.keys(byMuscle)).toEqual(["chest"]);
  });
});

describe("classifyVolume", () => {
  const landmarks = { mev: 6, mav: 14, mrv: 20 };

  it.each([
    [0, "under-mev"],
    [5.5, "under-mev"],
    [6, "mev-to-mav"],
    [13.9, "mev-to-mav"],
    [14, "mav-to-mrv"],
    [20, "mav-to-mrv"],
    [20.5, "over-mrv"],
  ] as const)("places %d sets in %s", (sets, expected) => {
    expect(classifyVolume(sets, landmarks)).toBe(expected);
  });

  it("uses inclusive lower bounds so a muscle exactly at MEV is not flagged", () => {
    expect(classifyVolume(landmarks.mev, landmarks)).toBe("mev-to-mav");
  });

  it("treats MRV as the last recoverable set, not the first unrecoverable one", () => {
    expect(classifyVolume(landmarks.mrv, landmarks)).toBe("mav-to-mrv");
    expect(classifyVolume(landmarks.mrv + 0.5, landmarks)).toBe("over-mrv");
  });

  it("rejects landmarks that are out of order", () => {
    expect(() => classifyVolume(10, { mev: 14, mav: 6, mrv: 20 })).toThrow(
      /MEV <= MAV <= MRV/,
    );
  });

  it("accepts collapsed landmarks where a user's estimates coincide", () => {
    expect(classifyVolume(10, { mev: 10, mav: 10, mrv: 10 })).toBe(
      "mav-to-mrv",
    );
  });

  it("ships defaults that are internally consistent", () => {
    expect(() => classifyVolume(10, DEFAULT_LANDMARKS)).not.toThrow();
  });
});
