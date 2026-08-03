"use client";

import { ChartFigure } from "@/components/charts/chart-figure";
import { LANDMARK_UNCERTAINTY } from "@/lib/training/volume";

const MAX_SETS = 28;

/**
 * MEV, MAV, and MRV drawn as overlapping ranges rather than three numbers.
 *
 * Every app that teaches these landmarks prints them as point values — "MEV is
 * 10 sets" — and the precision is fabricated. The honest rendering is a set of
 * wide, overlapping bands, because that is the actual state of knowledge: the
 * ranges genuinely overlap, and an individual's MRV can sit below another's
 * MEV.
 *
 * Drawn as an annotated axis rather than a chart because it is a scale being
 * explained, not a dataset being plotted.
 */

const LANDMARKS = [
  {
    key: "mev" as const,
    label: "MEV",
    name: "Minimum effective volume",
    color: "var(--landmark-mev)",
    meaning: "Below this, the muscle is under-stimulated.",
  },
  {
    key: "mav" as const,
    label: "MAV",
    name: "Maximum adaptive volume",
    color: "var(--landmark-mav)",
    meaning: "The range where returns per set are best.",
  },
  {
    key: "mrv" as const,
    label: "MRV",
    name: "Maximum recoverable volume",
    color: "var(--landmark-over)",
    meaning: "Above this, fatigue accumulates faster than it clears.",
  },
];

function percent(sets: number): number {
  return (sets / MAX_SETS) * 100;
}

export function VolumeLandmarkScale() {
  return (
    <ChartFigure
      title="The landmarks are ranges, and they overlap"
      subtitle="Weekly hard sets per muscle for a trained lifter. Each band is where the landmark plausibly falls — not a threshold."
      columns={["Landmark", "Plausible range", "What it marks"]}
      rows={LANDMARKS.map((landmark) => [
        landmark.label,
        `${LANDMARK_UNCERTAINTY[landmark.key].low}–${LANDMARK_UNCERTAINTY[landmark.key].high} sets`,
        landmark.meaning,
      ])}
      source="Ranges synthesised from Schoenfeld, Ogborn & Krieger (2017) and Baz-Valle et al. (2022). MRV in particular is individual enough that the population range is close to useless on its own — the app estimates yours from your own performance data instead."
    >
      <div className="space-y-5 pb-2">
        {LANDMARKS.map((landmark) => {
          const range = LANDMARK_UNCERTAINTY[landmark.key];
          return (
            <div key={landmark.key}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <span className="font-mono text-xs font-medium tracking-wide text-foreground">
                  {landmark.label}
                  <span className="ml-2 font-sans text-xs font-normal text-muted-foreground">
                    {landmark.name}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                  {range.low}–{range.high}
                </span>
              </div>
              <div className="relative h-6 rounded-sm bg-muted/50">
                <div
                  className="absolute inset-y-0 rounded-sm"
                  style={{
                    left: `${percent(range.low)}%`,
                    width: `${percent(range.high - range.low)}%`,
                    background: landmark.color,
                    opacity: 0.75,
                  }}
                />
                <span className="sr-only">
                  {landmark.name} plausibly falls between {range.low} and{" "}
                  {range.high} weekly sets. {landmark.meaning}
                </span>
              </div>
            </div>
          );
        })}

        <div aria-hidden="true">
          <div className="relative h-4 border-t border-border pt-1.5">
            {[0, 7, 14, 21, 28].map((tick) => (
              <span
                key={tick}
                className="absolute font-mono text-ui-2xs tabular-nums text-muted-foreground"
                style={{
                  left: `${percent(tick)}%`,
                  // The end ticks anchor to their edge instead of centring, so
                  // neither hangs outside the plot area.
                  transform:
                    tick === 0
                      ? "none"
                      : tick === 28
                        ? "translateX(-100%)"
                        : "translateX(-50%)",
                }}
              >
                {tick}
              </span>
            ))}
          </div>
          <p className="mt-3 text-right font-mono text-ui-2xs uppercase tracking-eyebrow text-muted-foreground">
            sets / week
          </p>
        </div>
      </div>
    </ChartFigure>
  );
}
