import { SurfaceShell } from "@/components/surface";
import { routeSurface } from "@/lib/design/surface";

/**
 * The exercise library reads on paper.
 *
 * Reference material rather than in-gym operation — the logger is where the
 * dark surface belongs, and that is a different route. Resolved through
 * `routeSurface` so `ROUTE_SURFACES` remains the single place a route's surface
 * is decided.
 */
export default function ExercisesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SurfaceShell surface={routeSurface("/exercises")}>{children}</SurfaceShell>
  );
}
