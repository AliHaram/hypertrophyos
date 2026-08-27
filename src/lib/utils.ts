import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Font-size utilities this design system adds.
 *
 * tailwind-merge has to be told about them. Its font-size group only accepts
 * t-shirt sizes and arbitrary lengths, and its text-colour group accepts
 * anything else — so `text-ui-2xs` was being classified as a *colour* and
 * silently dropped by the colour that followed it. `cn("font-mono text-ui-2xs
 * … text-muted-foreground")` shipped without a size, and the label rendered at
 * whatever it inherited.
 *
 * That was live across the nav bar, every evidence chip, and every mono label
 * assembled through `cn`, and it is invisible in the source: the class is
 * written, the token exists, the CSS is emitted, and the merge step removes it
 * on the way out. Nothing in a typecheck, a lint, or the design-token scan can
 * see a class that was present in the input.
 *
 * The names are written out rather than imported from `tokens.ts` so that the
 * token module does not get pulled into every client bundle that calls `cn`.
 * `utils.test.ts` asserts this list is exactly the token scale, so the
 * duplication cannot drift without failing.
 */
export const PROSE_SIZES = [
  "xs",
  "sm",
  "base",
  "lg",
  "xl",
  "2xl",
  "3xl",
  "4xl",
] as const;

export const UI_SIZES = [
  "2xs",
  "xs",
  "sm",
  "base",
  "md",
  "lg",
  "xl",
] as const;

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            ...PROSE_SIZES.map((size) => `prose-${size}`),
            ...UI_SIZES.map((size) => `ui-${size}`),
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
