import { SurfaceShell } from "@/components/surface";
import { routeSurface } from "@/lib/design/surface";

/**
 * The knowledge layer reads on paper.
 *
 * Long-form reading in dark mode is genuinely worse, so this route group
 * defaults to the light surface regardless of the app's default. A user
 * preference still overrides it.
 *
 * Resolved through `routeSurface` rather than hardcoded, so `ROUTE_SURFACES`
 * is the single place a route's surface is decided.
 */
export default function KnowledgeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SurfaceShell surface={routeSurface("/knowledge")}>{children}</SurfaceShell>
  );
}
