import "server-only";

import fs from "node:fs";
import path from "node:path";

import matter from "gray-matter";

import { resolveCitations } from "@/lib/evidence/citations";
import {
  assertNoViolations,
  checkOrphanedTerms,
  checkStaleOrphanRegistrations,
  checkTermUniqueness,
} from "@/lib/evidence/integrity";
import type { Citation } from "@/lib/evidence/types";

import {
  CONCEPT_CATEGORIES,
  type Concept,
  conceptFrontmatterSchema,
  conceptViolations,
  estimateReadingMinutes,
} from "./schema";

const CONTENT_DIR = path.join(process.cwd(), "content", "concepts");

/**
 * Loads and validates every concept once per process.
 *
 * Reading the corpus is cheap and the result is immutable within a build, so
 * it is cached module-side rather than per-request. Every failure here is a
 * hard throw: a bad citation id or a missing evidence grade should stop the
 * build, not degrade quietly into an unlabelled claim in production.
 */
let cache: Concept[] | undefined;

export function getAllConcepts(): Concept[] {
  if (cache) return cache;

  if (!fs.existsSync(CONTENT_DIR)) {
    throw new Error(`Concept directory not found at ${CONTENT_DIR}`);
  }

  const concepts = fs
    .readdirSync(CONTENT_DIR)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => parseConcept(file));

  runIntegrityChecks(concepts);
  assertRelatedResolve(concepts);

  cache = concepts.sort(compareConcepts);
  return cache;
}

/**
 * Runs the whole rule set over the corpus and fails once with every violation.
 *
 * Collecting rather than throwing on the first problem matters in practice: a
 * content pass that introduces six violations should surface six, not send the
 * author round the build loop six times.
 */
function runIntegrityChecks(concepts: Concept[]): void {
  const resolvedTerms = new Set(
    concepts.flatMap((concept) =>
      [concept.title, ...concept.terms].map((term) => term.toLowerCase()),
    ),
  );

  assertNoViolations([
    ...concepts.flatMap(conceptViolations),
    ...checkTermUniqueness(
      concepts.map((concept) => ({
        slug: concept.slug,
        terms: [concept.title, ...concept.terms],
      })),
    ),
    ...checkOrphanedTerms(resolvedTerms),
    ...checkStaleOrphanRegistrations(resolvedTerms),
  ]);
}

function parseConcept(filename: string): Concept {
  const slug = filename.replace(/\.mdx$/, "");
  const raw = fs.readFileSync(path.join(CONTENT_DIR, filename), "utf8");
  const { data, content } = matter(raw);

  const parsed = conceptFrontmatterSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(
      `Invalid frontmatter in ${filename}:\n${JSON.stringify(parsed.error.format(), null, 2)}`,
    );
  }

  const concept: Concept = {
    ...parsed.data,
    slug,
    body: content,
    readingMinutes: estimateReadingMinutes(content),
  };

  return concept;
}

function compareConcepts(a: Concept, b: Concept): number {
  const categoryDelta =
    CONCEPT_CATEGORIES.indexOf(a.category) -
    CONCEPT_CATEGORIES.indexOf(b.category);
  return categoryDelta !== 0 ? categoryDelta : a.position - b.position;
}

function assertRelatedResolve(concepts: Concept[]): void {
  const slugs = new Set(concepts.map((concept) => concept.slug));
  for (const concept of concepts) {
    for (const related of concept.related) {
      if (!slugs.has(related)) {
        throw new Error(
          `Concept "${concept.slug}" links to unknown concept "${related}".`,
        );
      }
    }
  }
}

export function getConcept(slug: string): Concept | undefined {
  return getAllConcepts().find((concept) => concept.slug === slug);
}

export function getConceptCitations(slug: string): Citation[] {
  const concept = getConcept(slug);
  return concept ? resolveCitations(concept.citations) : [];
}

/**
 * Term lookup table for the ambient glossary.
 *
 * Keyed by lowercased term, including each concept's own title, so `<Term>`
 * can resolve a definition anywhere in the app without the caller knowing
 * which concept owns it.
 */
export interface GlossaryEntry {
  slug: string;
  title: string;
  shortDefinition: string;
  evidenceGrade: Concept["evidenceGrade"];
}

let glossaryCache: Map<string, GlossaryEntry> | undefined;

function getGlossary(): Map<string, GlossaryEntry> {
  if (glossaryCache) return glossaryCache;

  const glossary = new Map<string, GlossaryEntry>();
  for (const concept of getAllConcepts()) {
    const entry: GlossaryEntry = {
      slug: concept.slug,
      title: concept.title,
      shortDefinition: concept.shortDefinition,
      evidenceGrade: concept.evidenceGrade,
    };
    for (const term of [concept.title, ...concept.terms]) {
      glossary.set(term.toLowerCase(), entry);
    }
  }

  glossaryCache = glossary;
  return glossary;
}

export function lookupTerm(term: string): GlossaryEntry | undefined {
  return getGlossary().get(term.trim().toLowerCase());
}

/** Citation id -> concepts citing it. Powers the bibliography's back-links. */
export function getCitationBacklinks(): Map<string, Concept[]> {
  const backlinks = new Map<string, Concept[]>();
  for (const concept of getAllConcepts()) {
    for (const id of concept.citations) {
      const list = backlinks.get(id) ?? [];
      list.push(concept);
      backlinks.set(id, list);
    }
  }
  return backlinks;
}
