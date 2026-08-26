import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;

/**
 * Accessibility runner.
 *
 * Separate from Vitest on purpose. Vitest covers `lib/` — pure functions with
 * no DOM — and runs in milliseconds on every save. This needs a real browser
 * against a real build, because the whole point is to check what the renderer
 * actually produced rather than what the tokens promised.
 *
 * That distinction is not academic. Two contrast bugs shipped in Phase 2 that
 * the token contrast assertions could not have caught: one where a route never
 * received its surface, and one where a misspelled utility emitted no CSS at
 * all and the element inherited its parent's colour. Both are invisible to
 * anything that does not compute style on a rendered page.
 *
 * Port 3100 rather than 3000 so a dev server left running does not get scanned
 * in place of the production build.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  /*
    One retry in CI, none locally. axe results are deterministic — a rule either
    fires against the DOM or it does not — so a retry cannot launder a real
    violation into a pass. What it does cover is the runner stalling: the suite
    takes three seconds on an idle machine and fifteen minutes next to a
    concurrent build, and under that kind of starvation `analyze()` times out
    and reports as a failure that has nothing to do with the page.
  */
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: BASE_URL,
    // Violations are reported as text, not pixels; a trace on failure is what
    // makes the offending node findable.
    trace: "retain-on-failure",
  },
  /*
    Two viewports, because a defect class can live in exactly one of them.

    The sweep ran desktop-only until three `overflow-x-auto` table containers
    shipped keyboard-unreachable at phone width — `scrollable-region-focusable`
    fires only when the content actually overflows, which at 1440 it did not.
    A gate that cannot see the viewport most of this product's users are
    standing in a gym holding is not covering the thing it claims to cover.

    1440 and 375 are the real edges: the widest layout the design tops out at,
    and the narrowest phone still worth supporting. Everything between them is
    an interpolation of the two.
  */
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile",
      use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 812 } },
    },
  ],
  webServer: {
    command: `pnpm exec next start --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
