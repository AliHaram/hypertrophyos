import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const evidenceGradeEnum = pgEnum("evidence_grade", [
  "strong",
  "mixed",
  "weak",
]);

/**
 * Citations, mirrored from `src/lib/evidence/citations.ts`.
 *
 * The TypeScript module is the source of truth — it is reviewable in diffs and
 * fails the build on an unknown id. This table exists so the app can answer
 * queries the module cannot serve cheaply at runtime: which concepts cite a
 * given paper, what the bibliography looks like filtered by study design.
 * `pnpm db:sync-content` rewrites it; nothing else should write here.
 */
export const citations = pgTable("citations", {
  id: text("id").primaryKey(),
  authors: text("authors").notNull(),
  year: integer("year").notNull(),
  title: text("title").notNull(),
  journal: text("journal").notNull(),
  doi: text("doi"),
  pmid: text("pmid"),
  design: text("design").notNull(),
  keyFinding: text("key_finding").notNull(),
  syncedAt: timestamp("synced_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/**
 * Concept index, projected from the MDX frontmatter at build time.
 *
 * Body prose is not stored here — it lives in `content/concepts/*.mdx` and is
 * rendered from the filesystem. What this table holds is everything the
 * ambient glossary and cross-linking need to resolve a term anywhere in the
 * app without loading the full corpus into the client bundle.
 */
export const concepts = pgTable(
  "concepts",
  {
    slug: text("slug").primaryKey(),
    title: text("title").notNull(),
    /** Section of the knowledge layer, e.g. "mechanisms", "programming". */
    category: text("category").notNull(),
    /** One or two sentences. This is what the hover card shows. */
    shortDefinition: text("short_definition").notNull(),
    /** Overall grade for the concept's central claim. */
    evidenceGrade: evidenceGradeEnum("evidence_grade").notNull(),
    /** Ordering within the category; the knowledge layer has a reading order. */
    position: integer("position").notNull(),
    readingMinutes: integer("reading_minutes").notNull(),
    syncedAt: timestamp("synced_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("concepts_category_idx").on(table.category, table.position)],
);

/**
 * Glossary terms, including aliases.
 *
 * A term maps to a concept, and several terms can map to the same one — "RIR",
 * "reps in reserve", and "repetitions in reserve" all resolve to a single
 * definition. Populated from the `terms` frontmatter array.
 */
export const glossaryTerms = pgTable(
  "glossary_terms",
  {
    term: text("term").primaryKey(),
    conceptSlug: text("concept_slug")
      .notNull()
      .references(() => concepts.slug, { onDelete: "cascade" }),
    syncedAt: timestamp("synced_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("glossary_terms_concept_idx").on(table.conceptSlug)],
);

/** Join table: which concepts cite which papers. */
export const conceptCitations = pgTable(
  "concept_citations",
  {
    conceptSlug: text("concept_slug")
      .notNull()
      .references(() => concepts.slug, { onDelete: "cascade" }),
    citationId: text("citation_id")
      .notNull()
      .references(() => citations.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("concept_citations_pk").on(table.conceptSlug, table.citationId),
    index("concept_citations_citation_idx").on(table.citationId),
  ],
);
