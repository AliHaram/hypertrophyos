"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ErrorBar,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartFigure } from "@/components/charts/chart-figure";
import { ANNUAL_GAIN_MODEL_LB } from "@/lib/training/dose-response";

const DATA = ANNUAL_GAIN_MODEL_LB.map((entry) => ({
  year: `Year ${entry.year}`,
  midpoint: (entry.low + entry.high) / 2,
  spread: [
    (entry.high - entry.low) / 2,
    (entry.high - entry.low) / 2,
  ] as [number, number],
  low: entry.low,
  high: entry.high,
}));

/**
 * Why the rate of overload has to decay.
 *
 * The most useful chart in the knowledge layer, because it recalibrates
 * expectations rather than teaching a technique. A lifter who expects year
 * three to look like year one concludes their programme is broken when it is
 * working exactly as it should.
 *
 * Error bars are shown because the underlying figures are a range, and drawing
 * a single bar per year would imply a precision nobody has.
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
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={DATA}
            margin={{ top: 12, right: 12, bottom: 8, left: 4 }}
            role="img"
            aria-label="Bar chart. Expected lean mass gain falls from 20 to 25 pounds in year one, to 10 to 12 in year two, 5 to 6 in year three, 2 to 3 in year four, and 1 to 2 in year five."
          >
            <CartesianGrid
              stroke="var(--border)"
              strokeOpacity={0.5}
              vertical={false}
            />
            <XAxis
              dataKey="year"
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
            />
            <YAxis
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(value: number) => `${value} lb`}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)", fillOpacity: 0.35 }}
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                fontSize: 12,
              }}
              formatter={(_value, _name, item) => [
                `${item.payload.low}–${item.payload.high} lb`,
                "Expected gain",
              ]}
            />
            <Bar dataKey="midpoint" radius={[4, 4, 0, 0]} maxBarSize={56}>
              {DATA.map((entry) => (
                <Cell key={entry.year} fill="var(--chart-1)" />
              ))}
              <ErrorBar
                dataKey="spread"
                width={6}
                strokeWidth={1.5}
                stroke="var(--foreground)"
                opacity={0.55}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFigure>
  );
}
