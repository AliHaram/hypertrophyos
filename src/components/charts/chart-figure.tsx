"use client";

import { Table2 } from "lucide-react";
import { type ReactNode, useId, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Shell for every chart in the app.
 *
 * Guarantees the two things a chart must never ship without: a caption that
 * states what the reader is looking at, and a table view carrying the same
 * numbers. The table is not a fallback for failure — it is the accessible
 * path, and it is also what makes the light-mode contrast relief legitimate.
 */
export function ChartFigure({
  title,
  subtitle,
  source,
  columns,
  rows,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  /** Where the numbers came from — a citation, or the model that produced them. */
  source?: ReactNode;
  columns: readonly string[];
  rows: readonly (readonly (string | number)[])[];
  children: ReactNode;
  className?: string;
}) {
  const [showTable, setShowTable] = useState(false);
  const tableId = useId();

  return (
    <figure
      className={cn(
        "my-8 rounded-md border border-border bg-card/50 p-4 sm:p-5",
        className,
      )}
    >
      <figcaption className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-prose text-base font-semibold leading-tight text-foreground">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-1 text-sm leading-snug text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowTable((open) => !open)}
          aria-expanded={showTable}
          aria-controls={tableId}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5",
            "font-mono text-ui-2xs uppercase tracking-eyebrow text-muted-foreground",
            "transition-colors hover:border-text-muted hover:text-foreground",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-muted",
          )}
        >
          <Table2 className="size-3" aria-hidden="true" />
          {showTable ? "Chart" : "Table"}
        </button>
      </figcaption>

      {showTable ? (
        <div id={tableId} className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                {columns.map((column) => (
                  <th
                    key={column}
                    scope="col"
                    className="px-2 py-2 text-left font-mono text-ui-2xs uppercase tracking-eyebrow text-muted-foreground"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="border-b border-border/50">
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="px-2 py-1.5 font-mono text-ui-sm tabular-nums text-foreground/85"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div id={tableId}>{children}</div>
      )}

      {source && (
        <p className="mt-4 border-t border-border/60 pt-3 text-xs leading-relaxed text-muted-foreground">
          {source}
        </p>
      )}
    </figure>
  );
}
