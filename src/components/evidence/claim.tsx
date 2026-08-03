import type { ReactNode } from "react";

import { EvidenceChip } from "@/components/evidence/evidence-chip";
import type { EvidenceGrade } from "@/lib/evidence/types";
import { cn } from "@/lib/utils";

/**
 * A graded claim, marked by a confidence gutter.
 *
 * The rule down the left edge is the whole idea: scrolling a concept, the
 * reader sees the shape of the argument's confidence before reading a word of
 * it — solid where the meta-analyses agree, broken where they do not. It works
 * the way a diff gutter does, except what it tracks is how much we actually
 * know.
 *
 * The stroke is dashed for `mixed` and dotted for `weak`, so the distinction
 * survives without colour.
 */

/**
 * Four strokes, distinguishable without colour.
 *
 * `border-double` renders as two hairlines with a gap, which needs at least
 * 3px of border to resolve — hence `border-l-4` on that grade alone while the
 * others sit at 2px. In grayscale the set reads as: unbroken, long dashes,
 * fine dots, and a railroad pair. Verified side by side on /design with
 * saturation stripped, at 1× and 2×.
 */
const GUTTER: Record<EvidenceGrade, string> = {
  strong: "border-l-2 border-evidence-strong border-solid",
  mixed: "border-l-2 border-evidence-mixed border-dashed",
  "mechanical-inference":
    "border-l-4 border-evidence-mechanical border-double",
  weak: "border-l-2 border-evidence-weak border-dotted",
};

export function Claim({
  grade,
  derivation,
  children,
  className,
}: {
  grade: EvidenceGrade;
  /**
   * The mechanical basis, for `mechanical-inference` claims. Rendered beneath
   * the claim rather than hidden behind a tooltip: the reasoning *is* the
   * evidence for this grade, so putting it out of sight would leave the claim
   * looking like an unsourced assertion.
   */
  derivation?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("group relative my-6 pl-4 sm:pl-5", GUTTER[grade], className)}
    >
      <div className="mb-2">
        <EvidenceChip grade={grade} />
      </div>
      <div className="prose-concept">{children}</div>
      {derivation && (
        <p className="mt-3 border-t border-border pt-3 font-sans text-sm leading-relaxed text-muted-foreground">
          <span className="eyebrow mr-2">Derivation</span>
          {derivation}
        </p>
      )}
    </div>
  );
}
