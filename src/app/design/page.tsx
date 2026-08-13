import type { Metadata } from "next";

import { DoseResponseChart } from "@/components/charts/dose-response-chart";
import { Claim } from "@/components/evidence/claim";
import { EvidenceChip } from "@/components/evidence/evidence-chip";
import { Uncertainty } from "@/components/evidence/uncertainty";
import { contrastRatioRounded } from "@/lib/design/contrast";
import {
  DENSITY,
  EVIDENCE,
  NEUTRAL,
  NEUTRAL_STEPS,
  RADIUS,
  TYPE_PROSE,
  TYPE_UI,
} from "@/lib/design/tokens";
import { EVIDENCE_GRADE_META, type EvidenceGrade } from "@/lib/evidence/types";
import { Page } from "@/components/shell/page";

export const metadata: Metadata = {
  title: "Design system",
  description:
    "Every primitive in every state, both surfaces, all three densities.",
};

const GRADES: EvidenceGrade[] = [
  "strong",
  "mixed",
  "mechanical-inference",
  "weak",
];

/**
 * The design system's test suite.
 *
 * Not documentation — a live gallery. When a component gains a state it gains
 * an entry here, so drift is visible rather than theoretical. The grayscale
 * strip near the bottom is the one that matters most: it is where the claim
 * that four gutter styles survive without colour gets checked instead of
 * asserted.
 */
