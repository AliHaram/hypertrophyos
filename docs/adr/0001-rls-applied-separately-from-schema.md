# 0001 — Row-level security is applied separately from schema migrations

- **Status:** Accepted
- **Date:** 2026-08-03 (backfilled 2026-08-04)
- **Phase:** 1

## Context

The app stores encrypted Whoop OAuth tokens, workout history, bodyweight logs,
and — from Phase 6 — progress photos. Every one of those is per-user data where
a missing `where user_id = …` is a disclosure, not a bug.

Supabase provides row-level security for exactly this. Drizzle manages our
schema. The question was where RLS policies should live.

The obvious answer is "in the Drizzle schema, next to the tables." It is wrong
for a specific mechanical reason: `drizzle-kit` does not diff RLS policies. A
schema push that recreates a table drops its policies, and `drizzle-kit` will
report success. The failure is silent, and the symptom is a table that is
readable by every authenticated user.

## Decision

Schema lives in `src/db/schema/*.ts` and is pushed with `drizzle-kit push`.
Policies live in `drizzle/*.sql` and are applied deliberately with `psql`.

The policy file is idempotent — every statement is `drop policy if exists`
followed by `create policy` — so re-running it after any schema change restores
the full policy set.

The access model is uniform:

- User-owned tables: visible only where `auth.uid() = user_id`.
- Tables owned through a parent (`mesocycles`, `workout_sets`): an `exists`
  subquery against the parent's owner.
- `whoop_connections`: RLS enabled with **no permissive policy**, plus an
  explicit `revoke` from `anon` and `authenticated`. Only the service role,
  which bypasses RLS, may read tokens.
- Reference and content tables: world-readable, writable only by the service
  role.

## Consequences

**Good.** A dropped policy cannot pass unnoticed, because restoring policies is
an explicit step rather than an implicit side effect. The token table's
deny-all posture is visible in one place.

**Bad.** Two commands instead of one, and the second is easy to forget. This is
mitigated by documenting the sequence in the README and, from Phase 2, by CI
asserting that every table carrying a `user_id` column has a policy.

**Rejected alternative.** Drizzle's `pgPolicy` helper exists, but it is subject
to the same diffing gap — it generates policies on create and does not detect
drift. It would have given the appearance of co-located safety without the
substance.
