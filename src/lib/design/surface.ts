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

export const surfaceSchema = z.enum(["dark", "light"]);
export type Surface = z.infer<typeof surfaceSchema>;

export const surfacePreferenceSchema = z.enum(["auto", "dark", "light"]);
export type SurfacePreference = z.infer<typeof surfacePreferenceSchema>;

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

/** The surface each route group defaults to when the user has no preference. */
export const ROUTE_SURFACE: Record<string, Surface> = {
  "/knowledge": "light",
  "/exercises": "light",
  "/design": "dark",
};

export function routeSurface(pathname: string): Surface {
  const match = Object.keys(ROUTE_SURFACE).find(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return match ? ROUTE_SURFACE[match]! : "dark";
}
