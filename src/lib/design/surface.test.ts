import { describe, expect, it } from "vitest";

import {
  APP_DEFAULT_SURFACE,
  ROUTE_SURFACES,
  resolveSurface,
  routeSurface,
  surfaceMatchOrder,
} from "./surface";

/**
 * Surface resolution had no coverage, which is why a prefix-matching bug sat
 * latent in it long enough to block the landing page from declaring a surface
 * at all. `routeSurface` also had no callers — the surface was applied by hand
 * in each route group's layout — so nothing exercised it even indirectly.
 */

describe("resolveSurface", () => {
  it("falls back to the route default when there is no preference", () => {
    expect(resolveSurface(undefined, "light")).toBe("light");
    expect(resolveSurface(undefined, "dark")).toBe("dark");
  });

  it("treats an explicit auto as following the route", () => {
    expect(resolveSurface("auto", "light")).toBe("light");
  });

  it("lets a preference override the route in both directions", () => {
    expect(resolveSurface("dark", "light")).toBe("dark");
    expect(resolveSurface("light", "dark")).toBe("light");
  });

  it("ignores a cookie value that is not a preference", () => {
    // The cookie is untrusted input, so this is parsed rather than cast.
    expect(resolveSurface("chartreuse", "light")).toBe("light");
    expect(resolveSurface("", "dark")).toBe("dark");
  });
});

describe("routeSurface", () => {
  it("puts the landing page on paper", () => {
    // The bug this replaces: "/" cannot be a prefix rule, because every path
    // starts with it. Adding it to the table made the entire app light.
    expect(routeSurface("/")).toBe("light");
  });

  it("does not let the landing rule leak into other sections", () => {
    expect(routeSurface("/train")).toBe("dark");
    expect(routeSurface("/dashboard")).toBe("dark");
    expect(routeSurface("/design")).toBe("dark");
  });

  it("puts the whole knowledge register on paper", () => {
    expect(routeSurface("/knowledge")).toBe("light");
    expect(routeSurface("/knowledge/mechanical-tension")).toBe("light");
    expect(routeSurface("/citations")).toBe("light");
    expect(routeSurface("/glossary")).toBe("light");
    expect(routeSurface("/exercises")).toBe("light");
    expect(routeSurface("/exercises/back-squat")).toBe("light");
  });

  it("matches on segment boundaries, not bare string prefixes", () => {
    // /designer is not inside /design. A naive startsWith would say it is.
    expect(routeSurface("/designer")).toBe(APP_DEFAULT_SURFACE);
    expect(routeSurface("/trainer")).toBe(APP_DEFAULT_SURFACE);
    expect(routeSurface("/knowledgebase")).toBe(APP_DEFAULT_SURFACE);
  });

  it("falls through to the app default for unclaimed routes", () => {
    expect(routeSurface("/nothing-here")).toBe(APP_DEFAULT_SURFACE);
  });
});

describe("the match-order invariant", () => {
  it("orders the table longest prefix first", () => {
    // The property the resolver depends on: the first match is the most
    // specific one. Declared by an explicit sort so adding an entry to the
    // grouped declaration cannot break it.
    const lengths = surfaceMatchOrder().map((prefix) => prefix.length);
    expect(lengths).toEqual([...lengths].sort((a, b) => b - a));
  });

  it("resolves a nested override ahead of its parent", () => {
    // No route needs this today, which is exactly why it is asserted: the
    // first one that does must not depend on where someone typed it.
    const order = surfaceMatchOrder();
    const nested = [...order].sort((a, b) => b.length - a.length);
    expect(order).toEqual(nested);
  });

  it("declares every prefix exactly once", () => {
    const prefixes = ROUTE_SURFACES.map((entry) => entry.prefix);
    expect(new Set(prefixes).size).toBe(prefixes.length);
  });

  it("declares every prefix as an absolute path without a trailing slash", () => {
    for (const { prefix } of ROUTE_SURFACES) {
      expect(prefix.startsWith("/")).toBe(true);
      expect(prefix.endsWith("/")).toBe(false);
    }
  });
});
