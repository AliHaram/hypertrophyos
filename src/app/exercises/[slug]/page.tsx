import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ResistanceProfileChart } from "@/components/charts/resistance-profile-chart";
import { InvolvementTable } from "@/components/exercises/involvement-table";
import { Breadcrumbs } from "@/components/shell/breadcrumbs";
import { conceptDependencies } from "@/lib/exercises/concept-links";
import { getAllExercises, getExercise, primeMoverOf } from "@/lib/exercises/library";
import { muscleName } from "@/lib/exercises/muscles";
import type { FailureProtocol } from "@/lib/exercises/schema";
import {
  type RankedSubstitution,
  complementsFor,
  substitutesFor,
} from "@/lib/exercises/substitutions";
import { cn } from "@/lib/utils";
import { Page } from "@/components/shell/page";

export function generateStaticParams() {
  return getAllExercises().map((exercise) => ({ slug: exercise.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const exercise = getExercise(slug);
  if (!exercise) return {};

  return {
    title: exercise.name,
    description: `${exercise.name}: hardest in the ${exercise.peakPosition} position, trains ${muscleName(primeMoverOf(exercise))}. ${exercise.sfrRationale.slice(0, 100)}`,
  };
}

const FAILURE_HEADLINE: Record<FailureProtocol, string> = {
  "true-failure-safe": "Can be taken to true failure, unsupervised",
  "failure-with-safety-setup": "Failure only with pins, a rack or a spotter",
  "terminate-at-form-breakdown": "Stop when position degrades, not at failure",
  "never-to-failure": "Never take this near failure",
};

export default async function ExercisePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const exercise = getExercise(slug);

  if (!exercise) notFound();

  const substitutes = substitutesFor(exercise);
  const complements = complementsFor(exercise);
  const dependencies = conceptDependencies();

  return (
    <Page>
      <Breadcrumbs pathname="/exercises/[slug]" leafLabel={exercise.name} />

      <header className="mt-6 border-b border-border pb-8">
        <p className="eyebrow">{exercise.equipment}</p>
        <h1 className="mt-2 font-prose text-4xl font-semibold tracking-tight sm:text-5xl">
          {exercise.name}
        </h1>
        <p className="prose-concept mt-4 max-w-2xl text-lg text-muted-foreground">
          Trains {muscleName(primeMoverOf(exercise))}, hardest in the{" "}
          {exercise.peakPosition} position, with peak tension arriving while the
          target is {exercise.muscleLengthAtPeakTension}.
        </p>

        <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
          <Stat label="Axial load" value={exercise.axialLoad} />
          <Stat label="Joint stress" value={exercise.jointStress} />
          <Stat label="Stability" value={exercise.stabilityDemand} />
          <Stat
            label="Stimulus / fatigue"
            value={`${exercise.sfrRating}/5`}
            numeric
          />
        </dl>
      </header>

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <article className="min-w-0">
          <ResistanceProfileChart
            series={[
              {
                id: exercise.id,
                name: exercise.name,
                samples: exercise.resistanceProfile,
                peakPosition: exercise.peakPosition,
              },
            ]}
            subtitle="Relative torque demand across the range of motion, normalised so the peak is 1.00. Derived from the mechanics below, not measured."
            source={exercise.resistanceProfileDerivation}
            className="mt-0"
          />

          <Section title="What it trains">
            <InvolvementTable exercise={exercise} />
          </Section>

          <Section title="How close to failure">
            <p className="font-prose text-lg font-semibold leading-snug text-text-strong">
              {FAILURE_HEADLINE[exercise.failureProtocol]}
            </p>
            <p className="prose-concept mt-3">
              {exercise.failureProtocolRationale}
            </p>
          </Section>

          <Section title="Stimulus to fatigue">
            <p className="prose-concept">{exercise.sfrRationale}</p>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              A judgement, not a measurement. No validated stimulus-to-fatigue
              metric exists, so this rating is reasoned from the mechanical
              properties above and is shown with its reasoning rather than as a
              bare number.
            </p>
          </Section>

          <Section title="Setting it up">
            <ul className="prose-concept list-disc space-y-2 pl-6 marker:text-muted-foreground">
              {exercise.setupCues.map((cue) => (
                <li key={cue} className="pl-1">
                  {cue}
                </li>
              ))}
            </ul>
          </Section>

          <Section title="What goes wrong">
            <ul className="prose-concept list-disc space-y-2 pl-6 marker:text-muted-foreground">
              {exercise.commonErrors.map((error) => (
                <li key={error} className="pl-1">
                  {error}
                </li>
              ))}
            </ul>
          </Section>

          <Section title="If you cannot do this one">
            <SubstitutionList
              results={substitutes}
              emptyHeadline={`Nothing in the library substitutes for this.`}
              emptyBody={`A substitute has to share the prime mover — ${muscleName(primeMoverOf(exercise))} here — and no other movement in these eight does. That is a real gap rather than a filtered-out result, and padding the list with something that trains a different muscle would be worse than saying so.`}
            />
          </Section>

          <Section title="What to pair it with">
            <SubstitutionList
              results={complements}
              emptyHeadline="No complement in the library yet."
              emptyBody={`A complement loads the same muscle from a different part of the range. Everything here training ${muscleName(primeMoverOf(exercise))} peaks in the same position as this does, so pairing them would load one part of the range twice.`}
            />
          </Section>
        </article>

        <aside className="space-y-8 lg:sticky lg:top-10 lg:self-start">
          <section>
            <h2 className="eyebrow mb-3">What this rests on</h2>
            <ul className="space-y-3.5">
              {dependencies.map((dependency) => (
                <li key={dependency.slug} className="text-sm leading-relaxed">
                  {dependency.written ? (
                    <Link
                      href={`/knowledge/${dependency.slug}`}
                      className="font-medium text-text-strong underline underline-offset-2"
                    >
                      {dependency.title}
                    </Link>
                  ) : (
                    <span className="font-medium text-muted-foreground">
                      {dependency.field}
                      <span className="ml-2 font-mono text-ui-2xs uppercase tracking-eyebrow">
                        not yet written · {dependency.plannedFor}
                      </span>
                    </span>
                  )}
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {dependency.because}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="border-t border-border pt-6">
            <h2 className="eyebrow mb-3">Every claim here</h2>
            <p className="text-xs leading-relaxed text-muted-foreground">
              is graded <strong className="text-foreground">mechanical</strong>{" "}
              — derived from moment arms and lines of action rather than
              measured in a trial. The reasoning is on this page for each one,
              which is what that grade promises.
            </p>
            <Link
              href="/citations"
              className="mt-3 inline-block font-mono text-ui-2xs uppercase tracking-eyebrow text-text-strong hover:underline"
            >
              Bibliography →
            </Link>
          </section>
        </aside>
      </div>
    </Page>
  );
}

function Stat({
  label,
  value,
  numeric = false,
}: {
  label: string;
  value: string;
  numeric?: boolean;
}) {
  return (
    <div>
      <dt className="font-mono text-ui-2xs uppercase tracking-eyebrow text-muted-foreground">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1 text-sm text-foreground",
          numeric && "font-mono tabular-nums",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12 border-t border-border pt-8">
      <h2 className="font-prose text-2xl font-semibold leading-tight">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function SubstitutionList({
  results,
  emptyHeadline,
  emptyBody,
}: {
  results: readonly RankedSubstitution[];
  emptyHeadline: string;
  emptyBody: string;
}) {
  if (results.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-5">
        <p className="font-prose text-base font-semibold text-foreground">
          {emptyHeadline}
        </p>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
          {emptyBody}
        </p>
        <Link
          href="/exercises"
          className="mt-4 inline-block text-sm text-text-strong underline underline-offset-2"
        >
          Browse the library
        </Link>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border border-y border-border">
      {results.map((result) => (
        <li key={result.exercise.id} className="py-5">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <Link
              href={`/exercises/${result.exercise.id}`}
              className="font-prose text-lg font-semibold text-text-strong underline underline-offset-2"
            >
              {result.exercise.name}
            </Link>
            <span className="font-mono text-ui-2xs uppercase tracking-eyebrow text-muted-foreground">
              {result.profileMatch} profile
            </span>
          </div>

          <ul className="mt-3 space-y-1.5">
            {result.tradeoffs.map((tradeoff) => (
              <li
                key={tradeoff.dimension}
                className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground"
              >
                {/*
                  Direction is carried by a glyph and by the text, never by
                  colour alone — and "different" genuinely means neither better
                  nor worse, so it gets its own mark rather than being rounded
                  toward one of the other two.
                */}
                <span
                  aria-hidden="true"
                  className="mt-2 block h-px w-3 shrink-0 bg-text-muted"
                />
                <span>
                  <span className="sr-only">
                    {tradeoff.direction === "better"
                      ? "Improvement: "
                      : tradeoff.direction === "worse"
                        ? "Cost: "
                        : "Difference: "}
                  </span>
                  {tradeoff.note}
                </span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
