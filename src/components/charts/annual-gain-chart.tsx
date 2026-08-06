import { ChartFigure } from "@/components/charts/chart-figure";
import { niceScale } from "@/lib/charts/scale";
import { ANNUAL_GAIN_MODEL_LB } from "@/lib/training/dose-response";

const Y = niceScale(Math.max(...ANNUAL_GAIN_MODEL_LB.map((e) => e.high)), 5);

/** Share of the plot height a value occupies. */
function height(value: number): string {
  return `${(value / Y.domain.max) * 100}%`;
}

/**
 * Why the rate of overload has to decay.
 *
 * The most useful figure in the knowledge layer, because it recalibrates
 * expectations rather than teaching a technique. A lifter who expects year three
 * to look like year one concludes their programme is broken when it is working
 * exactly as it should.
 *
 * The bar runs to the midpoint and the whisker spans the range, because the
 * underlying figures *are* a range — a single bar per year would assert a
 * precision nobody has.
 *
 * Laid out in CSS rather than SVG. Bars are rectangles anchored to a baseline,
 * which is what a block element already is; going through a drawing surface to
 * get them would only cost the text its real font sizes.
 */
export function AnnualGainChart() {
  return (
    <ChartFigure
      title="Realistic muscle gain by training year"
      subtitle="Pounds of lean mass for a male novice training and eating well. Female lifters gain roughly half these absolute amounts — a similar proportion of starting lean mass."
      columns={["Training year", "Expected gain", "Share of year one"]}
      rows={ANNUAL_GAIN_MODEL_LB.map((entry) => [
        `Year ${entry.year}`,
        `${entry.low}–${entry.high} lb`,
        `${Math.round((entry.high / 25) * 100)}%`,
      ])}
      source="A widely used heuristic model rather than a measured result — no controlled trial has tracked untrained lifters across five years. Treat the shape as reliable and the exact figures as approximate."
    >
      <div className="w-full">
        <p className="sr-only">
          Expected lean mass gain falls from 20 to 25 pounds in year one, to 10
          to 12 in year two, 5 to 6 in year three, 2 to 3 in year four, and 1 to
          2 in year five.
        </p>

        <div className="flex">
          <div className="relative w-11 shrink-0" aria-hidden="true">
            {Y.ticks.map((tick) => (
              <span
                key={tick}
                className="absolute right-2 -translate-y-1/2 font-mono text-ui-2xs tabular-nums text-muted-foreground"
                style={{ bottom: height(tick) }}
              >
                {tick}
              </span>
            ))}
          </div>

          <div className="relative h-56 flex-1 border-b border-l border-border">
            {Y.ticks.slice(1).map((tick) => (
              <div
                key={tick}
                aria-hidden="true"
                className="absolute inset-x-0 border-t border-border/60"
                style={{ bottom: height(tick) }}
              />
            ))}

            <div className="absolute inset-0 flex items-end gap-3 px-3">
              {ANNUAL_GAIN_MODEL_LB.map((entry) => {
                const midpoint = (entry.low + entry.high) / 2;
                return (
                  <div
                    key={entry.year}
                    className="relative h-full flex-1"
                    aria-hidden="true"
                  >
                    <div
                      className="absolute inset-x-0 bottom-0 mx-auto max-w-14 rounded-t-sm bg-chart-1"
                      style={{ height: height(midpoint) }}
                    />
                    <div
                      className="absolute left-1/2 w-px -translate-x-1/2 bg-foreground/55"
                      style={{
                        bottom: height(entry.low),
                        height: height(entry.high - entry.low),
                      }}
                    />
                    {[entry.low, entry.high].map((cap) => (
                      <div
                        key={cap}
                        className="absolute left-1/2 h-px w-2.5 -translate-x-1/2 bg-foreground/55"
                        style={{ bottom: height(cap) }}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="ml-11 flex gap-3 px-3" aria-hidden="true">
          {ANNUAL_GAIN_MODEL_LB.map((entry) => (
            <span
              key={entry.year}
              className="mt-1.5 flex-1 text-center font-mono text-ui-2xs tabular-nums text-muted-foreground"
            >
              {entry.year}
            </span>
          ))}
        </div>

        <p className="ml-11 mt-3 font-mono text-ui-2xs uppercase tracking-eyebrow text-muted-foreground">
          lb lean mass gained &middot; training year
        </p>
      </div>
    </ChartFigure>
  );
}
