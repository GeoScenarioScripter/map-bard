# MapBard — Status

**Updated 2026-10-21. [M2 — Visual Engine](visual-engine.md) is active; its
execution plan is [m2-visual.md](m2-visual.md). Wave 1 is complete; next is
Wave 2.** [M1](m1-cli.md) is complete. The owner deferred the fresh Claude
Code trial beyond M1. See the [roadmap](ROADMAP.md).

## What works today

- `@mapbard/schema`: strict Zod contracts for project 0.1, GeoNarrative 0.1,
  design, compiled spec and diagnostics.
- `@mapbard/core`: load and validate a project with source hashes; compile it
  to a resolved spec (equal-interval, quantile, natural-breaks and manual
  color classes; category and size scales; shared color and size scales;
  legend titles and display units; annotations, controls, capability
  diagnostics); ingest/profiling helpers in
  `inspect/`. Format 0.2 loads from `mapbard.json` and `story.json`, with text
  hashes and profiles in `mapbard.lock.json`; 0.1 projects migrate into a new
  directory without changing the source.
- `@mapbard/renderer`: compiled publication (MapLibre 6.1 player and local IIFE
  worker) that runs from `file://`, with stale-input rejection, safe asset
  paths, online style fallback, terrain and offline mode.
- `@mapbard/knowledge`: capability list, encoding prerequisites, display
  formatters (units, numbers, titles) and provider catalog for OpenFreeMap,
  VersaTiles, Mapterhorn and AWS Terrarium.
- Visual QA: `node scripts/visual-qa.mjs <publication> <out>` captures each
  scene at desktop and phone sizes, writes a contact sheet, and reports
  console errors, remote requests and occlusion findings. The compiled page
  exposes `data-mb-state` and a read-only `window.MapBardStory` hook.
- `mapbard` CLI: `init`, `add`, `inspect`, `lock`, `check`, `build`, `preview`,
  `capabilities`, `schema`, `migrate` and `skill install`, with JSON envelopes.
- `skills/mapbard`: a versioned agent workflow pack with format, technique,
  cartography, diagnostic and data-honesty guidance, installed by the CLI.
  A direct CLI trial from raw Potomac files reached `check` and `build`.
- Example: `examples/projects/potomac` (format 0.2, Potomac, three scenes,
  gauges as graduated symbols on one shared size scale), built with `mapbard build` in online and offline modes. The format 0.1
  `first-slice` project remains as a migration regression fixture.
- A root README has a five-minute human and coding-agent quickstart.
- Release packages: `mapbard` and `@mapbard/core` at 0.1.2, and `schema`,
  `knowledge` and `renderer` at 0.1.1, are published on npm, each with a README, MIT license, explicit published files,
  exports and Node engine. Changesets, three-OS CI and a manual npm release
  workflow are configured. The public `mapbard` CLI ran via `npm exec`.
- Checks: 121 routine tests (schema 24, knowledge 5, core 56, renderer 24, CLI 6,
  root integration 5, browser smoke 1), lint and Windows tarball install smoke
  pass. A live OpenFreeMap style and multiple vector tiles loaded in headless
  Chrome with HTTP 200 and no failed requests; the screenshot was inspected.

## Known issues

- Visual quality is below the bar (<60/100). The defects are listed in
  [visual-engine.md](visual-engine.md#why-the-current-output) (M2). Fixed
  in Wave 1: raw legend IDs, caret units, and the encoding that hid the 2025
  drop. Open: the visual QA report on Potomac still has 6 layout findings:
  on desktop the card covers Hancock and the legend overlaps the card in
  `limits`; on phone the card covers Point of Rocks and overlaps the media
  panel and legend (Wave 2, item E). Annotation marker buttons sit on top of
  small 2025 symbols (Wave 3, item I). The largest symbol radius is 16 px.
- The legacy Potomac fixture still uses format 0.1. CSV can be added and
  inspected, but the current compiler cannot yet render CSV layers.
- The routine headless browser smoke test still stubs the online style so it
  remains network independent. The separate live check passed on 2026-10-21.
- The 0.1.0 npm release did not include provenance. Releases use the GitHub
  `npm` environment secret; this machine has no npm login (`ENEEDAUTH`).
- The fresh Claude Code agent trial could not start because its API connection
  was refused before any tokens or tool calls. The owner deferred that trial
  beyond M1 on 2026-10-21. The direct CLI trial passed.

## Log

Add one line per working session: date, what changed, the checks run, and the
next step. Details belong in commit messages.

- 2026-10-21: Wrote the M2 execution plan (docs/m2-visual.md, four waves) and
  ran Wave 1. A: visual QA capture script, readiness hook and occlusion
  geometry; the baseline on the old Potomac flagged the known card/legend
  collisions (6 findings). B: compiled legend titles, display units (ft³/s)
  and en-US class labels with exact-edge fallback. C: quantile,
  natural-breaks and manual classes, plus shared size scales; Potomac now
  uses graduated symbols on one shared size scale. Build, 121 tests, lint and
  browser smoke pass; QA ran on stub-online and offline builds, and the
  contact sheet and zoomed gauge crops were inspected. Next: Wave 2 (D–G).

- 2026-10-21: Owner follow-up to the M1 review. `preview` keeps serving when the
  first build fails and shows the diagnostics panel until a saved fix builds
  (checked in headless Chrome with screenshots). `init` and `add` reject
  non-ASCII names and IDs. Removed the worldwide-audience records. The root
  `test` script now runs through `scripts/test.mjs` with the invoking pnpm.
  Published `mapbard` and `@mapbard/core` 0.1.2 (`latest`) after three-OS
  release verification; `npm exec mapbard@0.1.2` reported 0.1.2 and rejected a
  non-ASCII `init`. Next: M2.
- 2026-10-21: M1 review fixes. `preview` no longer crashes on a malformed URL,
  serves media with real content types, serializes rebuilds and closes
  live-reload streams on Ctrl+C. A failed `add` removes its copied file, `add
--feature-id` names a unique property, and `add` outside a project returns
  `RESOURCE_MISSING` (exit 1, not 3). `--limit` no longer truncates nested
  arrays such as JSON Schema `required`, and envelopes report `truncated`.
  `check` reports placeholder credits together with compile diagnostics and
  every missing reference. Build, tests, lint and browser smoke pass. Ctrl+C
  shutdown was not exercised on Windows. Next: M2.
- 2026-10-21: Documented npm CLI skill installation and its Codex/Claude output
  paths in the package README. Confirmed the skill pack is bundled in `dist` and
  the CLI test covers installation; next: publish the README update in a future
  npm release.
- 2026-10-21: Expanded the five npm package READMEs with install and usage
  guidance, added descriptions and discovery metadata, and published 0.1.1.
  Build, 108 tests, lint and tarball install smoke passed locally; three-OS CI
  and release verification passed. Next: M2 visual engine.
- 2026-10-21: Three-OS CI and release verification passed. Published all five
  0.1.0 packages to npm using the GitHub `npm` environment secret; the four
  scoped libraries published first, then `mapbard` after the secret was updated.
  Confirmed registry tags and ran `mapbard@0.1.0 --version` through `npm exec`.
  M1 complete. Next: M2 visual engine.
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
  assets, and a tile fallback chain. Plans updated. Next: M1-A.
