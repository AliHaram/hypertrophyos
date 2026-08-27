import fs from "node:fs";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { getAllExercises } from "../src/lib/exercises/library";

/**
 * axe against every route, on both surfaces.
 *
 * The route list is derived rather than written down. A concept added to
 * `content/concepts` is scanned the moment it exists — a checklist that has to
 * be updated by hand is a checklist that silently stops covering things.
 *
 * Both surfaces matter because they are different stylesheets. Dark and light
 * resolve to different ramp steps for the same semantic role, so a pairing can
 * pass on one and fail on the other, and the knowledge layer defaults to light
 * while everything else defaults to dark.
 */

const SURFACE_COOKIE = "hos-surface";
const SURFACES = ["dark", "light"] as const;

/**
 * WCAG 2.0/2.1 A and AA. `best-practice` is deliberately excluded: it flags
 * things like heading-order inside MDX prose that are stylistic rather than
 * barriers, and a gate that cries wolf gets switched off.
 */
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

function conceptRoutes(): string[] {
  const dir = path.join(process.cwd(), "content", "concepts");
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => `/knowledge/${file.replace(/\.mdx$/, "")}`)
    .sort();
}

/**
 * Exercise routes come from the library rather than a written list, for the
 * same reason concept routes do: a checklist updated by hand is a checklist
 * that silently stops covering things.
 */
function exerciseRoutes(): string[] {
  return getAllExercises()
    .map((exercise) => `/exercises/${exercise.id}`)
    .sort();
}

const ROUTES = [
  "/",
  "/knowledge",
  "/glossary",
  // A filtered view, and the grade with nothing in it — the empty state is a
  // rendered surface with its own headings and links.
  "/glossary?grade=strong",
  "/glossary?grade=weak",
  "/citations",
  "/design",
  "/exercises",
  // The empty state is a rendered surface with its own headings and links, and
  // it is the one view a11y sweeps normally never reach.
  "/exercises?muscle=quadriceps&peak=shortened",
  ...conceptRoutes(),
  ...exerciseRoutes(),
];

test.describe("accessibility", () => {
  for (const surface of SURFACES) {
    for (const route of ROUTES) {
      test(`${route} has no axe violations on the ${surface} surface`, async ({
        page,
        context,
      }) => {
        await context.addCookies([
          {
            name: SURFACE_COOKIE,
            value: surface,
            domain: "127.0.0.1",
            path: "/",
          },
        ]);

        await page.goto(route);

        // Figure data tables live inside a closed <details>, and axe does not
        // scan hidden content. The table is the accessible path to the numbers,
        // so it is exactly the thing that must be checked.
        await page.evaluate(() => {
          for (const details of document.querySelectorAll("details")) {
            details.open = true;
          }
        });

        const results = await new AxeBuilder({ page })
          .withTags(TAGS)
          .analyze();

        expect(describeViolations(results.violations), formatSummary(route, surface))
          .toEqual([]);
      });
    }
  }
});

interface AxeViolation {
  id: string;
  impact?: string | null;
  help: string;
  nodes: ReadonlyArray<{ html: string; failureSummary?: string | undefined }>;
}

/**
 * Flattens violations into readable strings.
 *
 * Asserting on the raw axe objects prints several hundred lines of nested
 * detail per failure, which is how a CI log becomes something nobody reads.
 * One line per offending node, carrying the rule, the element and the reason.
 */
function describeViolations(violations: readonly AxeViolation[]): string[] {
  return violations.flatMap((violation) =>
    violation.nodes.map((node) => {
      const reason = node.failureSummary?.replace(/\s+/g, " ").trim() ?? violation.help;
      return `[${violation.id}] ${reason} — ${truncate(node.html, 120)}`;
    }),
  );
}

function formatSummary(route: string, surface: string): string {
  return `axe violations on ${route} (${surface} surface)`;
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}
