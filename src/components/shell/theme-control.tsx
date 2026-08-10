"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { SURFACE_COOKIE } from "@/lib/design/surface";
import { cn } from "@/lib/utils";

/**
 * Surface preference: follow the route, force light, force dark.
 *
 * Three states, not two. The surface follows the route by default because the
 * knowledge layer reads better on paper and the logger reads better dark — but
 * someone who needs dark for photophobia, or light for contrast, must not have
 * to fight the app section by section.
 *
 * Written to a cookie and resolved server-side on the next render, so there is
 * no flash. `router.refresh()` re-renders the tree with the new preference
 * rather than reloading the page.
 */

const OPTIONS = [
  { value: "auto", label: "Auto", title: "Follow the section" },
  { value: "light", label: "Light", title: "Always paper" },
  { value: "dark", label: "Dark", title: "Always dark" },
] as const;

export function ThemeControl({ current }: { current: string }) {
  const router = useRouter();
  const [value, setValue] = useState(current);

  function choose(next: string) {
    setValue(next);
    // A year is long enough to be a preference rather than a session quirk.
    document.cookie = `${SURFACE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <fieldset className="flex items-center gap-2">
      <legend className="sr-only">Surface preference</legend>
      <div className="flex items-center rounded-xs border border-border">
        {OPTIONS.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => choose(option.value)}
              aria-pressed={selected}
              title={option.title}
              className={cn(
                "min-h-9 px-2.5 font-mono text-ui-2xs uppercase tracking-eyebrow transition-colors",
                "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-text-muted",
                selected
                  ? "bg-muted font-medium text-text-strong"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
