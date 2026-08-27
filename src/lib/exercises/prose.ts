import type { Exercise } from "@/lib/exercises/schema";
import { complementsFor, substitutesFor } from "@/lib/exercises/substitutions";

/**
 * Every run of glossable prose on an exercise page, in reading order.
 *
 * The order is the page's DOM order, because the seen-set consumes the first
 * occurrence and "first" is only meaningful in the order a reader meets them.
 *
 * `exercise-prose.test.ts` asserts this covers every free-text field the
 * schema carries, so a new one cannot be added to the library and silently go
 * unglossed and uncounted.
 */
export function exerciseProse(
  exercise: Exercise,
): readonly string[] {
  return [
    exercise.resistanceProfileDerivation,
    exercise.failureProtocolRationale,
    exercise.sfrRationale,
    ...exercise.setupCues,
    ...exercise.commonErrors,
    ...substitutesFor(exercise).flatMap((result) =>
      result.tradeoffs.map((tradeoff) => tradeoff.note),
    ),
    ...complementsFor(exercise).flatMap((result) =>
      result.tradeoffs.map((tradeoff) => tradeoff.note),
    ),
  ];
}
