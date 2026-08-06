import {
  type ProfileSeries,
  ResistanceProfileChart,
} from "@/components/charts/resistance-profile-chart";
import { getAllExercises } from "@/lib/exercises/library";
import type { PeakPosition } from "@/lib/exercises/schema";

/**
 * Two real curves from opposite ends of the range, overlaid.
 *
 * The argument for modelling peak position at all is hard to make in prose and
 * immediate as a picture: two movements that both "train the shoulders" or both
 * "train the hamstrings" can load completely different parts of the range, and
 * a programme that stacks two of the same shape leaves half the range untrained.
 *
 * The pair is selected from the library rather than named, so this cannot drift
 * out of agreement with the exercise pages. If the library ever stops holding a
 * contrasting pair, the component renders whatever it does have rather than a
 * comparison that is no longer a contrast.
 */

function firstWithPeak(position: PeakPosition) {
  return getAllExercises().find(
    (exercise) => exercise.peakPosition === position,
  );
}

function toSeries(exercise: {
  id: string;
  name: string;
  resistanceProfile: readonly number[];
  peakPosition: PeakPosition;
}): ProfileSeries {
  return {
    id: exercise.id,
    name: exercise.name,
    samples: exercise.resistanceProfile,
    peakPosition: exercise.peakPosition,
  };
}

export function ResistanceProfileComparison() {
  // Opposite ends first; fall back through the middle so the figure degrades
  // to something honest rather than to nothing.
  const stretched = firstWithPeak("stretched");
  const shortened =
    firstWithPeak("shortened") ?? firstWithPeak("mid-range") ?? firstWithPeak("even");

  const series = [stretched, shortened]
    .filter((exercise) => exercise !== undefined)
    .map(toSeries);

  if (series.length === 0) return null;

  return (
    <ResistanceProfileChart
      series={series}
      title="The same range, loaded from opposite ends"
      subtitle="Two exercises from the library, overlaid. Both are hard sets; they are hard in different places, and that difference is what the profile encodes."
    />
  );
}
