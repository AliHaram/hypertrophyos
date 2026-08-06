import { z } from "zod";

import { involvementSchema } from "@/lib/training/involvement";

/**
 * The exercise boundary.
 *
 * Everything entering the library passes through here — the seed, the content
 * sync, any future import. The database enforces what SQL can enforce cheaply
 * (array lengths, the SFR range, one prime mover per exercise); this enforces
 * what it cannot, and it is the only place that knows an eleven-sample curve is
 * meaningless unless every sample sits in 0–1 with the peak at exactly 1.
 */

export const RESISTANCE_PROFILE_SAMPLES = 11;

/**
 * Peak positions in range order — lengthened end first, then the special case.
 *
 * Declared as an array rather than read back off the Zod enum so the display
 * order is stated rather than inherited. `even` sits last because it is not a
 * point on the range at all; it is the absence of a peak.
 */
export const PEAK_POSITIONS = [
  "stretched",
  "mid-range",
  "shortened",
  "even",
] as const;

const peakPositionSchema = z.enum(PEAK_POSITIONS);
export type PeakPosition = z.infer<typeof peakPositionSchema>;

const muscleLengthSchema = z.enum(["lengthened", "mid", "shortened"]);
export type MuscleLength = z.infer<typeof muscleLengthSchema>;

const failureProtocolSchema = z.enum([
  "true-failure-safe",
  "failure-with-safety-setup",
  "terminate-at-form-breakdown",
  "never-to-failure",
]);
export type FailureProtocol = z.infer<typeof failureProtocolSchema>;

const axialLoadSchema = z.enum(["none", "low", "moderate", "high"]);
const jointStressSchema = z.enum(["low", "moderate", "high"]);
const stabilityDemandSchema = z.enum(["low", "moderate", "high"]);

const equipmentSchema = z.enum([
  "barbell",
  "dumbbell",
  "machine",
  "cable",
  "smith-machine",
  "bodyweight",
  "band",
]);
export type Equipment = z.infer<typeof equipmentSchema>;

/**
 * Relative torque demand across the range of motion.
 *
 * Sample 0 is the fully lengthened position and sample 10 the fully shortened
 * one, so the array reads in the direction of the concentric.
 *
 * Normalisation to a peak of exactly 1.0 is what makes two curves comparable:
 * the shape is the claim, and the absolute magnitude — which nobody here has
 * measured in newton-metres — is not. A curve whose maximum is 0.9 is either
 * unnormalised or wrong, and both are worth failing on.
 */
export const resistanceProfileSchema = z
  .array(z.number().min(0).max(1))
  .length(RESISTANCE_PROFILE_SAMPLES)
  .refine((samples) => samples.some((sample) => sample === 1), {
    message: "the peak sample must be exactly 1.0 — profiles are normalised",
  });

const exerciseMuscleSchema = z.object({
  muscleId: z.string().min(1),
  involvement: involvementSchema,
  primeMover: z.boolean().default(false),
  codingNote: z.string().min(1).optional(),
});

export const exerciseSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),

    resistanceProfile: resistanceProfileSchema,
    resistanceProfileDerivation: z.string().min(1),
    peakPosition: peakPositionSchema,
    muscleLengthAtPeakTension: muscleLengthSchema,

    equipment: equipmentSchema,
    unilateral: z.boolean().default(false),
    axialLoad: axialLoadSchema,
    jointStress: jointStressSchema,
    stabilityDemand: stabilityDemandSchema,
    failureProtocol: failureProtocolSchema,
    failureProtocolRationale: z.string().min(1),

    sfrRating: z.number().int().min(1).max(5),
    sfrRationale: z.string().min(1),

    /** Only cues that change the outcome. Five is already generous. */
    setupCues: z.array(z.string().min(1)).min(3).max(5),
    /** Each states the consequence, not just the correction. */
    commonErrors: z.array(z.string().min(1)).min(2).max(3),

    muscles: z.array(exerciseMuscleSchema).min(1),
  })
  .superRefine((exercise, ctx) => {
    const primeMovers = exercise.muscles.filter((entry) => entry.primeMover);
    if (primeMovers.length !== 1) {
      ctx.addIssue({
        code: "custom",
        path: ["muscles"],
        message: `exactly one prime mover required, found ${primeMovers.length}`,
      });
    }

    // The prime mover is what the exercise is chosen for. Coding it as anything
    // but direct means either the coding or the choice is wrong.
    for (const mover of primeMovers) {
      if (mover.involvement !== "direct") {
        ctx.addIssue({
          code: "custom",
          path: ["muscles"],
          message: `prime mover "${mover.muscleId}" is coded ${mover.involvement}, but a prime mover is direct by definition`,
        });
      }
    }

    const ids = exercise.muscles.map((entry) => entry.muscleId);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicates.length > 0) {
      ctx.addIssue({
        code: "custom",
        path: ["muscles"],
        message: `duplicate muscle entries: ${[...new Set(duplicates)].join(", ")}`,
      });
    }

    // The curve and the label are two statements about the same mechanics. If
    // they disagree, one of them is a typo, and a filter that says "stretched"
    // over a curve that peaks at the shortened end is worse than no filter.
    const declared = exercise.peakPosition;
    const observed = observedPeakPosition(exercise.resistanceProfile);
    if (observed && declared !== observed) {
      ctx.addIssue({
        code: "custom",
        path: ["peakPosition"],
        message: `declared "${declared}" but the curve peaks at "${observed}"`,
      });
    }
  });

export type Exercise = z.infer<typeof exerciseSchema>;

/**
 * Where the curve actually peaks.
 *
 * Returns `even` when the curve never departs far from its own mean, and
 * `undefined` when the peak sits on a boundary between thirds — there the label
 * is a judgement the author should make, not one this function should
 * second-guess.
 */
export function observedPeakPosition(
  samples: readonly number[],
): PeakPosition | undefined {
  const max = Math.max(...samples);
  const min = Math.min(...samples);
  if (max - min <= 0.15) return "even";

  const peakIndex = samples.indexOf(max);
  const position = peakIndex / (samples.length - 1);

  if (position < 0.3) return "stretched";
  if (position > 0.7) return "shortened";
  if (position >= 0.35 && position <= 0.65) return "mid-range";
  return undefined;
}
