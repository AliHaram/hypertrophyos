import { EVIDENCE_GRADE_META, type EvidenceGrade } from "@/lib/evidence/types";
import { DOT_COLOR } from "@/components/evidence/evidence-mark";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * The evidence grade, rendered as a figure-legend marker rather than a status
 * badge.
 *
 * The pill itself stays neutral and only the dot carries hue. Filled colour
 * chips read as calls to action and would compete with the interface's own
 * accent; a legend marker reads as annotation, which is what a grade is. It
 * also means the three grades stay distinguishable for readers who cannot
 * separate the hues — the label is always present, never colour alone.
 */



export function EvidenceChip({
  grade,
  className,
  showLabel = true,
}: {
  grade: EvidenceGrade;
  className?: string;
  showLabel?: boolean;
}) {
  const meta = EVIDENCE_GRADE_META[grade];

  return (
    <Tooltip>
      <TooltipTrigger
        className={cn(
          "inline-flex select-none items-center gap-1.5 rounded-full border border-border/80 bg-card px-2 py-0.5 align-middle",
          "font-mono text-ui-2xs uppercase tracking-eyebrow text-muted-foreground",
          "cursor-help transition-colors hover:border-border hover:text-foreground",
          className,
        )}
      >
        <span
          aria-hidden="true"
          className={cn("size-1.5 shrink-0 rounded-full", DOT_COLOR[grade])}
        />
        {showLabel && meta.label}
        <span className="sr-only">Evidence grade: {meta.label}.</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-72">
        <p className="font-sans text-xs leading-relaxed">
          <span className="font-semibold">{meta.label} evidence.</span>{" "}
          {meta.definition}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
