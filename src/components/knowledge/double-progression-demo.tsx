"use client";

import { useId, useState } from "react";

import { nextDoubleProgression } from "@/lib/training/overload-levers";
import { cn } from "@/lib/utils";

/**
 * Double progression, worked.
 *
 * The rule is easy to state and easy to get wrong, and the failure modes are
 * invisible in prose — most people never see the case where hitting the top of
 * the range at 4 RIR means the load was too light all along, not that they
 * have earned a small increment.
 *
 * This runs the same `nextDoubleProgression` function the overload debt
 * tracker uses, so what the reader learns here is literally what the app will
 * later prescribe.
 */

const LOAD_KG = 60;
const RANGE_LOW = 8;
const RANGE_HIGH = 12;

const ACTION_STYLES = {
  "add-load": "border-l-chart-3",
  "add-reps": "border-l-chart-1",
  hold: "border-l-muted-foreground",
} as const;

const ACTION_LABELS = {
  "add-load": "Add load",
  "add-reps": "Add a rep",
  hold: "Repeat the session",
} as const;

export function DoubleProgressionDemo() {
  const [reps, setReps] = useState(10);
  const [rir, setRir] = useState(2);

  const prescription = nextDoubleProgression({
    loadKg: LOAD_KG,
    reps,
    repRangeLow: RANGE_LOW,
    repRangeHigh: RANGE_HIGH,
    rir,
    loadIncrementKg: 2.5,
  });

  return (
    <div className="my-8 rounded-md border border-border bg-card/50 p-4 sm:p-5">
      <h3 className="font-prose text-base font-semibold leading-tight">
        Double progression, worked
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Target: {RANGE_LOW}–{RANGE_HIGH} reps at {LOAD_KG} kg. Move the last set
        you performed and read the prescription.
      </p>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <ControlRow
          label="Reps completed"
          value={reps}
          min={5}
          max={15}
          onChange={setReps}
        />
        <ControlRow
          label="Reps in reserve"
          value={rir}
          min={0}
          max={5}
          onChange={setRir}
        />
      </div>

      <div
        className={cn(
          "mt-5 border-l-2 bg-background/60 p-4",
          ACTION_STYLES[prescription.action],
        )}
        aria-live="polite"
      >
        <p className="eyebrow mb-2">{ACTION_LABELS[prescription.action]}</p>
        <p className="font-mono text-lg tabular-nums text-foreground">
          {prescription.loadKg} kg × {prescription.targetReps} reps
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {prescription.rationale}
        </p>
      </div>
    </div>
  );
}

function ControlRow({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const id = useId();

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <label htmlFor={id} className="eyebrow">
          {label}
        </label>
        <span
          className="font-mono text-sm tabular-nums text-foreground"
          aria-hidden="true"
        >
          {value}
        </span>
      </div>
      {/*
        A native range input rather than a component-library slider. The
        platform control already has keyboard stepping, touch targets, pointer
        capture and the correct screen-reader semantics; the library version
        reimplements all of it in JavaScript that has to be shipped. Styling is
        the only thing it costs, and that is a stylesheet.
      */}
      <input
        id={id}
        type="range"
        className="range-control"
        value={value}
        min={min}
        max={max}
        step={1}
        onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
      />
    </div>
  );
}
