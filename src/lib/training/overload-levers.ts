import type { EvidenceGrade } from "@/lib/evidence/types";

/**
 * The six levers of progressive overload.
 *
 * Most apps define progressive overload as "add weight", which is one lever
 * of six and the one that runs out first. Ordered here by how much hypertrophy
 * each reliably buys, which is deliberately not the order lifters reach for
 * them in.
 *
 * `rangeOfMotion` is listed as a lever for completeness but is really a
 * quality gate — you do not progressively add range, you train through a full
 * one from the start. It is included because leaving it out is how people end
 * up adding load by quietly shortening their reps.
 */

export type LeverId =
  | "load"
  | "reps"
  | "sets"
  | "rangeOfMotion"
  | "tempo"
  | "density";

export interface OverloadLever {
  id: LeverId;
  name: string;
  mechanism: string;
  whenToUse: string;
  /** What it costs — every lever trades against something. */
  cost: string;
  evidenceGrade: EvidenceGrade;
  /** Relative hypertrophy value, 1–5. Drives the ordering and the bar. */
  potency: number;
  worked: string;
}

export const OVERLOAD_LEVERS: readonly OverloadLever[] = [
  {
    id: "load",
    name: "Load",
    mechanism: "More tension per rep, and more force per motor unit recruited.",
    whenToUse: "You hit the top of the rep target at 1 RIR or less.",
    cost:
      "Joint and connective-tissue stress rises faster than muscle stimulus does. It is also the lever that runs out soonest.",
    evidenceGrade: "strong",
    potency: 5,
    worked:
      "Three sets of 10 at 60 kg, last set at 1 RIR → 62.5 kg next session, expecting reps to drop to 8.",
  },
  {
    id: "reps",
    name: "Reps",
    mechanism:
      "More effective reps per set — the ones near failure, where high-threshold motor units are actually recruited.",
    whenToUse:
      "The smallest available load jump is too large for your current strength. Usually most of the time.",
    cost:
      "Adds session time, and drifting far above about 30 reps per set makes the limiting factor local endurance rather than tension.",
    evidenceGrade: "strong",
    potency: 5,
    worked:
      "Three sets of 8 at 60 kg → three sets of 9 at 60 kg, then 10, then add load and drop back to 8.",
  },
  {
    id: "sets",
    name: "Sets",
    mechanism: "More weekly volume, the dose variable with the clearest dose-response.",
    whenToUse:
      "You are below MEV for that muscle, and recovery markers are holding.",
    cost:
      "The most fatiguing lever per unit of stimulus, and the one that pushes you toward MRV fastest.",
    evidenceGrade: "strong",
    potency: 4,
    worked:
      "Chest at 8 effective sets a week with recovery holding → add one set to the second session, reassess after two weeks.",
  },
  {
    id: "rangeOfMotion",
    name: "Range of motion",
    mechanism:
      "More tension at long muscle lengths, where the hypertrophic stimulus per rep appears to be highest.",
    whenToUse:
      "Always. Treat it as a quality gate on every other lever rather than something you add later.",
    cost:
      "None worth the name — but it will force a load reduction when you first fix a shortened rep, and that is not a regression.",
    evidenceGrade: "mixed",
    potency: 4,
    worked:
      "A pressing rep stopping four inches short of the chest → full depth at 10% less load. Same lift, more stimulus.",
  },
  {
    id: "tempo",
    name: "Tempo and eccentric control",
    mechanism:
      "More time under tension per rep, particularly in the lengthened position.",
    whenToUse:
      "Load is capped by joint tolerance, or the movement is easy to accelerate through with momentum.",
    cost:
      "Reduces the load you can handle, so it trades tension for time. Easy to overdo into theatre.",
    evidenceGrade: "mixed",
    potency: 3,
    worked:
      "A two-second lowering phase on a curl instead of dropping the bar, at roughly 10% less load.",
  },
  {
    id: "density",
    name: "Density",
    mechanism: "More work per unit of time, by cutting rest between sets.",
    whenToUse:
      "You are training for conditioning or short on time, and are willing to trade hypertrophy for it.",
    cost:
      "The weakest hypertrophy lever of the six, and the only one with direct evidence against it. Schoenfeld et al. (2016) found three-minute rest beat one-minute rest for both strength and size.",
    evidenceGrade: "strong",
    potency: 1,
    worked:
      "Cutting rest from three minutes to ninety seconds. Do this when time is the constraint, not when growth is the goal.",
  },
];

export function getLever(id: LeverId): OverloadLever {
  const lever = OVERLOAD_LEVERS.find((candidate) => candidate.id === id);
  if (!lever) throw new Error(`Unknown overload lever "${id}"`);
  return lever;
}

/**
 * Double progression: work reps up through a range at a fixed load, then add
 * load and reset to the bottom of the range.
 *
 * Returns the next prescription given where the lifter currently is. This is
 * the rule the overload debt tracker applies, so it is unit-tested rather than
 * described in prose alone.
 */
export interface DoubleProgressionState {
  loadKg: number;
  reps: number;
  repRangeLow: number;
  repRangeHigh: number;
  rir: number;
  /** Smallest load increment available, e.g. 2.5 kg for a barbell. */
  loadIncrementKg: number;
}

export interface DoubleProgressionPrescription {
  action: "add-load" | "add-reps" | "hold";
  loadKg: number;
  targetReps: number;
  rationale: string;
}

export function nextDoubleProgression(
  state: DoubleProgressionState,
): DoubleProgressionPrescription {
  const { loadKg, reps, repRangeLow, repRangeHigh, rir, loadIncrementKg } =
    state;

  if (repRangeLow > repRangeHigh) {
    throw new RangeError("repRangeLow must not exceed repRangeHigh");
  }

  // Top of the range and genuinely close to failure: the load is now the
  // limiting factor, so raise it and drop back to the bottom of the range.
  if (reps >= repRangeHigh && rir <= 1) {
    return {
      action: "add-load",
      loadKg: loadKg + loadIncrementKg,
      targetReps: repRangeLow,
      rationale: `Hit ${repRangeHigh} reps at ${rir} RIR — the top of the range at genuine effort. Add ${loadIncrementKg} kg and expect to drop back to about ${repRangeLow} reps.`,
    };
  }

  // Top of the range but several reps left: the load was too light to begin
  // with, so adding reps here would just extend a set that is not hard enough.
  if (reps >= repRangeHigh && rir > 1) {
    return {
      action: "add-load",
      loadKg: loadKg + loadIncrementKg * 2,
      targetReps: repRangeLow,
      rationale: `Hit ${repRangeHigh} reps with ${rir} still in reserve — this load is too light to be driving much. Jump ${loadIncrementKg * 2} kg rather than adding reps to an easy set.`,
    };
  }

  if (rir <= 2) {
    return {
      action: "add-reps",
      loadKg,
      targetReps: reps + 1,
      rationale: `${reps} reps at ${rir} RIR, below the top of the range. Hold the load and add a rep — the load jump would be too large from here.`,
    };
  }

  return {
    action: "hold",
    loadKg,
    targetReps: reps,
    rationale: `${reps} reps at ${rir} RIR. Repeat this session before progressing — the effort is not yet high enough for the last session to count as a stimulus worth building on.`,
  };
}
