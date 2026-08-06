import { ChartFigure } from "@/components/charts/chart-figure";
import {
  type Point,
  plotPoints,
  polyline,
  project,
  projectY,
} from "@/lib/charts/scale";
import type { PeakPosition } from "@/lib/exercises/schema";
import { cn } from "@/lib/utils";

/**
 * Relative torque demand across the range of motion.
 *
 * Multi-series from the outset, because the single most useful thing this
 * figure does is show two curves at once: a squat and a leg press look like the
 * same exercise until their profiles are overlaid, and a stretched-peaking
 * movement beside a shortened-peaking one is the clearest available argument
 * for why the property is modelled at all.
 *
 * Hand-drawn on the server, per ADR 0003. The data is fixed at build time,
 * nothing responds to a pointer, and straight segments are deliberate — spline
 * smoothing would invent values between samples and can overshoot the
 * normalised peak of 1.0, drawing a claim the model does not make.
 *
 * **Colour is never the only channel.** Each series takes both a chart slot and
 * a distinct stroke pattern, so the curves stay separable in grayscale and
 * under a red–green deficiency. This is the same redundancy the evidence
 * gutters carry, for the same reason.
 */

export interface ProfileSeries {
  id: string;
  name: string;
  /** Eleven normalised samples, lengthened position first. */
  samples: readonly number[];
  peakPosition: PeakPosition;
}

/**
 * Series styling, in assignment order.
 *
 * Declared as an ordered array rather than indexed off an object, for the
 * reason recorded in ADR 0005: correctness here depends on order, so the order
 * is stated. Five slots because the palette has five validated categorical
 * colours; a sixth series is a sign the figure is doing too much.
 */
const SERIES_STYLES: readonly { stroke: string; dash: string | undefined }[] = [
  { stroke: "var(--chart-1)", dash: undefined },
  { stroke: "var(--chart-2)", dash: "5 3" },
  { stroke: "var(--chart-3)", dash: "1 3" },
  { stroke: "var(--chart-4)", dash: "8 3 2 3" },
  { stroke: "var(--chart-5)", dash: "2 2" },
];

const X = { min: 0, max: 10 } as const;
const Y = { min: 0, max: 1 } as const;

/** Quarter points, labelled by what the position means rather than by index. */
const RANGE_LABELS: readonly { at: number; label: string }[] = [
  { at: 0, label: "lengthened" },
  { at: 5, label: "mid" },
  { at: 10, label: "shortened" },
];

const Y_TICKS = [0, 0.25, 0.5, 0.75, 1];

const PEAK_LABEL: Record<PeakPosition, string> = {
  stretched: "peaks in the stretched position",
  "mid-range": "peaks through the mid-range",
  shortened: "peaks in the shortened position",
  even: "loads evenly across the range",
};

function toPoints(samples: readonly number[]): Point[] {
  return plotPoints(
    samples.map((value, index) => ({ x: index, y: value })),
    X,
    Y,
  );
}

function styleFor(index: number) {
  // Wraps rather than throwing: a sixth series should render, badly, rather
  // than crash a page. The legend still distinguishes it by name.
  return SERIES_STYLES[index % SERIES_STYLES.length]!;
}

export function ResistanceProfileChart({
  series,
  title = "Where the movement is hardest",
  subtitle,
  source,
  className,
}: {
  series: readonly ProfileSeries[];
  title?: string;
  subtitle?: string;
  source?: React.ReactNode;
  className?: string;
}) {
  const rows = series.flatMap((entry) =>
    entry.samples.map((value, index) => [
      entry.name,
      index === 0
        ? "0 · lengthened"
        : index === 10
          ? "10 · shortened"
          : String(index),
      value.toFixed(2),
    ]),
  );

  return (
    <ChartFigure
      title={title}
      subtitle={
        subtitle ??
        "Relative torque demand across the range of motion, normalised so each curve peaks at 1.00. The shape is the claim; the magnitude is not measured."
      }
      columns={["Exercise", "Range position", "Relative demand"]}
      rows={rows}
      source={
        source ??
        "Derived from the direction of the resistance and the moment arms it acts through, not from measurement. Each exercise page carries the reasoning behind its own curve. Graded mechanical-inference."
      }
      className={className}
    >
      <div className="w-full">
        <p className="sr-only">
          {series.map((entry) => `${entry.name} ${PEAK_LABEL[entry.peakPosition]}.`).join(" ")}{" "}
          Sample-by-sample figures are in the data table below.
        </p>

        <div className="flex">
          <div className="relative w-10 shrink-0" aria-hidden="true">
            {Y_TICKS.map((tick) => (
              <span
                key={tick}
                className="absolute right-2 -translate-y-1/2 font-mono text-ui-2xs tabular-nums text-muted-foreground"
                style={{ top: `${projectY(tick, Y)}%` }}
              >
                {tick.toFixed(2)}
              </span>
            ))}
          </div>

          <div className="relative h-52 flex-1 border-b border-l border-border">
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 size-full"
              aria-hidden="true"
              focusable="false"
            >
              {Y_TICKS.slice(1).map((tick) => (
                <line
                  key={tick}
                  x1={0}
                  x2={100}
                  y1={projectY(tick, Y)}
                  y2={projectY(tick, Y)}
                  stroke="var(--border)"
                  strokeOpacity={0.6}
                  vectorEffect="non-scaling-stroke"
                />
              ))}

              {series.map((entry, index) => {
                const style = styleFor(index);
                return (
                  <path
                    key={entry.id}
                    d={polyline(toPoints(entry.samples))}
                    fill="none"
                    stroke={style.stroke}
                    strokeWidth={2}
                    strokeDasharray={style.dash}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
            </svg>
          </div>
        </div>

        <div className="relative ml-10 mt-1.5 h-4" aria-hidden="true">
          {RANGE_LABELS.map(({ at, label }) => (
            <span
              key={label}
              className="absolute font-mono text-ui-2xs uppercase tracking-eyebrow text-muted-foreground"
              style={{
                left: `${project(at, X)}%`,
                transform:
                  at === X.min
                    ? "none"
                    : at === X.max
                      ? "translateX(-100%)"
                      : "translateX(-50%)",
              }}
            >
              {label}
            </span>
          ))}
        </div>

        {series.length > 1 && (
          <ul className="ml-10 mt-5 flex flex-wrap gap-x-5 gap-y-2">
            {series.map((entry, index) => {
              const style = styleFor(index);
              return (
                <li
                  key={entry.id}
                  className="flex items-center gap-2 text-ui-sm text-foreground"
                >
                  {/*
                    The swatch repeats the stroke pattern rather than showing a
                    solid block, so the legend distinguishes the series by the
                    same two channels the plot does.
                  */}
                  <svg
                    viewBox="0 0 24 4"
                    className="h-1 w-6 shrink-0"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <line
                      x1={0}
                      x2={24}
                      y1={2}
                      y2={2}
                      stroke={style.stroke}
                      strokeWidth={2}
                      strokeDasharray={style.dash}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span>{entry.name}</span>
                  <span className="font-mono text-ui-2xs text-muted-foreground">
                    {entry.peakPosition}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        <p
          className={cn(
            "ml-10 font-mono text-ui-2xs uppercase tracking-eyebrow text-muted-foreground",
            series.length > 1 ? "mt-4" : "mt-3",
          )}
        >
          range of motion
        </p>
      </div>
    </ChartFigure>
  );
}
