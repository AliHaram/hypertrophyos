import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { getAllExercises, primeMoverOf } from "@/lib/exercises/library";
import { muscleName } from "@/lib/exercises/muscles";
import {
  PEAK_POSITIONS,
  type Equipment,
  type Exercise,
  type PeakPosition,
} from "@/lib/exercises/schema";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Exercises",
  description:
    "Exercise mechanics: where each movement is hardest, what it trains and how directly, and how close to failure it can safely be taken.",
};

/**
 * The exercise library index.
 *
 * Filtering runs through search params and is rendered on the server, so it
 * works without JavaScript, survives a page reload, and produces a URL someone
 * can send to somebody else. A client-side filter would have cost a bundle to
 * do less.
 *
 * The filter rail becomes proper secondary navigation in the app shell; this is
 * the version that works before the shell exists.
 */

type Filters = {
  muscle?: string;
  equipment?: Equipment;
  peak?: PeakPosition;
};

const EQUIPMENT_FILTERS: readonly Equipment[] = [
  "barbell",
  "dumbbell",
  "machine",
];

/**
 * A single search-param value, with blanks normalised away.
 *
 * `?muscle=` and no `muscle` at all mean the same thing to a reader, so they
 * have to mean the same thing here. Normalising at the boundary is what keeps
 * every downstream check from having to decide whether an empty string counts.
 */
