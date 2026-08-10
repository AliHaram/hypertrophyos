# Deferred findings

Defects and improvements found while doing something else, recorded rather than
chased. Nothing here is blocking.

---

## The `src/db` unused-export blind spot has a fix, and a trap next to it

**Status:** deferred, not attempted.

`import * as schema from "./schema"` in `src/db/index.ts` makes the whole of
`src/db` invisible to unused-export analysis — a namespace import marks every
member used by construction. Replacing it with named imports assembled into an
explicit object fixes that, and it works: `src/db` becomes analysable and knip
immediately reports 15 findings there.

**The trap, verified empirically before it bit:** 14 of those 15 are `pgEnum`
declarations, and they are *not* dead. `drizzle.config.ts` points at
`src/db/schema/index.ts`, and drizzle-kit discovers enums through that barrel's
**exported** symbols. Unexporting them takes generated migrations from **14
`CREATE TYPE` statements to 0** — producing migrations that reference enum
types nothing creates.

Typecheck, lint, the unit tests and the build all pass in that state. The only
signal is a migration that fails against a real database.

So the fix is two changes, not one:

1. Named imports in `src/db/index.ts` assembled into an explicit `schema`
   object. One line per new table; forgetting it fails loudly, because a
   relational query cannot resolve a table absent from the object.
2. The `pgEnum` exports must stay exported and be marked as consumed by
   drizzle-kit rather than by application code — the same situation as
   `tokens.ts` and `generate-tokens.mjs`, which knip resolves by declaring the
   file an entry point.

Doing (1) without (2) leaves the build green and the migrations broken.

**Reproduction of the trap:**

```
DIRECT_URL="postgresql://u:p@localhost:5432/x" pnpm exec drizzle-kit generate --name probe
grep -c "CREATE TYPE" drizzle/0000_probe.sql   # 14 with exports, 0 without
```

---

## The app shell remounts when crossing sections

**Status:** accepted for now.

Each route group applies its own surface via `SurfaceShell`, and the shell is
rendered inside that so its chrome sits on the right surface. The consequence is
that moving between `/knowledge` and `/exercises` remounts the shell rather than
preserving it.

The markup is identical across sections, so this produces no layout shift, and
the bar is static. Preserving a single shell instance would mean resolving the
surface in one layout above all sections, which needs the pathname in a server
layout — and Next does not expose it without a middleware that sets a header.

Worth revisiting if the shell gains state that should survive navigation.
