import { ArrowRight } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";

import { EvidenceChip } from "@/components/evidence/evidence-chip";
import { PAGE_CONTAINER, Page } from "@/components/shell/page";
import { getAllConcepts } from "@/lib/content/concepts";
import {
  LANDING_SURFACE,
  SURFACE_COOKIE,
  resolveSurface,
} from "@/lib/design/surface";
import { ALL_CITATIONS } from "@/lib/evidence/citations";
import { cn } from "@/lib/utils";

/**
 * The hero is the evidence system, demonstrated on itself.
 *
 * A training app's landing page normally opens with a large number and a
 * gradient. This one opens with a graded claim in a confidence gutter, because
 * the product's actual argument is "we show our reasoning and mark our
 * uncertainty" — and asserting that in marketing copy would be less
 * convincing than simply doing it above the fold.
 */
export default async function Home() {
  const concepts = getAllConcepts();
  // The landing page is not inside a section layout, so it applies its own
  // surface. Without this, `LANDING_SURFACE` was a declaration nothing read and
  // the page rendered dark while the surface table said light.
  const override = (await cookies()).get(SURFACE_COOKIE)?.value;
  const surface = resolveSurface(override, LANDING_SURFACE);

  return (
    <div
      data-surface={surface}
      className="min-h-screen bg-background text-foreground"
    >
      {/*
        The landing page opts out of the app shell and carries its own bar.
        A specimen page should not open behind the product's chrome — the first
        thing on screen is the argument, not a navigation rail.
      */}
      <nav aria-label="Primary" className="border-b border-border">
        <div className={cn(PAGE_CONTAINER, "flex items-center gap-6 py-4")}>
          <span className="font-mono text-ui-2xs uppercase tracking-eyebrow text-text-strong">
            HypertrophyOS
          </span>
          <div className="ml-auto flex items-center gap-5">
            <Link
              href="/knowledge"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Knowledge
            </Link>
            <Link
              href="/exercises"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Exercises
            </Link>
          </div>
        </div>
      </nav>

      <Page className="py-14 sm:py-24">
      <h1 className="mt-4 max-w-3xl font-prose text-4xl font-semibold tracking-tight sm:text-6xl">
        A training system that tells you what to do today, and why it thinks so.
      </h1>

      <div className="mt-10 max-w-2xl border-l-2 border-evidence-strong pl-5">
        <div className="mb-3">
          <EvidenceChip grade="strong" />
        </div>
        <p className="prose-concept text-lg">
          Each additional weekly set is associated with roughly{" "}
          <span className="font-mono tabular-nums">0.37%</span> greater
          hypertrophy across the range studied — but the curve is logarithmic,
          not linear, and the tenth set buys about a third of what the first
          does.
        </p>
      </div>

      <div className="mt-6 max-w-2xl border-l-2 border-dashed border-evidence-mixed pl-5">
        <div className="mb-3">
          <EvidenceChip grade="mixed" />
        </div>
        <p className="prose-concept text-lg">
          Training in the lengthened position is at least as good as full range
          of motion, and possibly better. The most recent trial found no
          advantage. We say so rather than picking the result we prefer.
        </p>
      </div>

      <p className="mt-8 max-w-2xl font-sans text-sm leading-relaxed text-muted-foreground">
        That gutter down the left is the whole idea. Solid where the
        meta-analyses agree, dashed where they do not. It runs beside every
        claim in the app, so you can see the shape of an argument&rsquo;s
        confidence before you read a word of it.
      </p>

      <div className="mt-10 flex flex-wrap items-center gap-4">
        <Link
          href="/knowledge"
          className="inline-flex min-h-11 items-center gap-2 rounded-md bg-text-strong px-5 text-sm font-medium text-background transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-muted"
        >
          Read the knowledge layer
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
        <Link
          href="/citations"
          className="inline-flex min-h-11 items-center font-mono text-xs uppercase tracking-eyebrow text-muted-foreground transition-colors hover:text-foreground"
        >
          {ALL_CITATIONS.length} references
        </Link>
      </div>

      <section className="mt-20 border-t border-border pt-10">
        <h2 className="eyebrow mb-6">What this is for</h2>
        <div className="grid gap-8 sm:grid-cols-3">
          <Positioning
            title="Logging apps"
            body="know what you lifted, and nothing about whether you should have."
          />
          <Positioning
            title="Recovery apps"
            body="know your readiness, and nothing about your training."
          />
          <Positioning
            title="This"
            body="reads both, tracks per-muscle volume against your own landmarks, and shows the rule behind every prescription."
            emphasised
          />
        </div>
      </section>

      <section className="mt-16 border-t border-border pt-10">
        <h2 className="eyebrow mb-6">In the knowledge layer now</h2>
        <ul className="flex flex-wrap gap-x-6 gap-y-3">
          {concepts.map((concept) => (
            <li key={concept.slug}>
              <Link
                href={`/knowledge/${concept.slug}`}
                className="inline-flex items-center gap-2 text-sm text-foreground transition-colors hover:text-text-strong"
              >
                <EvidenceChip grade={concept.evidenceGrade} showLabel={false} />
                {concept.title}
              </Link>
            </li>
          ))}
          </ul>
        </section>
      </Page>
    </div>
  );
}

function Positioning({
  title,
  body,
  emphasised = false,
}: {
  title: string;
  body: string;
  emphasised?: boolean;
}) {
  return (
    <div>
      <h3
        className={
          emphasised
            ? "font-prose text-base font-semibold text-text-strong"
            : "font-prose text-base font-semibold text-muted-foreground"
        }
      >
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
    </div>
  );
}
