import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Shell for every figure in the knowledge layer.
 *
 * Guarantees the two things a figure must never ship without: a caption that
 * states what the reader is looking at, and a table carrying the same numbers.
 *
 * The table is a disclosure rather than a toggle, and the component renders on
 * the server. It used to swap chart for table behind `useState`, which meant
 * the "accessible path" was gated on a JavaScript bundle arriving — and that a
 * reader could see the numbers or the shape, never both while comparing them.
 * `<details>` is the native control for exactly this, costs nothing, and works
 * before hydration.
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
  return (
    <figure
      className={cn(
        "my-8 rounded-md border border-border bg-card/50 p-4 sm:p-5",
        className,
      )}
    >
      <figcaption className="mb-5">
        <h3 className="font-prose text-base font-semibold leading-tight text-foreground">
          {title}
        </h3>
        {subtitle && (
          <p className="mt-1 text-sm leading-snug text-muted-foreground">
            {subtitle}
          </p>
        )}
      </figcaption>

      {children}

      <details className="group mt-5 border-t border-border/60 pt-3">
        <summary
          className={cn(
            "disclosure-summary inline-flex items-center gap-1.5 rounded-md",
            "font-mono text-ui-2xs uppercase tracking-eyebrow text-muted-foreground",
            "transition-colors hover:text-foreground",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-muted",
          )}
        >
          <svg
            viewBox="0 0 8 8"
            className="size-2 transition-transform group-open:rotate-90"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M2 0.5 L6 4 L2 7.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Data table
        </summary>

        <div className="mt-3 overflow-x-auto" tabIndex={0}>
          <table className="table-scroll w-full border-collapse text-sm">
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
                      className="px-2 py-1.5 font-mono text-ui-sm tabular-nums text-foreground"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {source && (
        <p className="mt-4 border-t border-border/60 pt-3 text-xs leading-relaxed text-muted-foreground">
          {source}
        </p>
      )}
    </figure>
  );
}
