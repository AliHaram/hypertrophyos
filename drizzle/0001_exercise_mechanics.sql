-- Exercise mechanics: the Part C model.
--
-- Forward-only. Run before the RLS file, which is unchanged by this migration:
-- no table is added or removed, so `exercises`, `exercise_muscles` and
-- `muscles` keep the read-only content policies granted in 0000.
--
--   psql "$DIRECT_URL" -f drizzle/0001_exercise_mechanics.sql
--
-- What changes and why:
--
--   * `resistance_profile` stops being an enum and becomes the eleven-sample
--     curve. The categorical axis moves to `peak_position`, named for the
--     position rather than the shape — "ascending strength curve" conventionally
--     means hardest at the *stretch*, and Phase 1's enum documented `ascending`
--     as hardest near the shortened position. Naming the position removes the
--     ambiguity rather than picking a side of it.
--   * `failure_protocol` gains a fourth value. Phase 1 collapsed "stop when form
--     degrades" and "never approach failure at all" into one label; those are
--     different instructions and a squat and a leg press must not share one.
--   * `length_tension_position` becomes `muscle_length_at_peak_tension`, which
--     is what it always measured.
--   * Adds axial load, stability demand, unilateral, equipment as an enum, and
--     the two rationale columns that make the graded fields legible.

begin;

-- ---------------------------------------------------------------------------
-- Guard
-- ---------------------------------------------------------------------------

-- Several columns arrive NOT NULL with no default, because there is no honest
-- default for a resistance curve or a safety rationale. The library is seeded
-- in this phase, so the table is empty and that is fine — but if it is not, the
-- migration must say so in words rather than surfacing as a constraint error.
do $$
begin
  if exists (select 1 from public.exercises) then
    raise exception
      'exercises is not empty. This migration adds NOT NULL mechanics columns with no default; backfill them explicitly before running it.';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.peak_position as enum (
  'stretched', 'mid-range', 'shortened', 'even'
);

create type public.axial_load as enum ('none', 'low', 'moderate', 'high');

create type public.stability_demand as enum ('low', 'moderate', 'high');

create type public.equipment as enum (
  'barbell', 'dumbbell', 'machine', 'cable', 'smith-machine', 'bodyweight', 'band'
);

-- Renames rather than a new type, so any stored value moves with its meaning.
alter type public.failure_protocol
  rename value 'true-concentric-safe' to 'true-failure-safe';
alter type public.failure_protocol
  rename value 'spotter-required' to 'failure-with-safety-setup';
alter type public.failure_protocol
  rename value 'technical-limit-only' to 'terminate-at-form-breakdown';

alter type public.length_tension_position rename value 'mid-range' to 'mid';
alter type public.length_tension_position
  rename to muscle_length_at_peak_tension;

-- ---------------------------------------------------------------------------
-- exercises: the categorical mechanics axis
-- ---------------------------------------------------------------------------

alter table public.exercises
  rename column length_tension_position to muscle_length_at_peak_tension;

alter table public.exercises add column peak_position public.peak_position;

-- Mapped by Phase 1's own documented meanings, not by the conventional reading
-- of the words, because that is what the stored rows meant.
update public.exercises
set peak_position = (
  case resistance_profile::text
    when 'ascending' then 'shortened'
    when 'descending' then 'stretched'
    when 'bell-shaped' then 'mid-range'
    when 'flat' then 'even'
  end
)::public.peak_position;

drop index if exists public.exercises_profile_idx;
drop index if exists public.exercises_length_idx;

alter table public.exercises drop column resistance_profile;
drop type public.resistance_profile;

alter table public.exercises alter column peak_position set not null;

-- ---------------------------------------------------------------------------
-- exercises: the curve takes the freed name
-- ---------------------------------------------------------------------------

alter table public.exercises
  rename column resistance_curve to resistance_profile;

-- Phase 1 sampled from shortened to lengthened; the new convention reads in the
-- direction of the concentric, so sample 0 is the fully lengthened position.
update public.exercises
set resistance_profile = (
  select array_agg(value order by ordinality desc)
  from unnest(resistance_profile) with ordinality as sample(value, ordinality)
)
where resistance_profile is not null;

alter table public.exercises
  alter column resistance_profile set not null;

-- ---------------------------------------------------------------------------
-- exercises: new columns
-- ---------------------------------------------------------------------------

-- The rationale this column already held was always about the failure
-- protocol; the name now says so.
alter table public.exercises
  rename column failure_notes to failure_protocol_rationale;

alter table public.exercises
  add column resistance_profile_derivation text not null,
  add column axial_load public.axial_load not null,
  add column stability_demand public.stability_demand not null,
  add column unilateral boolean not null default false;

alter table public.exercises
  alter column equipment type public.equipment using equipment::public.equipment;

-- ---------------------------------------------------------------------------
-- exercises: constraints
-- ---------------------------------------------------------------------------

alter table public.exercises
  add constraint exercises_sfr_range
    check (sfr_rating between 1 and 5),
  add constraint exercises_profile_samples
    check (array_length(resistance_profile, 1) = 11),
  -- The peak must actually be present, or "normalised to 1.0" is a comment
  -- rather than a property. That every other sample also falls in 0-1 is
  -- enforced by Zod at the boundary: a CHECK cannot contain a subquery, and
  -- unnest needs one.
  add constraint exercises_profile_normalised
    check (1.0 = any(resistance_profile)),
  add constraint exercises_setup_cues_count
    check (array_length(setup_cues, 1) between 3 and 5),
  add constraint exercises_common_errors_count
    check (array_length(common_errors, 1) between 2 and 3);

create index exercises_peak_position_idx
  on public.exercises (peak_position);
create index exercises_muscle_length_idx
  on public.exercises (muscle_length_at_peak_tension);
create index exercises_equipment_idx
  on public.exercises (equipment);

-- ---------------------------------------------------------------------------
-- exercise_muscles: the prime mover
-- ---------------------------------------------------------------------------

alter table public.exercise_muscles
  add column prime_mover boolean not null default false;

-- At most one prime mover per exercise. A CHECK cannot see sibling rows, and
-- the substitution engine's first matching pass is meaningless if an exercise
-- has two prime movers.
create unique index exercise_muscles_one_prime_mover
  on public.exercise_muscles (exercise_id)
  where prime_mover;

commit;

-- ---------------------------------------------------------------------------
-- Run separately
-- ---------------------------------------------------------------------------
--
-- ALTER TYPE ... ADD VALUE cannot be used in the same transaction that then
-- reads the new value. Kept out of the block above so the migration stays
-- re-runnable rather than half-applied.

alter type public.failure_protocol add value if not exists 'never-to-failure';
