import { getAllExercises, primeMoverOf } from "./library";
import type {
  Equipment,
  Exercise,
  FailureProtocol,
  MuscleLength,
  PeakPosition,
} from "./schema";

/**
 * The substitution engine.
 *
 * A substitution is not "another exercise for the same body part". The
 * question it answers is narrower and more useful: *if I cannot do this today,
 * what preserves the stimulus I was choosing it for?* Swapping a
 * chest-supported row for another row preserves it. Swapping it for a pullover
 * does not, even though both are commonly filed under "back".
 *
 * So the ranking is built on where in the range of motion the movement is
 * hardest, which is the property that determines what the set actually trains.
 * Equipment is a filter rather than a score — the usual reason to substitute is
 * that a piece of equipment is unavailable, so preferring the same equipment
 * class would rank the engine's whole purpose last.
 *
 * Every result carries its tradeoffs explicitly. A ranked list with no stated
 * differences is a recommendation the reader cannot check, and the difference
 * between "this is close" and "this is close except that it cannot be taken to
 * failure" is the entire value of the answer.
 */

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/**
 * Weights, declared rather than tuned.
 *
 * Peak position dominates because it is the property the whole model treats as
 * defining the stimulus. Muscle length at peak tension is weighted lower
 * because it usually agrees with peak position and only diverges on two-joint
 * movements. SFR is included because between two mechanically similar options
 * the one that costs less fatigue is genuinely the better swap — but it is
 * weighted below the mechanics, because a cheaper exercise that trains a
 * different range is not a substitute at all.
 *
 * These sum to 1 so a score reads as a fraction. `weightsSumToOne` asserts it.
 */
export const SUBSTITUTION_WEIGHTS = {
  peakPosition: 0.55,
  muscleLength: 0.2,
  stimulusToFatigue: 0.25,
} as const;

export function weightsSumToOne(): boolean {
  const total = Object.values(SUBSTITUTION_WEIGHTS).reduce((a, b) => a + b, 0);
  return Math.abs(total - 1) < 1e-9;
}

/**
 * Peak positions laid out along the range of motion.
 *
 * `even` is deliberately absent. It is not a fourth point on this line — it is
 * a curve that never strongly favours any point, so it is partially compatible
 * with all of them, and `peakDistance` handles it as a special case rather than
 * pretending it sits at some arbitrary coordinate.
 */
const PEAK_POSITION_ORDER: Record<
  Exclude<PeakPosition, "even">,
  number
> = {
  stretched: 0,
  "mid-range": 1,
  shortened: 2,
};

/** 0 identical, 1 opposite ends of the range. */
export function peakDistance(a: PeakPosition, b: PeakPosition): number {
  if (a === b) return 0;
  // An even profile overlaps every peaked one without matching any of them.
  if (a === "even" || b === "even") return 0.5;
  return (
    Math.abs(
      PEAK_POSITION_ORDER[a as Exclude<PeakPosition, "even">] -
        PEAK_POSITION_ORDER[b as Exclude<PeakPosition, "even">],
    ) / 2
  );
}

const MUSCLE_LENGTH_ORDER: Record<MuscleLength, number> = {
  lengthened: 0,
  mid: 1,
  shortened: 2,
};

export function muscleLengthDistance(a: MuscleLength, b: MuscleLength): number {
  return Math.abs(MUSCLE_LENGTH_ORDER[a] - MUSCLE_LENGTH_ORDER[b]) / 2;
}

// ---------------------------------------------------------------------------
// Tradeoffs
// ---------------------------------------------------------------------------

type TradeoffDimension =
  | "peak-position"
  | "muscle-length"
  | "equipment"
  | "axial-load"
  | "joint-stress"
  | "stability"
  | "failure-protocol"
  | "stimulus-to-fatigue";

export interface Tradeoff {
  dimension: TradeoffDimension;
  /**
   * Whether the swap improves things, costs something, or is simply not
   * comparable. `different` is not a hedge — a peak position moving from
   * stretched to shortened is neither better nor worse, it is a different
   * exercise, and calling it an improvement would be the kind of quiet
   * dishonesty this app is built against.
   */
  direction: "better" | "worse" | "different";
  note: string;
}

const AXIAL_ORDER = { none: 0, low: 1, moderate: 2, high: 3 } as const;
const STRESS_ORDER = { low: 0, moderate: 1, high: 2 } as const;

/**
 * How close to failure each protocol permits, most permissive first.
 *
 * Used to say whether a swap gains or loses access to failure — which changes
 * how a set has to be programmed, not just how it feels.
 */
