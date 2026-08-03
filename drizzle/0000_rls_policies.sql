-- Row-level security.
--
-- Applied after `pnpm db:push` generates the tables. Drizzle manages schema;
-- this file manages access, because drizzle-kit does not diff policies and a
-- silently-dropped policy is a data leak.
--
--   psql "$DIRECT_URL" -f drizzle/0000_rls_policies.sql
--
-- The model is simple and uniform: a row is visible to the user whose id is in
-- its user_id column, and to nobody else. Content tables are world-readable
-- because they contain no user data. The Whoop token table is readable by
-- nobody — only the service role, which bypasses RLS entirely, may touch it.

-- ---------------------------------------------------------------------------
-- User-owned tables
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'bodyweight_logs',
    'water_logs',
    'programs',
    'workouts',
    'rir_calibrations',
    'volume_landmarks',
    'overload_debt',
    'whoop_recovery',
    'whoop_sleep',
    'whoop_cycles'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_owner', t);
    execute format(
      'create policy %I on public.%I for all
         using (auth.uid() = user_id)
         with check (auth.uid() = user_id)',
      t || '_owner', t
    );
  end loop;
end $$;

-- Profiles key on `id` rather than `user_id`.
alter table public.profiles enable row level security;
drop policy if exists profiles_owner on public.profiles;
create policy profiles_owner on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- Tables owned through a parent
-- ---------------------------------------------------------------------------

-- Mesocycles belong to a program, which belongs to a user.
alter table public.mesocycles enable row level security;
drop policy if exists mesocycles_owner on public.mesocycles;
create policy mesocycles_owner on public.mesocycles
  for all
  using (
    exists (
      select 1 from public.programs p
      where p.id = mesocycles.program_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.programs p
      where p.id = mesocycles.program_id and p.user_id = auth.uid()
    )
  );

-- Sets belong to a workout, which belongs to a user.
alter table public.workout_sets enable row level security;
drop policy if exists workout_sets_owner on public.workout_sets;
create policy workout_sets_owner on public.workout_sets
  for all
  using (
    exists (
      select 1 from public.workouts w
      where w.id = workout_sets.workout_id and w.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workouts w
      where w.id = workout_sets.workout_id and w.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Whoop OAuth tokens: no client access at all
-- ---------------------------------------------------------------------------

-- RLS is enabled with no permissive policy, which denies every request from
-- `anon` and `authenticated`. Only the service role reaches this table, and it
-- is only ever read server-side to refresh or call the Whoop API.
alter table public.whoop_connections enable row level security;
drop policy if exists whoop_connections_owner on public.whoop_connections;
revoke all on public.whoop_connections from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Reference and content tables: readable by all, writable by none
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'muscles',
    'exercises',
    'exercise_muscles',
    'concepts',
    'citations',
    'glossary_terms',
    'concept_citations'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format(
      'create policy %I on public.%I for select using (true)', t || '_read', t
    );
    -- Writes happen through the sync script and seeds, which use the service
    -- role. No insert/update/delete policy exists for ordinary users.
    execute format('revoke insert, update, delete on public.%I from anon, authenticated', t);
  end loop;
end $$;