export default function DesignSystemPage() {
  return (
    <Page>
      <header className="border-b border-border pb-8">
        <p className="eyebrow">Design system</p>
        <h1 className="display-lg mt-2">Every primitive, every state</h1>
        <p className="prose-concept mt-4">
          This route is the design system&rsquo;s test suite. If a component
          renders wrong here, it renders wrong everywhere.
        </p>
      </header>

      <Section title="The neutral ramp" eyebrow="Colour">
        <p className="mb-5 max-w-prose text-ui-base text-text-muted">
          Twelve warm-neutral steps. All chrome draws from here. Neither end is
          pure — <Mono>#0b0a08</Mono> not black, <Mono>#f8f6f4</Mono> not white.
          Contrast is measured against both surface bases.
        </p>
        <div className="overflow-x-auto" tabIndex={0}>
          <table className="table-scroll w-full border-collapse text-ui-sm">
            <thead>
              <tr className="border-b border-border">
                <Th>Step</Th>
                <Th>Value</Th>
                <Th>Swatch</Th>
                <Th>vs 00</Th>
                <Th>vs 11</Th>
              </tr>
            </thead>
            <tbody>
              {NEUTRAL_STEPS.map((step) => (
                <tr key={step} className="border-b border-border/60">
                  <Td>
                    <Mono>neutral-{step}</Mono>
                  </Td>
                  <Td>
                    <Mono>{NEUTRAL[step]}</Mono>
                  </Td>
                  <Td>
                    <span
                      className="block h-6 w-24 rounded-sm border border-border"
                      style={{ background: NEUTRAL[step] }}
                    />
                  </Td>
                  <Td>
                    <Mono>
                      {contrastRatioRounded(NEUTRAL[step], NEUTRAL["00"])}
                    </Mono>
                  </Td>
                  <Td>
                    <Mono>
                      {contrastRatioRounded(NEUTRAL[step], NEUTRAL["11"])}
                    </Mono>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Type scale — prose" eyebrow="Typography">
        <p className="mb-5 max-w-prose text-ui-base text-text-muted">
          Newsreader, 1.2 modular scale off a 17px base. Every line height is a
          multiple of 4.
        </p>
        <div className="space-y-4">
          {Object.entries(TYPE_PROSE).map(([name, step]) => (
            <div
              key={name}
              className="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-b border-border/60 pb-4"
            >
              <Mono className="w-28 shrink-0 text-text-muted">
                prose-{name}
              </Mono>
              <Mono className="w-28 shrink-0 text-text-muted">
                {step.size} / {step.lineHeight}
              </Mono>
              <p
                className="font-prose text-text-strong"
                style={{ fontSize: step.size, lineHeight: step.lineHeight }}
              >
                Mechanical tension
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Type scale — interface" eyebrow="Typography">
        <div className="space-y-3">
          {Object.entries(TYPE_UI).map(([name, step]) => (
            <div
              key={name}
              className="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-b border-border/60 pb-3"
            >
              <Mono className="w-28 shrink-0 text-text-muted">ui-{name}</Mono>
              <Mono className="w-28 shrink-0 text-text-muted">
                {step.size} / {step.lineHeight}
              </Mono>
              <p
                className="text-text-strong"
                style={{ fontSize: step.size, lineHeight: step.lineHeight }}
              >
                Effective weekly sets
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Numerics" eyebrow="Typography">
        <p className="mb-4 max-w-prose text-ui-base text-text-muted">
          Every number in the product uses tabular figures. These two columns
          contain the same values; only the first is tabular.
        </p>
        <div className="flex gap-10">
          <div>
            <p className="eyebrow mb-2">Tabular</p>
            {["1,180.5", "97.25", "212.00", "8.75"].map((n) => (
              <p key={n} className="font-mono text-ui-md tabular-nums">
                {n}
              </p>
            ))}
          </div>
          <div>
            <p className="eyebrow mb-2">Proportional</p>
            {["1,180.5", "97.25", "212.00", "8.75"].map((n) => (
              <p
                key={n}
                className="font-mono text-ui-md"
                style={{ fontVariantNumeric: "proportional-nums" }}
              >
                {n}
              </p>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Evidence grades" eyebrow="Semantics">
        <div className="mb-6 flex flex-wrap gap-3">
          {GRADES.map((grade) => (
            <EvidenceChip key={grade} grade={grade} />
          ))}
        </div>
        <dl className="space-y-3">
          {GRADES.map((grade) => (
            <div key={grade} className="border-b border-border/60 pb-3">
              <dt className="mb-1 text-ui-base font-medium text-text-strong">
                {EVIDENCE_GRADE_META[grade].label}
              </dt>
              <dd className="max-w-prose text-ui-sm text-text-muted">
                {EVIDENCE_GRADE_META[grade].definition}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="Confidence gutters" eyebrow="Semantics">
        <p className="mb-5 max-w-prose text-ui-base text-text-muted">
          Four strokes: solid, dashed, double, dotted.
        </p>
        {GRADES.map((grade) => (
          <Claim
            key={grade}
            grade={grade}
            derivation={
              grade === "mechanical-inference"
                ? "Resistance acts perpendicular to the forearm at full elbow extension, where the elbow flexor moment arm is longest."
                : undefined
            }
          >
            <p>
              This claim is graded {EVIDENCE_GRADE_META[grade].label.toLowerCase()}.
              The rule down the left is the whole idea.
            </p>
          </Claim>
        ))}
      </Section>

      <Section
        title="Gutters in grayscale"
        eyebrow="Accessibility"
      >
        <p className="mb-5 max-w-prose text-ui-base text-text-muted">
          The same four, saturation stripped. Evidence green and red collapse
          under deuteranopia (ΔE 3.8) — inherent to any good/bad pair. What
          makes the system legal is that colour is never the only channel:
          stroke style and text label both survive here.
        </p>
        <div style={{ filter: "grayscale(1)" }}>
          {GRADES.map((grade) => (
            <Claim key={grade} grade={grade}>
              <p className="font-ui text-ui-base">
                {EVIDENCE_GRADE_META[grade].label} — distinguishable by stroke
                alone.
              </p>
            </Claim>
          ))}
        </div>
      </Section>

      <Section title="Semantic colour" eyebrow="Colour">
        <div className="overflow-x-auto" tabIndex={0}>
          <table className="table-scroll w-full border-collapse text-ui-sm">
            <thead>
              <tr className="border-b border-border">
                <Th>Grade</Th>
                <Th>Dark</Th>
                <Th>Paper</Th>
                <Th>On dark</Th>
                <Th>On paper</Th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(EVIDENCE).map(([grade, modes]) => (
                <tr key={grade} className="border-b border-border/60">
                  <Td>
                    <Mono>{grade}</Mono>
                  </Td>
                  <Td>
                    <Swatch value={modes.dark} />
                  </Td>
                  <Td>
                    <Swatch value={modes.light} />
                  </Td>
                  <Td>
                    <Mono>
                      {contrastRatioRounded(modes.dark, NEUTRAL["00"])}
                    </Mono>
                  </Td>
                  <Td>
                    <Mono>
                      {contrastRatioRounded(modes.light, NEUTRAL["11"])}
                    </Mono>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Density tiers" eyebrow="Structure">
        <p className="mb-5 max-w-prose text-ui-base text-text-muted">
          Note that <Mono>condensed</Mono> is bigger, not smaller. It is the
          in-gym tier, where a chalky thumb matters more than elegance.
        </p>
        <div className="space-y-6">
          {Object.entries(DENSITY).map(([tier, values]) => (
            <div key={tier}>
              <p className="eyebrow mb-2">{tier}</p>
              <div className="rounded-sm border border-border">
                {["Barbell bench press", "Preacher curl"].map((row) => (
                  <div
                    key={row}
                    className="flex items-center justify-between border-b border-border/60 last:border-0"
                    style={{
                      minHeight: values.rowHeight,
                      paddingInline: values.paddingX,
                      paddingBlock: values.paddingY,
                      fontSize: values.fontSize,
                    }}
                  >
                    <span className="text-text-body">{row}</span>
                    <span className="font-mono tabular-nums text-text-muted">
                      3 × 8
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Radii" eyebrow="Structure">
        <div className="flex flex-wrap gap-6">
          {Object.entries(RADIUS).map(([name, value]) => (
            <div key={name}>
              <div
                className="mb-2 h-16 w-24 border border-border bg-surface-raised"
                style={{ borderRadius: value }}
              />
              <Mono className="text-text-muted">
                {name} · {value}
              </Mono>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Uncertainty note" eyebrow="Components">
        <Uncertainty>
          <p>
            Rendered as marginalia rather than a warning callout — nothing here
            is a hazard, and naming the weak points of an argument is the most
            trustworthy thing this app does.
          </p>
        </Uncertainty>
      </Section>

      <Section title="Range control" eyebrow="Components">
        <p className="prose-concept mb-5 max-w-prose">
          The native <code className="font-mono text-ui-sm">input[type=range]</code>{" "}
          restyled onto tokens. Chosen over a component-library slider because
          the platform control already has keyboard stepping, pointer capture and
          the right screen-reader semantics; the library version reimplements all
          of it in 10 kB of JavaScript that has to reach the reader before the
          control works.
        </p>
        <div className="max-w-sm">
          <label htmlFor="design-range" className="eyebrow">
            Reps in reserve
          </label>
          <input
            id="design-range"
            type="range"
            className="range-control mt-2"
            min={0}
            max={5}
            step={1}
            defaultValue={2}
          />
        </div>
      </Section>

      <Section title="Disclosure" eyebrow="Components">
        <p className="prose-concept mb-5 max-w-prose">
          <code className="font-mono text-ui-sm">details</code> and{" "}
          <code className="font-mono text-ui-sm">summary</code>, marker removed
          and replaced with a chevron that rotates on open. Every figure&rsquo;s
          data table uses this, which is what makes the table reachable before
          hydration rather than after it.
        </p>
        <details className="group max-w-prose rounded-md border border-border p-4">
          <summary className="disclosure-summary inline-flex items-center gap-1.5 font-mono text-ui-2xs uppercase tracking-eyebrow text-text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-muted">
            <svg
              viewBox="0 0 8 8"
              className="size-2 transition-transform group-open:rotate-90"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M2 0.5 L6 4 L2 7.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Data table
          </summary>
          <p className="prose-concept mt-3">
            Content, revealed. No JavaScript involved in either direction.
          </p>
        </details>
      </Section>

      <Section title="Static plate" eyebrow="Charts">
        <p className="prose-concept mb-5 max-w-prose">
          Knowledge-layer figures are journal plates: fixed data, no
          interaction, drawn once on the server. The plot is a stretched SVG with
          non-scaling strokes; every label is HTML positioned by percentage, so
          type stays on the scale and stays legible at phone widths. Interactive
          analytics in later phases will use a charting library — these do not
          need one.
        </p>
        <DoseResponseChart />
      </Section>
    </Page>
  );
}

function Section({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-14 border-t border-border pt-8 first:border-0">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="display-md mb-5 mt-1">{title}</h2>
      {children}
    </section>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th scope="col" className="eyebrow px-3 py-2 text-left">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2 align-middle">{children}</td>;
}

function Mono({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`font-mono text-ui-xs tabular-nums ${className}`}>
      {children}
    </span>
  );
}

function Swatch({ value }: { value: string }) {
  return (
    <span className="flex items-center gap-2">
      <span
        className="block size-5 rounded-sm border border-border"
        style={{ background: value }}
      />
      <Mono className="text-text-muted">{value}</Mono>
    </span>
  );
}
