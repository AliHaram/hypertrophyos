# Information architecture

The route map. Every route that exists, every route Phases 3–6 will add, and
the hierarchy connecting them.

This document exists because the app reached seven pages with no navigation
between them. Every route was built in isolation and the only way to reach one
was to type it. Navigation built without a map becomes a list of links someone
appends to forever, so the map comes first and the components render from it.

**The rule this document establishes: navigation renders from
`src/lib/navigation/routes.ts`. There are no hand-written `<Link>` lists in a
layout.** A route that is not in `NAV` is not reachable, and CI says so.

---

## 1. What is actually on disk

Seven route patterns, twenty-one URLs, after the exercise slice landed.
Verified against `src/app`, not against the plan.

| Route | File | Surface | Notes |
|---|---|---|---|
| `/` | `app/page.tsx` | dark → light | Landing. Opens with a graded claim in a gutter. Surface changes in D5. |
| `/knowledge` | `app/knowledge/page.tsx` | light | Index, grouped by category, with a "not yet written" block. |
| `/knowledge/[slug]` | `app/knowledge/[slug]/page.tsx` | light | 8 concepts in `content/concepts/`. |
| `/citations` | `app/citations/page.tsx` | light | Bibliography, 18 records. 308 from the old path. |
| `/exercises` | `app/exercises/page.tsx` | light | Index with a search-param filter rail. |
| `/exercises/[slug]` | `app/exercises/[slug]/page.tsx` | light | 8 exercises, statically generated. |
| `/design` | `app/design/page.tsx` | dark | Internal system gallery. |

Cross-links that now exist: landing → knowledge/citations, knowledge →
citations, concept → related concepts, concept → exercises (per peak position,
derived), citation → citing concepts, exercise → concepts it depends on,
exercise → substitutes and complements (derived and ranked).

**There is still no shell, no primary navigation, and no way to discover
`/design` or reach `/exercises` from anywhere except a concept page.** That is
what Part D is for.

### Corrections to the brief's assumed shape

The brief sketched a route map to be corrected against disk. Corrected, with
what the slice then changed:

- **`/exercises` did not exist in any form.** The schema, the Postgres tables
  and `drizzle/0001_exercise_mechanics.sql` were written; there were **zero
  exercise records**. Phase 2 modelled the library and did not populate it.
  *Now: eight authored entries, both routes live.*
- **There was no substitution engine.** *Now: `lib/exercises/substitutions.ts`,
  ranked with explicit tradeoffs, plus the inverse complement query.*
- **There was no resistance-profile concept** — a registered orphaned term due
  `phase-2`. *Now written; the register entry is deleted and `CURRENT_PHASE` is
  `phase-2`.*
- **`/citations` was at `/knowledge/citations`.** *Now moved, with a tested 308.
  See ADR 0005.*
- **`/glossary` did not exist**, but was derivable. *Now built (D4.2): every
  alias in one alphabetical sequence, filterable by grade, with orphaned terms
  listed against their phase and "used in" derived by running the same remark
  pass the pages themselves use.*
- **There is no anatomical map component**, and no SVG body data anywhere in
  `src/` or `public/`. `muscles.svgPathId` is a column with no consumer.
  **Deferred deliberately** — see §8.
- The product is named **HypertrophyOS** (`package.json`, root metadata). The
  repository directory is `MuscleTheory`; the product name is what ships.

---

## 2. Sections

Four primary sections, plus utility routes that live in shell chrome rather
than in primary navigation.

Sections are grouped by **what the user is doing**, not by data model. The
split that matters is logging in the moment versus reading afterwards — those
are different postures, different surfaces, and in the gym, different hands.

### Train — *log what you did*

| Route | Status | Phase | Surface |
|---|---|---|---|
| `/train` | planned | phase-3 | dark |
| `/water` | planned | phase-5 | dark |

The logger. Dark surface, `condensed` density — a thumb with chalk on it
matters more than elegance. `/water` is daily hydration logging; `water_logs`
sits in `db/schema/identity.ts` keyed by user and day, which is what places it
here rather than under Dashboard: it is something you record, not something you
analyse.

> `/water`'s section assignment is the one I am least confident in. It is a
> recovery input, so it could equally belong beside the Whoop-derived readiness
> data under Dashboard. Nothing on disk settles it. Flagged for review; it
> costs one line in `NAV` to move.

