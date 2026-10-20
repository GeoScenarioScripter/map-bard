# MapBard — Status

**Updated 2026-10-20. Active milestone: [M1 — CLI and foundation](m1-cli.md),
in progress. M1-A complete; next: M1-B.** See the [roadmap](ROADMAP.md).

## What works today

- `@mapbard/schema`: strict Zod contracts for project 0.1, GeoNarrative 0.1,
  design, compiled spec and diagnostics.
- `@mapbard/core`: load and validate a project with source hashes; compile it
  to a resolved spec (shared/equal-interval scales, category and size scales,
  annotations, controls, capability diagnostics); ingest/profiling helpers in
  `inspect/`.
- `@mapbard/renderer`: compiled publication (MapLibre 4.7 player, IIFE build)
  that runs from `file://` offline, with stale-input rejection and safe asset
  paths.
- `@mapbard/knowledge`: capability list and encoding prerequisites.
- Example: `examples/projects/first-slice` (Potomac, three scenes), built by
  `node examples/scripts/build-first-slice.mjs <out>`.
- Checks: 97 tests (schema 22, core 48, renderer 24, root integration 3) and
  lint pass.

## Known issues

- The CLI is a stub. Everything requires Node scripts (M1-C).
- Visual quality is below the bar (<60/100). The defects are listed in
  [visual-engine.md](visual-engine.md#why-the-current-output) (M2).
- The project is still format 0.1 with authored hashes (M1-B).

## Log

Add one line per working session: date, what changed, the checks run, and the
next step. Details belong in commit messages.

- 2026-10-20: M1-A retired the legacy renderer, DashScope planner and importer;
  moved ingest fixtures and profiling to `inspect/`; fixed the renderer build
  and removed stale generated output during rebuilds. Build, 97 tests and lint
  pass. Next: M1-B format 0.2.
- 2026-10-20: Process reset. Stage/wave/gate plans, BUILD_LOG and the idea
  register archived to `docs/archive/2026-10-20-process-reset/`. New
  ROADMAP, M1 plan, visual engine plan and slim AGENTS.md written. Test fixtures
  moved from `docs/` to `fixtures/`. All 131 tests pass. Decisions: product
  first; CLI first; free keyless online basemaps (OpenFreeMap, VersaTiles,
  Mapterhorn/Terrarium terrain); retire legacy code; deck.gl + three.js for the
  visual engine, without Threebox. Next: M1-A.
- 2026-10-20: Owner decisions: publish to npm as `mapbard` (names unclaimed today;
  the owner must create the npm org and claim them), motion defaults with a
  layered override system, a CC0 starter asset pack plus user and community
  assets, and a worldwide audience (tile fallback chain, label language, scripts/RTL,
  locale formatting). Plans updated. Next: M1-A.
