import { expect, test } from "@playwright/test";

/**
 * Every view that can legitimately show nothing.
 *
 * An empty result is a normal outcome in a corpus this size — eight exercises
 * and eight concepts leave real gaps, and a filter combination that matches
 * none of them is the app being honest rather than broken. What matters is
 * that the reader can tell those apart, and that they are never left on a page
 * with nothing to click.
 *
 * So each of these asserts two things: the state explains itself, and it
 * offers a way out.
 */

test.describe("filtered views with no matches", () => {
  test("the exercise filter explains itself and offers a way back", async ({
    page,
  }) => {
    await page.goto("/exercises?muscle=quadriceps&peak=shortened");

    const empty = page.getByText("No exercise matches that combination.");
    await expect(empty).toBeVisible();
    await expect(page.getByRole("link", { name: /clear the filters/i })).toBeVisible();
  });

  test("an unrecognised filter value is not a filter", async ({ page }) => {
    /*
      `?peak=bogus` used to filter everything out and then report that
      "nothing in the library is hardest in the bogus position" — describing a
      category that does not exist back to the reader as though it did. Search
      params arrive from links, history and hand-typed URLs, and an
      unrecognised one is not a filter that matched nothing.
    */
    await page.goto("/exercises?peak=bogus&equipment=nonsense");
    await expect(
      page.getByText("No exercise matches that combination."),
    ).toHaveCount(0);
    await expect(page.getByText(/^\d+ of \d+ shown$/)).toContainText("8 of 8");
  });

  test("the glossary grade filter explains itself and offers a way back", async ({
    page,
  }) => {
    await page.goto("/glossary?grade=weak");
    await expect(page.getByText(/No term is graded Weak\./)).toBeVisible();
    await expect(page.getByRole("link", { name: /show every term/i })).toBeVisible();
  });
});

test("every dashed empty panel on an exercise page offers a route out", async ({
  page,
}) => {
  /*
    Substitutions and complements come back empty when the library holds
    nothing sharing the prime mover — a real gap rather than a filtered-out
    result. Rather than pinning one exercise, this walks the library and checks
    whatever it finds, so a future entry that closes or opens a gap does not
    quietly stop this from covering anything.
  */
  await page.goto("/exercises");
  const hrefs = await page
    .locator('a[href^="/exercises/"]')
    .evaluateAll((nodes) => [
      ...new Set(nodes.map((node) => node.getAttribute("href")!)),
    ]);
  expect(hrefs.length).toBeGreaterThan(0);

  let panels = 0;
  for (const href of hrefs) {
    await page.goto(href);
    const empties = page.locator("div.border-dashed");
    const count = await empties.count();
    for (let index = 0; index < count; index += 1) {
      panels += 1;
      await expect(empties.nth(index).locator("a")).toHaveCount(1);
    }
  }

  // If the library ever grows past every gap, this test stops covering
  // anything and should be reconsidered rather than left passing vacuously.
  expect(panels, "no empty substitution panels found to check").toBeGreaterThan(0);
});
