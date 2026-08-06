import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Where in the range of motion the exercise is hardest.
 *
 * This is the property the substitution engine matches on. Swapping a barbell
 * row for a chest-supported row preserves the stimulus; swapping it for a
 * pullover does not, even though both "train back".
 *
 * Named for the *position* rather than the shape of the curve on purpose. The
 * conventional terms are ambiguous in a way that matters here: an "ascending
 * strength curve" describes strength rising through the movement, which means
 * resistance is hardest at the *stretch* — and Phase 1's enum documented
 * `ascending` as "hardest near the shortened position", the opposite. Naming
 * the position leaves nothing to infer.
 */
export const peakPositionEnum = pgEnum("peak_position", [
  "stretched", // hardest near full stretch (Romanian deadlift, incline press)
  "mid-range", // hardest through the middle (barbell curl)
  "shortened", // hardest near full contraction (lateral raise, leg extension)
  "even", // roughly flat (cable work with a good line of pull)
]);

/**
 * Muscle length at which the target is under the most tension.
 *
 * Distinct from `peak_position`, which describes the *external* resistance —
 * moment arm times load. They usually agree, and diverge where the target
 * crosses two joints: on a leg press the resistance peaks deep in the range,
 * but rectus femoris length depends on the hip as well as the knee, so the
 * quadriceps as a group are not maximally lengthened where the machine is
 * hardest.
 *
 * Where they diverge, this is the field that matters for the lengthened-partial
 * literature, and `peak_position` is the field that matters for pairing.
 */
export const muscleLengthEnum = pgEnum("muscle_length_at_peak_tension", [
  "lengthened",
  "mid",
  "shortened",
]);

/**
 * How close to true failure this movement can safely be taken.
 *
 * The distinction that matters: a leg press can be taken to genuine concentric
 * failure with no consequence beyond a rack-assisted last rep. A barbell back
 * squat cannot — what fails first is the ability to hold position safely, not
 * the quadriceps. The app must never prescribe the second as though it were the
 * first.
 *
 * Four values, not three. Phase 1 collapsed "stop before failure because form
 * degrades" and "never approach failure because the failure mode is a spinal
 * load you cannot bail out of" into one label. Those are different
 * instructions: the first is a judgement call about a rep, the second is a
 * standing rule about the exercise.
 */
export const failureProtocolEnum = pgEnum("failure_protocol", [
  "true-failure-safe", // 0 RIR is fine, unsupervised
  "failure-with-safety-setup", // 0 RIR only with safeties, pins or a spotter
  "terminate-at-form-breakdown", // stop when position degrades, not at failure
  "never-to-failure", // the failure mode is unsafe regardless of setup
]);

/** Spinal compression the movement imposes. Feeds Phase 5 autoregulation. */
export const axialLoadEnum = pgEnum("axial_load", [
  "none",
  "low",
  "moderate",
  "high",
]);

export const jointStressEnum = pgEnum("joint_stress", ["low", "moderate", "high"]);

/**
 * How much of the effort goes into holding position rather than moving load.
 *
 * High stability demand is why a movement can have an excellent resistance
 * profile and a poor stimulus-to-fatigue ratio at the same time.
 */
export const stabilityDemandEnum = pgEnum("stability_demand", [
  "low",
  "moderate",
  "high",
]);

/** Equipment class, for substitution ranking and library filtering. */
export const equipmentEnum = pgEnum("equipment", [
  "barbell",
  "dumbbell",
  "machine",
  "cable",
  "smith-machine",
  "bodyweight",
  "band",
]);

