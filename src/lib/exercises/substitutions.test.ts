import { describe, expect, it } from "vitest";

import { getExercise } from "./library";
import {
  SUBSTITUTION_WEIGHTS,
  complementsFor,
  muscleLengthDistance,
  peakDistance,
  substitutesFor,
  tradeoffsBetween,
  weightsSumToOne,
} from "./substitutions";

const backSquat = getExercise("back-squat")!;
const legPress = getExercise("leg-press")!;
const rdl = getExercise("romanian-deadlift")!;
const legCurl = getExercise("seated-leg-curl")!;
const inclinePress = getExercise("incline-dumbbell-press")!;
const fly = getExercise("machine-chest-fly")!;
const lateralRaise = getExercise("lateral-raise")!;

describe("peak distance", () => {
  it("is zero for identical positions", () => {
    expect(peakDistance("stretched", "stretched")).toBe(0);
  });

  it("is maximal across the ends of the range", () => {
    expect(peakDistance("stretched", "shortened")).toBe(1);
  });

  it("is half a step to the middle", () => {
    expect(peakDistance("stretched", "mid-range")).toBe(0.5);
    expect(peakDistance("mid-range", "shortened")).toBe(0.5);
  });

  it("treats an even profile as partially compatible with everything", () => {
    // Not a fourth point on the line — a curve with no strong preference
    // overlaps every peaked one without matching any.
    expect(peakDistance("even", "stretched")).toBe(0.5);
    expect(peakDistance("even", "shortened")).toBe(0.5);
    expect(peakDistance("even", "mid-range")).toBe(0.5);
  });

  it("is symmetric", () => {
    expect(peakDistance("stretched", "even")).toBe(
      peakDistance("even", "stretched"),
    );
  });

  it("is zero between two even profiles", () => {
    expect(peakDistance("even", "even")).toBe(0);
  });
});

describe("muscle length distance", () => {
  it("runs from zero to one across the scale", () => {
    expect(muscleLengthDistance("lengthened", "lengthened")).toBe(0);
    expect(muscleLengthDistance("lengthened", "mid")).toBe(0.5);
    expect(muscleLengthDistance("lengthened", "shortened")).toBe(1);
  });
});

describe("the weights are a declared distribution", () => {
  it("sums to one so a score reads as a fraction", () => {
    expect(weightsSumToOne()).toBe(true);
  });

  it("lets peak position dominate", () => {
    // The property the model treats as defining the stimulus should carry
    // more than either other term alone.
    expect(SUBSTITUTION_WEIGHTS.peakPosition).toBeGreaterThan(
      SUBSTITUTION_WEIGHTS.muscleLength,
    );
    expect(SUBSTITUTION_WEIGHTS.peakPosition).toBeGreaterThan(
      SUBSTITUTION_WEIGHTS.stimulusToFatigue,
    );
  });
});

describe("substitutions", () => {
  it("only offers exercises sharing the prime mover", () => {
    // A hard filter, not a weighted term. Something training another muscle is
    // not a worse substitute; it is not a substitute.
    const results = substitutesFor(backSquat);

    expect(results.map((r) => r.exercise.id)).toEqual(["leg-press"]);
  });

  it("never returns the original", () => {
    for (const exercise of [backSquat, rdl, inclinePress]) {
      expect(substitutesFor(exercise).map((r) => r.exercise.id)).not.toContain(
        exercise.id,
      );
    }
  });

  it("returns nothing when the library has no alternative", () => {
    // Honest emptiness. The lateral raise is the only lateral-deltoid movement
    // in an eight-exercise library, and padding the list with a press would
    // imply a swap that does not preserve the stimulus.
    expect(substitutesFor(lateralRaise)).toEqual([]);
  });

  it("scores a same-profile swap higher than a divergent one", () => {
    // Leg press preserves the squat's stretched peak, so it should outrank a
    // hypothetical even-profile alternative on the mechanics term.
    const [top] = substitutesFor(backSquat);

    expect(top?.exercise.id).toBe("leg-press");
    expect(top?.profileMatch).toBe("same");
  });

  it("marks a partially-overlapping profile as adjacent", () => {
    const [top] = substitutesFor(rdl);

    expect(top?.exercise.id).toBe("seated-leg-curl");
    expect(top?.profileMatch).toBe("adjacent");
  });

  it("filters to the equipment actually available", () => {
    // The usual reason to substitute at all: the rack is taken.
    const results = substitutesFor(backSquat, {
      availableEquipment: ["dumbbell", "band"],
    });

    expect(results).toEqual([]);
  });

  it("keeps a candidate whose equipment is available", () => {
    const results = substitutesFor(backSquat, {
      availableEquipment: ["machine"],
    });

    expect(results.map((r) => r.exercise.id)).toEqual(["leg-press"]);
  });

  it("honours a limit", () => {
    expect(substitutesFor(rdl, { limit: 0 })).toHaveLength(0);
  });

  it("produces a score between zero and one", () => {
    for (const result of substitutesFor(backSquat)) {
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    }
  });
});