### Dashboard — *read what it means*

| Route | Status | Phase | Surface |
|---|---|---|---|
| `/dashboard` | planned | phase-4 | dark |
| `/progress` | planned | phase-4 | dark |
| `/review` | planned | phase-3 | dark |

Per-muscle volume against landmarks, long-term progression, and session review.
`/review` is dated phase-3 rather than phase-4 because it is the RIR
calibration surface — `rirCalibrations` is already in `db/schema/training.ts`,
and `orphaned-terms.ts` dates the calibration trainer to phase-3 explicitly.

### Exercises — *what to do and why it was chosen*

| Route | Status | Phase | Surface |
|---|---|---|---|
| `/exercises` | live (this part) | — | light |
| `/exercises/[slug]` | live (this part) | — | light |
| `/exercises/compare` | planned | phase-3 | light |

Light surface: this is reference reading, not in-gym operation.
`ROUTE_SURFACE` in `lib/design/surface.ts` already declares `/exercises` as
light, ahead of the routes existing.

`/exercises/compare` is deferred. The multi-series resistance-profile curve
that the comparison view needs is being built in this part regardless — it
appears overlaid on the landing page — so the route is close to free later.

### Knowledge — *the reasoning underneath all of it*

| Route | Status | Phase | Surface |
|---|---|---|---|
| `/knowledge` | live | — | light |
| `/knowledge/[slug]` | live | — | light |
| `/glossary` | live (this part) | — | light |
| `/citations` | live (this part) | — | light |

Paper-light throughout, because long-form reading in dark mode is worse and the
design principles say so out loud.

`/citations` and `/glossary` sit in the Knowledge *section* while being
app-wide *infrastructure* — exercise details, cues, and later the
autoregulation explanations all point at them. That tension is real and is
resolved in the ADR: the section grouping is for navigation, the URL is at root
because four sections cite it.

### Utility — shell chrome, not primary navigation

| Route | Status | Phase | Surface | Where it appears |
|---|---|---|---|---|
| `/settings` | planned | phase-6 | dark | Shell chrome |
| `/design` | live | — | dark | Shell chrome, internal |

Neither belongs on a bottom bar competing for a thumb with the logger.
`/design` is the design system's test suite and is currently unreachable
without typing the URL — it gets a chrome link so it stops rotting unseen.

---

## 3. Section order, and a tradeoff worth stating

Primary navigation renders in product order: **Train · Dashboard · Exercises ·
Knowledge**.

Today that means the first two items are visibly disabled and the two live
sections sit third and fourth. That is deliberate. The brief asks that users be
able to see the shape of the product, and ordering by what happens to be built
this month would both misrepresent the product and require reordering at Phase
3 and again at Phase 4.

The cost is real on mobile, where a four-item bottom bar would give half its
thumb real estate to routes that do nothing.

**Resolution:** the desktop top bar shows all four in product order. The
**mobile bottom bar renders live sections only** — Exercises and Knowledge —
and the planned sections appear in product order in an "Coming in Phase 3–6"
block on `/` and in the shell's overflow. A disabled tap target on a thumb-sized
bar is worse than an honest omission that is disclosed elsewhere.

> Flagging this rather than deciding it silently: the brief says planned
> sections should "render as visibly disabled with a tooltip naming the phase,
> rather than being absent." I am honouring that on desktop and departing from
> it on the mobile bar specifically, for the thumb-reach reason above. A tooltip
> on a touch device has no hover state to trigger it, so the disabled-plus-
> tooltip pattern degrades to a dead target with no explanation — which is worse
> than either alternative. If you want it uniform, say so and I will render all
> four everywhere.

---

## 4. The `NAV` structure

`src/lib/navigation/routes.ts`. Typed, exhaustive, and the only source
navigation reads from.

