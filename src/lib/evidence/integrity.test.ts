import { describe, expect, it } from "vitest";

import {
  type CheckableExercise,
  INTEGRITY_RULES,
  IntegrityError,
  assertNoViolations,
  checkCitationsResolve,
  checkExercise,
  checkGradedSubject,
  checkOrphanedTerms,
  checkStaleOrphanRegistrations,
  checkTermUniqueness,
  formatViolations,
} from "./integrity";

/**
 * Every rule gets a crafted violation fixture and a passing counterpart.
 *
 * A checker tested only on valid input asserts nothing — it would still pass
 * if every rule body were deleted. So each block below proves the rule fires,
 * and proves it does not fire on the near-miss case.
 */

describe("rule 1 — strong requires a citation", () => {
  it("fires on a strong claim citing nothing", () => {
    const violations = checkGradedSubject({
      id: "some-concept",
      grade: "strong",
      citations: [],
    });

    expect(violations).toHaveLength(1);
    expect(violations[0]?.rule).toBe("strong-requires-citation");
  });

  it("passes when the strong claim cites something", () => {
    expect(
      checkGradedSubject({
        id: "some-concept",
        grade: "strong",
        citations: ["schoenfeld-2017-volume"],
      }),
    ).toHaveLength(0);
  });

  it("does not demand a citation from a mechanical-inference claim", () => {
    const violations = checkGradedSubject({
      id: "preacher-curl",
      grade: "mechanical-inference",
      citations: [],
      derivation:
        "Resistance acts perpendicular to the forearm at full elbow extension, where the elbow flexor moment arm is longest.",
    });

    expect(violations).toHaveLength(0);
  });
});

describe("rule 2 — mixed requires an uncertainty note", () => {
  it("fires on a mixed claim with no uncertainty", () => {
    const violations = checkGradedSubject({ id: "sfr", grade: "mixed" });

    expect(violations).toHaveLength(1);
    expect(violations[0]?.rule).toBe("mixed-requires-uncertainty");
  });

  it("passes when the note is present", () => {
    expect(
      checkGradedSubject({
        id: "sfr",
        grade: "mixed",
        uncertainty: "No validated metric exists, so this is a framework.",
      }),
    ).toHaveLength(0);
  });
});

describe("rule 3 — mechanical-inference requires a derivation", () => {
  it("fires on a mechanical claim with no derivation", () => {
    const violations = checkGradedSubject({
      id: "preacher-curl.resistanceProfile",
      grade: "mechanical-inference",
    });

    expect(violations).toHaveLength(1);
    expect(violations[0]?.rule).toBe("mechanical-requires-derivation");
    expect(violations[0]?.message).toMatch(/moment arm/);
  });

  it("passes when the mechanical basis is named", () => {
    expect(
      checkGradedSubject({
        id: "preacher-curl.resistanceProfile",
        grade: "mechanical-inference",
        derivation:
          "The pad fixes the humerus at roughly 45 degrees, so the resistance vector is closest to perpendicular near full extension.",
      }),
    ).toHaveLength(0);
  });

  it("treats an empty-string derivation as absent", () => {
    const violations = checkGradedSubject({
      id: "x",
      grade: "mechanical-inference",
      derivation: "",
    });

    expect(violations).toHaveLength(1);
  });

  it("does not demand a derivation from other grades", () => {
    for (const grade of ["strong", "weak"] as const) {
      const violations = checkGradedSubject({
        id: "x",
        grade,
        citations: ["schoenfeld-2017-volume"],
      });
      expect(
        violations.some((v) => v.rule === "mechanical-requires-derivation"),
      ).toBe(false);
    }
  });
});

describe("rule 4 — citations must resolve and be verified", () => {
  it("fires on an unknown citation id", () => {
    const violations = checkCitationsResolve("concept", ["not-a-real-paper"]);

    expect(violations).toHaveLength(1);
    expect(violations[0]?.rule).toBe("citation-must-resolve");
    expect(violations[0]?.message).toMatch(/unknown citation id/);
  });

  it("passes on a verified id from the bibliography", () => {
    expect(
      checkCitationsResolve("concept", ["pelland-2026-dose-response"]),
    ).toHaveLength(0);
  });

  it("reports every bad id, not just the first", () => {
    expect(checkCitationsResolve("concept", ["nope-1", "nope-2"])).toHaveLength(
      2,
    );
  });
});

