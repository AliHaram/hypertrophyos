import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * The ambient glossary, exercised as an interaction.
 *
 * The main sweep cannot cover this. A closed popover is `display: none`, and
 * axe does not scan what is not rendered — so the panel's own contrast, the
 * one thing two shipped bugs in this project were, is invisible to it. And the
 * behaviour that makes the popover the right choice at all (open by activation
 * rather than hover, Escape to close, focus returning to the term) is not a
 * property of static markup.
 *
 * Runs at both viewports because the panel has two presentations: anchored
 * beside the term above 48rem, centred below it.
 */

const SURFACE_COOKIE = "hos-surface";
const SURFACES = ["dark", "light"] as const;
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

/** A concept whose prose cites several others, so there is more than one term. */
const ROUTE = "/knowledge/mechanical-tension";

for (const surface of SURFACES) {
  test.describe(`glossary on the ${surface} surface`, () => {
    test.beforeEach(async ({ context, page }) => {
      await context.addCookies([
        { name: SURFACE_COOKIE, value: surface, domain: "127.0.0.1", path: "/" },
      ]);
      await page.goto(ROUTE);
    });

    test("the concept prose annotates terms owned by other concepts", async ({
      page,
    }) => {
      await expect(page.locator("button.glossary-term").first()).toBeVisible();
    });

    test("a term never links to the page it is on", async ({ page }) => {
      // `mechanical tension` is the subject here, not a cross-reference.
      await expect(
        page.locator('[popovertarget="glossary-mechanical-tension"]'),
      ).toHaveCount(0);
    });

    test("each term appears once, so ids stay unique", async ({ page }) => {
      const targets = await page
        .locator("button.glossary-term")
        .evaluateAll((nodes) =>
          nodes.map((node) => node.getAttribute("popovertarget")),
        );
      expect(new Set(targets).size).toBe(targets.length);
    });

    test("activating a term opens its definition, and Escape closes it", async ({
      page,
    }) => {
      const trigger = page.locator("button.glossary-term").first();
      const panelId = await trigger.getAttribute("popovertarget");
      const panel = page.locator(`#${panelId}`);

      await expect(panel).toBeHidden();

      // Keyboard, not a click: the whole reason for a popover over a hover
      // card is that activation must not require a pointer.
      await trigger.focus();
      await page.keyboard.press("Enter");
      await expect(panel).toBeVisible();

      await page.keyboard.press("Escape");
      await expect(panel).toBeHidden();
      // Focus comes back to where it was, from the browser, with no JS.
      await expect(trigger).toBeFocused();
    });

    test("the definition offers a route to the concept it belongs to", async ({
      page,
    }) => {
      const trigger = page.locator("button.glossary-term").first();
      const panelId = await trigger.getAttribute("popovertarget");
      await trigger.click();

      const link = page.locator(`#${panelId} a`);
      await expect(link).toHaveAttribute("href", /^\/knowledge\//);
      await link.click();
      await expect(page).toHaveURL(/\/knowledge\/[a-z-]+$/);
    });

    test("an open definition has no axe violations", async ({ page }) => {
      const triggers = page.locator("button.glossary-term");
      const count = await triggers.count();
      expect(count).toBeGreaterThan(0);

      for (let index = 0; index < count; index += 1) {
        const trigger = triggers.nth(index);
        const panelId = await trigger.getAttribute("popovertarget");
        await trigger.click();
        await expect(page.locator(`#${panelId}`)).toBeVisible();

        const results = await new AxeBuilder({ page })
          .withTags(TAGS)
          // Scoped to the panel: the rest of the page is already covered by
          // the main sweep, and rescanning it once per term is wasted seconds.
          .include(`#${panelId}`)
          .analyze();

        expect(
          results.violations.flatMap((violation) =>
            violation.nodes.map(
              (node) => `[${violation.id}] ${node.failureSummary ?? violation.help}`,
            ),
          ),
          `axe violations in ${panelId} (${surface})`,
        ).toEqual([]);

        await page.keyboard.press("Escape");
      }
    });
  });
}
