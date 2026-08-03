import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * "Where I might be wrong."
 *
 * Given its own visual treatment rather than buried in a footnote, because
 * naming the weak points of an argument is the most trustworthy thing this
 * app does and hiding it would defeat the purpose. Styled as marginalia — a
 * hand-annotation on the page — not as a warning callout, since nothing here
 * is a hazard.
 */
export function Uncertainty({
  children,
  title = "Where this might be wrong",
  className,
}: {
  children: ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "my-8 rounded-md border border-dashed border-border bg-card/40 p-5",
        className,
      )}
      aria-labelledby="uncertainty-heading"
    >
      <h3 id="uncertainty-heading" className="eyebrow mb-2.5">
        {title}
      </h3>
      <div className="font-sans text-sm leading-relaxed text-muted-foreground [&_a]:text-primary [&_a]:underline [&_p+p]:mt-3">
        {children}
      </div>
    </aside>
  );
}
