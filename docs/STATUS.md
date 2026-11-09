# MapBard — Status

**Updated 2026-10-23. [M2 — Visual Engine](visual-engine.md) is active; its
execution plan is [m2-visual.md](m2-visual.md). Waves 1–3 are complete;
V1 closed on 2026-10-23: the owner
[scored](m2-scoring.md#owners-scores-and-named-defects) both Potomac
variants 77/100 (target ≥ 75), and the pushed CI run passed on three OSes,
with both `visual` jobs matching the Linux goldens exactly. All five
packages are published (`latest`): `mapbard` and `@mapbard/renderer` at
0.2.1 (the `file://` worker fix), the others at 0.2.0. V2's detailed plan is in
[m2-visual.md](m2-visual.md#v2--3d-data-change-and-flows); the owner settled
its decisions, step 5.0 (spike) has run, the owner confirmed its
[backend table](m2-visual.md#50-results-2026-10-23), and step 5.1 (the
foundation: compiled 0.4.0, tier loading, altitude projection) and step
5.2 (M: MapLibre 3D and change; N: deck.gl tier, arcs and trips) and
step 5.3 (O: Potomac V2; P: the migration-flows example) are done.
Step 5.4's five-project Linux goldens are generated and independently
verified (126/126 exact matches); next: owner V2 scoring and named fixes.
Live terrain captures were inspected, but live idle timeouts remain.** [M1](m1-cli.md) is complete. The owner deferred the fresh Claude
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
  `night`, `atlas`, `newsroom`), context colours from theme tokens when a
  layer sets none, layout frames, WCAG contrast, six critic rules (raw
  identifiers, caret units, hidden contrast, inconsistent scales, palette
  contrast, and `TEXT_OVERFLOW_LIKELY` for narration that would scroll in
  the phone sheet), size budgets (core JS ≤ 450 KB gzip, all tiers ≤ 1.2 MB)
  and provider catalog for OpenFreeMap, VersaTiles, Mapterhorn and AWS
  Terrarium. Size encodings and shared size scales take `maxRadius`
  (4–48 px, default 16).
- Visual QA: `mapbard check --visual [--network offline|stub|live]
[--fail-on-warnings]` runs `check`, builds into `.mapbard-visual/build/`
  (offline by default) and returns the findings as `VISUAL_*` diagnostics,
  with `report.json` and `contact-sheet.png` in `.mapbard-visual/captures/`.
  It never edits the project or its lockfile. Without a usable Chromium it
  reports `VISUAL_BROWSER_MISSING` (exit 1). `node scripts/visual-qa.mjs
<publication> <out>` runs the same capture on any build. Each scene is
  captured at p = 0, 0.5 and 1 at desktop and phone sizes. A flight sweep
  samples every 0.05 across each moving scrub camera track and tags each
  finding `rest` or `flight`. Symbols and targets passing under panels in
  flight are warnings; everything else is an error. Captures use SwiftShader
  on every OS. The capture also writes a contact sheet and reports console errors, remote requests and occlusion findings
  (panels, map controls, edge clipping, callout overlap, callouts covering
  targets, and point symbols without a callout hidden by panels, controls or
  labels). Offline runs compare each capture with the project's
  `goldens/` (`--update` rewrites them from five runs and sets the
  tolerance from the measured noise); goldens from another platform give
  one non-gating warning. `--network unavailable` aborts every request and
  checks the basemap notice and local layers; stub serves flat terrain; live
  ignores terrain-host 404s. `--frames` reports p95/p99 frame intervals,
  and `build` and `check --visual` report gzip sizes against the budgets.
  The player hides a callout that cannot be placed clear of panels,
  controls and other callouts, and credits each basemap provider once. The compiled page exposes `data-mb-state` and a read-only
  `window.MapBardStory` hook (`symbols()` lists shown point symbols); `seek`
  exists only with `MAPBARD_CAPTURE`. `node scripts/frame-probe.mjs
<publication>` scrolls a story and reports frame intervals.
- `mapbard` CLI: `init`, `add`, `inspect`, `lock`, `check` (and `check --visual`), `build`, `preview`,
  `capabilities`, `schema`, `migrate` and `skill install`, with JSON envelopes.
  `capabilities` lists capability IDs, compiled techniques, themes, layouts,
  motion presets, modes and easings, basemaps, terrain, and whether a
  headless Chromium is available for visual checks.
- `skills/mapbard` 0.2.0: a versioned agent workflow pack with format,
  technique, layout, motion, cartography, diagnostic (every code, including
  critic, `VISUAL_*` and budget codes) and data-honesty guidance, installed
  by the CLI; the workflow includes `check --visual`.
  A direct CLI trial from raw Potomac files reached `check` and `build`.
- Examples: `examples/projects/potomac` (atlas) and
  `examples/projects/potomac-night` (night), with identical data and story
  (format 0.2, four scenes; V2 since 5.3: 2024 gauges as 3D columns on one
  shared height scale that grow downstream, 2025 change columns that shrink
  from their 2024 heights beside 2024 ghosts with compiled change labels and
  a scrub orbit, a push-in on Little Falls and a pull-back with size-form
  change symbols), Mapterhorn terrain with hillshade and sky. Both build
  online and offline; their committed Linux goldens cover V2.
  `examples/projects/migration-flows` (newsroom, full-bleed, deck.gl
  arcs): the 30 largest 2024 ACS state-to-state flows with margins of
  error, in four scenes. The format 0.1
  `first-slice` project remains as a migration regression fixture.
- A root README has a five-minute human and coding-agent quickstart.
- Release packages: all five (`mapbard`, `@mapbard/core`, `schema`,
  `knowledge` and `renderer`) are published on npm (`latest`,
  2026-10-23): `mapbard` and `renderer` at 0.2.1, the others at 0.2.0.
  Each has a README, changelog, MIT license, explicit
  published files, exports and Node engine. Changesets, three-OS CI and a
  manual npm release workflow are configured. The public `mapbard@0.2.1`
  CLI installed from npm and reported 0.2.1.
- V2 foundation (step 5.1, unreleased): compiled spec 0.4.0 with a backend
  per layer (`maplibre`, or `deck` for arcs and trips), derived sources,
  height and width scales, `grow`, `morph` and `trail` tracks and a theme
  `light` token. The V2 techniques (column, extrusion, change, hexbin, arc,
  trip) compile and draw (step 5.2, unreleased; `capabilities` lists
  them). M: columns (24-sided footprints, staggered `grow`), extrusions,
  change symbols (ring and disc, or ghost and solid column; compiled
  change labels as generated callouts), morphs through feature state and
  hexbins (flat or extruded) as MapLibre layers, with callouts on column
  tops, height, change and hexbin legends, theme light for 3D stories and
  the critic rules `DEPTH_UNSEEN` and `ENCODING_AREA_DISTORTED`. N: a
  deck.gl 9.4 tier (`vendor/tier-deck.js`, 240.5 KB gzip, shipped only to
  stories that use it) drawing arcs and trips through an interleaved
  `MapLibreOverlay`, with flow legends, a trip clock, a per-tier 400 KB
  budget warning, and `CAPABILITY_UNSUPPORTED` for deck techniques with
  terrain or globe. Technique galleries: `fixtures/visual/gallery-maplibre`
  and `gallery-deck`, from public-domain data, with Linux goldens.
- Checks: 368 routine tests (schema 45, knowledge 31, core 128, renderer 121,
  CLI 38, root 5, browser smoke 1), lint and `actionlint` pass; the Windows
  tarball install smoke passed on 2026-10-23 at 0.2.0. A live OpenFreeMap style and multiple vector tiles loaded in headless
  Chrome with HTTP 200 and no failed requests; the screenshot was inspected.

## Known issues

- Visual quality was below the bar (<60/100) before M2. The defects are listed in
  [visual-engine.md](visual-engine.md#why-the-current-output) (M2). Fixed
  in Wave 1: raw legend IDs, caret units, and the encoding that hid the 2025
  drop. Fixed in Wave 2: all 6 layout findings; Potomac's QA report is clean
  at desktop and phone sizes (stub-online and offline). Fixed in Wave 3:
  annotation buttons over small symbols, and gauges merging into one blob in
  the phone overview; QA is clean at p = 0, 0.5 and 1. Fixed in Wave 4 (K):
  symbol size (`maxRadius`), context colours from the theme, the double
  OpenFreeMap credit, flight callout collisions and long phone narration.
  The owner scored both variants 77/100 on 2026-10-23 (target ≥ 75); the
  weakest areas are motion and camera (9/15) and attention and annotation
  (10/15).
- Motion limits: `stagger` cannot apply to
  `line-reveal` or to scrub and step tracks (diagnostics say so). Frame
  timing is measured in headless Chrome with software WebGL, so it shows
  main-thread cost, not GPU frame rate. With 5,000 extra points in one scene,
  callout placement still costs about 42 ms per frame at p95 on a phone-sized
  map (desktop 16.7 ms); 1,000 points stay within 16.7 ms on both.
- `check --visual` on both Potomac V2 variants: 0 errors at stub, offline
  and unavailable, with 11 in-flight symbol warnings in each. Live runs on
  2026-11-04/05 stopped at 1–3 `VISUAL_RUNTIME` 15 s idle timeouts in the
  2024 flight (mostly phone p = 0.6); V1 from `main` timed out at the same
  sample, so slow tile hosts are the likely cause; recheck in 5.4. On
  desktop a gauge passes under the media at 2024 p = 0.45 and under the
  story column at p = 0.9. On phones gauges pass under the media at
  p = 0.3–0.45 and under the attribution, scale bars or north arrow at
  p = 0.7–0.85 in the 2024 flight, and Point of Rocks under the legend at
  scope p = 0.35–0.4. Offline frame probe: desktop p99 50 ms (V1 the same),
  phone 16.8 ms. For scoring: night-theme 2024 ghosts read faintly, and the
  2025 phone overview columns are only a few pixels tall.
- The Linux goldens (made in the `mcr.microsoft.com/playwright:v1.64.1-noble`
  image) matched ubuntu-latest exactly in the first `visual` CI run on
  2026-10-23. Windows captures differ from them by 0.8–4.5% (DOM text wraps
  differently), so local Windows checks give one non-gating warning.
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

- 2026-11-08: Generated all five Linux golden sets through CI run
  42554670343 (all eight jobs passed), inspected all five contact sheets,
  and independently compared fresh captures in the Playwright Linux
  container: 126/126 exact matches, five-run noise 0. Offline and
  unavailable: 0 errors; each Potomac variant retains 11 flight warnings,
  others 0. Three-OS build/test/lint/package checks passed in CI. No
  runtime or tolerance changes. Next: owner V2 scores (target ≥ 80), named
  fixes, then 5.5; live idle timeouts and performance gaps remain open.

- 2026-11-08: Started 5.4: expanded visual CI to five explicit project
  paths and prepared V2 owner scoring sheets; corrected the stale plan
  introduction. Windows/Linux builds and lint pass. Windows tests failed
  14 core tests on timeouts (plus cleanup errors); Linux core passed
  127/128 with one timeout under capture load; a final Windows rerun with
  captures stopped passed all 375 tests including browser smoke.
  `actionlint` unavailable. Atlas live: two idle
  timeouts, 12 warnings; night live: one timeout, 12 warnings. Both contact
  sheets and atlas full-size terrain captures inspected.
  Linux golden update failed at contact-sheet generation (30 s timeout);
  stopped the batch and preserved committed goldens. Next: regenerate
  Linux goldens without concurrent captures, finish live review,
  then owner scoring and CI after an explicitly requested push.

- 2026-11-05: Step 5.3 merged: O (Potomac V2 columns and change symbols,
  both variants; phone rail CSS fix beside a basemap notice) fast-forwarded,
  then P (`examples/projects/migration-flows`; arc legend key deduped per
  source and colours) merged; built in parallel worktrees, see each "as
  built" note in m2-visual.md. Old 5.2 worktrees removed. Checks on the
  merge: build, 374 tests and lint pass; `check --visual` 0 errors on both
  Potomac variants (offline 13 warnings: 11 in flight, the offline notice,
  the Windows golden mismatch; unavailable 11), migration-flows (offline
  only the offline notice; unavailable 0) and both galleries offline (only
  the offline notice); Potomac and migration-flows contact sheets
  inspected. From the agents only: stub runs, live runs (Potomac 1–3
  idle-timeout errors per variant, as V1 from main that day),
  frame probe (offline desktop p99 50 ms, phone 16.8 ms, V1 the same).
  Not met: Potomac live 0 errors, desktop p99 ≤ 16.7 ms. Not run: the
  1,000-feature morph probe, CI (no push; the `visual` job will fail on the
  stale Potomac goldens until 5.4). Next: step 5.4.
- 2026-10-28: Step 5.2 merged (`5c6a8fe`): M (columns, extrusions,
  change symbols, morph, hexbins, `DEPTH_UNSEEN`,
  `ENCODING_AREA_DISTORTED`, gallery-maplibre) and N (deck.gl 9.4 tier,
  arcs, trips, flow legends, per-tier budget, gallery-deck), built in
  parallel worktrees; see each "as built" note in m2-visual.md. Checks on
  the merge: build, 368 tests and lint pass; `check --visual` 0 errors on
  both galleries (offline and stub, 0 warnings beyond the offline-basemap
  notice) and both Potomac variants (offline 6 and stub 8 in-flight
  warnings, as before); both gallery contact sheets inspected. Not run:
  live and unavailable runs on the merge (N saw live idle timeouts, also
  on Potomac), frame budgets (gallery-deck desktop p99 50 ms under
  SwiftShader), Linux goldens (5.4), CI (no push). Next: step 5.3, O ‖ P.
- 2026-10-23: Owner confirmed the V2 backend table. Step 5.1 (`cd39f47`):
  compiled 0.4.0 (layer backends, derived sources, height and width
  scales, `grow`/`morph`/`trail` tracks, generated callouts, theme
  `light`), V2 schema fields, stub technique modules answering
  `CAPABILITY_UNSUPPORTED`, tier loading with a stub deck tier, and
  `projectAltitude`. Checks: build, 308 tests, lint and browser smoke
  pass; a stub-deck story ran from `file://` in headless Chrome (ready,
  layer bound to the tier, 0 requests, no console errors) and the size
  report counts the tier; Potomac's compiled spec differs from 0.2.0's
  only by version, `theme.light`, backends and an empty `derived`; in the
  Linux Docker image both Potomac variants matched their goldens (24/24
  each, worst difference 0, 0 errors, 6 offline in-flight warnings as
  before). Not run: `actionlint` (no workflow change), live runs, CI (no
  push). Next: step 5.2, M ‖ N in parallel worktrees.

- 2026-10-23: Owner settled the V2 decisions (MapLibre for columns,
  extrusions, change and hexbins; compile-time change values; ACS
  state-to-state migration flows; score target ≥ 80). Ran step 5.0 on the
  throwaway branch `spike/v2-5.0` (`spike/`): MapLibre extrusions sit on
  live terrain; deck.gl columns are buried by the terrain height (40–50%
  short on ridges); morphs redraw every frame only with feature state
  (paint and `global-state` re-layout: 37–40% of frames at 5,000);
  tier 231.5 KB gzip with arcs, 243.2 KB with trips; SwiftShader noise 0;
  `file://` offline 0 requests; deck.gl arcs fail on the globe; altitude
  projection ≤ 0.1 px. Live captures inspected. No package code changed,
  so no build, tests or lint run; measurements in headless Chrome only,
  not on phone hardware. Next: owner confirms the backend table, then
  step 5.1.
- 2026-10-23: Released 0.2.1 at the owner's request (`mapbard` and
  `@mapbard/renderer`; schema, core and knowledge stay 0.2.0). Applied
  the changeset, then build, all tests (browser smoke included), lint and
  `test:pack` passed locally. Pushed `8e65224`; release run 39923995931
  passed `verify` on three OSes and published both with `latest` (a first
  dispatch with a mistyped ref, 39923939583, was cancelled). The registry
  served the renderer tarball about 6 minutes after publish; a clean
  `npm install mapbard@0.2.1` reported 0.2.1 and carries the Blob worker.
  Next: owner decisions on V2, then step 5.0.
- 2026-10-23: `file://` fix. In a reader's Chrome, stories opened from
  `file://` drew no basemap or layers: Chrome blocks `new Worker` on a
  `file://` script, and MapLibre 6 starts a module worker for a cross-origin
  Blob, which Chrome also blocks there. The page now loads the worker source
  as a string (`vendor/maplibre-gl-worker.js`) and passes MapLibre a Blob URL
  ending `#.cjs` (MapLibre's switch to a classic worker; recheck it on a
  MapLibre upgrade). Every browser launch drops
  `--allow-file-access-from-files`, which had hidden the failure, and the
  smoke test now waits for the map to go idle; it fails on the old player.
  Checks: renderer, core, schema, knowledge and CLI tests, lint,
  `test:browser` (system Chrome 155), `check --visual` on Potomac (ok; the
  Linux goldens give the usual cross-platform warning on Windows), and
  screenshots matching between `file://` and HTTP. Not run: Linux goldens,
  Firefox and Safari. Next: owner decisions on V2, then step 5.0.
- 2026-10-23: Planned V2 in m2-visual.md (Wave 5, steps 5.0–5.5): a
  spike, a foundation commit (compiled 0.4.0, tier loading, altitude
  projection), then M (MapLibre columns, extrusions, change symbols,
  hexbins, morphs) ‖ N (deck.gl 9.4 tier via `@deck.gl/maplibre`, arcs,
  trips), then O (Potomac V2) ‖ P (flows example), goldens and scoring,
  and Q (skill pack, 0.3.0). Open owner decisions: MapLibre rather than
  deck.gl for columns (deck.gl draws at sea level under terrain),
  compile-time change values before M3, the flows dataset and a ≥ 80
  score target. Docs only; no checks run. Next: owner decisions, then
  step 5.0.

- 2026-10-23: Released 0.2.0 at the owner's request. Applied the
  changeset (all five packages 0.2.0, changelogs), then build, 276 tests
  (browser smoke included), lint and the tarball install smoke passed
  locally. Pushed `a519768`; release run 39912450817 passed `verify` on
  three OSes and published all five with the `latest` tag. The registry
  lists 0.2.0 as `latest` for each, and `npm exec mapbard@0.2.0` reported
  0.2.0 and listed the themes and layouts. Changesets made git tags on the
  runner only; none are pushed, as with earlier releases. Next: V2's
  detailed section in m2-visual.md.

- 2026-10-23: V1 closed. Pushed 28 commits to `main` at the owner's
  request. CI run 39910445623 passed: `verify` on ubuntu, macOS and
  Windows, and `visual` for both Potomac variants (24/24 goldens matched,
  worst difference 0; 0 errors; in-flight symbol warnings only, 6 offline
  and 7 tiles-unavailable per variant, as on Windows).
  Docs record V1 as closed. Not published; the 0.2.0 changeset waits for
  the owner. Next: V2's detailed section in m2-visual.md.

- 2026-10-23: Two CLI fixes found while the owner previewed Potomac.
  `preview` rebuilt forever (about 70% CPU per server) because the
  watcher did not ignore the renderer's `..<output>.next-*` staging copy;
  it now does, and a test saves one edit and asserts one rebuild. `lock`
  wrote profiles in a different key order from `build`, so alternating
  them moved `crs` in an unchanged lockfile; both now write schema order
  (core test added). Build, 276 tests (browser smoke included) and lint
  pass; `lock` and `check` leave both Potomac lockfiles unchanged.

- 2026-10-23: Step 4.4 (L). `capabilities` lists themes, layouts, motion
  options and visual-check readiness (it launches and closes a headless
  Chromium, about 0.7 s); a test asserts the lists match the schema enums
  the compiler accepts. Skill pack 0.2.0 with new `motion.md` and
  `layout.md`, every M2 diagnostic code with its remedy, and
  `check --visual` in the workflow. Package READMEs updated; a changeset
  bumps all five packages to 0.2.0 (not applied). Build, 275 tests
  (browser smoke included), lint and the tarball install smoke (via
  npmmirror) pass. No player change, so no visual run. Not pushed or
  published. Next: the owner decides on a push, which runs CI and the
  `visual` job (the last V1 condition), then a 0.2.0 release.

- 2026-10-23: Step 4.3 complete. The owner viewed both stories online in
  `preview` and scored atlas 77 and night 77 (place 13, encoding 16, motion
  9, attention 10, type 12, depth 8, polish 9 on each) and named no
  defects. Scores recorded in `docs/m2-scoring.md`. Docs only; no checks
  run. Next: step 4.4 (L).

- 2026-10-23: Step 4.3 scoring sheets in `docs/m2-scoring.md` (one per
  variant: evidence and known gaps for the seven quality-bar areas), also on
  a private page with captures and score fields. Fresh evidence: build;
  `check` clean on both; `check --visual` 0 errors on both at stub, offline,
  unavailable and live (6–8 flight symbol warnings, unchanged); offline
  frames p99 8.5 ms; core JS 409 KB gzip. Two runs side by side missed the
  15 s idle timeout mid-flight (1–2 errors); each rerun alone passed. Live
  and offline contact sheets and seven full-size captures inspected. No
  tests or lint run (docs only). Next: the owner scores both variants.

- 2026-10-22: Step 4.2 (J2 ‖ K in parallel worktrees, merged) and the
  goldens part of 4.3. J2: goldens with `--update`, `--network
unavailable`, size budgets, `--frames`, a `visual` CI job, and a fix for
  the style fallback stopping after two failed styles. K: atlas and night
  Potomac variants (four scenes; limits split into limits and scope),
  context colours from the theme, `maxRadius`, callout hiding, providers
  credited once, a compact phone notice rail, `TEXT_OVERFLOW_LIKELY`. Lead:
  flat terrain under stub, terrain 404s ignored in live, one non-gating
  warning for cross-platform goldens, Linux goldens made in Docker. Build,
  274 tests, lint, browser smoke and actionlint pass; `check --visual` has
  0 errors on both variants at stub, offline, unavailable and live (6–8
  flight symbol warnings); Linux goldens match in Docker; live captures of
  tint, hillshade, pitch and sky inspected. Frame probe p99 8.5 ms (run by
  the workers, not rerun after the merge). CI not run (no push). Next: 4.3
  scoring sheets and the owner's scores.

- 2026-10-22: Step 4.1 (J1). Visual QA moved into the CLI as TypeScript
  (`packages/cli/src/visual/`) behind `mapbard check --visual`, with a
  flight sweep, rest and flight phases, grouped `VISUAL_*` diagnostics,
  SwiftShader on every OS and `playwright-core` loaded only for
  `--visual`. Diagnostic codes for the rest of Wave 4 were added up front.
  `scripts/visual-qa.mjs` is a thin wrapper. Build, 241 tests, lint and
  browser smoke pass. On Potomac, rest findings are 0 at stub and offline (as
  before), and the sweep finds 19 at stub and 14 offline on the 2024 flight.
  The flags were ruled out as a cause (also 19 without them). A live run was
  done and a phone capture inspected. The frame probe was not rerun (no
  player change). Next: step 4.2, J2 ‖ K in parallel worktrees.

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
