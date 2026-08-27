import { describe, expect, it } from "vitest";

import { getAllExercises } from "@/lib/exercises/library";
import { exerciseProse } from "@/lib/exercises/prose";

/**
 * `exerciseProse` is the one declaration of what an exercise page glosses. The
 * page renders those runs in place and the glossary index counts them, so a
 * field missing from here is both unannotated on the page and absent from the
 * index that claims to say where terms appear.
 *
 * Nothing in a typecheck notices a field that simply is not read. This walks
 * the actual exercise objects instead, so a new free-text field added to the
 * schema fails here until someone has decided what to do with it.
 */

/**
 * Fields that carry text but are deliberately not glossed, each for a reason.
 *
 * An exclusion has to be written down to exist. That is the same rule the
 * orphaned-term register and the budget exceptions follow.
 */
const NOT_PROSE: Record<string, string> = {
  id: "A slug.",
  name: "A label, and the text of a link on every index that lists it.",
  equipment: "An enum.",
  peakPosition: "An enum.",
  muscleLengthAtPeakTension: "An enum.",
  failureProtocol: "An enum, rendered through a headline table.",
  axialLoad: "An enum.",
  jointStress: "An enum.",
  stabilityDemand: "An enum.",
  sfrRating: "A number.",
  resistanceProfile: "Numbers.",
  muscles: "Involvement coding. `codingNote` inside it is rendered in the involvement table and is not glossed yet — the table would need the page's pass threaded into it.",
};

describe("exerciseProse", () => {
  const exercises = getAllExercises();

  it("has exercises to check", () => {
    expect(exercises.length).toBeGreaterThan(0);
  });

  it("covers every free-text field the library carries", () => {
    const uncovered = new Set<string>();

    for (const exercise of exercises) {
      const prose = new Set(exerciseProse(exercise));

      for (const [key, value] of Object.entries(exercise)) {
        if (key in NOT_PROSE) continue;

        if (typeof value === "string" && !prose.has(value)) {
          uncovered.add(key);
        }
        if (
          Array.isArray(value) &&
          value.some((item) => typeof item === "string" && !prose.has(item))
        ) {
          uncovered.add(key);
        }
      }
    }

    expect(
      [...uncovered],
      "free-text fields neither glossed nor listed in NOT_PROSE",
    ).toEqual([]);
  });

  it("puts the derivation first and the tradeoffs last, matching the page", () => {
    const exercise = exercises[0]!;
    const prose = exerciseProse(exercise);
    expect(prose[0]).toBe(exercise.resistanceProfileDerivation);
    expect(prose).toContain(exercise.sfrRationale);
    expect(prose.indexOf(exercise.sfrRationale)).toBeLessThan(
      prose.indexOf(exercise.setupCues[0]!),
    );
  });

  it("returns no blank runs", () => {
    for (const exercise of exercises) {
      for (const run of exerciseProse(exercise)) {
        expect(run.trim()).not.toBe("");
      }
    }
  });
});
