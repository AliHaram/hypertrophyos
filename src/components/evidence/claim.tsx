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

const GUTTER: Record<EvidenceGrade, string> = {
  strong: "border-evidence-strong border-solid",
  mixed: "border-evidence-mixed border-dashed",
  weak: "border-evidence-weak border-dotted",
};

export function Claim({
  grade,
  children,
  className,
}: {
  grade: EvidenceGrade;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group relative my-6 border-l-2 pl-4 sm:pl-5",
        GUTTER[grade],
        className,
      )}
    >
      <div className="mb-2">
        <EvidenceChip grade={grade} />
      </div>
      <div className="prose-concept">{children}</div>
    </div>
  );
}
