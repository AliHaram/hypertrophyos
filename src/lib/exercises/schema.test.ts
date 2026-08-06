import { describe, expect, it } from "vitest";

import { z } from "zod";

import {
  exerciseSchema,
  observedPeakPosition,
  resistanceProfileSchema,
} from "@/lib/exercises/schema";

/**
 * Overrides are typed against the schema's *input*, not its output. `primeMover`
 * and `unilateral` carry defaults, so they are optional going in and required
 * coming out — building fixtures against the output type would demand fields the
 * parser is there to supply.
 */
type ExerciseInput = z.input<typeof exerciseSchema>;

/** A curve peaking at the stretched end, as a Romanian deadlift does. */
const STRETCHED_CURVE = [
  1, 0.97, 0.9, 0.8, 0.68, 0.55, 0.43, 0.32, 0.23, 0.16, 0.11,
];

function validExercise(overrides: Partial<ExerciseInput> = {}): unknown {
  return {
    id: "romanian-deadlift",
    name: "Romanian deadlift",
    resistanceProfile: STRETCHED_CURVE,
    resistanceProfileDerivation:
      "The hip moment arm is longest with the torso near horizontal and shortens through to lockout.",
    peakPosition: "stretched",
    muscleLengthAtPeakTension: "lengthened",
    equipment: "barbell",
    unilateral: false,
    axialLoad: "high",
    jointStress: "moderate",
    stabilityDemand: "moderate",
    failureProtocol: "terminate-at-form-breakdown",
    failureProtocolRationale:
      "What fails first is lumbar position, not the hamstrings.",
    sfrRating: 4,
    sfrRationale: "High stimulus at length against real systemic cost.",
    setupCues: ["Brace before the bar moves", "Push the hips back", "Stop at the shins"],
    commonErrors: [
      "Bending the knees to reach the floor, which turns it into a deadlift",
      "Rounding at the bottom, which moves load onto the spine",
    ],
    muscles: [
      { muscleId: "hamstrings", involvement: "direct", primeMover: true },
      { muscleId: "gluteus-maximus", involvement: "direct" },
      { muscleId: "erector-spinae", involvement: "fractional" },
      { muscleId: "forearm-flexors", involvement: "indirect" },
    ],
    ...overrides,
  };
}

describe("resistanceProfileSchema", () => {
  it("accepts a normalised eleven-sample curve", () => {
    expect(resistanceProfileSchema.safeParse(STRETCHED_CURVE).success).toBe(true);
  });

  it("rejects a curve of the wrong length", () => {
    expect(resistanceProfileSchema.safeParse([1, 0.5, 0.2]).success).toBe(false);
  });

  it("rejects an unnormalised curve", () => {
    // Peaks at 0.9. Either it was never normalised or a sample is wrong, and
    // both make it incomparable with every other curve in the library.
    const unnormalised = STRETCHED_CURVE.map((sample) => sample * 0.9);
    expect(resistanceProfileSchema.safeParse(unnormalised).success).toBe(false);
  });

  it("rejects samples outside 0–1", () => {
    const overshoot = [...STRETCHED_CURVE];
    overshoot[3] = 1.4;
    expect(resistanceProfileSchema.safeParse(overshoot).success).toBe(false);
  });
});

describe("observedPeakPosition", () => {
  it("reads a stretched peak", () => {
    expect(observedPeakPosition(STRETCHED_CURVE)).toBe("stretched");
  });

  it("reads a shortened peak", () => {
    expect(observedPeakPosition([...STRETCHED_CURVE].reverse())).toBe("shortened");
  });

  it("reads a mid-range peak", () => {
    const bell = [0.4, 0.55, 0.7, 0.85, 0.95, 1, 0.95, 0.85, 0.7, 0.55, 0.4];
    expect(observedPeakPosition(bell)).toBe("mid-range");
  });

  it("calls a nearly flat curve even, wherever its nominal maximum falls", () => {
    const flat = [0.92, 0.95, 0.97, 0.99, 1, 0.99, 0.98, 0.97, 0.95, 0.93, 0.92];
    expect(observedPeakPosition(flat)).toBe("even");
  });

  it("declines to judge a peak sitting between thirds", () => {
    const ambiguous = [0.2, 0.4, 0.7, 1, 0.85, 0.6, 0.45, 0.35, 0.3, 0.25, 0.2];
    expect(observedPeakPosition(ambiguous)).toBeUndefined();
  });
});

describe("exerciseSchema", () => {
  it("accepts a fully specified exercise", () => {
    const result = exerciseSchema.safeParse(validExercise());
    expect(result.error?.issues).toBeUndefined();
    expect(result.success).toBe(true);
  });

  it("requires exactly one prime mover", () => {
    const none = exerciseSchema.safeParse(
      validExercise({
        muscles: [{ muscleId: "hamstrings", involvement: "direct", primeMover: false }],
      }),
    );
    expect(none.success).toBe(false);
    expect(none.error?.issues[0]?.message).toMatch(/exactly one prime mover/);
  });

  it("rejects a prime mover coded as anything but direct", () => {
    const result = exerciseSchema.safeParse(
      validExercise({
        muscles: [
          { muscleId: "hamstrings", involvement: "fractional", primeMover: true },
        ],
      }),
    );
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/direct by definition/);
  });

  it("rejects a duplicate muscle entry", () => {
    const result = exerciseSchema.safeParse(
      validExercise({
        muscles: [
          { muscleId: "hamstrings", involvement: "direct", primeMover: true },
          { muscleId: "hamstrings", involvement: "fractional" },
        ],
      }),
    );
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/duplicate muscle entries/);
  });

  it("rejects a peak_position that contradicts its own curve", () => {
    const result = exerciseSchema.safeParse(
      validExercise({ peakPosition: "shortened" }),
    );
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(
      /declared "shortened" but the curve peaks at "stretched"/,
    );
  });

  it("rejects fewer than three setup cues", () => {
    const result = exerciseSchema.safeParse(
      validExercise({ setupCues: ["Brace", "Hinge"] }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects more than three common errors", () => {
    const result = exerciseSchema.safeParse(
      validExercise({
        commonErrors: ["One", "Two", "Three", "Four"],
      }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects an SFR rating outside 1–5", () => {
    expect(exerciseSchema.safeParse(validExercise({ sfrRating: 6 })).success).toBe(
      false,
    );
    expect(exerciseSchema.safeParse(validExercise({ sfrRating: 0 })).success).toBe(
      false,
    );
  });

  it("requires a derivation for the resistance profile", () => {
    const result = exerciseSchema.safeParse(
      validExercise({ resistanceProfileDerivation: "" }),
    );
    expect(result.success).toBe(false);
  });
});
