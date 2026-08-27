import { EVIDENCE_GRADE_META, type EvidenceGrade } from "@/lib/evidence/types";
import { cn } from "@/lib/utils";

/**
 * The evidence grade ramp, as utilities.
 *
 * Lives here rather than beside the chip because this module has no client
 * boundary in it. `evidence-chip.tsx` reaches a tooltip, and a tooltip is
 * `"use client"` — so anything importing the chip's module drags the whole
 * popup runtime into the bundle. That cost 43 kB on the exercise pages the
 * first time the glossary panel wanted a grade marker, for a static span.
 */
export const DOT_COLOR: Record<EvidenceGrade, string> = {
  strong: "bg-evidence-strong",
  mixed: "bg-evidence-mixed",
  // Blue, from the Phase 1 validated palette. Deliberately not a fourth hue
  // invented for the purpose, and deliberately not adjacent to amber — the
  // grade it is most often confused with.
  "mechanical-inference": "bg-evidence-mechanical",
  weak: "bg-evidence-weak",
};

/**
 * The grade as a non-interactive marker.
 *
 * The chip above is a tooltip trigger, which is right in a page header where
 * the reader may want the definition of the grade itself. Inside a panel that
 * is *already* a disclosure — the glossary popover — a nested trigger is both
 * a worse interaction and a second control to tab through for a definition of
 * a definition. This is the same dot and the same label, rendered as the
 * annotation it is.
 *
 * It shares `DOT_COLOR` with the chip rather than restating it, so the grade
 * ramp has one declaration.
 */
export function EvidenceMark({
  grade,
  className,
}: {
  grade: EvidenceGrade;
  className?: string;
}) {
  const meta = EVIDENCE_GRADE_META[grade];

  return (
    <span
      className={cn(
        "inline-flex shrink-0 select-none items-center gap-1.5 align-middle",
        "font-mono text-ui-2xs uppercase tracking-eyebrow text-muted-foreground",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("size-1.5 shrink-0 rounded-full", DOT_COLOR[grade])}
      />
      {meta.label}
      <span className="sr-only">evidence.</span>
    </span>
  );
}
