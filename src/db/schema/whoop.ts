import {
  date,
  index,
  integer,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { profiles } from "./identity";

/**
 * Whoop mirrors.
 *
 * These tables cache what the v2 API returns so the dashboard stays fast and
 * usable when Whoop is unreachable, rate-limiting, or has simply not scored
 * the night yet. `whoopId` is the upstream record id, unique per user, so
 * webhook deliveries and backfills can upsert idempotently.
 *
 * Only derived metrics are stored — never tokens. Those live encrypted in
 * `whoop_connections`.
 */

export const whoopRecovery = pgTable(
  "whoop_recovery",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    whoopId: text("whoop_id").notNull(),
    cycleId: text("cycle_id"),
    /** The day this recovery scores, in the user's timezone. */
    scoredFor: date("scored_for").notNull(),
    recoveryScore: smallint("recovery_score"),
    restingHeartRate: numeric("resting_heart_rate", { precision: 5, scale: 1 }),
    hrvRmssdMilli: numeric("hrv_rmssd_milli", { precision: 6, scale: 2 }),
    spo2Percentage: numeric("spo2_percentage", { precision: 4, scale: 1 }),
    skinTempCelsius: numeric("skin_temp_celsius", { precision: 4, scale: 1 }),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
    syncedAt: timestamp("synced_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("whoop_recovery_user_whoop_idx").on(table.userId, table.whoopId),
    index("whoop_recovery_user_day_idx").on(table.userId, table.scoredFor),
  ],
);

export const whoopSleep = pgTable(
  "whoop_sleep",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    whoopId: text("whoop_id").notNull(),
    scoredFor: date("scored_for").notNull(),
    sleepPerformancePercentage: smallint("sleep_performance_percentage"),
    sleepEfficiencyPercentage: numeric("sleep_efficiency_percentage", {
      precision: 5,
      scale: 2,
    }),
    totalInBedMilli: integer("total_in_bed_milli"),
    totalAwakeMilli: integer("total_awake_milli"),
    totalRemMilli: integer("total_rem_milli"),
    totalSlowWaveMilli: integer("total_slow_wave_milli"),
    /** Cumulative debt, an input to the deload predictor. */
    sleepDebtMilli: integer("sleep_debt_milli"),
    respiratoryRate: numeric("respiratory_rate", { precision: 4, scale: 1 }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    syncedAt: timestamp("synced_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("whoop_sleep_user_whoop_idx").on(table.userId, table.whoopId),
    index("whoop_sleep_user_day_idx").on(table.userId, table.scoredFor),
  ],
);

export const whoopCycles = pgTable(
  "whoop_cycles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    whoopId: text("whoop_id").notNull(),
    scoredFor: date("scored_for").notNull(),
    /** Whoop day strain, 0–21 on a logarithmic scale. */
    strain: numeric("strain", { precision: 4, scale: 2 }),
    averageHeartRate: smallint("average_heart_rate"),
    maxHeartRate: smallint("max_heart_rate"),
    kilojoules: numeric("kilojoules", { precision: 8, scale: 2 }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    syncedAt: timestamp("synced_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("whoop_cycles_user_whoop_idx").on(table.userId, table.whoopId),
    index("whoop_cycles_user_day_idx").on(table.userId, table.scoredFor),
  ],
);