const FAILURE_ACCESS: Record<FailureProtocol, number> = {
  "true-failure-safe": 3,
  "failure-with-safety-setup": 2,
  "terminate-at-form-breakdown": 1,
  "never-to-failure": 0,
};

const FAILURE_LABEL: Record<FailureProtocol, string> = {
  "true-failure-safe": "can be taken to true failure unsupervised",
  "failure-with-safety-setup": "reaches failure only with pins or a spotter",
  "terminate-at-form-breakdown": "has to be stopped when position degrades",
  "never-to-failure": "must never be taken near failure",
};

const EQUIPMENT_LABEL: Record<Equipment, string> = {
  barbell: "a barbell",
  dumbbell: "dumbbells",
  machine: "a machine",
  cable: "a cable stack",
  "smith-machine": "a Smith machine",
  bodyweight: "bodyweight only",
  band: "a band",
};

/**
 * Everything that changes between two exercises, stated plainly.
 *
 * Only differences are emitted. A list that also reported the dimensions that
 * stayed the same would bury the two lines that matter under six that do not.
 */
export function tradeoffsBetween(
  from: Exercise,
  to: Exercise,
): readonly Tradeoff[] {
  const tradeoffs: Tradeoff[] = [];

  if (from.peakPosition !== to.peakPosition) {
    tradeoffs.push({
      dimension: "peak-position",
      direction: "different",
      note: `Hardest point moves from the ${from.peakPosition} position to the ${to.peakPosition} one, so the range that receives the most tension changes.`,
    });
  }

  if (from.muscleLengthAtPeakTension !== to.muscleLengthAtPeakTension) {
    tradeoffs.push({
      dimension: "muscle-length",
      direction: "different",
      note: `Peak tension arrives with the target ${to.muscleLengthAtPeakTension} rather than ${from.muscleLengthAtPeakTension}.`,
    });
  }

  if (from.equipment !== to.equipment) {
    tradeoffs.push({
      dimension: "equipment",
      direction: "different",
      note: `Needs ${EQUIPMENT_LABEL[to.equipment]} instead of ${EQUIPMENT_LABEL[from.equipment]}.`,
    });
  }

  const axialDelta = AXIAL_ORDER[to.axialLoad] - AXIAL_ORDER[from.axialLoad];
  if (axialDelta !== 0) {
    tradeoffs.push({
      dimension: "axial-load",
      direction: axialDelta < 0 ? "better" : "worse",
      note: `Axial load ${axialDelta < 0 ? "drops" : "rises"} from ${from.axialLoad} to ${to.axialLoad}.`,
    });
  }

  const jointDelta =
    STRESS_ORDER[to.jointStress] - STRESS_ORDER[from.jointStress];
  if (jointDelta !== 0) {
    tradeoffs.push({
      dimension: "joint-stress",
      direction: jointDelta < 0 ? "better" : "worse",
      note: `Joint stress ${jointDelta < 0 ? "drops" : "rises"} from ${from.jointStress} to ${to.jointStress}.`,
    });
  }

  const stabilityDelta =
    STRESS_ORDER[to.stabilityDemand] - STRESS_ORDER[from.stabilityDemand];
  if (stabilityDelta !== 0) {
    tradeoffs.push({
      dimension: "stability",
      direction: stabilityDelta < 0 ? "better" : "worse",
      note: `Stability demand ${stabilityDelta < 0 ? "drops" : "rises"} from ${from.stabilityDemand} to ${to.stabilityDemand}, so ${stabilityDelta < 0 ? "more" : "less"} of the effort reaches the target.`,
    });
  }

  const failureDelta =
    FAILURE_ACCESS[to.failureProtocol] - FAILURE_ACCESS[from.failureProtocol];
  if (failureDelta !== 0) {
    tradeoffs.push({
      dimension: "failure-protocol",
      direction: failureDelta > 0 ? "better" : "worse",
      note: `This one ${FAILURE_LABEL[to.failureProtocol]}, where the original ${FAILURE_LABEL[from.failureProtocol]}.`,
    });
  }

  const sfrDelta = to.sfrRating - from.sfrRating;
  if (sfrDelta !== 0) {
    tradeoffs.push({
      dimension: "stimulus-to-fatigue",
      direction: sfrDelta > 0 ? "better" : "worse",
      note: `Stimulus-to-fatigue rated ${to.sfrRating} against ${from.sfrRating} — a judgement, not a measurement, and the reasoning is on the exercise page.`,
    });
  }

  return tradeoffs;
}

// ---------------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------------

