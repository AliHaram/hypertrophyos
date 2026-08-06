import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

/**
 * Server-side database client.
 *
 * Imports `server-only`, so pulling this into a client component is a build
 * error rather than a runtime leak. Application queries go through Supabase
 * auth with RLS enforced; this connection is for server components, route
 * handlers, and migrations.
 */

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local.");
}

declare global {
  var __hypertrophyDb: ReturnType<typeof createClient> | undefined;
}

function createClient() {
  const client = postgres(connectionString!, {
    // Supabase's pooler does not support prepared statements in transaction mode.
    prepare: false,
    max: 10,
  });
  return drizzle(client, { schema });
}

// Reused across hot reloads so dev does not exhaust the connection pool.
export const db = globalThis.__hypertrophyDb ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__hypertrophyDb = db;
}
