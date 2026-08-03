/**
 * Volume accounting: what counts as a set, and where a weekly total sits
 * against a muscle's landmarks.
 *
 * Two ideas do the work here.
 *
 * 1. Fractional counting. A set of bench press is not one set of chest and one
 *    set of triceps. Pelland et al. (2026) found that weighting indirect
 *    involvement at 0.5 predicted adaptation better than counting it as either
 *    1.0 or 0.0, so involvement weights are stored per exercise-muscle pair
 *    rather than assumed.
 *
 * 2. Effective sets. A set taken 6 reps shy of failure recruits far fewer
 *    high-threshold motor units than one taken near failure, and counting it
 *    the same way inflates the weekly total into meaninglessness. Sets past
 *    the junk-volume threshold are excluded from the effective count and
 *    reported separately so the user can see what was discarded and why.
 */

/** Involvement of a muscle in an exercise, used as the set multiplier. */
export const INVOLVEMENT_WEIGHTS = {
  /** The muscle the exercise is chosen to train. */
  prime: 1,
  /** Meaningfully loaded through a useful range, but not the target. */
  synergist: 0.5,
  /**
   * Loaded largely isometrically, or through a range too short to drive much
   * growth. Counted at zero for volume purposes, still recorded for fatigue.
   */
  stabilizer: 0,
} as const;

export type InvolvementRole = keyof typeof INVOLVEMENT_WEIGHTS;

/**
 * Corrected RIR above which a set stops contributing meaningfully to the
 * hypertrophic stimulus and is excluded from effective volume.
 *
 * 4 is a judgement call at the edge of what the data supports. Robinson et al.
 * (2024) found hypertrophy trending upward as sets approach failure without a
 * clean breakpoint, so any threshold is a simplification of a gradient. We
 * chose the value where the trend has flattened enough that counting the set
 * as equivalent to a near-failure set would be actively misleading.
 */
export const JUNK_VOLUME_RIR_THRESHOLD = 4;

export interface LoggedSet {
  /** Muscle the set is being counted toward. */
  muscleId: string;
  /** Involvement weight for this exercise-muscle pair, 0–1. */
  involvement: number;
  /**
   * RIR after correcting for the user's measured estimation bias. Null when
   * the user has not logged an RIR and no bias correction is possible.
   */
  correctedRir: number | null;
  /** Whether the set was actually completed (vs. planned or abandoned). */
  completed: boolean;
}

export interface VolumeTally {
  /** Sets counted toward the stimulus, after weighting and junk filtering. */
  effectiveSets: number;
  /** Every completed set, weighted but unfiltered. */
  totalSets: number;
  /** Weighted sets discarded for sitting past the junk-volume threshold. */
  junkSets: number;
  /** Completed sets with no RIR recorded. Counted as effective; flagged. */
  unratedSets: number;
}

const EMPTY_TALLY: VolumeTally = {
  effectiveSets: 0,
  totalSets: 0,
  junkSets: 0,
  unratedSets: 0,
};

/**
 * Tally weighted volume for a single muscle.
 *
 * Sets with no RIR are counted as effective rather than discarded — throwing
 * away a real set because of missing metadata understates volume more badly
 * than including it. They are surfaced separately so the weekly review can
 * ask for the missing data.
 */
export function tallyVolume(sets: readonly LoggedSet[]): VolumeTally {
  return sets.reduce<VolumeTally>((tally, set) => {
    if (!set.completed) return tally;

    const weight = clampInvolvement(set.involvement);
    if (weight === 0) return tally;

    const isJunk =
      set.correctedRir !== null && set.correctedRir > JUNK_VOLUME_RIR_THRESHOLD;

    return {
      totalSets: round2(tally.totalSets + weight),
      effectiveSets: round2(tally.effectiveSets + (isJunk ? 0 : weight)),
      junkSets: round2(tally.junkSets + (isJunk ? weight : 0)),
      unratedSets: round2(
        tally.unratedSets + (set.correctedRir === null ? weight : 0),
      ),
    };
  }, EMPTY_TALLY);
}

/** Tally weighted volume per muscle across a week of logged sets. */
export function tallyVolumeByMuscle(
  sets: readonly LoggedSet[],
): Record<string, VolumeTally> {
  const byMuscle: Record<string, LoggedSet[]> = {};
  for (const set of sets) {
    (byMuscle[set.muscleId] ??= []).push(set);
  }
  return Object.fromEntries(
    Object.entries(byMuscle).map(([muscleId, muscleSets]) => [
      muscleId,
      tallyVolume(muscleSets),
    ]),
  );
}

/**
 * Per-muscle weekly set landmarks.
 *
 * MEV — minimum effective volume, below which a muscle is under-stimulated.
 * MAV — maximum adaptive volume, the range where returns are best.
 * MRV — maximum recoverable volume, above which fatigue outpaces adaptation.
 *
 * These are estimates that get refined per user from performance data. The
 * population priors are wide on purpose; MRV in particular varies enough
 * between individuals that a single number is close to useless.
 */
export interface VolumeLandmarks {
  mev: number;
  mav: number;
  mrv: number;
}

export type VolumeZone =
  | "under-mev"
  | "mev-to-mav"
  | "mav-to-mrv"
  | "over-mrv";

export function classifyVolume(
  effectiveSets: number,
  landmarks: VolumeLandmarks,
): VolumeZone {
  assertOrderedLandmarks(landmarks);
  if (effectiveSets < landmarks.mev) return "under-mev";
  if (effectiveSets < landmarks.mav) return "mev-to-mav";
  if (effectiveSets <= landmarks.mrv) return "mav-to-mrv";
  return "over-mrv";
}

export const VOLUME_ZONE_META: Record<
  VolumeZone,
  { label: string; meaning: string }
> = {
  "under-mev": {
    label: "Under MEV",
    meaning:
      "Below the volume that reliably drives growth for this muscle. Adding sets is the highest-value change available.",
  },
  "mev-to-mav": {
    label: "MEV–MAV",
    meaning:
      "Productive, with room to add. This is where most of a block should be spent before pushing higher.",
  },
  "mav-to-mrv": {
    label: "MAV–MRV",
    meaning:
      "Near the top of the productive range. Returns per added set are small and fatigue accumulates faster than it clears.",
  },
  "over-mrv": {
    label: "Over MRV",
    meaning:
      "Past what is being recovered from. Performance decline follows, and the fix is fewer sets, not more effort.",
  },
};

/**
 * Population starting priors, in weekly sets per muscle for a trained lifter.
 *
 * Deliberately conservative on MEV and deliberately wide on MRV. These are
 * only the initial guess: once there are four weeks of logged performance,
 * the per-user estimate replaces them.
 */
export const DEFAULT_LANDMARKS: VolumeLandmarks = {
  mev: 6,
  mav: 14,
  mrv: 20,
};

/** Plausible ranges behind the defaults, for honest error bars in the UI. */
export const LANDMARK_UNCERTAINTY: Record<
  keyof VolumeLandmarks,
  { low: number; high: number }
> = {
  mev: { low: 4, high: 8 },
  mav: { low: 10, high: 20 },
  mrv: { low: 12, high: 25 },
};

function clampInvolvement(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function assertOrderedLandmarks(landmarks: VolumeLandmarks): void {
  const { mev, mav, mrv } = landmarks;
  if (!(mev <= mav && mav <= mrv)) {
    throw new Error(
      `Volume landmarks must satisfy MEV <= MAV <= MRV; received ${mev}/${mav}/${mrv}.`,
    );
  }
}

/** Guards against binary-float drift accumulating over a week of 0.5s. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
