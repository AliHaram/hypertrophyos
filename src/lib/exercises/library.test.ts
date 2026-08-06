import { describe, expect, it } from "vitest";

import { MUSCLES } from "./muscles";
import {
  exercisesByPeakPosition,
  exercisesForMuscle,
  getAllExercises,
  getExercise,
  primeMoverOf,
} from "./library";
import {
  RESISTANCE_PROFILE_SAMPLES,
  observedPeakPosition,
} from "./schema";

/**
 * The library validates itself on load, so most of what could go wrong throws
 * before a test can see it. What these cover is the thing validation cannot:
 * whether the set of eight still has the *coverage* it was chosen for.
 *
 * That matters because the coverage is the justification for stopping at
 * eight. If a future edit leaves three peak positions represented and one
 * absent, the library has quietly become an arbitrary list of movements, and
 * nothing else in the build would notice.
 */

describe("the library loads and validates", () => {
  it("parses every record", () => {
    expect(getAllExercises()).toHaveLength(8);
  });

  it("caches rather than reparsing", () => {
    expect(getAllExercises()).toBe(getAllExercises());
  });

  it("resolves every coded muscle against the registry", () => {
    for (const exercise of getAllExercises()) {
      for (const entry of exercise.muscles) {
        expect(MUSCLES[entry.muscleId], entry.muscleId).toBeDefined();
      }
    }
  });

  it("finds an exercise by id and misses cleanly", () => {
    expect(getExercise("back-squat")?.name).toBe("Barbell back squat");
    expect(getExercise("jefferson-curl")).toBeUndefined();
  });
});

describe("the coverage the set of eight was chosen for", () => {
  it("spans all four peak positions", () => {
    const covered = new Set(
      getAllExercises().map((exercise) => exercise.peakPosition),
    );

    expect([...covered].sort()).toEqual([
      "even",
      "mid-range",
      "shortened",
      "stretched",
    ]);
  });

  it("spans all four failure protocols", () => {
    const covered = new Set(
      getAllExercises().map((exercise) => exercise.failureProtocol),
    );

    expect([...covered].sort()).toEqual([
      "failure-with-safety-setup",
      "never-to-failure",
      "terminate-at-form-breakdown",
      "true-failure-safe",
    ]);
  });

  it("spans all three muscle lengths at peak tension", () => {
    const covered = new Set(
      getAllExercises().map(
        (exercise) => exercise.muscleLengthAtPeakTension,
      ),
    );

    expect([...covered].sort()).toEqual(["lengthened", "mid", "shortened"]);
  });

  it("leaves the ranker two candidates in three muscle groups", () => {
    // The reason the library stops at eight rather than four: a substitution
    // engine with one candidate per muscle has nothing to rank.
    const byPrimeMover = new Map<string, number>();
    for (const exercise of getAllExercises()) {
      const mover = primeMoverOf(exercise);
      byPrimeMover.set(mover, (byPrimeMover.get(mover) ?? 0) + 1);
    }

    const withAlternatives = [...byPrimeMover.entries()].filter(
      ([, count]) => count >= 2,
    );

    expect(withAlternatives).toHaveLength(3);
    expect(withAlternatives.map(([muscle]) => muscle).sort()).toEqual([
      "hamstrings",
      "pectoralis-major",
      "quadriceps",
    ]);
  });

  it("keeps the leg press as the peak-position/muscle-length divergence case", () => {
    // Documented in db/schema/exercises.ts: external resistance peaks deep,
    // but the quadriceps as a group are not maximally lengthened there because
    // rectus femoris length depends on the hip as well as the knee. If this
    // ever collapses to agreement, the distinction between the two fields has
    // lost its worked example.
    const legPress = getExercise("leg-press");

    expect(legPress?.peakPosition).toBe("stretched");
    expect(legPress?.muscleLengthAtPeakTension).toBe("mid");
  });
});

