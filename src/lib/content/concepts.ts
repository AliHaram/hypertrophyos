import "server-only";

import fs from "node:fs";
import path from "node:path";

import matter from "gray-matter";

import { resolveCitations } from "@/lib/evidence/citations";
import type { Citation } from "@/lib/evidence/types";

import {
  CONCEPT_CATEGORIES,
  type Concept,
  type ConceptCategory,
  assertIntegrity,
  conceptFrontmatterSchema,
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

  assertUniqueTerms(concepts);
  assertRelatedResolve(concepts);

  cache = concepts.sort(compareConcepts);
  return cache;
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

  // Throws on unknown or unverified ids.
  resolveCitations(parsed.data.citations);

  const concept: Concept = {
    ...parsed.data,
    slug,
    body: content,
    readingMinutes: estimateReadingMinutes(content),
  };

  assertIntegrity(concept);
  return concept;
}

function compareConcepts(a: Concept, b: Concept): number {
  const categoryDelta =
    CONCEPT_CATEGORIES.indexOf(a.category) -
    CONCEPT_CATEGORIES.indexOf(b.category);
  return categoryDelta !== 0 ? categoryDelta : a.position - b.position;
}

/**
 * A term may only resolve to one concept. Two definitions for "MEV" would make
 * the glossary non-deterministic, and the reader would never know which they
 * were getting.
 */
function assertUniqueTerms(concepts: Concept[]): void {
  const owners = new Map<string, string>();
  for (const concept of concepts) {
    for (const term of [concept.title, ...concept.terms]) {
      const key = term.toLowerCase();
      const existing = owners.get(key);
      if (existing && existing !== concept.slug) {
        throw new Error(
          `Glossary term "${term}" is claimed by both "${existing}" and "${concept.slug}". Terms must resolve to exactly one concept.`,
        );
      }
      owners.set(key, concept.slug);
    }
  }
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

export function getConceptsByCategory(
  category: ConceptCategory,
): Concept[] {
  return getAllConcepts().filter((concept) => concept.category === category);
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

export function getGlossary(): Map<string, GlossaryEntry> {
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
