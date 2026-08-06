import { z } from "zod";

/**
 * The muscle registry.
 *
 * Deliberately coarser than an anatomy textbook. The unit here is "a thing a
 * training programme can allocate sets to", which is not the same as a muscle
 * belly: nobody programmes for vastus intermedius separately, and pretending
 * the model can distinguish it would imply a resolution the volume maths does
 * not have.
 *
 * Where a distinction *does* change a programming decision, it is kept. The
 * gastrocnemius is separate from the soleus because one crosses the knee and
 * the other does not, which is why a seated calf raise and a standing one are
 * not substitutes. The long head of the triceps is not separated, because no
 * decision in this app currently turns on it — when one does, it can be split.
 *
 * `region` groups muscles for the body map. `svgPathId` is the hook for the
 * anatomical atlas, which is deferred: sourcing a correct, correctly-licensed
 * SVG is illustration work rather than engineering, and generated path data
 * would read as amateur on a product whose claim is rigour. Recorded as null
 * rather than omitted so the column's consumer is obvious when it arrives.
 */

const MUSCLE_REGIONS = [
  "legs",
  "hips",
  "back",
  "chest",
  "shoulders",
  "arms",
  "trunk",
] as const;

const muscleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  region: z.enum(MUSCLE_REGIONS),
  svgPathId: z.string().min(1).nullable(),
});

export type Muscle = z.infer<typeof muscleSchema>;

const RECORDS = [
  // --- Legs ---------------------------------------------------------------
  { id: "quadriceps", name: "Quadriceps", region: "legs", svgPathId: null },
  { id: "hamstrings", name: "Hamstrings", region: "legs", svgPathId: null },
  {
    id: "gastrocnemius",
    name: "Gastrocnemius",
    region: "legs",
    svgPathId: null,
  },
  { id: "soleus", name: "Soleus", region: "legs", svgPathId: null },

  // --- Hips ---------------------------------------------------------------
  {
    id: "gluteus-maximus",
    name: "Gluteus maximus",
    region: "hips",
    svgPathId: null,
  },
  {
    id: "adductor-magnus",
    name: "Adductor magnus",
    region: "hips",
    svgPathId: null,
  },

  // --- Back ---------------------------------------------------------------
  {
    id: "latissimus-dorsi",
    name: "Latissimus dorsi",
    region: "back",
    svgPathId: null,
  },
  {
    id: "trapezius-middle",
    name: "Mid trapezius",
    region: "back",
    svgPathId: null,
  },
  {
    id: "trapezius-upper",
    name: "Upper trapezius",
    region: "back",
    svgPathId: null,
  },
  { id: "rhomboids", name: "Rhomboids", region: "back", svgPathId: null },
  {
    id: "erector-spinae",
    name: "Erector spinae",
    region: "back",
    svgPathId: null,
  },

  // --- Chest --------------------------------------------------------------
  {
    id: "pectoralis-major",
    name: "Pectoralis major",
    region: "chest",
    svgPathId: null,
  },

  // --- Shoulders ----------------------------------------------------------
  {
    id: "anterior-deltoid",
    name: "Anterior deltoid",
    region: "shoulders",
    svgPathId: null,
  },
  {
    id: "lateral-deltoid",
    name: "Lateral deltoid",
    region: "shoulders",
    svgPathId: null,
  },
  {
    id: "posterior-deltoid",
    name: "Posterior deltoid",
    region: "shoulders",
    svgPathId: null,
  },

  // --- Arms ---------------------------------------------------------------
  {
    id: "biceps-brachii",
    name: "Biceps brachii",
    region: "arms",
    svgPathId: null,
  },
  {
    id: "triceps-brachii",
    name: "Triceps brachii",
    region: "arms",
    svgPathId: null,
  },
  {
    id: "forearm-flexors",
    name: "Forearm flexors",
    region: "arms",
    svgPathId: null,
  },
] as const satisfies readonly Muscle[];

export const MUSCLES: Record<string, Muscle> = Object.fromEntries(
  RECORDS.map((record) => [record.id, muscleSchema.parse(record)]),
);

/** Display name for a muscle id, throwing on an id the registry does not know. */
export function muscleName(id: string): string {
  const muscle = MUSCLES[id];
  if (!muscle) {
    throw new Error(
      `Unknown muscle id "${id}". Add it to src/lib/exercises/muscles.ts — a coding that names a muscle the registry has never heard of cannot be rendered or counted.`,
    );
  }
  return muscle.name;
}