```ts
import type { Phase } from "@/lib/content/orphaned-terms";
import type { Surface } from "@/lib/design/surface";

/** Where a node renders. Not every route is a nav link. */
type Visibility =
  | "primary"   // top bar on desktop, bottom bar on mobile
  | "utility"   // shell chrome — settings, design gallery
  | "contextual"; // reachable only from within a section; breadcrumbs only

type RouteStatus =
  | { kind: "live" }
  | { kind: "planned"; phase: Phase };  // phase is not optional

interface RouteNode {
  /** Route pattern as Next writes it: "/exercises/[slug]". */
  pattern: string;
  label: string;
  /** One line, used by the command palette and the planned-state tooltip. */
  blurb: string;
  status: RouteStatus;
  visibility: Visibility;
  surface: Surface;
  /** True for [slug] routes: excluded from link lists, used for breadcrumbs. */
  dynamic?: boolean;
  children?: RouteNode[];
}

export const NAV: readonly RouteNode[];

/**
 * Routes with a page.tsx that deliberately do not appear in NAV.
 * Currently empty — every route is navigable. Entries require a reason.
 */
export const UNLISTED: readonly { pattern: string; reason: string }[] = [];
```

Making `phase` non-optional inside the `planned` variant is the point of the
discriminated union: a planned route with no phase renders a tooltip that says
nothing, and the type system should not permit it.

`Phase` is imported from `orphaned-terms.ts` rather than redeclared. The
orphaned-term register and the route map are both promises about when something
lands, and they should not be able to disagree about what a phase is called.

### Derived helpers

- `breadcrumbsFor(pathname, leafLabel?)` — walks `NAV` and returns the trail.
  Dynamic segments take `leafLabel` from the page, because `NAV` is static and
  cannot know a concept's title. Breadcrumbs are never hand-assembled.
- `sectionFor(pathname)` — the active primary section, for nav weighting.
- `secondaryFor(pathname)` — the sibling routes for the contextual rail.
- `surfaceFor(pathname)` — replaces the hand-maintained `ROUTE_SURFACE` map
  (see §6).

---

## 5. The orphan-route check

`scripts/check-route-map.mjs`, wired into CI after `pnpm lint`.

> **Not built as of D4.** This section describes a gate that does not exist. D2
> shipped the nav bar under an explicit "no new gates" instruction and the
> check was never written; D4 stayed inside its own scope rather than picking
> it up. `/glossary` was added to `NAV` by hand, and nothing would have caught
> it if it had not been. A document describing a checker that is not running is
> the same defect one level up that ADR 0006 is about, so it is flagged here
> rather than left reading as though it were live.

It walks `src/app`, finds every `page.tsx`, and converts its directory path to a
route pattern — stripping route groups `(...)`, preserving `[slug]` and
`[...catch]`. Then two assertions, in both directions:

1. **Every route pattern appears in `NAV` or in `UNLISTED`.** This is the check
   the brief asked for. Orphan routes are how this problem recurs.
2. **Every `NAV` node with `status.kind === "live"` has a `page.tsx`.** The
   brief did not ask for this one and it is worth having: without it, marking a
   route live before building it ships a nav item that 404s, which is a worse
   failure than an unreachable page and is invisible until someone clicks.

`not-found.tsx`, `error.tsx`, and `loading.tsx` are not routes and are excluded
by construction — the walk only matches `page.tsx`.

`UNLISTED` ships empty. An allowlist with nothing in it is not decoration: it
means the check is currently at full strength, and any future entry has to be
argued for in a diff with a reason string attached.

---

## 6. Surfaces, and a bug in the current resolver

Declared surface per section, following the design principles: knowledge
register on paper-light, logger and dashboard on dark.

| Prefix | Surface | Reason |
|---|---|---|
| `/` | **light** | Landing is a specimen page — editorial register, long-form. Changing from today's dark. |
| `/knowledge` | light | Already declared. |
| `/glossary` | light | Knowledge register. |
| `/citations` | light | Knowledge register. Long-form reading; must not inherit the app default. |
| `/exercises` | light | Already declared. |
| `/train`, `/water` | dark | Logger. |
| `/dashboard`, `/progress`, `/review` | dark | Instrument panel. |
| `/settings`, `/design` | dark | App default. |

The user's cookie preference still overrides all of it. Three states — `auto`,
`dark`, `light` — resolved server-side, no flash.

### The bug

`routeSurface()` in `lib/design/surface.ts` matches with:

```ts
const match = Object.keys(ROUTE_SURFACE).find(
  (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
);
```

Adding `"/": "light"` for the landing page **makes every route light**, because
`"/knowledge".startsWith("/")` is true and `find` returns the first match in
key insertion order. The landing page cannot be added to this map as written.

