# MapBard — Status

**Updated 2026-10-21. Active milestone: [M1 — CLI and foundation](m1-cli.md),
release ready locally. The owner deferred the fresh Claude Code trial. M1 closes
after cross-platform CI and npm publication.** See the
[roadmap](ROADMAP.md).

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
- `mapbard` CLI: `init`, `add`, `inspect`, `lock`, `check`, `build`, `preview`,
  `capabilities`, `schema`, `migrate` and `skill install`, with JSON envelopes.
- `skills/mapbard`: a versioned agent workflow pack with format, technique,
  cartography, diagnostic and data-honesty guidance, installed by the CLI.
  A direct CLI trial from raw Potomac files reached `check` and `build`.
- Example: `examples/projects/potomac` (format 0.2, Potomac, three scenes),
  built with `mapbard build` in online and offline modes. The format 0.1
  `first-slice` project remains as a migration regression fixture.
- A root README has a five-minute human and coding-agent quickstart.
- Release packages: `mapbard` plus four `@mapbard/*` libraries at 0.1.0, each
  with a README, MIT license, explicit published files, exports and Node engine.
  Changesets, three-OS CI and a manual npm release workflow are configured.
- Checks: 108 routine tests (schema 24, knowledge 2, core 52, renderer 24, CLI 2,
  root integration 3, browser smoke 1), lint and Windows tarball install smoke
  pass. A live OpenFreeMap style and multiple vector tiles loaded in headless
  Chrome with HTTP 200 and no failed requests; the screenshot was inspected.

## Known issues

- Visual quality is below the bar (<60/100). The defects are listed in
  [visual-engine.md](visual-engine.md#why-the-current-output) (M2).
- The legacy Potomac fixture still uses format 0.1. CSV can be added and
  inspected, but the current compiler cannot yet render CSV layers.
- The routine headless browser smoke test still stubs the online style so it
  remains network independent. The separate live check passed on 2026-10-21.
- Three-OS GitHub CI reached tests after the billing block cleared, then found
  PNG fixture blobs that had been normalized as text. The `npm` release
  environment and `NPM_TOKEN` secret exist. The owner created the `@mapbard`
  npm organization. npm provenance is unavailable while the GitHub repository
  is private. This machine has no npm login (`ENEEDAUTH`).
- The fresh Claude Code agent trial could not start because its API connection
  was refused before any tokens or tool calls. The owner deferred that trial
  beyond M1 on 2026-10-21. The direct CLI trial passed.

## Log

Add one line per working session: date, what changed, the checks run, and the
next step. Details belong in commit messages.

- 2026-10-21: Retried three-OS CI after GitHub billing cleared. All jobs reached
  tests and failed on two PNG fixture dimensions; their committed blobs had lost
  the PNG signature carriage return. Removed inherited `eol=lf` from binary
  patterns and restored the two fixtures. Core's 52 tests pass locally and the
  staged PNG bytes match the local files. Next: rerun CI, then publish 0.1.0.
- 2026-10-21: Pushed release preparation to `main`; GitHub CI jobs were
  rejected before steps because of billing or spending limits. Created the
  `npm` GitHub environment and removed provenance from the private-repository
  release workflow. Checked registry: `mapbard` and `@mapbard/schema` returned 404. Local build, 108 tests, lint and tarball install smoke passed. Next:
  resolve GitHub billing, add a fresh npm secret, rerun CI, publish.
- 2026-10-21: Deferred the fresh Claude Code trial by owner direction. Prepared
  five public 0.1.0 packages, Changesets, three-OS CI, release workflow and
  external tarball install smoke; live OpenFreeMap style and vector tiles loaded
  in headless Chrome with an inspected screenshot. Build, 108 routine tests,
  lint and Windows pack smoke pass. Next: push for CI, configure npm ownership
  and secret, then publish 0.1.0.
- 2026-10-20: M1-E expanded the skill pack with a tested project-root workflow,
  format example, technique limits and diagnostic remedies. A direct CLI trial
  from raw Potomac files completed `init` → `add` → `inspect` → `lock` →
  `check` → `build`; it exposed an oversized `lock` response, now summarized.
  Fresh Claude Code trial was blocked by API `ECONNREFUSED` before any tokens
  or tool calls. M1-F added the migrated format 0.2 Potomac example, online and
  offline CLI builds, a quickstart, and a CLI test that authors a real layer.
  Added a Playwright smoke test for `file://` playback, scroll navigation,
  console errors, online host requests and zero offline requests. Build, 108
  tests and lint pass. Next: fresh-agent retry and M1-G release packaging.
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
