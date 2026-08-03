import { z } from "zod";

/**
 * Fractional set coding.
 *
 * Pelland et al. (2026) coded involvement in three tiers and found that scheme
 * predicted adaptation better than counting indirect work fully or ignoring
 * it. Three tiers is what the meta-regression tested, so three tiers is what
 * we can defend.
 *
 * Phase 1 stored a free float. That was a mistake in a specific way: it let
 * any exercise-muscle pair take any multiplier, and no two people coding the
 * library would have assigned the same numbers. A 0.35 has no citation behind
 * it and no argument for it beyond the taste of whoever typed it. The enum
 * removes the option.
 *
 * See docs/adr/0002-fractional-set-coding.md.
 */

export const involvementSchema = z.enum(["direct", "fractional", "indirect"]);
export type Involvement = z.infer<typeof involvementSchema>;

const MULTIPLIERS: Record<Involvement, number> = {
  /** The muscle the exercise is chosen to train. Counts as a full set. */
  direct: 1,
  /** Meaningfully loaded through a useful range, but not the target. */
  fractional: 0.5,
  /**
   * Loaded largely isometrically, or through a range too short to drive
   * growth. Counts as zero for volume; still recorded, because it matters for
   * fatigue even when it does not matter for stimulus.
   */
  indirect: 0,
};

export function involvementMultiplier(involvement: Involvement): number {
  return MULTIPLIERS[involvement];
}

export const INVOLVEMENT_META: Record<
  Involvement,
  { label: string; multiplier: number; definition: string }
> = {
  direct: {
    label: "Direct",
    multiplier: 1,
    definition:
      "The muscle this exercise is chosen to train. The set counts in full toward its weekly volume.",
  },
  fractional: {
    label: "Fractional",
    multiplier: 0.5,
    definition:
      "Meaningfully loaded through a useful range, but not the target of the movement. The set counts as half.",
  },
  indirect: {
    label: "Indirect",
    multiplier: 0,
    definition:
      "Loaded largely isometrically or through too short a range to drive growth. Recorded for fatigue, counted as zero for volume.",
  },
};

/**
 * Maps a legacy float weight onto the enum.
 *
 * Used by the Phase 1 → Phase 2 backfill. Anything that is not one of the
 * three canonical values is a coding decision that was never defensible, so it
 * snaps to the nearest tier and the migration reports it rather than silently
 * rounding.
 */
export function involvementFromLegacyWeight(weight: number): {
  involvement: Involvement;
  exact: boolean;
} {
  if (weight === 1) return { involvement: "direct", exact: true };
  if (weight === 0.5) return { involvement: "fractional", exact: true };
  if (weight === 0) return { involvement: "indirect", exact: true };

  const nearest: Involvement =
    weight >= 0.75 ? "direct" : weight >= 0.25 ? "fractional" : "indirect";
  return { involvement: nearest, exact: false };
}