function readParam(value: string | string[] | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function matches(exercise: Exercise, filters: Filters): boolean {
  if (filters.peak && exercise.peakPosition !== filters.peak) return false;
  if (filters.equipment && exercise.equipment !== filters.equipment) {
    return false;
  }
  if (
    filters.muscle &&
    !exercise.muscles.some((entry) => entry.muscleId === filters.muscle)
  ) {
    return false;
  }
  return true;
}

function hrefWith(current: Filters, patch: Filters): string {
  const next = { ...current, ...patch };
  const params = new URLSearchParams();
  if (next.muscle) params.set("muscle", next.muscle);
  if (next.equipment) params.set("equipment", next.equipment);
  if (next.peak) params.set("peak", next.peak);
  const query = params.toString();
  return query ? `/exercises?${query}` : "/exercises";
}

export default async function ExercisesIndex({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const exercises = getAllExercises();

  const filters: Filters = {
    muscle: readParam(params.muscle),
    equipment: readParam(params.equipment) as Equipment | undefined,
    peak: readParam(params.peak) as PeakPosition | undefined,
  };

  const visible = exercises.filter((exercise) => matches(exercise, filters));
  // `.some(Boolean)` rather than a chain of `||`, because the question is
  // "is any filter set" and a blank is not set. `??` would answer a different
  // question and get it wrong: `"" ?? undefined ?? "quads"` is `""`.
  const active = [filters.muscle, filters.equipment, filters.peak].some(Boolean);

  // Prime movers only. Filtering by every muscle any exercise touches would
  // offer eighteen options over eight exercises, most of them returning one
  // result for a muscle the exercise was not chosen to train.
  const primeMovers = [
    ...new Set(exercises.map((exercise) => primeMoverOf(exercise))),
  ].sort((a, b) => muscleName(a).localeCompare(muscleName(b)));

  return (
    <main id="main" className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-16">
      <header className="border-b border-border pb-8">
        <p className="eyebrow">The exercise library</p>
        <h1 className="mt-2 font-prose text-4xl font-semibold tracking-tight sm:text-5xl">
          What each movement actually trains
        </h1>
        <p className="prose-concept mt-4 max-w-2xl text-lg text-muted-foreground">
          Every entry carries where in the range it is hardest, which muscles it
          trains and how directly, how close to failure it can safely be taken,
          and the reasoning behind each of those. Eight movements, chosen to
          cover the mechanics rather than to look comprehensive.
        </p>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <FilterRail
          filters={filters}
          primeMovers={primeMovers}
          active={active}
        />

        <div>
          <p className="font-mono text-ui-2xs uppercase tracking-eyebrow text-muted-foreground">
            {visible.length} of {exercises.length} shown
          </p>

          {visible.length > 0 ? (
            <ul className="mt-4 divide-y divide-border border-y border-border">
              {visible.map((exercise) => (
                <li key={exercise.id}>
                  <ExerciseRow exercise={exercise} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState filters={filters} />
          )}
        </div>
      </div>
    </main>
  );
}

function FilterRail({
  filters,
  primeMovers,
  active,
}: {
  filters: Filters;
  primeMovers: readonly string[];
  active: boolean;
}) {
  return (
    <nav aria-label="Filter exercises" className="lg:sticky lg:top-10 lg:self-start">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="eyebrow">Filter</h2>
        {active && (
          <Link
            href="/exercises"
            className="font-mono text-ui-2xs uppercase tracking-eyebrow text-text-strong underline underline-offset-2"
          >
            Clear
          </Link>
        )}
      </div>

      <FilterGroup label="Trains">
        {primeMovers.map((muscle) => (
          <FilterLink
            key={muscle}
            href={hrefWith(filters, {
              muscle: filters.muscle === muscle ? undefined : muscle,
            })}
            selected={filters.muscle === muscle}
          >
            {muscleName(muscle)}
          </FilterLink>
        ))}
      </FilterGroup>

      <FilterGroup label="Hardest at">
        {PEAK_POSITIONS.map((peak) => (
          <FilterLink
            key={peak}
            href={hrefWith(filters, {
              peak: filters.peak === peak ? undefined : peak,
            })}
            selected={filters.peak === peak}
          >
            {peak}
          </FilterLink>
        ))}
      </FilterGroup>

      <FilterGroup label="Equipment">
        {EQUIPMENT_FILTERS.map((equipment) => (
          <FilterLink
            key={equipment}
            href={hrefWith(filters, {
              equipment: filters.equipment === equipment ? undefined : equipment,
            })}
            selected={filters.equipment === equipment}
          >
            {equipment}
          </FilterLink>
        ))}
      </FilterGroup>
    </nav>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <h3 className="font-mono text-ui-2xs uppercase tracking-eyebrow text-muted-foreground">
        {label}
      </h3>
      <ul className="mt-2 space-y-1">{children}</ul>
    </section>
  );
}

function FilterLink({
  href,
  selected,
  children,
}: {
  href: string;
  selected: boolean;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        aria-current={selected ? "true" : undefined}
        className={cn(
          "-mx-2 flex min-h-9 items-center rounded-xs px-2 text-sm transition-colors",
          "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-text-muted",
          selected
            ? "font-medium text-text-strong"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        {/*
          The active filter is marked by weight and a rule, not a coloured
          pill — hue in this app means an evidence grade or a volume zone, and
          spending it on a selection state would make both harder to read.
        */}
        <span
          aria-hidden="true"
          className={cn(
            "mr-2 block h-4 w-0.5 shrink-0",
            selected ? "bg-text-strong" : "bg-transparent",
          )}
        />
        {children}
      </Link>
    </li>
  );
}

function ExerciseRow({ exercise }: { exercise: Exercise }) {
  return (
    <Link
      href={`/exercises/${exercise.id}`}
      className="group flex gap-4 py-5 transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-text-muted sm:gap-6"
    >
      <div className="min-w-0 flex-1">
        <h3 className="font-prose text-lg font-semibold leading-snug transition-colors group-hover:text-text-strong">
          {exercise.name}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Trains {muscleName(primeMoverOf(exercise))} · hardest in the{" "}
          {exercise.peakPosition} position
        </p>
        <p className="mt-2 line-clamp-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
          {exercise.sfrRationale}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="font-mono text-ui-2xs uppercase tracking-eyebrow text-muted-foreground">
          {exercise.equipment}
        </p>
        <p className="mt-1 font-mono text-sm tabular-nums text-foreground">
          SFR {exercise.sfrRating}
          <span className="text-muted-foreground">/5</span>
        </p>
      </div>
    </Link>
  );
}

/**
 * The empty state, with a route out of it.
 *
 * A filter combination returning nothing is a normal outcome in an
 * eight-exercise library, and the page has to say what happened and offer the
 * way back rather than rendering an empty list and letting the reader wonder
 * whether it broke.
 */
function EmptyState({ filters }: { filters: Filters }) {
  const described = [
    filters.muscle && `trains ${muscleName(filters.muscle)}`,
    filters.peak && `is hardest in the ${filters.peak} position`,
    filters.equipment && `uses ${filters.equipment}`,
  ].filter(Boolean);

  return (
    <div className="mt-4 border-y border-border py-14 text-center">
      <p className="font-prose text-lg font-semibold text-foreground">
        No exercise matches that combination.
      </p>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        {described.length > 0 ? (
          <>
            Nothing in the library {described.join(", and ")}. The library holds
            eight movements chosen for mechanical coverage, so real gaps are
            expected — this is one of them rather than a bug.
          </>
        ) : (
          <>The library is empty, which should not be possible.</>
        )}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-3">
        <Link
          href="/exercises"
          className="inline-flex min-h-11 items-center gap-2 text-sm text-text-strong underline underline-offset-2"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Clear the filters
        </Link>
        <Link
          href="/knowledge/resistance-profile"
          className="inline-flex min-h-11 items-center text-sm text-text-strong underline underline-offset-2"
        >
          Read what a resistance profile is
        </Link>
      </div>
    </div>
  );
}
