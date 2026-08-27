import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * The path from a claim to its source, and back again.
 *
 * The inline reference used to be a hover card wrapped around a link to the
 * DOI, which meant that on a phone the paper's reported finding — the thing
 * the marker exists to show — was unreachable: a tap left the app. These check
 * the shape that replaced it, at both viewports, because "works on a phone" is
 * the property that was missing.
 */

const SURFACE_COOKIE = "hos-surface";
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
const ROUTE = "/knowledge/volume-landmarks";

test.beforeEach(async ({ context, page }) => {
  await context.addCookies([
    { name: SURFACE_COOKIE, value: "light", domain: "127.0.0.1", path: "/" },
  ]);
  await page.goto(ROUTE);
});

test("a reference opens by keyboard and closes on Escape", async ({ page }) => {
  const marker = page.locator("button.citation-ref").first();
  const panel = page.locator(`#${await marker.getAttribute("popovertarget")}`);

  await expect(panel).toBeHidden();
  await marker.focus();
  await page.keyboard.press("Enter");
  await expect(panel).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(marker).toBeFocused();
});

test("the panel shows the paper's own reported finding", async ({ page }) => {
  const marker = page.locator("button.citation-ref").first();
  const panel = page.locator(`#${await marker.getAttribute("popovertarget")}`);
  await marker.click();
  await expect(panel.locator(".citation-panel-finding")).not.toBeEmpty();
});

test("every reference on a page has its own panel id", async ({ page }) => {
  // A paper cited twice would otherwise share one id, and the second marker
  // would open the first one's panel.
  const targets = await page
    .locator("button.citation-ref")
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("popovertarget")),
    );
  expect(targets.length).toBeGreaterThan(0);
  expect(new Set(targets).size).toBe(targets.length);
});

test("a reference reaches the bibliography entry it belongs to", async ({
  page,
}) => {
  const marker = page.locator("button.citation-ref").first();
  const panelId = await marker.getAttribute("popovertarget");
  await marker.click();

  const back = page.locator(`#${panelId} a[href^="/citations#"]`);
  const href = await back.getAttribute("href");
  const anchor = href!.split("#")[1]!;

  await back.click();
  await expect(page).toHaveURL(new RegExp(`/citations#${anchor}$`));

  // The anchor has to exist, or the reader lands at the top of a list and has
  // to search it — which is the state this replaced.
  const entry = page.locator(`[id="${anchor}"]`);
  await expect(entry).toBeVisible();
});

test("the bibliography links back to everything resting on a source", async ({
  page,
}) => {
  await page.goto("/citations");
  const entry = page.locator("li[id]").first();
  await expect(entry.locator('a[href^="/knowledge/"]').first()).toBeVisible();
});

test("an open reference has no axe violations", async ({ page }) => {
  const marker = page.locator("button.citation-ref").first();
  const panelId = await marker.getAttribute("popovertarget");
  await marker.click();
  await expect(page.locator(`#${panelId}`)).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(TAGS)
    .include(`#${panelId}`)
    .analyze();

  expect(
    results.violations.flatMap((violation) =>
      violation.nodes.map((node) => `[${violation.id}] ${node.failureSummary}`),
    ),
  ).toEqual([]);
});
