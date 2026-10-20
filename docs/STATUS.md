# MapBard — Status

**Updated 2026-10-20. Active milestone: [M1 — CLI and foundation](m1-cli.md),
in progress. M1-A and M1-B complete; next: M1-C and M1-D.** See the [roadmap](ROADMAP.md).

## What works today

- `@mapbard/schema`: strict Zod contracts for project 0.1, GeoNarrative 0.1,
  design, compiled spec and diagnostics.
- `@mapbard/core`: load and validate a project with source hashes; compile it
  to a resolved spec (shared/equal-interval scales, category and size scales,
  annotations, controls, capability diagnostics); ingest/profiling helpers in
  `inspect/`. Format 0.2 loads from `mapbard.json` and `story.json`, with text
  hashes and profiles in `mapbard.lock.json`; 0.1 projects migrate into a new
  directory without changing the source.
- `@mapbard/renderer`: compiled publication (MapLibre 4.7 player, IIFE build)
  that runs from `file://` offline, with stale-input rejection and safe asset
  paths.
- `@mapbard/knowledge`: capability list and encoding prerequisites.
- Example: `examples/projects/first-slice` (Potomac, three scenes), built by
  `node examples/scripts/build-first-slice.mjs <out>`.
- Checks: 103 tests (schema 24, core 52, renderer 24, root integration 3) and
  lint pass.

## Known issues

- The CLI is a stub. Everything requires Node scripts (M1-C).
- Visual quality is below the bar (<60/100). The defects are listed in
  [visual-engine.md](visual-engine.md#why-the-current-output) (M2).
- The checked-in Potomac example still uses format 0.1; M1-F moves it to 0.2
  and builds it through the CLI. Online basemap resolution remains in M1-D.
- A browser check of the 0.2 publication was blocked by the browser tool's
  local `file://` URL policy. The generated page and player were tested through
  build/unit/integration checks; browser playback remains unverified.

## Log

Add one line per working session: date, what changed, the checks run, and the
next step. Details belong in commit messages.

- 2026-10-20: M1-B added strict format 0.2 authored and lock contracts, JSON
  Schema export, normalized text hashes, resource profiles/statistics, stale
  lock detection, non-destructive 0.1 migration, and 0.2 compiler/player
  versions. Potomac and two-period fixture migration/compile checked; build,
  103 tests and lint pass. Browser `file://` check blocked by URL policy. Next:
  M1-C CLI and M1-D online basemaps.
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
