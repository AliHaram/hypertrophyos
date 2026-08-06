import { z } from "zod";

/**
 * Surface resolution.
 *
 * Dark is primary for the logger and dashboard. Light is primary for the
 * knowledge layer, because long-form reading in dark mode is genuinely worse
 * and pretending otherwise would be the kind of small dishonesty this product
 * is built against.
 *
 * So the surface follows the route by default. A user preference, when set,
 * overrides every route — someone who needs dark for photophobia or light for
 * contrast must not have to fight the app section by section.
 *
 * Three states, not two: `auto` (follow the route), `dark`, `light`.
 */

export const SURFACE_COOKIE = "hos-surface";

export type Surface = "dark" | "light";

const surfacePreferenceSchema = z.enum(["auto", "dark", "light"]);

/**
 * Resolves the surface to render.
 *
 * `preference` is an untrusted cookie value, so it is parsed rather than cast.
 * Anything unrecognised falls through to the route default.
 */
export function resolveSurface(
  preference: string | undefined,
  routeDefault: Surface,
): Surface {
  const parsed = surfacePreferenceSchema.safeParse(preference);
  if (!parsed.success || parsed.data === "auto") return routeDefault;
  return parsed.data;
}

/** Where a route falls when no prefix claims it. The logger and dashboard. */
export const APP_DEFAULT_SURFACE: Surface = "dark";

/**
 * The landing page, matched exactly.
 *
 * `/` cannot be expressed as a prefix rule: every path on the site starts with
 * it, so a `"/"` entry in the table below would claim the whole app. It is a
 * genuine exact match and is handled as one.
 *
 * Paper, because the landing page is a specimen page — editorial typography at
 * display scale, set against space, in the same register as the knowledge
 * layer it opens onto.
 */
const LANDING_SURFACE: Surface = "light";

/**
 * Route-prefix surface defaults, **in match order — longest prefix first**.
 *
 * An ordered array, not an object, and the order is declared rather than
 * inherited. This is the second time implicit key ordering has been a bug in
 * this project: `NEUTRAL_STEPS` exists because `Object.keys(NEUTRAL)` hoists
 * `"10"` and `"11"` ahead of `"00"`, and the previous version of this function
 * iterated `Object.keys(ROUTE_SURFACE)` and so resolved by insertion order,
 * which meant a nested override could be shadowed by its own parent depending
 * on where someone happened to type it.
 *
 * The general rule, and the reason both of these are worth a comment: **any
 * structure whose correctness depends on order declares that order explicitly.**
 * Object literals do not carry an ordering contract, and code that relies on
 * one is correct by coincidence. `surfaceTableIsOrdered` asserts the invariant
 * so an entry inserted in the wrong place fails a test rather than quietly
 * mis-resolving one section.
 */
export const ROUTE_SURFACES: readonly {
  prefix: string;
  surface: Surface;
}[] = [
  // The knowledge register — long-form reading, on paper.
  { prefix: "/knowledge", surface: "light" },
  { prefix: "/citations", surface: "light" },
  { prefix: "/glossary", surface: "light" },
  { prefix: "/exercises", surface: "light" },

  // The instrument — logger, dashboard, and the internals.
  { prefix: "/train", surface: "dark" },
  { prefix: "/water", surface: "dark" },
  { prefix: "/dashboard", surface: "dark" },
  { prefix: "/progress", surface: "dark" },
  { prefix: "/review", surface: "dark" },
  { prefix: "/settings", surface: "dark" },
  { prefix: "/design", surface: "dark" },
];

/**
 * The table in match order: longest prefix first, so the first hit is also the
 * most specific one.
 *
 * Derived by an explicit sort rather than by hand-ordering the declaration
 * above. Both satisfy "declare the order"; this one additionally cannot be
 * broken by someone adding an entry in the wrong place, and it lets the
 * declaration stay grouped by surface, which is how a reader wants to check it.
 * The sort is the declaration of intent, and `surface.test.ts` asserts it
 * produces what it claims.
 */
const MATCH_ORDER: readonly { prefix: string; surface: Surface }[] = [
  ...ROUTE_SURFACES,
].sort((a, b) => b.prefix.length - a.prefix.length);

/** Exposed so the ordering invariant is testable rather than assumed. */
export function surfaceMatchOrder(): readonly string[] {
  return MATCH_ORDER.map((entry) => entry.prefix);
}

/**
 * The surface a route defaults to before the user's preference is applied.
 *
 * Matches the full path or a path segment boundary — never a bare string
 * prefix, so `/designer` does not match `/design`.
 */
export function routeSurface(pathname: string): Surface {
  if (pathname === "/") return LANDING_SURFACE;

  const match = MATCH_ORDER.find(
    (entry) =>
      pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`),
  );
  return match?.surface ?? APP_DEFAULT_SURFACE;
}
