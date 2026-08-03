import { describe, expect, it } from "vitest";

import {
  OVERLOAD_LEVERS,
  type DoubleProgressionState,
  getLever,
  nextDoubleProgression,
} from "./overload-levers";

function state(
  overrides: Partial<DoubleProgressionState> = {},
): DoubleProgressionState {
  return {
    loadKg: 60,
    reps: 8,
    repRangeLow: 8,
    repRangeHigh: 12,
    rir: 2,
    loadIncrementKg: 2.5,
    ...overrides,
  };
}

describe("OVERLOAD_LEVERS", () => {
  it("covers all six levers", () => {
    expect(OVERLOAD_LEVERS).toHaveLength(6);
  });

  it("is ordered by descending hypertrophy potency", () => {
    const potencies = OVERLOAD_LEVERS.map((lever) => lever.potency);
    expect([...potencies].sort((a, b) => b - a)).toEqual(potencies);
  });

  it("ranks density last, since the direct evidence runs against it", () => {
    expect(OVERLOAD_LEVERS.at(-1)?.id).toBe("density");
  });

  it("gives every lever a stated cost — no lever is free", () => {
    for (const lever of OVERLOAD_LEVERS) {
      expect(lever.cost.length).toBeGreaterThan(20);
    }
  });

  it("throws on an unknown lever rather than returning undefined", () => {
    // @ts-expect-error deliberately invalid id
    expect(() => getLever("cardio")).toThrow(/Unknown overload lever/);
  });
});

describe("nextDoubleProgression", () => {
  it("adds load once the top of the range is hit at a genuine 1 RIR", () => {
    const result = nextDoubleProgression(
      state({ reps: 12, rir: 1, loadKg: 60 }),
    );

    expect(result.action).toBe("add-load");
    expect(result.loadKg).toBe(62.5);
    expect(result.targetReps).toBe(8);
  });

  it("adds load at the top of the range even at 0 RIR", () => {
    expect(nextDoubleProgression(state({ reps: 12, rir: 0 })).action).toBe(
      "add-load",
    );
  });

  it("makes a double jump when the top of the range came too easily", () => {
    const result = nextDoubleProgression(state({ reps: 12, rir: 4 }));

    expect(result.action).toBe("add-load");
    expect(result.loadKg).toBe(65);
    expect(result.rationale).toMatch(/too light/);
  });

  it("adds a rep mid-range rather than jumping load", () => {
    const result = nextDoubleProgression(state({ reps: 9, rir: 2 }));

    expect(result.action).toBe("add-reps");
    expect(result.loadKg).toBe(60);
    expect(result.targetReps).toBe(10);
  });

  it("holds when the set was not hard enough to build on", () => {
    const result = nextDoubleProgression(state({ reps: 9, rir: 4 }));

    expect(result.action).toBe("hold");
    expect(result.targetReps).toBe(9);
  });

  it("treats reps beyond the top of the range as still warranting load", () => {
    expect(nextDoubleProgression(state({ reps: 15, rir: 1 })).action).toBe(
      "add-load",
    );
  });

  it("handles a single-rep range where low equals high", () => {
    const result = nextDoubleProgression(
      state({ reps: 5, repRangeLow: 5, repRangeHigh: 5, rir: 1 }),
    );

    expect(result.action).toBe("add-load");
    expect(result.targetReps).toBe(5);
  });

  it("rejects an inverted rep range", () => {
    expect(() =>
      nextDoubleProgression(state({ repRangeLow: 12, repRangeHigh: 8 })),
    ).toThrow(RangeError);
  });

  it("always explains itself", () => {
    const cases = [
      state({ reps: 12, rir: 1 }),
      state({ reps: 12, rir: 4 }),
      state({ reps: 9, rir: 2 }),
      state({ reps: 9, rir: 4 }),
    ];

    for (const testCase of cases) {
      expect(nextDoubleProgression(testCase).rationale.length).toBeGreaterThan(
        30,
      );
    }
  });
});
