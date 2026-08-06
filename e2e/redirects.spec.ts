import { expect, test } from "@playwright/test";

import { PERMANENT_REDIRECTS } from "../next.config";

/**
 * Permanent moves still resolve.
 *
 * The whole point of a redirect is that links written before the move keep
 * working — from other sites, from someone's notes, from a message sent last
 * year. Nothing else in the suite would notice if one broke: the destination
 * renders fine, the build passes, and the failure is only visible to a reader
 * who followed an old link and left.
 *
 * Driven off the exported table rather than a written-down list, so adding a
 * redirect to `next.config.ts` adds a test for it. A redirect nobody tests is a
 * redirect that quietly breaks during an unrelated refactor.
 *
 * This runs against a real build via `next start`, which is the only place
 * `redirects()` is actually applied — it is config, not code the unit suite can
 * call.
 */

test.describe("permanent redirects", () => {
  for (const { source, destination, reason } of PERMANENT_REDIRECTS) {
    test(`${source} still resolves to ${destination}`, async ({ page }) => {
      const response = await page.goto(source);

      // The redirect fired and the destination actually rendered — not a 404
      // wearing the right URL.
      expect(response?.status(), reason).toBe(200);
      expect(new URL(page.url()).pathname).toBe(destination);
    });

    test(`${source} redirects permanently, not temporarily`, async ({
      request,
    }) => {
      // 308 rather than 307: the move is not provisional, and caches and search
      // engines should be told so. Checked without following, because the
      // browser hides the status of an intermediate hop.
      const response = await request.get(source, { maxRedirects: 0 });

      expect(response.status()).toBe(308);
      expect(response.headers()["location"]).toBe(destination);
    });
  }
});

test("the bibliography renders at its new home", async ({ page }) => {
  await page.goto("/citations");

  await expect(
    page.getByRole("heading", { name: "Bibliography", level: 1 }),
  ).toBeVisible();
});