describe("tradeoffs", () => {
  it("reports only what actually differs", () => {
    const dimensions = tradeoffsBetween(backSquat, legPress).map(
      (t) => t.dimension,
    );

    // Both peak stretched, so that dimension must not appear.
    expect(dimensions).not.toContain("peak-position");
    expect(dimensions).toContain("axial-load");
    expect(dimensions).toContain("equipment");
  });

  it("calls a reduction in axial load an improvement", () => {
    const axial = tradeoffsBetween(backSquat, legPress).find(
      (t) => t.dimension === "axial-load",
    );

    expect(axial?.direction).toBe("better");
    expect(axial?.note).toMatch(/drops from high to none/);
  });

  it("calls a change in peak position different rather than better", () => {
    // A stretched-to-shortened move is not an upgrade. Grading it as one would
    // be exactly the quiet dishonesty the evidence system exists to prevent.
    const peak = tradeoffsBetween(inclinePress, fly).find(
      (t) => t.dimension === "peak-position",
    );

    expect(peak?.direction).toBe("different");
  });

  it("says when a swap gains access to failure", () => {
    const failure = tradeoffsBetween(rdl, legCurl).find(
      (t) => t.dimension === "failure-protocol",
    );

    expect(failure?.direction).toBe("better");
    expect(failure?.note).toMatch(/true failure/);
  });

  it("says when a swap loses access to failure", () => {
    const failure = tradeoffsBetween(legCurl, rdl).find(
      (t) => t.dimension === "failure-protocol",
    );

    expect(failure?.direction).toBe("worse");
    expect(failure?.note).toMatch(/never be taken near failure/);
  });

  it("qualifies the SFR comparison as a judgement", () => {
    const sfr = tradeoffsBetween(backSquat, legPress).find(
      (t) => t.dimension === "stimulus-to-fatigue",
    );

    expect(sfr?.note).toMatch(/judgement, not a measurement/);
  });

  it("is empty between an exercise and itself", () => {
    expect(tradeoffsBetween(backSquat, backSquat)).toEqual([]);
  });
});

describe("complements", () => {
  it("pairs a stretched-peaking movement with a differently-loaded one", () => {
    const results = complementsFor(inclinePress);

    expect(results.map((r) => r.exercise.id)).toContain("machine-chest-fly");
  });

  it("never suggests a movement loading the same part of the range", () => {
    // The squat and leg press both peak stretched, so pairing them loads the
    // same range twice — which is the thing a complement exists to avoid.
    expect(complementsFor(backSquat).map((r) => r.exercise.id)).not.toContain(
      "leg-press",
    );
  });

  it("returns nothing when the library has no complement", () => {
    // Quadriceps have two entries and both peak stretched. An empty result is
    // the correct answer and a real gap in the library, not a bug.
    expect(complementsFor(backSquat)).toEqual([]);
  });

  it("ranks the most divergent profile first", () => {
    const results = complementsFor(rdl);

    expect(results[0]?.exercise.id).toBe("seated-leg-curl");
    expect(results[0]?.score).toBeGreaterThan(0);
  });

  it("draws on fractional involvement, not only prime movers", () => {
    // A movement can complement a muscle it was not chosen for. The fly codes
    // anterior deltoid fractionally, so it is a candidate for that muscle even
    // though the incline press is what targets it.
    const results = complementsFor(inclinePress);

    expect(results.length).toBeGreaterThan(0);
  });

  it("carries the same tradeoff detail as a substitution", () => {
    const [first] = complementsFor(rdl);

    expect(first?.tradeoffs.length).toBeGreaterThan(0);
  });
});
