# MapBard — Status

**Updated 2026-10-20. Active milestone: [M1 — CLI and foundation](m1-cli.md),
in progress. M1-A through M1-D implemented; M1-E pack expanded, agent trial
pending; next: complete M1-E and M1-F.** See the [roadmap](ROADMAP.md).

## What works today

- `@mapbard/schema`: strict Zod contracts for project 0.1, GeoNarrative 0.1,
  design, compiled spec and diagnostics.
- `@mapbard/core`: load and validate a project with source hashes; compile it
  to a resolved spec (shared/equal-interval scales, category and size scales,
  annotations, controls, capability diagnostics); ingest/profiling helpers in
  `inspect/`. Format 0.2 loads from `mapbard.json` and `story.json`, with text
  hashes and profiles in `mapbard.lock.json`; 0.1 projects migrate into a new
  directory without changing the source.
- `@mapbard/renderer`: compiled publication (MapLibre 6.1 player and local IIFE
  worker) that runs from `file://`, with stale-input rejection, safe asset
  paths, online style fallback, terrain and offline mode.
- `@mapbard/knowledge`: capability list, encoding prerequisites and provider
  catalog for OpenFreeMap, VersaTiles, Mapterhorn and AWS Terrarium.
- `@mapbard/cli`: `init`, `add`, `inspect`, `lock`, `check`, `build`, `preview`,
  `capabilities`, `schema`, `migrate` and `skill install`, with JSON envelopes.
- `skills/mapbard`: a versioned agent workflow pack with format, technique,
  cartography, diagnostic and data-honesty guidance, installed by the CLI.
  A direct CLI trial from raw Potomac files reached `check` and `build`.
- Example: `examples/projects/first-slice` (Potomac, three scenes), built by
  `node examples/scripts/build-first-slice.mjs <out>`.
- Checks: 107 tests (schema 24, knowledge 2, core 52, renderer 24, CLI 2,
  root integration 3) and lint pass.

## Known issues

- Visual quality is below the bar (<60/100). The defects are listed in
  [visual-engine.md](visual-engine.md#why-the-current-output) (M2).
- The checked-in Potomac example still uses format 0.1; M1-F moves it to 0.2
  and builds it through the CLI. CSV can be added and inspected, but the
  current compiler cannot yet render CSV layers.
- The sandboxed headless browser could not reach the public tile hosts, so an
  actual OpenFreeMap/VersaTiles tile load has not been visually verified. A
  custom HTTP style loaded and displayed in headless Chrome; the offline
  publication also loaded from `file://`.
- M1-F still needs an automated browser smoke test, Potomac CLI migration and
  quickstart. M1-G covers npm release packaging and CI.
- A fresh Claude Code agent trial for M1-E could not start in this environment:
  its API connection was refused before any tokens or tool calls. The direct
  CLI trial passed, but it does not satisfy the agent-trial acceptance item.

## Log

Add one line per working session: date, what changed, the checks run, and the
next step. Details belong in commit messages.

- 2026-10-20: M1-E expanded the skill pack with a tested project-root workflow,
  format example, technique limits and diagnostic remedies. A direct CLI trial
  from raw Potomac files completed `init` → `add` → `inspect` → `lock` →
  `check` → `build`; it exposed an oversized `lock` response, now summarized.
  Build, 107 tests and lint pass. Fresh Claude Code trial was blocked by API
  `ECONNREFUSED` before any tokens or tool calls. Next: retry that trial when
  reachable, then M1-F example and smoke test.
- 2026-10-20: M1-C/D added the CLI binary and commands, JSON diagnostics,
  preview server, initial skill pack, MapLibre 6 IIFE/worker, provider catalog,
  fallback, terrain, attribution and offline mode. Build, 107 tests and lint
  pass; headless Chrome checked offline `file://` and a custom HTTP style;
  preview HTTP served page and worker. Public tile hosts were unreachable in
  this browser environment. Next: M1-E pack trial and M1-F example/smoke.
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
