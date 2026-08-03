/**
 * Projects the MDX corpus into Postgres.
 *
 * The files stay the source of truth: prose is reviewable in diffs and the
 * build fails on a bad citation id. What lands in the database is only the
 * index the app cannot cheaply derive at runtime — the glossary lookup, the
 * concept metadata, and the citation back-links.
 *
 * Safe to re-run. Rows absent from the corpus are deleted, so a renamed slug
 * does not leave a ghost behind.
 *
 *   pnpm db:sync-content
 */
import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  // Imported after dotenv so DATABASE_URL is populated.
  const { db } = await import("@/db");
  const {
    citations,
    conceptCitations,
    concepts,
    glossaryTerms,
  } = await import("@/db/schema");
  const { getAllConcepts } = await import("@/lib/content/concepts");
  const { ALL_CITATIONS } = await import("@/lib/evidence/citations");

  const corpus = getAllConcepts();

  console.log(
    `Syncing ${corpus.length} concepts and ${ALL_CITATIONS.length} citations.`,
  );

  await db.transaction(async (tx) => {
    // Citations first — concept_citations references them.
    for (const citation of ALL_CITATIONS) {
      await tx
        .insert(citations)
        .values({
          id: citation.id,
          authors: citation.authors,
          year: citation.year,
          title: citation.title,
          journal: citation.journal,
          doi: citation.doi ?? null,
          pmid: citation.pmid ?? null,
          design: citation.design,
          keyFinding: citation.keyFinding,
        })
        .onConflictDoUpdate({
          target: citations.id,
          set: {
            authors: citation.authors,
            year: citation.year,
            title: citation.title,
            journal: citation.journal,
            doi: citation.doi ?? null,
            pmid: citation.pmid ?? null,
            design: citation.design,
            keyFinding: citation.keyFinding,
          },
        });
    }

    for (const concept of corpus) {
      await tx
        .insert(concepts)
        .values({
          slug: concept.slug,
          title: concept.title,
          category: concept.category,
          shortDefinition: concept.shortDefinition,
          evidenceGrade: concept.evidenceGrade,
          position: concept.position,
          readingMinutes: concept.readingMinutes,
        })
        .onConflictDoUpdate({
          target: concepts.slug,
          set: {
            title: concept.title,
            category: concept.category,
            shortDefinition: concept.shortDefinition,
            evidenceGrade: concept.evidenceGrade,
            position: concept.position,
            readingMinutes: concept.readingMinutes,
          },
        });
    }

    // Terms and joins are rebuilt wholesale — they are small, and diffing them
    // would be more code than it is worth.
    await tx.delete(glossaryTerms);
    await tx.delete(conceptCitations);

    for (const concept of corpus) {
      for (const term of [concept.title, ...concept.terms]) {
        await tx
          .insert(glossaryTerms)
          .values({ term: term.toLowerCase(), conceptSlug: concept.slug })
          .onConflictDoNothing();
      }
      for (const citationId of concept.citations) {
        await tx
          .insert(conceptCitations)
          .values({ conceptSlug: concept.slug, citationId })
          .onConflictDoNothing();
      }
    }
  });

  console.log("Sync complete.");
  process.exit(0);
}

main().catch((error) => {
  console.error("Content sync failed:", error);
  process.exit(1);
});
