import type { EvidenceGrade } from "@/lib/evidence/types";

/**
 * The ambient glossary index and matcher.
 *
 * Every registered term expands to its definition wherever it appears —
 * concept prose, exercise mechanics, setup cues, substitution tradeoffs. The
 * knowledge layer is not a tab you visit once; it is available at the point
 * the jargon is used.
 *
 * This module is deliberately pure: no filesystem, no React, no `server-only`.
 * The matching rules are where the subtlety lives, so they need to be testable
 * as a function of a string and an index rather than only observable through a
 * rendered page. `concepts.ts` builds the index from the corpus and the
 * components consume it; nothing here knows either of those exist.
 *
 * Matching happens on the AST at build time, never over rendered HTML. A regex
 * sweep across markup cannot tell prose from a heading, an attribute value, or
 * the inside of an existing link, and would happily rewrite all three.
 */

export interface GlossaryEntry {
  slug: string;
  title: string;
  shortDefinition: string;
  evidenceGrade: EvidenceGrade;
}

/** A concept, reduced to what the glossary needs of it. */
export interface GlossarySource extends GlossaryEntry {
  /** Aliases beyond the title — abbreviations, plurals, synonyms. */
  terms: readonly string[];
}

interface IndexedAlias {
  /** Lowercased, for matching. */
  alias: string;
  /**
   * The alias as its author wrote it.
   *
   * Matching is case-insensitive, so the key has to be lowercased — but the
   * key is not what a reader should be shown. "DOMS", "MEV" and "mTORC1" are
   * not words that have a lowercase form, and an index that prints them as
   * "doms" and "mev" looks like it does not know what they are.
   */
  display: string;
  entry: GlossaryEntry;
}

export interface GlossaryIndex {
  /**
   * Aliases in match order: longest first, so the most specific one wins.
   *
   * The order is explicit rather than inherited from insertion, for the reason
   * `ROUTE_SURFACES` is: a structure whose correctness depends on order has to
   * declare that order. Alternation in a JS regex is leftmost-first, so
   * "reps in reserve" must precede "reps" or the short alias eats the long one
   * and the reader gets the wrong concept.
   */
  readonly aliases: readonly IndexedAlias[];
  /** Lowercased alias -> owning concept. */
  readonly byAlias: ReadonlyMap<string, GlossaryEntry>;
  readonly bySlug: ReadonlyMap<string, GlossaryEntry>;
  /** Undefined when nothing is registered — an empty alternation matches all. */
  readonly pattern: RegExp | undefined;
}

type GlossarySegment =
  | { kind: "text"; text: string }
  | { kind: "term"; text: string; entry: GlossaryEntry };

/**
 * Word boundaries, hand-written rather than `\b`.
 *
 * `\b` is defined against `[A-Za-z0-9_]`, which gets two things wrong here.
 * It would match "tension" inside "tension-free" — a hyphenated compound is a
 * different word — and it mishandles the non-ASCII letters that appear in
 * author names and borrowed terms. These lookarounds treat any letter, digit,
 * underscore or hyphen as part of the surrounding word.
 */
const BEFORE = "(?<![\\p{L}\\p{N}_-])";
const AFTER = "(?![\\p{L}\\p{N}_-])";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Builds the index from the corpus.
 *
 * A duplicate alias keeps its first owner and the later one is dropped. That
 * is not a silent tie-break: `checkTermUniqueness` already fails the build on
 * a term claimed by two concepts, so reaching this line means the integrity
 * check has been changed and the tie-break is a last line rather than a policy.
 */
export function buildGlossaryIndex(
  sources: readonly GlossarySource[],
): GlossaryIndex {
  const bySlug = new Map<string, GlossaryEntry>();
  const owners = new Map<string, IndexedAlias>();

  for (const source of sources) {
    const entry: GlossaryEntry = {
      slug: source.slug,
      title: source.title,
      shortDefinition: source.shortDefinition,
      evidenceGrade: source.evidenceGrade,
    };
    bySlug.set(entry.slug, entry);

    for (const term of [source.title, ...source.terms]) {
      const display = term.trim();
      const alias = display.toLowerCase();
      if (alias === "" || owners.has(alias)) continue;
      owners.set(alias, { alias, display, entry });
    }
  }

  const aliases = [...owners.values()]
    // Longest first. Ties broken alphabetically so the index is deterministic
    // across builds rather than dependent on Map iteration order.
    .sort((a, b) =>
      b.alias.length - a.alias.length || a.alias.localeCompare(b.alias),
    );

  const pattern =
    aliases.length === 0
      ? undefined
      : new RegExp(
          `${BEFORE}(?:${aliases.map(({ alias }) => escapeRegExp(alias)).join("|")})${AFTER}`,
          "giu",
        );

  return {
    aliases,
    byAlias: new Map(aliases.map((entry) => [entry.alias, entry.entry])),
    bySlug,
    pattern,
  };
}

export interface GlossaryPassOptions {
  /**
   * A concept never links to itself. On `/knowledge/mechanical-tension`, the
   * phrase "mechanical tension" is the subject of the page, not a reference to
   * somewhere else.
   */
  skipSlug?: string;
}

export interface GlossaryPass {
  /** Splits one run of prose into plain text and annotated terms. */
  segment(text: string): GlossarySegment[];
  /** Slugs annotated so far, in first-appearance order. */
  annotated(): readonly string[];
}

/**
 * One pass per page.
 *
 * The seen-set is what enforces "first occurrence only", and it is keyed by
 * owning concept rather than by alias: "MPS" and "protein synthesis" resolve
 * to the same page, so annotating both would send the reader to the same place
 * twice. Annotating every instance of every term turns prose into a minefield
 * of dotted underlines that nobody reads through.
 *
 * State is why this is a factory rather than a function. A pass belongs to a
 * render of a page, and two pages rendering concurrently must not share one.
 */
export function createGlossaryPass(
  index: GlossaryIndex,
  options: GlossaryPassOptions = {},
): GlossaryPass {
  const seen = new Set<string>();
  const order: string[] = [];

  function segment(text: string): GlossarySegment[] {
    const { pattern } = index;
    if (!pattern || text === "") return plain(text);

    const segments: GlossarySegment[] = [];
    let cursor = 0;
    pattern.lastIndex = 0;

    let match = pattern.exec(text);
    while (match) {
      const found = index.byAlias.get(match[0].toLowerCase());

      if (found && found.slug !== options.skipSlug && !seen.has(found.slug)) {
        seen.add(found.slug);
        order.push(found.slug);
        if (match.index > cursor) {
          segments.push({ kind: "text", text: text.slice(cursor, match.index) });
        }
        segments.push({ kind: "term", text: match[0], entry: found });
        cursor = match.index + match[0].length;
      }

      /*
        Scanning resumes after the match even when it was not annotated. A
        skipped "mechanical tension" must not then be re-scanned so that the
        shorter "tension" inside it matches — that is the "never match inside
        another glossary term" rule, and it applies to terms we declined to
        annotate exactly as it applies to ones we did.
      */
      pattern.lastIndex = match.index + Math.max(match[0].length, 1);
      match = pattern.exec(text);
    }

    if (segments.length === 0) return plain(text);
    if (cursor < text.length) {
      segments.push({ kind: "text", text: text.slice(cursor) });
    }
    return segments;
  }

  return {
    segment,
    annotated: () => order,
  };
}

function plain(text: string): GlossarySegment[] {
  return text === "" ? [] : [{ kind: "text", text }];
}