export interface RankedSubstitution {
  exercise: Exercise;
  /** 0–1. How well this preserves what the original was chosen for. */
  score: number;
  /** How closely the resistance profiles line up. */
  profileMatch: "same" | "adjacent" | "opposed";
  tradeoffs: readonly Tradeoff[];
}

export interface SubstitutionOptions {
  /** When given, only these equipment classes are considered available. */
  availableEquipment?: readonly Equipment[];
  limit?: number;
}

function profileMatch(distance: number): RankedSubstitution["profileMatch"] {
  if (distance === 0) return "same";
  if (distance <= 0.5) return "adjacent";
  return "opposed";
}

function score(from: Exercise, to: Exercise): number {
  const peak = 1 - peakDistance(from.peakPosition, to.peakPosition);
  const length =
    1 -
    muscleLengthDistance(
      from.muscleLengthAtPeakTension,
      to.muscleLengthAtPeakTension,
    );
  // Normalised onto 0–1 from the 1–5 scale. Favours the cheaper option
  // outright rather than favouring similarity, because between two
  // mechanically comparable choices the lower-fatigue one is simply better.
  const sfr = (to.sfrRating - 1) / 4;

  return (
    peak * SUBSTITUTION_WEIGHTS.peakPosition +
    length * SUBSTITUTION_WEIGHTS.muscleLength +
    sfr * SUBSTITUTION_WEIGHTS.stimulusToFatigue
  );
}

/**
 * Ranked alternatives that preserve what the original was chosen for.
 *
 * Candidates must share the original's prime mover. That is a hard filter, not
 * a weighted term: an exercise that trains a different muscle is not a worse
 * substitute, it is not a substitute.
 */
export function substitutesFor(
  exercise: Exercise,
  options: SubstitutionOptions = {},
): readonly RankedSubstitution[] {
  const target = primeMoverOf(exercise);
  const available = options.availableEquipment;

  const ranked = getAllExercises()
    .filter((candidate) => candidate.id !== exercise.id)
    .filter((candidate) => primeMoverOf(candidate) === target)
    .filter(
      (candidate) => !available || available.includes(candidate.equipment),
    )
    .map((candidate) => ({
      exercise: candidate,
      score: score(exercise, candidate),
      profileMatch: profileMatch(
        peakDistance(exercise.peakPosition, candidate.peakPosition),
      ),
      tradeoffs: tradeoffsBetween(exercise, candidate),
    }))
    .sort((a, b) => b.score - a.score || a.exercise.name.localeCompare(b.exercise.name));

  return options.limit === undefined ? ranked : ranked.slice(0, options.limit);
}

/**
 * Exercises that train the same muscle from the *other* end of the range.
 *
 * The opposite question to a substitution. A complement is not a replacement —
 * it is what you pair the original with so the muscle is loaded across a range
 * neither covers alone, which is the practical reason peak position is modelled
 * at all.
 *
 * Candidates are drawn from any exercise loading the muscle directly or
 * fractionally, not only those whose prime mover it is: a movement can be an
 * excellent complement for a muscle it was not chosen for.
 *
 * Returns nothing when the library genuinely has no complement. That empty
 * result is a real answer and the UI says so, rather than padding the list with
 * the nearest thing and implying a pairing that does not exist.
 */
export function complementsFor(
  exercise: Exercise,
  options: SubstitutionOptions = {},
): readonly RankedSubstitution[] {
  const target = primeMoverOf(exercise);
  const available = options.availableEquipment;

  const ranked = getAllExercises()
    .filter((candidate) => candidate.id !== exercise.id)
    .filter((candidate) =>
      candidate.muscles.some(
        (entry) =>
          entry.muscleId === target &&
          (entry.involvement === "direct" || entry.involvement === "fractional"),
      ),
    )
    .filter(
      (candidate) => !available || available.includes(candidate.equipment),
    )
    // A complement has to actually differ. Same peak position means the pair
    // loads the same part of the range twice, which is the thing to avoid.
    .filter(
      (candidate) =>
        peakDistance(exercise.peakPosition, candidate.peakPosition) > 0,
    )
    .map((candidate) => ({
      exercise: candidate,
      // Inverted: the further apart the profiles, the better the pairing.
      score: peakDistance(exercise.peakPosition, candidate.peakPosition),
      profileMatch: profileMatch(
        peakDistance(exercise.peakPosition, candidate.peakPosition),
      ),
      tradeoffs: tradeoffsBetween(exercise, candidate),
    }))
    .sort((a, b) => b.score - a.score || a.exercise.name.localeCompare(b.exercise.name));

  return options.limit === undefined ? ranked : ranked.slice(0, options.limit);
}
