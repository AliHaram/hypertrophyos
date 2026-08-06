import Link from "next/link";

import { exercisesByPeakPosition } from "@/lib/exercises/library";
import { PEAK_POSITIONS, type PeakPosition } from "@/lib/exercises/schema";

/**
 * Real examples of each peak position, drawn from the library.
 *
 * Derived rather than written into the prose, and that is the whole point. A
 * concept that names "leg extension, lateral raise" in a sentence is asserting
 * a classification nothing checks: the exercise can be recoded, or removed, and
 * the prose keeps confidently naming it. Here the list comes from the same
 * records the exercise pages render, so it cannot disagree with them.
 *
 * A position with no exercise yet says so. That is a real state — the library
 * is eight movements — and naming the gap is better than quietly rendering
 * three headings and one empty space.
 */

const DESCRIPTION: Record<PeakPosition, string> = {
  stretched:
    "Hardest near full stretch. Most free-weight compounds land here, because the moment arm is longest where the joint is most flexed.",
  "mid-range":
    "Hardest through the middle. The load builds as the limb rotates away from the line of resistance, then eases before lockout.",
  shortened:
    "Hardest near full contraction. Characteristic of raises and extensions, where the moment arm grows as the muscle shortens.",
  even: "No strong peak. Usually the result of a cam or a linkage designed to hold demand roughly constant across the range.",
};

export function PeakPositionExamples() {
  const grouped = exercisesByPeakPosition();

  return (
    <div className="my-8 divide-y divide-border border-y border-border">
      {PEAK_POSITIONS.map((position) => {
        const examples = grouped.get(position) ?? [];

        return (
          <section key={position} className="py-5">
            <h3 className="font-mono text-ui-2xs uppercase tracking-eyebrow text-muted-foreground">
              {position}
            </h3>
            <p className="prose-concept mt-2 max-w-2xl text-sm">
              {DESCRIPTION[position]}
            </p>

            {examples.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                {examples.map((exercise) => (
                  <li key={exercise.id}>
                    <Link
                      href={`/exercises/${exercise.id}`}
                      className="text-sm text-text-strong underline underline-offset-2"
                    >
                      {exercise.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm italic text-muted-foreground">
                No exercise in the library carries this profile yet.
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
