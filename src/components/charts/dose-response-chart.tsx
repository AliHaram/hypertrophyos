import { ChartFigure } from "@/components/charts/chart-figure";
import {
  area,
  niceScale,
  plotPoints,
  polyline,
  project,
  projectY,
} from "@/lib/charts/scale";
import { doseResponseCurve } from "@/lib/training/dose-response";

const DATA = doseResponseCurve(30, 1);
const X = { min: 0, max: 30 } as const;
const Y = niceScale(Math.max(...DATA.map((point) => point.gain)), 3);

const CURVE = plotPoints(
  DATA.map((point) => ({ x: point.sets, y: point.gain })),
  X,
  Y.domain,
);

/** One label every five sets; thirty-one of them collide into a smear. */
const X_TICKS = [0, 5, 10, 15, 20, 25, 30];

/** Where the 0.37%-per-set figure was measured, and the curve's useful knee. */
const REFERENCE_SETS = 10;

/**
 * The shape of diminishing returns.
 *
 * A single series, because the point is the curvature — that the tenth set buys
 * roughly a third of what the first buys. Marginal return is a second measure
 * on a different scale, so it belongs in the table rather than on a second axis.
 *
 * Hand-drawn rather than charted. The data is fixed, nothing here responds to a
 * pointer, and it is rendered once at build time — every byte of a charting
 * runtime would be spent redrawing a plate that never changes. The plot
 * stretches with `preserveAspectRatio="none"` and non-scaling strokes; the
 * labels are HTML positioned by percentage, because text inside a stretched
 * viewBox shears and text inside an unstretched one is 6px on a phone.
 */
export function DoseResponseChart() {
  return (
    <ChartFigure
      title="Returns flatten as weekly sets climb"
      subtitle="Modelled hypertrophy across a training block, by weekly sets for one muscle."
      columns={["Weekly sets", "Modelled gain", "Next set adds"]}
      rows={DATA.filter((point) => point.sets % 5 === 0).map((point) => [
        point.sets,
        `${point.gain.toFixed(2)}%`,
        `${point.marginal.toFixed(2)}%`,
      ])}
      source="Curve fitted so its slope near 10 weekly sets matches the 0.37% per-set figure reported by Schoenfeld, Ogborn & Krieger (2017). A teaching model of the shape, not a prediction of your results — it is not used to prescribe volume."
    >
      <div className="w-full">
        <p className="sr-only">
          Modelled hypertrophy rises steeply from zero to about ten weekly sets,
          then flattens markedly through thirty. The full figures are in the data
          table below.
        </p>

        <div className="flex">
          <div className="relative w-11 shrink-0" aria-hidden="true">
            {Y.ticks.map((tick) => (
              <span
                key={tick}
                className="absolute right-2 -translate-y-1/2 font-mono text-ui-2xs tabular-nums text-muted-foreground"
                style={{ top: `${projectY(tick, Y.domain)}%` }}
              >
                {tick}%
              </span>
            ))}
          </div>

          <div className="relative h-56 flex-1 border-b border-l border-border">
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 size-full"
              aria-hidden="true"
              focusable="false"
            >
              {Y.ticks.slice(1).map((tick) => (
                <line
                  key={tick}
                  x1={0}
                  x2={100}
                  y1={projectY(tick, Y.domain)}
                  y2={projectY(tick, Y.domain)}
                  stroke="var(--border)"
                  strokeOpacity={0.6}
                  vectorEffect="non-scaling-stroke"
                />
              ))}

              <path
                d={area(CURVE)}
                fill="var(--chart-1)"
                fillOpacity={0.12}
              />
              <path
                d={polyline(CURVE)}
                fill="none"
                stroke="var(--chart-1)"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />

              <line
                x1={project(REFERENCE_SETS, X)}
                x2={project(REFERENCE_SETS, X)}
                y1={0}
                y2={100}
                stroke="var(--muted-foreground)"
                strokeDasharray="3 3"
                strokeOpacity={0.7}
                vectorEffect="non-scaling-stroke"
              />
            </svg>

            <span
              className="absolute top-2 ml-2 font-mono text-ui-2xs tabular-nums text-muted-foreground"
              style={{ left: `${project(REFERENCE_SETS, X)}%` }}
              aria-hidden="true"
            >
              ≈10 sets
            </span>
          </div>
        </div>

        <div className="relative ml-11 mt-1.5 h-4" aria-hidden="true">
          {X_TICKS.map((tick) => (
            <span
              key={tick}
              className="absolute font-mono text-ui-2xs tabular-nums text-muted-foreground"
              style={{
                left: `${project(tick, X)}%`,
                // End ticks anchor to their edge rather than centring, so
                // neither hangs outside the plot area.
                transform:
                  tick === X.min
                    ? "none"
                    : tick === X.max
                      ? "translateX(-100%)"
                      : "translateX(-50%)",
              }}
            >
              {tick}
            </span>
          ))}
        </div>

        <p className="ml-11 mt-3 font-mono text-ui-2xs uppercase tracking-eyebrow text-muted-foreground">
          weekly sets per muscle
        </p>
      </div>
    </ChartFigure>
  );
}
