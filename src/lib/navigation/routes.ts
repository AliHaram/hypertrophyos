import type { Phase } from "@/lib/phases";

/**
 * The route map, as data.
 *
 * Navigation renders from here. There are no hand-written `<Link>` lists in a
 * layout, because that is how a nav becomes a pile someone appends to forever
 * and how routes end up unreachable — the app reached seven pages with no way
 * between them but the URL bar.
 *
 * See docs/information-architecture.md for the reasoning behind the sections.
 */

type RouteStatus =
  | { kind: "live" }
  /** `phase` is not optional: a planned item whose label says nothing is worse
   *  than one that is absent, and the type should not permit it. */
  | { kind: "planned"; phase: Phase };

export interface NavSection {
  id: string;
  label: string;
  href: string;
  status: RouteStatus;
  /** Routes inside this section, for breadcrumbs and the contextual rail. */
  children?: NavChild[];
}

interface NavChild {
  /** Route pattern as Next writes it — `/exercises/[slug]`. */
  pattern: string;
  label: string;
  /** Dynamic routes take their crumb label from the page. */
  dynamic?: boolean;
}

/**
 * Primary sections, in product order.
 *
 * Train and Dashboard lead while unbuilt, deliberately. Ordering by what
 * happens to exist would misrepresent the product and would need reordering at
 * Phase 3 and again at Phase 4. The phase label is rendered inline and visible
 * rather than on hover, which is what keeps a disabled item reading as honest
 * rather than broken.
 */
export const NAV: readonly NavSection[] = [
  {
    id: "train",
    label: "Train",
    href: "/train",
    status: { kind: "planned", phase: "phase-3" },
  },
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    status: { kind: "planned", phase: "phase-4" },
  },
  {
    id: "exercises",
    label: "Exercises",
    href: "/exercises",
    status: { kind: "live" },
    children: [
      { pattern: "/exercises/[slug]", label: "Exercise", dynamic: true },
    ],
  },
  {
    id: "knowledge",
    label: "Knowledge",
    href: "/knowledge",
    status: { kind: "live" },
    children: [
      { pattern: "/knowledge/[slug]", label: "Concept", dynamic: true },
      { pattern: "/citations", label: "Bibliography" },
    ],
  },
];

/** Reachable from shell chrome rather than the primary bar. */
export const UTILITY: readonly NavSection[] = [
  {
    id: "design",
    label: "Design system",
    href: "/design",
    status: { kind: "live" },
  },
  {
    id: "settings",
    label: "Settings",
    href: "/settings",
    status: { kind: "planned", phase: "phase-6" },
  },
];

function isLive(section: NavSection): boolean {
  return section.status.kind === "live";
}

/** Sections that render on the mobile bottom bar — live only, see IA §3. */
export function mobileSections(): readonly NavSection[] {
  return NAV.filter(isLive);
}

/**
 * The section a path belongs to.
 *
 * `/citations` is a Knowledge route without a `/knowledge` prefix, so this
 * matches declared children as well as the section href — the URL tree and the
 * nav tree deliberately have different shapes here (ADR 0005).
 */
export function sectionFor(pathname: string): NavSection | undefined {
  return NAV.find((section) => {
    if (pathname === section.href || pathname.startsWith(`${section.href}/`)) {
      return true;
    }
    return section.children?.some((child) => {
      const base = child.pattern.replace(/\/\[.*$/, "");
      return pathname === base || pathname.startsWith(`${base}/`);
    });
  });
}

export interface Crumb {
  label: string;
  /** Absent on the current page, which is not a link. */
  href?: string;
}

/**
 * The breadcrumb trail for a path, derived rather than hand-assembled.
 *
 * `leafLabel` comes from the page because NAV is static and cannot know a
 * concept's title. `interstitial` covers the one case where the trail is not a
 * function of the path: a concept's category lives in frontmatter, not the URL,
 * and dropping it would hide the knowledge layer's reading order in the very
 * component whose job is showing structure.
 */
export function breadcrumbsFor(
  pathname: string,
  leafLabel?: string,
  interstitial?: string,
): Crumb[] {
  const section = sectionFor(pathname);
  if (!section) return [];

  const crumbs: Crumb[] = [{ label: section.label, href: section.href }];

  if (interstitial) crumbs.push({ label: interstitial });

  // A section's own index page is not its own child.
  if (pathname === section.href) return [{ label: section.label }];

  const child = section.children?.find(
    (candidate) => candidate.pattern === pathname,
  );

  crumbs.push({ label: leafLabel ?? child?.label ?? "" });
  return crumbs.filter((crumb) => crumb.label !== "");
}
