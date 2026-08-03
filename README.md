# HypertrophyOS

An evidence-based training operating system. It teaches the mechanisms of muscle growth properly, and applies them to your actual recovery data.

The thesis: logging apps know what you lifted but nothing about whether you should have. Recovery apps know your readiness but nothing about your training. Education sites explain the science but never touch your data. This sits in the middle.

**Status: Phase 1 (knowledge layer) complete.** Seven concepts written, evidence system built, training-math modules tested. Phases 2–6 are not yet built — see [Roadmap](#roadmap).

---

## Getting started

```bash
pnpm install
cp .env.example .env.local   # fill in Supabase credentials
pnpm dev
```

The knowledge layer runs with no database and no Whoop account. `DATABASE_URL` is only needed once you push the schema.

```bash
pnpm test           # training-math unit tests
pnpm typecheck
pnpm build
```

---

## Architecture

### Stack and why

| Choice | Reason |
|---|---|
| **Next.js 15, App Router** | Concept pages are static and prerendered at build; the logger will need server actions and offline-capable client state. |
| **Supabase Postgres + Drizzle** | Supabase for auth, RLS, and storage; Drizzle for schema and queries. RLS matters here because the app stores encrypted OAuth tokens and (later) progress photos — a missed `where user_id = …` should not be a data breach, and with RLS it is not. Drizzle rather than `supabase-js` because the volume queries join `workout_sets × exercise_muscles` with fractional weighting, and that is where an untyped query builder hurts. |
| **MDX files + a `concepts` table** | Prose lives in `content/concepts/*.mdx`, version-controlled and reviewable in diffs. A sync step projects frontmatter into Postgres for the glossary lookup and citation back-links. Files are the source of truth; the table is an index. |
| **Zod at every boundary** | Frontmatter, API payloads, and Whoop responses are all parsed, not asserted. |
| **Vitest** | The training-math modules drive prescriptions, so they are tested before they are wired to anything. |

> **Note on Next.js 15.** Next.js 16 is current. This project pins 15 as specified. The upgrade is `pnpm dlx @next/codemod@canary upgrade latest`; nothing here depends on 15-specific behaviour.

### Layout

```
content/concepts/       Concept prose (MDX + typed frontmatter)
src/lib/evidence/       Citation registry and evidence grades
src/lib/content/        MDX loader, validation, glossary index
src/lib/training/       Training math — pure functions, unit-tested
src/components/evidence/  Claim gutter, evidence chip, glossary term, citations
src/components/charts/    Chart shell + validated palette charts
src/db/schema/          Drizzle schema
drizzle/                RLS policies (applied separately from schema push)
scripts/sync-content.ts MDX → Postgres projection
```

### Database setup

```bash
pnpm db:push                                  # create tables
psql "$DIRECT_URL" -f drizzle/0000_rls_policies.sql   # apply RLS
pnpm db:sync-content                          # project MDX into concepts/citations
```

RLS lives in SQL rather than in the Drizzle schema because `drizzle-kit` does not diff policies. A policy silently dropped by a schema push is a data leak, so it is applied deliberately and separately.

---

## The training math

Everything in `src/lib/training/` is a pure function with tests. Nothing there reads from the database or the network.

### Fractional volume counting

A set of bench press is not one set of chest and one set of triceps. Each exercise-muscle pair carries an involvement weight:

| Role | Weight | Meaning |
|---|---|---|
| Prime mover | 1.0 | The muscle the exercise is chosen to train |
| Synergist | 0.5 | Meaningfully loaded through a useful range, but not the target |
| Stabilizer | 0.0 | Loaded largely isometrically; recorded for fatigue, not for volume |

This is not a guess. Pelland et al. (2026) tested exactly this scheme across 67 studies and found fractional counting predicted adaptation better than counting indirect sets fully or ignoring them. The weight is stored per pair rather than derived from the role, so individual exercises can deviate where the default is wrong.

### Effective volume and the junk-volume rule

Sets whose bias-corrected RIR exceeds **4** are excluded from effective weekly volume and reported separately.

This threshold is a judgement call, and the app says so wherever it applies it. Robinson et al. (2024) found hypertrophy trending upward as sets approach failure with no clean breakpoint — so any threshold simplifies a gradient. 4 is where treating a set as equivalent to a near-failure set becomes actively misleading. Excluded sets are always surfaced, never silently dropped.

Sets with no logged RIR are counted as effective and flagged. Discarding a real set over missing metadata understates volume worse than including it does.

### Volume landmarks

Population priors, deliberately wide:

| Landmark | Default | Plausible range |
|---|---|---|
| MEV | 6 | 4–8 |
| MAV | 14 | 10–20 |
| MRV | 20 | 12–25 |

These seed a per-user, per-muscle row that is refined from performance data. MRV in particular is individual enough that the population range is close to useless alone — one lifter's MRV can sit below another's MEV, which is why the UI draws them as overlapping bands rather than three numbers.

### Dose-response curve

Modelled as `gain(s) = 5.55 · ln(1 + s/5)`, calibrated so the marginal return near 10 weekly sets matches the 0.37% per-set figure from Schoenfeld, Ogborn & Krieger (2017).

**This is a teaching device, not a prediction engine.** It exists so the shape of diminishing returns is visible. It is not used to prescribe volume, and the chart rendering it says so.

### Double progression

`nextDoubleProgression()` returns the next prescription and its rationale. The rule the knowledge layer teaches is literally the function the overload debt tracker will call — the worked example on the Progressive Overload page runs the real implementation, not a mock.

The case worth knowing: hitting the top of the rep range with 4 RIR does not earn a small increment. It means the load was never heavy enough, and the correct response is a double jump.

---

## Evidence tagging methodology

Every substantive claim carries a grade describing the **state of the literature**, not our confidence in the advice. Those are independent axes, and conflating them is how fitness content goes wrong.

| Grade | Meaning |
|---|---|
| **Strong** | Multiple meta-analyses or well-controlled RCTs agree on direction and rough magnitude |
| **Mixed** | Plausible, often mechanistically supported, but trials disagree or the evidence is mechanistic rather than outcome-based |
| **Weak** | Commonly repeated, poorly supported — contradicted, untested, or resting entirely on inference |

Grades render as a neutral pill with a coloured dot, and claims carry a **confidence gutter** — a rule down the left margin, solid for strong, dashed for mixed, dotted for weak. The stroke style means the distinction survives without colour.

### Rules enforced at build time

`src/lib/content/schema.ts` fails the build on:

- a claim graded `strong` that cites nothing
- a claim graded `mixed` with no `uncertainty` note saying what would change our mind
- a citation id not present in the registry
- a citation marked unverified being used to support a claim
- a glossary term claimed by two concepts

### Citations

All 18 references were checked against PubMed or the publisher's DOI landing page while writing. `keyFinding` restates what the paper reported, not what we conclude from it — so a reader can check the claim against the study without leaving the page.

**No citation was invented.** Where a claim could not be tied to a paper we could verify, it carries no citation and is graded `mixed`. Two corrections applied during authoring:

- The per-set figure is **0.37%**, not the 0.38% that circulates widely.
- The lengthened-position literature does not support a blanket advantage. Wolf et al. (2025) found lengthened partials produce *similar*, not superior, adaptations in trained lifters — so the claim is written as "at least equivalent, possibly regionally superior" and graded `mixed`.

---

## Design

Dark-first, mobile-first — this gets used in a gym, one-handed.

- **Type:** Newsreader for long-form prose (it is essay content and should read like it), Archivo for interface, JetBrains Mono for all numerics and labels.
- **Colour:** deep blue-slate ground with a single cyan accent. Evidence green/amber/red are reserved semantics — nothing else in the interface may use them.
- **Charts:** every palette is validated, not chosen. Series colours and volume-zone colours clear a six-check validator (lightness band, chroma floor, CVD separation under protanopia/deuteranopia, normal-vision separation, contrast) against both light and dark surfaces. Do not hand-edit a chart colour without re-running it.
- **Accessibility:** every chart ships a table view and a text description; identity is never colour-alone; tap targets are ≥44px; reduced motion is respected.

---

## Whoop setup (Phase 4, not yet built)

The schema and env contract are in place; the client is not.

Planned: OAuth 2.0 authorization code flow against the **v2** API (`https://api.prod.whoop.com/developer/v2/`) with scopes `read:recovery read:cycles read:sleep read:workout read:body_measurement read:profile offline`. Tokens encrypted at rest, server-side only, transparent refresh on 401. Webhooks with signature verification rather than polling.

`WHOOP_PROVIDER=mock` (the default) runs a mock provider behind the same interface, so the app is fully developable and demoable without a Whoop account.

---

## Health-content integrity

Non-negotiable, and enforced in content review rather than left to tone:

- Never prescribes aggressive caloric restriction.
- Never encourages training through pain.
- The exercise library distinguishes movements that can be taken to true concentric failure from those that cannot — a leg press can, a barbell back squat cannot, and the difference is safety rather than toughness.
- Data suggesting disordered patterns (rapid weight-loss targets, extreme volume, consistently training on red recovery) is met with concern and moderation, not encouragement.
- No streak guilt, no artificial scarcity, no ads, no dark patterns.

---

## Roadmap

- [x] **Phase 1** — Knowledge layer, evidence system, contextual glossary, training math
- [ ] **Phase 2** — Exercise library, 120+ movements, resistance profiles, SFR ratings
- [ ] **Phase 3** — Proximity-to-failure system and the RIR calibration trainer
- [ ] **Phase 4** — Whoop OAuth, webhooks, mock provider, dashboard
- [ ] **Phase 5** — Readiness-adjusted autoregulation, fatigue ledger, overload debt, deload predictor
- [ ] **Phase 6** — Logger, water tracker, analytics, weekly review

Concepts still to write: proximity to failure and RIR/RPE, the calibration problem, frequency, periodization, deloads, exercise order, rest intervals, specificity, the recovery curve. They are listed as "not yet written" on the knowledge index rather than hidden — a knowledge layer that quietly omits its gaps is indistinguishable from one that thinks it is complete.

---

## A note on how this was built

This project was built with Claude, Anthropic's AI assistant, working from a detailed specification. Claude wrote the application code, the training-math modules and their tests, and the concept prose.

Every citation was verified against PubMed or the publisher before use, and two factual errors in the original specification were caught and corrected in the process. The evidence-integrity checks in the build exist partly because AI-generated content is exactly the kind of thing that should not be trusted to cite honestly without a mechanism enforcing it.
