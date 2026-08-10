import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { breadcrumbsFor } from "@/lib/navigation/routes";

/**
 * Breadcrumbs, derived from the route map.
 *
 * Never hand-assembled: the trail comes from `breadcrumbsFor`, so a section
 * rename moves every crumb at once. `leafLabel` is passed in because NAV is
 * static and cannot know a concept's title; `interstitial` carries the one tier
 * that is not a function of the path — a concept's category, which lives in
 * frontmatter.
 */
export function Breadcrumbs({
  pathname,
  leafLabel,
  interstitial,
}: {
  pathname: string;
  leafLabel?: string;
  interstitial?: string;
}) {
  const crumbs = breadcrumbsFor(pathname, leafLabel, interstitial);
  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <li key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 && (
                <ChevronRight
                  className="size-3 shrink-0 text-text-muted"
                  aria-hidden="true"
                />
              )}
              {crumb.href && !last ? (
                <Link
                  href={crumb.href}
                  className="font-mono text-ui-2xs uppercase tracking-eyebrow text-muted-foreground transition-colors hover:text-foreground"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  aria-current={last ? "page" : undefined}
                  className="font-mono text-ui-2xs uppercase tracking-eyebrow text-foreground"
                >
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