describe("rule 5 — a glossary term resolves to one concept", () => {
  it("fires when two concepts claim the same term", () => {
    const violations = checkTermUniqueness([
      { slug: "volume-landmarks", terms: ["MEV"] },
      { slug: "progressive-overload", terms: ["mev"] },
    ]);

    expect(violations).toHaveLength(1);
    expect(violations[0]?.rule).toBe("term-must-be-unique");
  });

  it("allows one concept to claim many aliases", () => {
    expect(
      checkTermUniqueness([
        { slug: "volume-landmarks", terms: ["MEV", "minimum effective volume"] },
      ]),
    ).toHaveLength(0);
  });

  it("does not fire when the same concept repeats a term", () => {
    expect(
      checkTermUniqueness([{ slug: "a", terms: ["RIR", "rir"] }]),
    ).toHaveLength(0);
  });
});

describe("rule 6 — orphaned terms expire", () => {
  it("fires on a term whose deadline has arrived and is still unresolved", () => {
    const violations = checkOrphanedTerms(new Set(), "phase-3");

    expect(violations.some((v) => v.subject === "proximity to failure")).toBe(
      true,
    );
    expect(violations[0]?.rule).toBe("orphaned-term-past-deadline");
  });

  it("passes once a concept resolves the term", () => {
    const violations = checkOrphanedTerms(
      new Set(["proximity to failure"]),
      "phase-3",
    );

    expect(violations.some((v) => v.subject === "proximity to failure")).toBe(
      false,
    );
  });

  it("has nothing outstanding at the phase the project is actually on", () => {
    // The register and CURRENT_PHASE have to agree, and this is the assertion
    // that catches a phase bumped ahead of the content it was promising. The
    // content loader enforces the same thing at build time; this fails in
    // milliseconds instead of after a full Next build.
    expect(checkOrphanedTerms(new Set())).toEqual([]);
  });

  it("does not fire on a term whose deadline is still in the future", () => {
    const violations = checkOrphanedTerms(new Set(), "phase-2");

    expect(violations.some((v) => v.subject === "proximity to failure")).toBe(
      false,
    );
  });

  it("fires on a phase-3 term once phase 3 arrives", () => {
    const violations = checkOrphanedTerms(new Set(), "phase-3");

    expect(violations.some((v) => v.subject === "proximity to failure")).toBe(
      true,
    );
    expect(violations.some((v) => v.subject === "overload debt")).toBe(true);
  });

  it("explains why the term was deferred", () => {
    const violations = checkOrphanedTerms(new Set(), "phase-3");

    expect(violations[0]?.message).toMatch(/registered to resolve by/);
  });
});

describe("rule 8 — orphan registrations do not go stale", () => {
  it("does not fire while the term is genuinely unresolved", () => {
    expect(checkStaleOrphanRegistrations(new Set())).toHaveLength(0);
  });

  it("fires once a concept resolves a registered term", () => {
    const violations = checkStaleOrphanRegistrations(
      new Set(["proximity to failure"]),
    );

    expect(violations).toHaveLength(1);
    expect(violations[0]?.rule).toBe("orphan-registration-is-stale");
    expect(violations[0]?.subject).toBe("proximity to failure");
  });

  it("says to delete the entry rather than leaving it satisfied", () => {
    const violations = checkStaleOrphanRegistrations(
      new Set(["proximity to failure"]),
    );

    expect(violations[0]?.message).toMatch(/stale and should be deleted/);
  });

  it("fires independently of the phase deadline", () => {
    // The point of the pair: rule 6 asks whether a promise is overdue, rule 8
    // asks whether it has been kept. A term resolved early is stale
    // immediately, not at its deadline.
    const resolved = new Set(["overload debt"]);

    expect(checkOrphanedTerms(resolved, "phase-1")).toHaveLength(0);
    expect(checkStaleOrphanRegistrations(resolved)).toHaveLength(1);
  });
});

