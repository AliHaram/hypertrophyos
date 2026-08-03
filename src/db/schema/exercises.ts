import {
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
 */
export const resistanceProfileEnum = pgEnum("resistance_profile", [
  "ascending", // hardest near the shortened position (e.g. concentration curl)
  "descending", // hardest near the stretch (e.g. preacher curl)
  "bell-shaped", // hardest mid-range (e.g. barbell curl)
  "flat", // roughly even (e.g. cable curl with good line of pull)
]);

/** Muscle length at which the exercise loads the target hardest. */
export const lengthTensionEnum = pgEnum("length_tension_position", [
  "lengthened",
  "mid-range",
  "shortened",
]);

/**
 * How close to true failure this movement can safely be taken.
 *
 * The distinction that matters: a leg press can be taken to genuine concentric
 * failure with no consequence beyond a rack-assisted last rep. A barbell back
 * squat cannot — what fails first is the ability to hold position safely, not
 * the quadriceps. The app must never prescribe the second as though it were
 * the first.
 */
export const failureProtocolEnum = pgEnum("failure_protocol", [
  "true-concentric-safe", // machine/isolation: 0 RIR is fine unsupervised
  "spotter-required", // 0 RIR only with a competent spotter or safeties
  "technical-limit-only", // stop at form breakdown, never at true failure
]);

export const jointStressEnum = pgEnum("joint_stress", ["low", "moderate", "high"]);

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

export const exercises = pgTable(
  "exercises",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    equipment: text("equipment").notNull(),
    resistanceProfile: resistanceProfileEnum("resistance_profile").notNull(),
    lengthTension: lengthTensionEnum("length_tension_position").notNull(),
    failureProtocol: failureProtocolEnum("failure_protocol").notNull(),
    jointStress: jointStressEnum("joint_stress").notNull(),
    /** Stimulus-to-fatigue ratio, 1–5. Stored with its reasoning, never bare. */
    sfrRating: integer("sfr_rating").notNull(),
    sfrRationale: text("sfr_rationale").notNull(),
    setupCues: text("setup_cues").array().notNull(),
    /** The two or three errors that actually change the outcome. */
    commonErrors: text("common_errors").array().notNull(),
    failureNotes: text("failure_notes").notNull(),
    /**
     * Sampled resistance curve, normalised: 0 = fully shortened, 1 = fully
     * lengthened, values are relative difficulty 0–1. Drives the inline plot.
     */
    resistanceCurve: numeric("resistance_curve", { precision: 4, scale: 3 })
      .array(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("exercises_profile_idx").on(table.resistanceProfile),
    index("exercises_length_idx").on(table.lengthTension),
    index("exercises_sfr_idx").on(table.sfrRating),
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
 * `involvement` is the tier, and the multiplier (1.0 / 0.5 / 0.0) is derived
 * in `lib/training/involvement.ts`. Storing the multiplier would reintroduce
 * exactly the per-exercise fudging the tiers exist to prevent: a stored float
 * can hold 0.35, and nothing in the literature supports 0.35.
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
    /** Why this pair is coded as it is, where the coding is arguable. */
    codingNote: text("coding_note"),
  },
  (table) => [
    uniqueIndex("exercise_muscles_pk").on(table.exerciseId, table.muscleId),
    index("exercise_muscles_muscle_idx").on(table.muscleId),
  ],
);
