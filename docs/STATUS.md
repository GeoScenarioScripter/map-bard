# MapBard — Status

**Updated 2026-10-20. Active milestone: [M1 — CLI and foundation](m1-cli.md),
not started.** See the [roadmap](ROADMAP.md).

## What works today

- `@mapbard/schema`: strict Zod contracts for project 0.1, GeoNarrative 0.1,
  design, compiled spec and diagnostics.
- `@mapbard/core`: load and validate a project with source hashes; compile it
  to a resolved spec (shared/equal-interval scales, category and size scales,
  annotations, controls, capability diagnostics); ingest/profiling helpers.
- `@mapbard/renderer`: compiled publication (MapLibre 4.7 player, IIFE build)
  that runs from `file://` offline, with stale-input rejection and safe asset
  paths.
- `@mapbard/knowledge`: capability list and encoding prerequisites.
- Example: `examples/projects/first-slice` (Potomac, three scenes), built by
  `node examples/scripts/build-first-slice.mjs <out>`.
- Checks: 131 tests (schema 22, core 74, renderer 32, root integration 3) and
  lint pass.

## Known issues

- `pnpm -r build` fails in the renderer if the global pnpm differs from the
  pinned 9.15.0, because of the nested `pnpm run build:player`. Workaround: run
  `corepack pnpm run build:player` in `packages/renderer`. Fixed in M1-A.
- The CLI is a stub. Everything requires Node scripts (M1-C).
- Visual quality is below the bar (<60/100). The defects are listed in
  [visual-engine.md](visual-engine.md#why-the-current-output) (M2).
- The legacy renderer and the DashScope planner are still in the tree until
  M1-A removes them.

## Log

Add one line per working session: date, what changed, the checks run, and the
next step. Details belong in commit messages.

- 2026-10-20: Process reset. Stage/wave/gate plans, BUILD_LOG and the idea
  register archived to `docs/archive/2026-10-20-process-reset/`. New
  ROADMAP, M1 plan, visual engine plan and slim AGENTS.md written. Test fixtures
  moved from `docs/` to `fixtures/`. All 131 tests pass. Decisions: product
  first; CLI first; free keyless online basemaps (OpenFreeMap, VersaTiles,
  Mapterhorn/Terrarium terrain); retire legacy code; deck.gl + three.js for the
  visual engine, without Threebox. Next: M1-A.