Fix as part of this part: match the root path exactly before falling through to
prefix matching, and sort candidate prefixes longest-first so a future
`/exercises/compare` override cannot be shadowed by `/exercises`. Add a test —
the current behaviour has no coverage, which is why this was latent.

---

## 7. Breadcrumbs

On every detail page, derived from `NAV` via `breadcrumbsFor()`.

```
Knowledge → Mechanisms → Mechanical tension
Exercises → Romanian deadlift
Knowledge → Bibliography
```

The category tier on concepts (`Mechanisms`) comes from `CATEGORY_META`, not
from the URL — `/knowledge/[slug]` is flat and the category is frontmatter. So
`breadcrumbsFor` accepts an optional interstitial crumb alongside `leafLabel`.
This is the one place the trail is not purely a function of the path, and it is
worth the parameter: dropping the category would make the knowledge layer's
reading order invisible in the one component whose job is showing structure.

---

## 8. What this part does *not* route

Two things that look like routes and are not:

- **The command palette** (⌘K) is a dialog, not a route. It reads a build-time
  index generated from concepts, exercises, and glossary terms. It appears in no
  route table and is excluded from route bundle budgets by lazy-loading.
- **The anatomical atlas** is deferred, not planned-with-a-phase. Sourcing an
  anatomically correct SVG under a compatible licence is an open question that
  should not be answered under time pressure, and generated path data would read
  as amateur on a product whose claim is rigour. The involvement table on
  exercise detail is built as a designed view rather than a fallback — it is the
  accessible representation regardless, so it has to be good either way.

---

## 9. Sequencing, and the context boundary

The exercise slice lands first, as its own commits, and is reported before any
navigation work starts. Cross-linking half-populated content means wiring links
to things that change underneath you.

**Context 1 — the exercise slice — done**

1. ✅ `/knowledge/citations` → `/citations`, 308 in `next.config.ts`, tested.
2. ✅ `routeSurface()` prefix matching fixed, 13 tests where there were none.
3. ✅ Eight exercises authored, spanning all four peak positions and all four
   failure protocols, leaving the ranker two candidates in three muscle groups.
4. ✅ Resistance-profile concept written; `phase-2` orphan cleared and
   `CURRENT_PHASE` bumped.
5. ✅ Multi-series resistance-profile curve.
6. ✅ Substitution ranker in `lib/exercises/substitutions.ts` — note the module
   landed under `exercises/`, not `training/` as first planned: it operates on
   the library rather than on a training session.
7. ✅ `/exercises` and `/exercises/[slug]` with the designed involvement table.
8. ✅ Reported.

Also landed, both found while doing the above: rule 8 in the integrity checker
(`staleRegistrations` was exported and never called, leaving the orphan register
enforced in only one direction), and a `limit: 0` falsy-check bug in the ranker.

**Context 2 — Part D**

D1 is this document. D2 shell, D3 palette, D4 wiring, D5 landing, D6 system
pages. Everything it needs from context 1 is on disk and under test by then:
the exercise data, the substitution ranker, the multi-series curve, the
citations move, and the surface fix.

The handoff artefact is this file plus the slice report. Nothing about Part D's
plan lives only in a conversation.

---

## 10. Questions resolved at review

1. **`/water` → Train.** Hydration is the highest-frequency, lowest-ceremony
   interaction in the product — logged in seconds, many times a day — so it
   belongs where the thumb already is. It reads Whoop strain in Phase 5 to set
   a target, but consuming recovery data does not make it a recovery view.
2. **Mobile bottom bar renders live sections only.** A disabled thumb target
   carrying a tooltip that cannot fire is a dead control with no explanation.
   In the shell overflow, where planned sections *do* appear on mobile, the
   phase is **visible text, not a tooltip**, for the same reason.
3. **Product order kept, with the phase shown inline on desktop too.** The
   objection to two disabled items leading was never the ordering — it was that
   an unexplained grey item at position one reads as broken. "Train · Phase 3"
   at a glance is a product stating its shape. With the label visible, product
   order is right, and it avoids reordering at Phase 3 and again at Phase 4.
4. **`/exercises/compare` stays planned.** It is cheap, which is exactly why it
   is tempting, and the slice has a well-drawn boundary that has been holding.
   The multi-series curve gets used overlaid on the landing page instead —
   the demonstration without the route. If Part D lands with budget left it can
   be promoted as a small follow-up commit, but it must not compete with D5
   polish for attention.