describe("every resistance profile is a well-formed claim", () => {
  it("carries exactly eleven normalised samples peaking at 1.0", () => {
    for (const exercise of getAllExercises()) {
      expect(exercise.resistanceProfile, exercise.id).toHaveLength(
        RESISTANCE_PROFILE_SAMPLES,
      );
      expect(Math.max(...exercise.resistanceProfile), exercise.id).toBe(1);
      expect(Math.min(...exercise.resistanceProfile), exercise.id).toBeGreaterThanOrEqual(0);
    }
  });

  it("declares a peak position the curve actually has", () => {
    // The schema asserts this too. Repeated here because it is the single
    // assertion most likely to be silently broken by a hand-edited curve, and
    // a filter that says "stretched" over a shortened-peaking curve is worse
    // than no filter at all.
    for (const exercise of getAllExercises()) {
      const observed = observedPeakPosition(exercise.resistanceProfile);
      expect(observed, exercise.id).toBe(exercise.peakPosition);
    }
  });

  it("never leaves a peak on the boundary where the label is ambiguous", () => {
    // observedPeakPosition returns undefined when the peak sits between
    // thirds. A curve in that band would pass the schema's consistency check
    // vacuously, because there is nothing to disagree with.
    for (const exercise of getAllExercises()) {
      expect(
        observedPeakPosition(exercise.resistanceProfile),
        `${exercise.id} peaks on an ambiguous boundary`,
      ).toBeDefined();
    }
  });

  it("writes out the reasoning behind every curve", () => {
    // These are graded mechanical-inference, and that grade is only honest if
    // the derivation is specific enough to argue with.
    for (const exercise of getAllExercises()) {
      expect(
        exercise.resistanceProfileDerivation.length,
        exercise.id,
      ).toBeGreaterThan(120);
    }
  });
});

describe("involvement coding", () => {
  it("gives every exercise exactly one prime mover, coded direct", () => {
    for (const exercise of getAllExercises()) {
      const movers = exercise.muscles.filter((entry) => entry.primeMover);

      expect(movers, exercise.id).toHaveLength(1);
      expect(movers[0]?.involvement, exercise.id).toBe("direct");
    }
  });

  it("records indirect muscles rather than dropping them", () => {
    // They contribute zero volume but they are not noise: the fatigue ledger
    // needs to know a muscle was loaded even when it earned no sets.
    const squat = getExercise("back-squat");
    const indirect = squat?.muscles.filter(
      (entry) => entry.involvement === "indirect",
    );

    expect(indirect?.length).toBeGreaterThan(0);
  });

  it("explains the coding wherever it is arguable", () => {
    // Not every entry needs a note, but the two-joint cases do — a hamstring
    // coded indirect on a squat looks like an error until the note explains
    // the length cancellation.
    const squat = getExercise("back-squat");
    const hamstrings = squat?.muscles.find(
      (entry) => entry.muscleId === "hamstrings",
    );

    expect(hamstrings?.involvement).toBe("indirect");
    expect(hamstrings?.codingNote).toMatch(/length/i);
  });

  it("finds every exercise training a given muscle, in any tier", () => {
    const quadWork = exercisesForMuscle("quadriceps").map((e) => e.id);

    expect(quadWork.sort()).toEqual(["back-squat", "leg-press"]);
  });
});

describe("grouping by peak position", () => {
  it("groups every exercise exactly once", () => {
    const grouped = exercisesByPeakPosition();
    const total = [...grouped.values()].reduce(
      (sum, list) => sum + list.length,
      0,
    );

    expect(total).toBe(getAllExercises().length);
  });

  it("gives the resistance-profile concept a real example of each case", () => {
    // The concept links to exercises exemplifying each peak position. If a
    // group is empty, that section of the concept links to nothing.
    const grouped = exercisesByPeakPosition();

    for (const position of ["stretched", "mid-range", "shortened", "even"]) {
      expect(grouped.get(position)?.length, position).toBeGreaterThan(0);
    }
  });
});
