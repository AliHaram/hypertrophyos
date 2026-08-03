import { cookies } from "next/headers";

import { SURFACE_COOKIE, type Surface, resolveSurface } from "@/lib/design/surface";

/**
 * Applies a route's surface.
 *
 * The surface variables are declared on `[data-surface]`, so re-declaring the
 * attribute on a wrapper re-points every token beneath it. The wrapper also
 * paints its own background and fills the viewport, because the body's paint
 * comes from the root and a nested subtree cannot reach back up to change it.
 *
 * The user's cookie preference, when set, wins over the route default —
 * someone who needs dark for photophobia or light for contrast should not have
 * to fight the app section by section.
 */
export async function SurfaceShell({
  surface,
  children,
}: {
  surface: Surface;
  children: React.ReactNode;
}) {
  const override = (await cookies()).get(SURFACE_COOKIE)?.value;
  const resolved = resolveSurface(override, surface);

  return (
    <div
      data-surface={resolved}
      className="min-h-screen bg-background text-foreground"
    >
      {children}
    </div>
  );
}
