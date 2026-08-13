import { cn } from "@/lib/utils";

/**
 * The page container. One width, one gutter, one left edge.
 *
 * Before this existed, five routes carried three different `max-w` values and
 * the nav bar carried a fourth, so the content's left edge moved as you
 * navigated and never lined up with the bar above it. That is the same class
 * this project keeps closing: a value inherited from wherever it was first
 * typed rather than declared once.
 *
 * So the width lives here and nothing else declares one. `check-design-tokens`
 * fails on a raw `mx-auto max-w-*` anywhere under `src/app`, which is the
 * idiom for a page container — inner prose constraints (`max-w-2xl` on a lede,
 * without `mx-auto`) are untouched, because those are measure, not layout.
 *
 * The nav bar imports `PAGE_CONTAINER` too. If these ever come from different
 * places, the misalignment comes straight back.
 */

/** 64rem. Wide enough for a detail page with a sidebar, narrow enough that an
 *  index list does not sprawl. */
const PAGE_WIDTH = "max-w-5xl";

/** Gutter, on the 4px grid at both breakpoints. */
const PAGE_GUTTER = "px-5 sm:px-8";

/** The shared container. Used by every route and by the shell chrome. */
export const PAGE_CONTAINER = `mx-auto w-full ${PAGE_WIDTH} ${PAGE_GUTTER}`;

/**
 * A route's main region.
 *
 * Carries `id="main"` so the skip link has a single, consistent target on every
 * page rather than each route remembering to provide one.
 */
export function Page({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main id="main" className={cn(PAGE_CONTAINER, "py-10 sm:py-16", className)}>
      {children}
    </main>
  );
}
