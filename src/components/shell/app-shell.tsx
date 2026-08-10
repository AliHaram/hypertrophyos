import { cookies } from "next/headers";

import { BottomBar, ChromeMenu, TopBar } from "@/components/shell/nav-bar";
import { ThemeControl } from "@/components/shell/theme-control";
import { SURFACE_COOKIE, type Surface, resolveSurface } from "@/lib/design/surface";

/**
 * The persistent shell.
 *
 * Wraps every route except the landing page, which carries its own minimal bar.
 * The surface is applied here rather than by a separate wrapper so the chrome
 * and the content sit on the same surface — a top bar rendered outside the
 * surface container would inherit the app default and read as dark chrome over
 * a paper page.
 *
 * `pb-20` on the main region reserves the bottom bar's height on small
 * viewports so the last element of a page is never sitting underneath it.
 */
export async function AppShell({
  surface,
  children,
}: {
  surface: Surface;
  children: React.ReactNode;
}) {
  const preference = (await cookies()).get(SURFACE_COOKIE)?.value ?? "auto";
  const resolved = resolveSurface(preference, surface);

  return (
    <div
      data-surface={resolved}
      className="flex min-h-screen flex-col bg-background text-foreground"
    >
      {/*
        The skip link lives in the root layout, not here — one per document.
        Two would put a second "Skip to content" in the tab order for every
        screen-reader user on every page, which is worse than none.
      */}
      <header>
        <TopBar>
          <ThemeControl current={preference} />
        </TopBar>
      </header>

      <div className="flex-1 pb-20 md:pb-0">{children}</div>

      <footer className="mt-12 border-t border-border pb-20 md:pb-0">
        <ChromeMenu />
      </footer>

      <BottomBar />
    </div>
  );
}
