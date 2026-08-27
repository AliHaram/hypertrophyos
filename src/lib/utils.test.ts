import { describe, expect, it } from "vitest";

import { TYPE_PROSE, TYPE_UI } from "@/lib/design/tokens";

import { PROSE_SIZES, UI_SIZES, cn } from "./utils";

/**
 * `cn` has to know the type scale, and it is told rather than shown — the
 * names are written out in `utils.ts` so the token module stays out of client
 * bundles. This is the check that keeps the two in step.
 */
describe("the font-size scale cn knows about", () => {
  it("is exactly the prose scale", () => {
    expect([...PROSE_SIZES]).toEqual(Object.keys(TYPE_PROSE));
  });

  it("is exactly the UI scale", () => {
    expect([...UI_SIZES]).toEqual(Object.keys(TYPE_UI));
  });
});

describe("merging", () => {
  it("keeps a custom font size next to a text colour", () => {
    /*
      The defect this exists for. tailwind-merge's colour group is a
      catch-all, so an unrecognised `text-*` utility was classified as a colour
      and dropped by the next one — leaving every mono label in the app at its
      inherited size.
    */
    expect(cn("font-mono text-ui-2xs text-muted-foreground")).toBe(
      "font-mono text-ui-2xs text-muted-foreground",
    );
  });

  it("keeps a prose size next to a text colour", () => {
    expect(cn("text-prose-sm text-foreground")).toBe(
      "text-prose-sm text-foreground",
    );
  });

  it("still lets one font size replace another", () => {
    expect(cn("text-ui-2xs", "text-ui-lg")).toBe("text-ui-lg");
    expect(cn("text-prose-base", "text-ui-sm")).toBe("text-ui-sm");
  });

  it("still lets one text colour replace another", () => {
    expect(cn("text-muted-foreground", "text-foreground")).toBe(
      "text-foreground",
    );
  });

  it("does not confuse a size with a colour of a similar shape", () => {
    // `text-text-strong` is a colour whose name begins with a scale-ish word.
    expect(cn("text-ui-xs text-text-strong")).toBe("text-ui-xs text-text-strong");
  });

  it("leaves the ordinary Tailwind scale alone", () => {
    expect(cn("text-sm text-muted-foreground")).toBe(
      "text-sm text-muted-foreground",
    );
    expect(cn("text-sm", "text-lg")).toBe("text-lg");
  });
});
