import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Newsreader } from "next/font/google";
import { cookies } from "next/headers";

import { TooltipProvider } from "@/components/ui/tooltip";
import { SURFACE_COOKIE, resolveSurface } from "@/lib/design/surface";
import "./globals.css";

/**
 * Three faces, three jobs.
 *
 * Newsreader is variable with an optical-size axis, which is why the display
 * sizes can tighten without the body text losing aperture. IBM Plex Sans and
 * Mono are subset and preloaded. Notably absent: Inter and Geist.
 */
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
  preload: true,
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  preload: true,
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: {
    default: "HypertrophyOS",
    template: "%s · HypertrophyOS",
  },
  description:
    "An evidence-based training operating system. Reads your recovery data, tracks per-muscle volume against physiological landmarks, and shows its work.",
};

export const viewport: Viewport = {
  themeColor: "#0b0a08",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // The user's override, if they have set one. Read server-side so the surface
  // is correct in the first paint — a theme flash is a bug, not a tradeoff.
  const override = (await cookies()).get(SURFACE_COOKIE)?.value;
  const surface = resolveSurface(override, "dark");

  return (
    <html
      lang="en"
      data-surface={surface}
      data-density="comfortable"
      suppressHydrationWarning
    >
      <body
        className={`${newsreader.variable} ${plexSans.variable} ${plexMono.variable}`}
      >
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-text-strong focus:px-4 focus:py-2 focus:text-background"
        >
          Skip to content
        </a>
        <TooltipProvider delay={200}>{children}</TooltipProvider>
      </body>
    </html>
  );
}
