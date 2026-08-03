import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    "Set DIRECT_URL (or DATABASE_URL) in .env.local. See .env.example.",
  );
}

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
  // Supabase manages these; drizzle-kit should not try to diff them.
  schemaFilter: ["public"],
  verbose: true,
  strict: true,
});
