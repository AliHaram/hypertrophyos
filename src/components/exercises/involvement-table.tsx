import { INVOLVEMENT_META, type Involvement } from "@/lib/training/involvement";
import { muscleName } from "@/lib/exercises/muscles";
import type { Exercise } from "@/lib/exercises/schema";
import { cn } from "@/lib/utils";

/**
 * What an exercise trains, and how directly.
 *
 * This is the primary representation, not a fallback for a body map. The
 * anatomical atlas is deferred — sourcing a correct, correctly-licensed SVG is
 * illustration work and generated path data would read as amateur — but that is
 * not the only reason this is built as a first-class view. A highlighted
 * silhouette can show *that* a muscle is involved. It cannot show the tier, the
 * multiplier, or the reasoning behind an arguable coding, and those are the
 * parts that actually determine what the volume maths does with the set.
 *
 * So even once an atlas exists, this stays the authoritative view and the map
 * becomes the overview. Which is also why it has to be good now.
 *
 * Ordered by contribution, prime mover first. Indirect entries are kept rather
 * than trimmed: they earn no volume, but the fatigue ledger needs to know a
 * muscle was loaded, and a reader deserves to see that the coding considered
 * them rather than overlooked them.
 */

const TIER_ORDER: Record<Involvement, number> = {
  direct: 0,
  fractional: 1,
  indirect: 2,
};

export function InvolvementTable({ exercise }: { exercise: Exercise }) {
  const rows = [...exercise.muscles].sort((a, b) => {
    if (a.primeMover !== b.primeMover) return a.primeMover ? -1 : 1;
    const tier = TIER_ORDER[a.involvement] - TIER_ORDER[b.involvement];
    return tier !== 0 ? tier : muscleName(a.muscleId).localeCompare(muscleName(b.muscleId));
  });

  const countedSets = rows.reduce(
    (total, row) => total + INVOLVEMENT_META[row.involvement].multiplier,
    0,
  );

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="table-scroll w-full border-collapse text-sm">
          <caption className="sr-only">
            Muscles trained by {exercise.name}, their involvement tier, and the
            fraction of a set each earns toward weekly volume.
          </caption>
          <thead>
            <tr className="border-b border-border">
              <th
                scope="col"
                className="px-2 py-2 text-left font-mono text-ui-2xs uppercase tracking-eyebrow text-muted-foreground"
              >
                Muscle
              </th>
              <th
                scope="col"
                className="px-2 py-2 text-left font-mono text-ui-2xs uppercase tracking-eyebrow text-muted-foreground"
              >
                Involvement
              </th>
              <th
                scope="col"
                className="px-2 py-2 text-right font-mono text-ui-2xs uppercase tracking-eyebrow text-muted-foreground"
              >
                Counts as
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const meta = INVOLVEMENT_META[row.involvement];
              return (
                <tr
                  key={row.muscleId}
                  className="border-b border-border/50 align-top"
                >
                  <th scope="row" className="px-2 py-3 text-left font-normal">
                    <span
                      className={cn(
                        "text-sm",
                        row.primeMover
                          ? "font-semibold text-text-strong"
                          : "text-foreground",
                      )}
                    >
                      {muscleName(row.muscleId)}
                    </span>
                    {row.primeMover && (
                      <span className="ml-2 font-mono text-ui-2xs uppercase tracking-eyebrow text-muted-foreground">
                        prime mover
                      </span>
                    )}
                    {row.codingNote && (
                      <p className="mt-1.5 max-w-prose text-xs leading-relaxed text-muted-foreground">
                        {row.codingNote}
                      </p>
                    )}
                  </th>

                  <td className="px-2 py-3">
                    <span className="inline-flex items-center gap-2">
                      {/*
                        Three steps, filled to the tier. A redundant encoding of
                        the label beside it — the tier is ordinal, and an
                        ordinal value is read faster as a position than as a
                        word.
                      */}
                      <span
                        className="inline-flex gap-0.5"
                        aria-hidden="true"
                      >
                        {[0, 1, 2].map((step) => (
                          <span
                            key={step}
                            className={cn(
                              "block h-3 w-1 rounded-xs",
                              step <= 2 - TIER_ORDER[row.involvement]
                                ? "bg-text-strong"
                                : "bg-border",
                            )}
                          />
                        ))}
                      </span>
                      <span className="text-sm text-foreground">
                        {meta.label}
                      </span>
                    </span>
                  </td>

                  <td className="px-2 py-3 text-right font-mono text-sm tabular-nums text-foreground">
                    {meta.multiplier.toFixed(1)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td className="px-2 py-3 font-mono text-ui-2xs uppercase tracking-eyebrow text-muted-foreground">
                One set contributes
              </td>
              <td />
              <td className="px-2 py-3 text-right font-mono text-sm font-medium tabular-nums text-text-strong">
                {countedSets.toFixed(1)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Tiers are 1.0, 0.5 and 0 — the three-level scheme Pelland et al. (2026)
        found predicted adaptation better than counting indirect work fully or
        ignoring it. The tier is stored; the multiplier is derived, so no
        exercise can be quietly assigned a number the literature does not
        support.
      </p>
    </div>
  );
}
