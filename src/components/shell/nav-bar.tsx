"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV, UTILITY, mobileSections, sectionFor } from "@/lib/navigation/routes";
import { cn } from "@/lib/utils";

/**
 * Primary navigation, rendered from NAV.
 *
 * Client-side only because the active section depends on the pathname; the
 * markup is otherwise static, so nothing here shifts on navigation.
 *
 * The active section is weight plus a hairline rule — never a coloured pill.
 * Hue in this app means an evidence grade or a volume zone, and spending it on
 * a selection state would make both harder to read.
 */

function phaseLabel(section: (typeof NAV)[number]): string | undefined {
  return section.status.kind === "planned"
    ? section.status.phase.replace("phase-", "Phase ")
    : undefined;
}

export function TopBar({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname();
  const active = sectionFor(pathname);

  return (
    <nav
      aria-label="Primary"
      className="hidden border-b border-border md:block"
    >
      <div className="mx-auto flex max-w-6xl items-stretch gap-1 px-5 sm:px-8">
        {NAV.map((section) => {
          const phase = phaseLabel(section);
          const isActive = active?.id === section.id;

          if (phase) {
            return (
              <span
                key={section.id}
                aria-disabled="true"
                title={`${section.label} arrives in ${phase}`}
                className="flex items-center gap-2 border-b-2 border-transparent px-3 py-3.5 text-sm text-text-muted"
              >
                {section.label}
                <span className="font-mono text-ui-2xs uppercase tracking-eyebrow">
                  · {phase}
                </span>
              </span>
            );
          }

          return (
            <Link
              key={section.id}
              href={section.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center border-b-2 px-3 py-3.5 text-sm transition-colors",
                "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-text-muted",
                isActive
                  ? "border-text-strong font-medium text-text-strong"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {section.label}
            </Link>
          );
        })}

        <div className="ml-auto flex items-center gap-4">{children}</div>
      </div>
    </nav>
  );
}

/**
 * Bottom-anchored bar for small viewports.
 *
 * Live sections only. A disabled thumb target carrying a tooltip that cannot
 * fire on touch is a dead control with no explanation, which is worse than an
 * honest omission — the planned sections are disclosed in the chrome menu with
 * their phase in visible text instead. See IA §3.
 */
export function BottomBar() {
  const pathname = usePathname();
  const active = sectionFor(pathname);
  const sections = mobileSections();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex">
        {sections.map((section) => {
          const isActive = active?.id === section.id;
          return (
            <li key={section.id} className="flex-1">
              <Link
                href={section.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 text-sm",
                  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-text-muted",
                  isActive
                    ? "font-medium text-text-strong"
                    : "text-muted-foreground",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "block h-0.5 w-6",
                    isActive ? "bg-text-strong" : "bg-transparent",
                  )}
                />
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Chrome links: the design gallery, and the sections that do not exist yet.
 *
 * The gallery was previously reachable only by typing its URL, which is how a
 * design system's test suite rots unseen. Planned sections appear here with the
 * phase in visible text — the mobile bar omits them, so this is where a phone
 * user learns the shape of the product.
 */
export function ChromeMenu() {
  return (
    <div className="border-t border-border md:border-0">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3 sm:px-8 md:px-0 md:py-0">
        <span className="font-mono text-ui-2xs uppercase tracking-eyebrow text-muted-foreground md:hidden">
          Coming later
        </span>
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 md:hidden">
          {NAV.filter((section) => section.status.kind === "planned").map(
            (section) => (
              <li
                key={section.id}
                className="text-sm text-text-muted"
              >
                {section.label}
                <span className="ml-1.5 font-mono text-ui-2xs uppercase tracking-eyebrow">
                  {phaseLabel(section)}
                </span>
              </li>
            ),
          )}
        </ul>

        {UTILITY.map((item) =>
          item.status.kind === "live" ? (
            <Link
              key={item.id}
              href={item.href}
              className="font-mono text-ui-2xs uppercase tracking-eyebrow text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-muted"
            >
              {item.label}
            </Link>
          ) : (
            <span
              key={item.id}
              aria-disabled="true"
              className="font-mono text-ui-2xs uppercase tracking-eyebrow text-text-muted"
            >
              {item.label} · {phaseLabel(item)}
            </span>
          ),
        )}
      </div>
    </div>
  );
}
