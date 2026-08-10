import { AppShell } from "@/components/shell/app-shell";
import { routeSurface } from "@/lib/design/surface";

/**
 * The shell wraps this section, and applies its surface.
 *
 * The surface is resolved through `routeSurface` so `ROUTE_SURFACES` stays the
 * single place a route's surface is decided.
 */
export default function SectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell surface={routeSurface("/citations")}>{children}</AppShell>;
}