export const muscles = pgTable(
  "muscles",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    /** Grouping used by the body-map heatmap. */
    region: text("region").notNull(),
    /** SVG path id in the anatomical map, so highlighting stays declarative. */
    svgPathId: text("svg_path_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("muscles_region_idx").on(table.region)],
);

/** How many samples a resistance profile carries. */
export const RESISTANCE_PROFILE_SAMPLES = 11;

export const exercises = pgTable(
  "exercises",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),

    // --- Mechanics ---------------------------------------------------------

    /**
     * Relative torque demand at eleven points across the range of motion.
     *
     * Sample 0 is the fully lengthened position, sample 10 the fully shortened
     * one, so the array reads in the direction of the concentric. Values are
     * normalised so the peak is exactly 1.0 — the shape is the claim, not the
     * magnitude, and nothing here is a measurement in newton-metres.
     *
     * Graded `mechanical-inference`, which is why `resistanceProfileDerivation`
     * is not nullable. A curve without its reasoning is an assertion dressed as
     * data.
     */
    resistanceProfile: numeric("resistance_profile", { precision: 4, scale: 3 })
      .array()
      .notNull(),
    resistanceProfileDerivation: text("resistance_profile_derivation").notNull(),
    peakPosition: peakPositionEnum("peak_position").notNull(),
    muscleLengthAtPeakTension: muscleLengthEnum(
      "muscle_length_at_peak_tension",
    ).notNull(),

    // --- Load and safety ---------------------------------------------------

    equipment: equipmentEnum("equipment").notNull(),
    unilateral: boolean("unilateral").notNull().default(false),
    axialLoad: axialLoadEnum("axial_load").notNull(),
    jointStress: jointStressEnum("joint_stress").notNull(),
    stabilityDemand: stabilityDemandEnum("stability_demand").notNull(),
    failureProtocol: failureProtocolEnum("failure_protocol").notNull(),
    /** Why this protocol, in terms of what fails first and what it costs. */
    failureProtocolRationale: text("failure_protocol_rationale").notNull(),

    // --- Judgement ---------------------------------------------------------

    /**
     * Stimulus-to-fatigue ratio, 1–5.
     *
     * A judgement, not a measurement, and the UI says so wherever it appears.
     * Stored with its reasoning, never bare.
     */
    sfrRating: integer("sfr_rating").notNull(),
    sfrRationale: text("sfr_rationale").notNull(),

    // --- Coaching ----------------------------------------------------------

    /** Three to five. Only cues that change the outcome. */
    setupCues: text("setup_cues").array().notNull(),
    /** Two or three, each stating the consequence rather than the correction. */
    commonErrors: text("common_errors").array().notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("exercises_peak_position_idx").on(table.peakPosition),
    index("exercises_muscle_length_idx").on(table.muscleLengthAtPeakTension),
    index("exercises_equipment_idx").on(table.equipment),
    index("exercises_sfr_idx").on(table.sfrRating),

    check("exercises_sfr_range", sql`${table.sfrRating} between 1 and 5`),
    check(
      "exercises_profile_samples",
      sql`array_length(${table.resistanceProfile}, 1) = ${sql.raw(String(RESISTANCE_PROFILE_SAMPLES))}`,
    ),
    /*
      The peak must actually be present, or "normalised to 1.0" is a comment
      rather than a property. That every other sample also falls in 0–1 is
      enforced by Zod at the boundary instead: a CHECK constraint cannot contain
      a subquery, and `unnest` needs one. The database guarantees the shape; the
      schema guarantees the range.
    */
    check("exercises_profile_normalised", sql`1.0 = any(${table.resistanceProfile})`),
    check(
      "exercises_setup_cues_count",
      sql`array_length(${table.setupCues}, 1) between 3 and 5`,
    ),
    check(
      "exercises_common_errors_count",
      sql`array_length(${table.commonErrors}, 1) between 2 and 3`,
    ),
  ],
);

/**
 * Pelland et al. (2026) coded involvement in three tiers. We store the tier,
 * never the multiplier — see docs/adr/0002-fractional-set-coding.md.
 */
export const involvementEnum = pgEnum("involvement", [
  "direct",
  "fractional",
  "indirect",
]);

/**
 * Fractional volume counting.
 *
 * `involvement` is the tier, and the multiplier (1.0 / 0.5 / 0.0) is derived in
 * `lib/training/involvement.ts`. Storing the multiplier would reintroduce
 * exactly the per-exercise fudging the tiers exist to prevent: a stored float
 * can hold 0.35, and nothing in the literature supports 0.35.
 *
 * Every muscle an exercise trains gets a row, including the indirect ones that
 * contribute zero volume. They are not noise — the fatigue ledger needs to know
 * a muscle was loaded even when it earned no sets, which is why
 * `tallyVolumeByMuscle` keeps zeroed entries rather than dropping them.
 */
export const exerciseMuscles = pgTable(
  "exercise_muscles",
  {
    exerciseId: text("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    muscleId: text("muscle_id")
      .notNull()
      .references(() => muscles.id, { onDelete: "cascade" }),
    involvement: involvementEnum("involvement").notNull(),
    /** True for the muscle the exercise is chosen to train. Exactly one. */
    primeMover: boolean("prime_mover").notNull().default(false),
    /** Why this pair is coded as it is, where the coding is arguable. */
    codingNote: text("coding_note"),
  },
  (table) => [
    uniqueIndex("exercise_muscles_pk").on(table.exerciseId, table.muscleId),
    index("exercise_muscles_muscle_idx").on(table.muscleId),
    /*
      One prime mover per exercise. A partial unique index is the only way to
      say "at most one row per exercise where this is true" — a CHECK cannot see
      sibling rows, and the substitution engine's first matching pass has no
      meaning if an exercise has two prime movers or none.
    */
    uniqueIndex("exercise_muscles_one_prime_mover")
      .on(table.exerciseId)
      .where(sql`prime_mover`),
  ],
);
