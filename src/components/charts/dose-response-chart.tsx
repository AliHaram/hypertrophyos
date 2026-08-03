"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartFigure } from "@/components/charts/chart-figure";
import { doseResponseCurve } from "@/lib/training/dose-response";

const DATA = doseResponseCurve(30, 1);

/**
 * The shape of diminishing returns.
 *
 * A single series, because the point is the curvature — that the tenth set
 * buys roughly a third of what the first buys. Marginal return is a second
 * measure on a different scale, so it gets its own chart rather than a second
 * y-axis.
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
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={DATA}
            margin={{ top: 8, right: 12, bottom: 24, left: 4 }}
            role="img"
            aria-label="Line chart. Modelled hypertrophy rises steeply from zero to about ten weekly sets, then flattens markedly through thirty sets."
          >
            <defs>
              <linearGradient id="doseFill" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--chart-1)"
                  stopOpacity={0.28}
                />
                <stop
                  offset="100%"
                  stopColor="var(--chart-1)"
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="var(--border)"
              strokeOpacity={0.5}
              vertical={false}
            />
            <XAxis
              dataKey="sets"
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              label={{
                value: "Weekly sets per muscle",
                position: "insideBottom",
                offset: -14,
                fill: "var(--muted-foreground)",
                fontSize: 11,
              }}
            />
            <YAxis
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(value: number) => `${value}%`}
            />
            <ReferenceLine
              x={10}
              stroke="var(--muted-foreground)"
              strokeDasharray="3 3"
              strokeOpacity={0.7}
              label={{
                value: "≈10 sets",
                position: "top",
                fill: "var(--muted-foreground)",
                fontSize: 10,
              }}
            />
            <Tooltip
              cursor={{ stroke: "var(--border)" }}
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                fontSize: 12,
              }}
              labelStyle={{ color: "var(--muted-foreground)" }}
              labelFormatter={(value) => `${value} weekly sets`}
              formatter={(value: number, name) =>
                name === "gain"
                  ? [`${value.toFixed(2)}%`, "Modelled gain"]
                  : [`${value.toFixed(2)}%`, "Next set adds"]
              }
            />
            <Area
              type="monotone"
              dataKey="gain"
              stroke="var(--chart-1)"
              strokeWidth={2}
              fill="url(#doseFill)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartFigure>
  );
}
