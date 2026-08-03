import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const sexEnum = pgEnum("sex", ["male", "female", "unspecified"]);

export const unitSystemEnum = pgEnum("unit_system", ["metric", "imperial"]);

/**
 * Profile row, one per Supabase auth user.
 *
 * `id` is the Supabase `auth.users.id`. We do not mirror email or credentials
 * here — that data stays in the auth schema, which keeps the surface area of
 * anything we might accidentally expose smaller.
 */
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  displayName: text("display_name"),
  sex: sexEnum("sex").default("unspecified").notNull(),
  birthYear: integer("birth_year"),
  unitSystem: unitSystemEnum("unit_system").default("metric").notNull(),
  /** First date of consistent resistance training, for training-age models. */
  trainingSince: date("training_since"),
  /**
   * Global "show your work" toggle: expands every prescription into its
   * inputs, the rule applied, and the evidence grade behind it.
   */
  showYourWork: boolean("show_your_work").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const bodyweightLogs = pgTable(
  "bodyweight_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    measuredOn: date("measured_on").notNull(),
    /** Always stored in kilograms; converted at the edge for display. */
    weightKg: numeric("weight_kg", { precision: 6, scale: 2 }).notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("bodyweight_logs_user_date_idx").on(
      table.userId,
      table.measuredOn,
    ),
  ],
);

export const waterLogs = pgTable(
  "water_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    loggedFor: date("logged_for").notNull(),
    volumeMl: integer("volume_ml").notNull(),
    /**
     * The target in force when this entry was made, retained so the history
     * stays interpretable after the strain-scaling formula changes.
     */
    targetMlAtLog: integer("target_ml_at_log"),
    source: text("source").default("quick-add").notNull(),
    loggedAt: timestamp("logged_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("water_logs_user_day_idx").on(table.userId, table.loggedFor)],
);

/**
 * Encrypted Whoop OAuth material. Server-side only — never selected into any
 * response that reaches the client, and protected by an RLS policy that denies
 * all access to the `authenticated` role.
 */
export const whoopConnections = pgTable(
  "whoop_connections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    whoopUserId: text("whoop_user_id").notNull(),
    /** Ciphertext, not the token. Encrypted with the app's KMS key. */
    accessTokenEncrypted: text("access_token_encrypted").notNull(),
    refreshTokenEncrypted: text("refresh_token_encrypted").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    scopes: jsonb("scopes").$type<string[]>().notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("whoop_connections_user_idx").on(table.userId),
    uniqueIndex("whoop_connections_whoop_user_idx").on(table.whoopUserId),
  ],
);
