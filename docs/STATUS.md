# MapBard — Status

**Updated 2026-10-22. [M2 — Visual Engine](visual-engine.md) is active; its
execution plan is [m2-visual.md](m2-visual.md). Waves 1–3 are complete;
Wave 4 is planned in detail (steps 4.1–4.4) and not started.** [M1](m1-cli.md) is complete. The owner deferred the fresh Claude
Code trial beyond M1. See the [roadmap](ROADMAP.md).

## What works today

- `@mapbard/schema`: strict Zod contracts for project 0.1, GeoNarrative 0.1,
  design, compiled spec and diagnostics.
- `@mapbard/core`: load and validate a project with source hashes; compile it
  to a resolved spec (equal-interval, quantile, natural-breaks and manual
  color classes; category and size scales; shared color and size scales;
  legend titles and display units; resolved theme and layout; callouts with
  target symbol radii; motion tracks from authored `motion`, `motionPresets`
  and the presets `reveal-from-overview`, `push-in`, `orbit` and `fly-along`,
  with per-feature `stagger` and callout fade tracks;
  controls, capability diagnostics), a static critic (`critiqueProject`);
  ingest/profiling helpers in
  `inspect/`. Format 0.2 loads from `mapbard.json` and `story.json`, with text
  hashes and profiles in `mapbard.lock.json`; 0.1 projects migrate into a new
  directory without changing the source.
- `@mapbard/renderer`: compiled publication (MapLibre 6.1 player and local IIFE
  worker) that runs from `file://`, with stale-input rejection, safe asset
  paths, online style fallback, terrain and offline mode. Styles are
  token-driven (generated `theme.css`, bundled OFL Inter and Source Serif 4);
  layouts `sidecar`, `overlay-cards` and `full-bleed` with a phone bottom
  sheet, camera padding and responsive zoom; theme-tinted OpenFreeMap and
  VersaTiles styles, hillshade, sky and globe projection. Compiled spec 0.3.0:
  scroll progress over each card's rest phase drives camera, layer and callout
  tracks (scrub, play, loop, step; staggered features through feature state;
  reduced motion; a pause control for loops). Callouts (label, leader, halo)
  are placed every frame clear of panels, map controls, other callouts and
  symbols, using a grid index for dense point layers; legends per technique,
  graduated circles drawn largest first, scale bars and a north arrow while
  rotated. On phones the camera also keeps clear of the attribution and scale
  bars.
- `@mapbard/knowledge`: capability list, encoding prerequisites, display
  formatters (units, numbers, titles), theme presets (`editorial-light`,
  `night`, `atlas`, `newsroom`), layout frames, WCAG contrast, five critic
  rules (raw identifiers, caret units, hidden contrast, inconsistent scales,
  palette contrast) and provider catalog for OpenFreeMap, VersaTiles,
  Mapterhorn and AWS Terrarium.
- Visual QA: `node scripts/visual-qa.mjs <publication> <out>` captures each
  scene at p = 0, 0.5 and 1 at desktop and phone sizes, writes a contact
  sheet, and reports console errors, remote requests and occlusion findings
  (panels, map controls, edge clipping, callout overlap, callouts covering
  targets, and point symbols without a callout hidden by panels, controls or
  labels). The compiled page exposes `data-mb-state` and a read-only
  `window.MapBardStory` hook (`symbols()` lists shown point symbols); `seek`
  exists only with `MAPBARD_CAPTURE`. `node scripts/frame-probe.mjs
<publication>` scrolls a story and reports frame intervals.
- `mapbard` CLI: `init`, `add`, `inspect`, `lock`, `check`, `build`, `preview`,
  `capabilities`, `schema`, `migrate` and `skill install`, with JSON envelopes.
- `skills/mapbard`: a versioned agent workflow pack with format, technique,
  cartography, diagnostic and data-honesty guidance, installed by the CLI.
  A direct CLI trial from raw Potomac files reached `check` and `build`.
- Example: `examples/projects/potomac` (format 0.2, Potomac, three scenes,
  gauges as graduated symbols on one shared size scale; an overview of the
  river, gauges and callouts appearing downstream one after another, a
  fly-along of the river and a push-in on Little Falls), built with `mapbard build` in online and offline modes. The format 0.1
  `first-slice` project remains as a migration regression fixture.
- A root README has a five-minute human and coding-agent quickstart.
- Release packages: `mapbard` and `@mapbard/core` at 0.1.2, and `schema`,
  `knowledge` and `renderer` at 0.1.1, are published on npm, each with a README, MIT license, explicit published files,
  exports and Node engine. Changesets, three-OS CI and a manual npm release
  workflow are configured. The public `mapbard` CLI ran via `npm exec`.
- Checks: 229 routine tests (schema 37, knowledge 20, core 78, renderer 79, CLI 6,
  root integration 8, browser smoke 1) and lint pass; the Windows tarball
  install smoke last passed before M2. A live OpenFreeMap style and multiple vector tiles loaded in headless
  Chrome with HTTP 200 and no failed requests; the screenshot was inspected.

## Known issues

