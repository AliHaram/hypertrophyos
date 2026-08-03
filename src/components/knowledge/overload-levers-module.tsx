"use client";

import { useState } from "react";

import { EvidenceChip } from "@/components/evidence/evidence-chip";
import {
  OVERLOAD_LEVERS,
  type LeverId,
  getLever,
} from "@/lib/training/overload-levers";
import { cn } from "@/lib/utils";

/**
 * The six levers, explorable.
 *
 * Ordered by hypertrophy potency rather than by how often lifters reach for
 * them — load sits first because it is genuinely potent, density sits last
 * because the direct evidence runs against it, and seeing those two facts
 * next to each other is the point of the module.
 *
 * The potency bar is deliberately coarse. It encodes an ordering we can
 * defend, not a measurement we cannot.
 */
export function OverloadLeversModule() {
  const [selected, setSelected] = useState<LeverId>("load");
  const lever = getLever(selected);

  return (
    <div className="my-8 overflow-hidden rounded-md border border-border bg-card/50">
      <div className="border-b border-border px-4 py-3 sm:px-5">
        <h3 className="font-prose text-base font-semibold leading-tight">
          Six levers, not one
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Ranked by how much hypertrophy each reliably buys. Select one.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Progressive overload levers"
        className="flex flex-col divide-y divide-border border-b border-border sm:flex-row sm:divide-x sm:divide-y-0"
      >
        {OVERLOAD_LEVERS.map((candidate) => {
          const isSelected = candidate.id === selected;
          return (
            <button
              key={candidate.id}
              role="tab"
              id={`lever-tab-${candidate.id}`}
              aria-selected={isSelected}
              aria-controls="lever-panel"
              onClick={() => setSelected(candidate.id)}
              className={cn(
                "flex min-h-12 flex-1 flex-col justify-center gap-1.5 px-4 py-3 text-left transition-colors",
                "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-text-muted",
                isSelected
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted/60",
              )}
            >
              <span className="font-mono text-ui-2xs uppercase tracking-eyebrow">
                {candidate.name}
              </span>
              <span
                className="flex gap-0.5"
                aria-label={`Hypertrophy value ${candidate.potency} of 5`}
              >
                {Array.from({ length: 5 }, (_, index) => (
                  <span
                    key={index}
                    className={cn(
                      "h-1 w-3 rounded-sm",
                      index < candidate.potency
                        ? "bg-text-strong"
                        : "bg-muted-foreground/25",
                    )}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id="lever-panel"
        aria-labelledby={`lever-tab-${lever.id}`}
        className="px-4 py-5 sm:px-5"
      >
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h4 className="font-prose text-lg font-semibold">{lever.name}</h4>
          <EvidenceChip grade={lever.evidenceGrade} />
        </div>

        <dl className="space-y-4">
          <Row label="Mechanism" value={lever.mechanism} />
          <Row label="When to use it" value={lever.whenToUse} />
          <Row label="What it costs" value={lever.cost} />
        </dl>

        <div className="mt-5 rounded-md border border-border bg-background/60 p-4">
          <p className="eyebrow mb-2">In practice</p>
          <p className="text-sm leading-relaxed text-foreground/90">
            {lever.worked}
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:gap-4">
      <dt className="eyebrow pt-0.5">{label}</dt>
      <dd className="text-sm leading-relaxed text-foreground/90">{value}</dd>
    </div>
  );
}
