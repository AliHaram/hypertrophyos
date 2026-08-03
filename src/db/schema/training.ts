import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { exercises, muscles } from "./exercises";
import { profiles } from "./identity";

export const programs = pgTable("programs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  notes: text("notes"),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const mesocycles = pgTable(
  "mesocycles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    programId: uuid("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    startDate: date("start_date").notNull(),
    /** Accumulation weeks, excluding the deload. */
    weeks: smallint("weeks").notNull(),
    /** Whether a deload week is appended. Predicted, not calendar-fixed. */
    includesDeload: boolean("includes_deload").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("mesocycles_program_idx").on(table.programId)],
);

export const readinessBandEnum = pgEnum("readiness_band", [
  "green",
  "yellow",
  "red",
  "unknown",
]);

export const workouts = pgTable(
  "workouts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    mesocycleId: uuid("mesocycle_id").references(() => mesocycles.id, {
      onDelete: "set null",
    }),
    performedOn: date("performed_on").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    /** Recovery band the session was pre-adjusted for, at the time it opened. */
    readinessBand: readinessBandEnum("readiness_band")
      .default("unknown")
      .notNull(),
    recoveryScore: smallint("recovery_score"),
    /**
     * Whether the user overrode the readiness adjustment. Paired with the
     * session outcome so the app can eventually tell the user whether their
     * overrides tend to work out — rather than assuming it knows better.
     */
    autoregulationOverridden: boolean("autoregulation_overridden")
      .default(false)
      .notNull(),
    sessionRpe: numeric("session_rpe", { precision: 3, scale: 1 }),
    notes: text("notes"),
  },
  (table) => [
    index("workouts_user_date_idx").on(table.userId, table.performedOn),
  ],
);

/** Corroborating failure-proximity signal that needs no VBT hardware. */
export const velocityTagEnum = pgEnum("velocity_tag", [
  "maintained",
  "slowed",
  "grinding",
]);

export const workoutSets = pgTable(
  "workout_sets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workoutId: uuid("workout_id")
      .notNull()
      .references(() => workouts.id, { onDelete: "cascade" }),
    exerciseId: text("exercise_id")
      .notNull()
      .references(() => exercises.id),
    /** Ordinal within the session, so supersets can share a group. */
    position: smallint("position").notNull(),
    supersetGroup: smallint("superset_group"),
    loadKg: numeric("load_kg", { precision: 6, scale: 2 }),
    reps: smallint("reps"),
    /** What the user reported. Never overwritten by the bias correction. */
    loggedRir: numeric("logged_rir", { precision: 3, scale: 1 }),
    /**
     * `loggedRir` adjusted by the user's measured bias for this exercise
     * class. Stored rather than derived so historical volume stays stable
     * when the coefficient later moves.
     */
    correctedRir: numeric("corrected_rir", { precision: 3, scale: 1 }),
    velocityTag: velocityTagEnum("velocity_tag"),
    isWarmup: boolean("is_warmup").default(false).notNull(),
    completed: boolean("completed").default(true).notNull(),
    loggedAt: timestamp("logged_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("workout_sets_workout_idx").on(table.workoutId, table.position),
    index("workout_sets_exercise_idx").on(table.exerciseId),
  ],
);

/**
 * AMRAP-to-true-failure calibration tests.
 *
 * Run every 2–3 weeks on an isolation or machine movement only — the failure
 * protocol for compound barbell lifts makes a true-failure test unsafe, and
 * prescribing one would contradict the exercise library's own guidance.
 *
 * Armes et al. (2020) found trained lifters under-predict remaining reps by
 * roughly 2 (95% CI 0.0–4.0). That population figure is only the prior; this
 * table is what replaces it with the user's own measured bias.
 */
export const rirCalibrations = pgTable(
  "rir_calibrations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    exerciseId: text("exercise_id")
      .notNull()
      .references(() => exercises.id),
    /** Grouping the coefficient generalises over (e.g. "machine-press"). */
    exerciseClass: text("exercise_class").notNull(),
    testedOn: date("tested_on").notNull(),
    loadKg: numeric("load_kg", { precision: 6, scale: 2 }).notNull(),
    /** Reps the user predicted before starting the set. */
    predictedReps: smallint("predicted_reps").notNull(),
    /** Reps actually completed to true concentric failure. */
    actualReps: smallint("actual_reps").notNull(),
    /**
     * actualReps - predictedReps. Positive means the user stopped early,
     * believing they were closer to failure than they were.
     */
    deltaReps: smallint("delta_reps").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("rir_calibrations_user_class_idx").on(
      table.userId,
      table.exerciseClass,
    ),
  ],
);

export const landmarkSourceEnum = pgEnum("landmark_source", [
  "population-default",
  "user-estimated",
  "user-override",
]);

/**
 * Per-user, per-muscle volume landmarks.
 *
 * Starts at the population prior and is refined from performance data,
 * soreness input, and recovery trend. Kept as a row per muscle rather than a
 * global setting because MRV in particular is muscle-specific — the same
 * lifter can tolerate far more volume for side delts than for hamstrings.
 */
export const volumeLandmarks = pgTable(
  "volume_landmarks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    muscleId: text("muscle_id")
      .notNull()
      .references(() => muscles.id, { onDelete: "cascade" }),
    mev: numeric("mev", { precision: 4, scale: 1 }).notNull(),
    mav: numeric("mav", { precision: 4, scale: 1 }).notNull(),
    mrv: numeric("mrv", { precision: 4, scale: 1 }).notNull(),
    source: landmarkSourceEnum("source").default("population-default").notNull(),
    /** How much data backs the estimate, 0–1. Drives the error bars shown. */
    confidence: numeric("confidence", { precision: 3, scale: 2 })
      .default("0.20")
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("volume_landmarks_user_muscle_idx").on(
      table.userId,
      table.muscleId,
    ),
  ],
);

/**
 * Per-lift overload debt.
 *
 * Accrues when a movement has not progressed on any of the six levers. The
 * prescribed next lever is stored with its reasoning so the recommendation
 * can be shown, questioned, and overridden rather than merely obeyed.
 */
export const overloadDebt = pgTable(
  "overload_debt",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    exerciseId: text("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    sessionsWithoutProgress: integer("sessions_without_progress")
      .default(0)
      .notNull(),
    lastProgressedAt: date("last_progressed_at"),
    prescribedLever: text("prescribed_lever"),
    prescriptionRationale: text("prescription_rationale"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("overload_debt_user_exercise_idx").on(
      table.userId,
      table.exerciseId,
    ),
  ],
);