- Visual quality is below the bar (<60/100). The defects are listed in
  [visual-engine.md](visual-engine.md#why-the-current-output) (M2). Fixed
  in Wave 1: raw legend IDs, caret units, and the encoding that hid the 2025
  drop. Fixed in Wave 2: all 6 layout findings; Potomac's QA report is clean
  at desktop and phone sizes (stub-online and offline). Fixed in Wave 3:
  annotation buttons over small symbols, and gauges merging into one blob in
  the phone overview; QA is clean at p = 0, 0.5 and 1. Open: the largest
  symbol radius is 16 px. Potomac still uses its own context colours
  (an opaque state fill), which hide most of the basemap tint and hillshade;
  the K redesign picks a theme and context styling.
- Long narration scrolls inside the phone bottom sheet and the full-bleed
  caption card, which are capped at the reserved height. The critic does not
  warn about it yet.
- Motion limits: `stagger` cannot apply to
  `line-reveal` or to scrub and step tracks (diagnostics say so). Frame
  timing is measured in headless Chrome with software WebGL, so it shows
  main-thread cost, not GPU frame rate. With 5,000 extra points in one scene,
  callout placement still costs about 42 ms per frame at p95 on a phone-sized
  map (desktop 16.7 ms); 1,000 points stay within 16.7 ms on both.
- Visual QA samples each scene at p = 0, 0.5 and 1 only. A one-off sweep of
  Potomac's 2024 flight (p = 0.3 to 0.9 in 0.05 steps) found 24 overlaps
  between samples, mostly on phones: gauges and callouts passing under the
  card, legend, media or attribution while the camera flies close. The same
  sweep found 22 before the fly-along path change, so it predates it. Likely
  remedies: fade far callouts during flights with callout tracks, and let
  QA sweep flights (Wave 4, J).
- With a live provider style, the attribution shows OpenFreeMap twice (the
  style's own source credit and MapBard's credit line).
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

- 2026-10-22: Planned Wave 4 in m2-visual.md as four staggered steps: J1
  moves visual QA into `mapbard check --visual` with a flight sweep; then J2
  (goldens, budgets, tiles-unavailable run, CI job) and K (atlas and night
  Potomac variants, both kept) run in parallel; then goldens and owner
  scoring; then L. Owner raised the core JS budget to 450 KB gzip (MapLibre
  6.1 is 384 KB). Docs only; no checks needed. Next: run step 4.1.
- 2026-10-22: `fly-along` follows every part of its line features: parts
  form one network (ends within 25 m join; parts split where another ends on
  a vertex) and the camera takes the shortest route from the first feature's
  free end to the last's far end. On Potomac the longest straight jump fell
  from 9.8 km to 3.2 km (a real data gap); the old path kept as little as 25%
  of a segment and cut across whole meanders. Potomac's flight zoom is 9.4,
  which keeps QA clean with the new route. Build, 229 tests, lint and browser
  smoke pass; Potomac QA 0 findings (stub-online and offline); paths drawn
  and inspected. A flight sweep found pre-existing mid-flight overlaps (see
  Known issues). Next: Wave 4 (J, K, L).
- 2026-10-21: Closed the Wave 3 open items. The CLI-written lockfile keeps its
  own formatting (prettier ignores it). `reveal-from-overview` can frame
  named features, and Potomac's opening frames the river; graduated circles
  draw largest first. QA checks point symbols without a callout through
  `MapBardStory.symbols()`. Callout placement drops symbols beyond reach and
  indexes the rest on a grid. New `stagger` on play/loop layer tracks and
  callout fade tracks, used by Potomac. Root tests and lint ignore
  `.claude/` worktrees. Build, 225 tests, lint and browser smoke pass;
  Potomac visual QA has 0 findings (stub-online and offline); frame probe on
  Potomac p99 8.5 ms (desktop and phone); timed screenshots confirmed the
  stagger and callout fades. Corrected the root integration count (8; the
  earlier 23 counted worktree copies). Next: Wave 4 (J, K, L).
- 2026-10-21: Ran M2 Wave 3, staggered. A foundation commit moved the compiled
  spec to 0.3.0 with scene `motion` and an adapter frame hook; then H and I
  ran in parallel worktrees and merged. H: authored motion and presets,
  compiled camera/layer tracks, scroll progress over each card's rest phase,
  reduced motion and a pause control, QA captures at p = 0, 0.5 and 1. I:
  compiled callouts, collision-aware projected callouts, legends per
  technique, scale bars, north arrow, callout and map-control QA findings.
  Lead fix: phone camera padding clears the attribution and scale bars.
  Build, 229 tests, lint and browser smoke pass; Potomac visual QA has 0
  findings at 18 captures (stub-online, and offline with zero requests).
  Contact sheets and phone captures were inspected. Next: Wave 4 (J, K, L).
- 2026-10-21: Ran M2 Wave 2. D: theme presets resolved at compile time,
  generated theme.css, token-only style.css, bundled OFL fonts with licences.
  E: sidecar, overlay-cards and full-bleed layouts with a phone bottom sheet,
  panel rail, camera padding and responsive zoom; QA now flags edge-clipped
  targets. F: theme tint for OpenMapTiles and Shortbread layers, hillshade,
  sky and globe. G: five critic rules as check/build warnings; credits use
  resource names. Build, 148 tests, lint and browser smoke pass. Visual QA on
  Potomac: 0 findings (stub-online; offline with zero requests), plus
  overlay-cards/night and full-bleed/atlas variants; a live run with
  OpenFreeMap tiles and Mapterhorn terrain confirmed tint, terrain,
  hillshade, sky and pitch. Contact sheets were inspected. Next: Wave 3 (H, I).
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