describe("rule 7 — exercises carry graded evidence-bearing fields", () => {
  function validExercise(): CheckableExercise {
    return {
      id: "preacher-curl",
      primeMover: { grade: "mechanical-inference", derivation: "d", muscleId: "biceps" },
      muscleInvolvement: {
        grade: "mechanical-inference",
        derivation: "d",
        entries: [{ muscleId: "biceps", involvement: "direct" }],
      },
      resistanceProfile: {
        grade: "mechanical-inference",
        derivation: "d",
        samples: [1, 0.9],
      },
      failureProtocol: {
        grade: "mechanical-inference",
        derivation: "d",
        protocol: "true_failure_safe",
      },
      sfr: {
        grade: "mechanical-inference",
        derivation: "d",
        rating: 4,
        reasoning: "Low stabilisation demand; the pad removes torso involvement.",
      },
    };
  }

  it("passes a fully specified exercise", () => {
    expect(checkExercise(validExercise())).toHaveLength(0);
  });

  it.each([
    "primeMover",
    "muscleInvolvement",
    "resistanceProfile",
    "failureProtocol",
    "sfr",
  ] as const)("fires when %s is missing", (field) => {
    const exercise = validExercise();
    delete exercise[field];

    const violations = checkExercise(exercise);

    expect(violations.some((v) => v.message.includes(field))).toBe(true);
    expect(violations[0]?.rule).toBe("exercise-requires-graded-fields");
  });

  it("fires when a present field carries no grade", () => {
    const exercise = validExercise();
    // @ts-expect-error deliberately stripping the grade
    exercise.sfr = { rating: 4, reasoning: "x" };

    expect(
      checkExercise(exercise).some((v) => v.message.includes("no evidence grade")),
    ).toBe(true);
  });

  it("fires when a mechanical-inference field omits its derivation", () => {
    const exercise = validExercise();
    exercise.resistanceProfile = {
      grade: "mechanical-inference",
      samples: [1, 0.9],
    };

    expect(
      checkExercise(exercise).some((v) => v.message.includes("derivation")),
    ).toBe(true);
  });

  it("fires when involvement coding lists no muscles", () => {
    const exercise = validExercise();
    exercise.muscleInvolvement = {
      grade: "mechanical-inference",
      derivation: "d",
      entries: [],
    };

    expect(
      checkExercise(exercise).some((v) => v.message.includes("codes no muscles")),
    ).toBe(true);
  });

  it("fires on an SFR rating outside 1–5", () => {
    const exercise = validExercise();
    exercise.sfr = {
      grade: "mechanical-inference",
      derivation: "d",
      rating: 7,
      reasoning: "x",
    };

    expect(
      checkExercise(exercise).some((v) => v.message.includes("outside the 1–5")),
    ).toBe(true);
  });

  it("fires on an SFR rating with no reasoning", () => {
    const exercise = validExercise();
    exercise.sfr = {
      grade: "mechanical-inference",
      derivation: "d",
      rating: 4,
    };

    expect(
      checkExercise(exercise).some((v) => v.message.includes("no reasoning")),
    ).toBe(true);
  });

  it("attributes field-level violations to the exercise, not the field path", () => {
    const exercise = validExercise();
    exercise.sfr = { grade: "mechanical-inference", rating: 4, reasoning: "x" };

    for (const violation of checkExercise(exercise)) {
      expect(violation.subject).toBe("preacher-curl");
    }
  });
});

describe("reporting", () => {
  it("documents every rule id it can emit", () => {
    const ids = Object.keys(INTEGRITY_RULES);

    expect(ids).toHaveLength(8);
    for (const description of Object.values(INTEGRITY_RULES)) {
      expect(description.length).toBeGreaterThan(20);
    }
  });

  it("groups violations by rule in the message", () => {
    const message = formatViolations([
      { rule: "strong-requires-citation", subject: "a", message: "m1" },
      { rule: "strong-requires-citation", subject: "b", message: "m2" },
      { rule: "mixed-requires-uncertainty", subject: "c", message: "m3" },
    ]);

    expect(message).toMatch(/3 violations/);
    expect(message).toMatch(/\[strong-requires-citation\]/);
    expect(message).toMatch(/\[mixed-requires-uncertainty\]/);
  });

  it("uses the singular for one violation", () => {
    expect(
      formatViolations([
        { rule: "term-must-be-unique", subject: "a", message: "m" },
      ]),
    ).toMatch(/\(1 violation\)/);
  });

  it("throws IntegrityError when violations exist", () => {
    expect(() =>
      assertNoViolations([
        { rule: "term-must-be-unique", subject: "a", message: "m" },
      ]),
    ).toThrow(IntegrityError);
  });

  it("does not throw on a clean run", () => {
    expect(() => assertNoViolations([])).not.toThrow();
  });
});
