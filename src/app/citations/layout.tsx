import { SurfaceShell } from "@/components/surface";
import { routeSurface } from "@/lib/design/surface";

/**
 * The bibliography reads on paper.
 *
 * Moving out of `/knowledge` cost it the knowledge layer's surface, and a
 * bibliography is long-form reading — it belongs in the same register as the
 * concepts that cite it, not on the logger's dark surface. See
 * docs/adr/0005-citations-are-shared-infrastructure.md.
 *
 * Resolved through `routeSurface` rather than hardcoded, so `ROUTE_SURFACES`
 * is the thing that decides. A declaration nothing reads is how the previous
 * prefix-matching bug survived unnoticed.
 */
export default function CitationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SurfaceShell surface={routeSurface("/citations")}>{children}</SurfaceShell>
  );
}
