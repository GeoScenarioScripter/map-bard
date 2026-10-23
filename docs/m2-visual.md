# M2 — Visual Engine: execution plan

Updated 2026-10-23. Status: **active; V1 closed 2026-10-23.** Waves 1–4
are complete: both Potomac variants scored 77, and the `visual` CI job
passed with the Linux goldens matching exactly. V2's detailed section is
[written](#v2--3d-data-change-and-flows); its owner decisions are open.
Next: step 5.0 (spike). Part of the
[roadmap](ROADMAP.md). The design reference is
[visual-engine.md](visual-engine.md) (architecture, motion model, technique
catalog, quality bar). This file is the order of work.

## Outcome

M2 is delivered in the four slices V1–V4 from
[visual-engine.md](visual-engine.md#delivery-slices). This plan details **V1**
(Tier-0 polish, motion, layouts, callouts, visual QA and critic) and **V2**
(3D data, change and flows). V3 and V4 get a detailed section here when the
slice before them closes; their outline is at the end.

**V1 is done when** the redesigned Potomac story (terrain, motion, fixed
encoding, no collisions) scores **≥ 75/100** on the
[quality bar](visual-engine.md#quality-bar), judged by the owner, and the
visual QA run passes in CI.

## Decisions for V1

- **Authored format stays 0.2.0.** V1 only adds optional fields, so every
  existing 0.2 project stays valid. An older CLI rejects a newer field with
  the usual strict-schema diagnostic. A format bump is reserved for a breaking
  change.
- **The compiled spec moves to 0.3.0 when motion lands (Wave 3),** because the
  player contract changes from step scenes to progress tracks. Before that,
  additive compiled fields (such as scale `title`) keep 0.2.0: the compiled
  spec is regenerated on every build and never read back, so it needs no
  migration.
- **Display text is compiled, not guessed by the player.** The compiler emits
  legend titles, unit labels and formatted class labels; the player only
  renders them.
- **Visual QA starts as repository tooling (Wave 1),** then becomes
  `mapbard check --visual` (Wave 4). It uses `playwright-core` (Apache-2.0)
  with a system Chrome or `MAPBARD_CHROME_PATH`; no browser download is
  bundled.
- **Goldens never depend on live tiles.** Golden runs use the offline build or
  a committed local style fixture. Live tiles get a separate, non-gating run.
- Number formatting is `en-US` only (no locale work; see the roadmap).

## Waves

A wave is a batch of items with no dependency on each other, so they can run
in parallel. There are no gates: each item lands as focused commits with tests
and a STATUS.md log line.

| Wave | Items                                                                                                | Depends on              |
| ---- | ---------------------------------------------------------------------------------------------------- | ----------------------- |
| 1    | A. Visual QA capture · B. Honest display text · C. Classification and scales                         | —                       |
| 2    | D. Themes and typography · E. Layout templates · F. Basemap styling · G. Static critic rules         | Wave 1 (A for checking) |
| 3    | H. Motion engine (compiled 0.3) · I. Callout and legend engine                                       | D, E                    |
| 4    | J. `check --visual`, goldens and CI · K. Potomac V1 redesign and scoring · L. Skill pack and release | All above               |

## Wave 1

### A. Visual QA capture

Goal: a repeatable way to see and measure a publication before changing how it
looks, and a recorded baseline of today's Potomac.

- **Player readiness hook.** The compiled page sets
  `document.documentElement.dataset.mbState` to `loading`, `ready` or `error`,
  and exposes a read-only `window.MapBardStory` with `sceneIds`,
  `activeSceneId()` and `whenIdle()` (resolves on the next MapLibre `idle`).
  QA reaches scenes by scrolling, as a reader does, so the hook cannot drive
  playback. The workbench (M5) can extend it.
- **Shared browser launcher.** Move the Chromium launch logic from
  `tests/browser.smoke.mjs` into `tests/browser.mjs` (system Chrome fallback,
  `MAPBARD_CHROME_PATH`, `--allow-file-access-from-files`) so smoke and QA share
  it.
- **`scripts/visual-qa.mjs <publication-dir> <out-dir> [--online-stub]`.** For
  each scene and viewport (desktop 1440×900, phone 390×844) it enters the scene,
  waits for idle, and writes:
  - `<scene>-<viewport>.png`
  - `contact-sheet.png`, a labelled grid composed in the same browser from the
    captured PNGs (no image library needed)
  - `report.json`: console errors, page errors, remote requests, and
    **occlusion findings**: DOM rects of annotation markers and media anchors
    that intersect the active scene card, legend, controls or media panel
- Progress positions (0, 0.5, 1) are captured once motion exists (Wave 3); until
  then each scene is captured in its settled state.
- **Baseline.** Run it on today's Potomac (offline and online-stub builds) and
  record the findings in STATUS.md. The known defects (card covers Hancock,
  legend overlaps the card) must show up as occlusion findings; if they don't,
  the check is wrong.

Done when: `node scripts/visual-qa.mjs` produces screenshots, a contact sheet
and a report for Potomac; the report flags the known collisions; a small test
covers the occlusion geometry.

### B. Honest display text

Goal: nothing user-facing shows an internal ID or an unformatted unit.

- **Unit labels.** A deterministic `formatUnit()` in `@mapbard/knowledge`:
  caret exponents become superscripts (`ft^3/s` → `ft³/s`, `km^2` → `km²`,
  `m^-1` → `m⁻¹`), other text is kept. Authored units stay as written in the
  data declaration; only display changes.
- **Number labels.** One formatter for legends and class labels: thousands
  separators, no float noise (`8,253` not `8253.333333`), half-open ranges
  written as `580 – 8,253 ft³/s`.
- **Legend titles.** Optional `label` on attribute declarations and optional
  `title` on shared scales. The compiler resolves a scale's `title` from the
  shared-scale title, then the attribute label, then a sentence-cased attribute
  name (`daily_mean_discharge` → "Daily mean discharge"), and emits `title` and
  `unitLabel` on every resolved scale. The legend shows the title and unit,
  never the scale ID.
- **Category labels** drop the `(string)` type suffix.
- **Potomac text** uses ft³/s in narration and annotations.

Done when: compiler and legend tests assert titles, unit labels and number
formatting; the Potomac legend reads "Daily mean discharge (ft³/s)".

### C. Classification and shared scales

Goal: the encoding can show the story's contrast; the Potomac 90% drop becomes
visible on the map.

- **Methods.** `equal-interval` (existing), `quantile`, `natural-breaks`
  (Jenks, deterministic) and `manual` (`breaks: number[]`, strictly increasing,
  inside the domain). Each has a capability ID (`color.quantile`,
  `color.natural-breaks`, `color.manual-breaks`), a diagnostic for too few
  distinct values, and the same label formatting as B.
- **Shared scales** accept every method above, plus `visualVariable: "size"`
  for graduated symbols (sqrt-area, one domain across all members, `[0, max]`).
  Member layers must agree with the shared scale's variable and method;
  otherwise `MEASUREMENT_INCOMPATIBLE` with a remedy.
- **Potomac** switches the gauges to graduated symbols on one shared size
  scale, so the 2025 circles are visibly about a tenth of the 2024 area-scaled
  values, with the nested-circle legend.

Done when: scale unit tests cover each method (including ties and a single
distinct value); a compile test covers a shared size scale across three scenes;
the Potomac build, browser smoke and the QA capture show the new encoding.

## Wave 2

Complete. As built, beyond the items below: the compiled spec carries the
resolved `theme` and `layout` (additive under 0.2.0); legends, controls, media
and notices stack in one rail (right on desktop, top on phones) that also pads
the camera; the camera zooms out (never in) when the free map area is smaller
than on the 1440×900 reference desktop, so authored targets stay visible on
phones; and visual QA flags targets clipped by the screen edge. `sidecar` is a
solid text column; today's floating cards are `overlay-cards`.

### D. Themes and typography

- `theme.preset`: `editorial-light` (default), `night`, `atlas`, `newsroom`.
  Each preset is a token set in `@mapbard/knowledge`: palette, sequential and
  diverging ramps, text and card colours, type scale, card style and basemap
  tint. Authored `theme` fields override preset tokens.
- `runtime/style.css` becomes token-driven (CSS custom properties); the theme
  CSS is generated from resolved tokens, not hand-edited per story.
- Fonts: two or three OFL families copied into the build (`fonts/`), with
  their licence files, so offline builds keep typography. Candidates: Inter
  and Source Serif 4 (both OFL). Record licences in the dependency notes.

### E. Layout templates

- `layout`: `sidecar` (default, a text column), `overlay-cards` (the pre-M2 floating cards), `full-bleed`; `split` and
  `chapter` follow in V4 unless they are cheap.
- Each layout declares the screen rectangle it reserves for the card at
  desktop and phone widths. The player applies it as MapLibre camera
  `padding`, so the camera centre and `fitBounds` targets stay out from under
  the card. This removes the Hancock occlusion without moving the gauges.
- Mobile-first: on phones the card becomes a bottom sheet with a reserved
  bottom inset.

### F. Basemap styling

- **Tint.** Recolour OpenMapTiles layers (water, landcover, landuse, roads,
  boundaries, labels) from theme tokens for OpenFreeMap and VersaTiles styles;
  unknown layers are left alone. Label density `full/minimal/off` keeps its
  current meaning.
- **Hillshade.** When terrain is on, add a `hillshade` layer from the same DEM
  below roads and labels, with theme-tinted shadow and highlight colours.
- **Sky, fog and globe.** `basemap.sky` (on/off, from theme tokens) and
  `basemap.projection: "mercator" | "globe"`, both through MapLibre 6.
- Offline builds keep ignoring online styles and terrain, and stay at zero
  requests.

### G. Static critic rules (`mapbard check`)

Rules live in `@mapbard/knowledge` as pure functions over the compiled spec
and project, each with a code, path, IDs and remedy:

- raw identifiers in user-facing text (scene titles, legend titles, labels)
- caret units in narration or annotations
- story contrast hidden: features named in the same scene's annotations or
  compared across a shared scale fall into the same class
- inconsistent scales: the same attribute compared across scenes on different
  scales
- palette contrast against the theme's basemap land and water colours

Occlusion stays in visual QA (I and J), because it needs projected
coordinates.

## Wave 3

H and I share the player, the compiled spec and the QA script, so the wave is
staggered. A foundation commit lands first: compiled spec 0.3.0 with a
per-scene `motion` contract (`@mapbard/schema` `motion.ts`; the compiler emits
a held camera from `core/src/compile/motion.ts`), and a per-frame hook on the
map adapter (`onFrame`, `project`). H and I then run in parallel on top of it.
H owns `motion.ts`, the scroll module and camera/layer track playback; I owns
the callout overlay and legends and does not edit the scroll module.

### H. Motion engine (compiled 0.3.0)

- **Scroll progress.** Replace the IntersectionObserver "winner" with a scroll
  module that reports the active scene and `p ∈ [0, 1]`, honouring
  `scrollLength` (scene height in viewport heights) and `trigger`.
- **Compiled tracks.** The compiler resolves authored `motion` (story-wide in
  `mapbard.json`, `motionPresets`, scene `motion`, per-track overrides; most
  specific wins) into typed tracks with explicit final states:
  - camera keyframes (center, zoom, pitch, bearing) with easing
  - layer property tracks: opacity, line reveal fraction, highlight strength
- **Presets** resolved at compile time from project geometry:
  `reveal-from-overview`, `push-in <feature>`, `orbit`, and
  `fly-along <line feature>` (path simplified, bearing from path tangent).
- **Modes** `scrub`, `play`, `loop`, `step`; defaults are camera scrub, data
  play, ambient loop. Easing: named, `cubic-bezier`, `spring`.
- **Reduced motion:** `step` by default, `shorten` and `keep` on request; a
  pause control for any loop (WCAG 2.2.2).
- QA captures each scene at p = 0, 0.5 and 1.

### I. Callout and legend engine

- Replace popup-button annotations with an overlay layer positioned from the
  map projection every frame: label, leader line, target halo.
- Collision-aware placement: candidate positions around the target, scored
  against the card rectangle, legend, other callouts and the target itself;
  deterministic tie-breaks.
- Legends per technique: class ramp, categories, nested circles, with title
  and unit from B. Auto scale bar, and a north arrow when bearing ≠ 0.
- QA occlusion uses the callout rects, so the report can fail a story.

## Wave 4

Planned 2026-10-22; step 4.1 done the same day. J, K and L touch each other's results:
K's flights need J's sweep to be verified, the goldens must capture K's final
look, and L documents everything. So the wave is staggered like Wave 3:

| Step | Work                                                              | Runs                             |
| ---- | ----------------------------------------------------------------- | -------------------------------- |
| 4.1  | J1: visual QA moves into the CLI, with the flight sweep           | Lead, first                      |
| 4.2  | J2: goldens, size budgets, "tiles unavailable" run, CI job ‖ K    | Parallel worktrees on top of 4.1 |
| 4.3  | Commit the goldens for K's final look; owner scores both variants | Lead; needs the owner            |
| 4.4  | L: skill pack, capabilities, READMEs, changeset                   | Lead, last                       |

J2 owns `packages/cli/src/visual/` (except the capture code from 4.1),
`.github/workflows/` and the budget numbers. K owns `examples/`, the
compiler's colour defaults, the player's callout hiding and attribution, and
the narration-length critic rule. Neither edits the other's files; K uses
`check --visual` as 4.1 left it.

Owner decisions (2026-10-22):

- **Size budget.** MapLibre 6.1 alone is 384 KB gzip (252 KB main thread,
  132 KB worker), so the 300 KB core budget could never pass. The core budget
  is now **≤ 450 KB gzip** for the page's JavaScript, worker included. The
  all-tiers budget stays at 1.2 MB. Going over the budget is a warning, not
  an error. Today's Potomac is about 408 KB.
- **Two Potomac variants, both kept as examples:** atlas and night (see K).

Owner checkpoints: scoring in 4.3 and before V1 closes. "QA passes in CI"
needs a push, so the CI part of V1's done-when waits until the owner asks for
one. Publishing happens only when the owner asks.

### J1. Visual QA in the CLI, with the flight sweep (step 4.1)

- **Move, don't fork.** `scripts/visual-qa.mjs` and `scripts/lib/occlusion.mjs`
  become TypeScript in `packages/cli/src/visual/`: `capture.ts` (browser,
  network modes, seek, rect collection), `occlusion.ts` (the pure geometry,
  unchanged rules), `contact-sheet.ts` and `report.ts`.
  `tests/occlusion.test.mjs` moves into the package. `scripts/visual-qa.mjs`
  stays as a thin wrapper so the STATUS commands still work.
  `tests/browser.mjs` keeps the shared launcher. The CLI gets its own copy of
  the launcher, because packages never import repository files.
- **`mapbard check --visual`** runs the normal `check`. If `check` reports
  no errors, it builds into `.mapbard-visual/build/` (offline by default),
  captures into `.mapbard-visual/captures/` and returns the findings as
  diagnostics in the usual envelope. The result holds the counts and the
  paths to `report.json` and `contact-sheet.png`. Options:
  `--network offline|stub|live` (offline needs no basemap stub and makes
  zero requests), `--fail-on-warnings`, and `--update` (J2). Add
  `.mapbard-visual/` to the `init` template's `.gitignore` and to the
  preview watcher's ignore list.
- **Dependency.** `playwright-core` 1.64.1 (Apache-2.0) becomes a CLI
  dependency, loaded with a dynamic `import()` only by `--visual`. No browser
  is bundled. Without Chrome, `MAPBARD_CHROME_PATH` or Playwright's
  Chromium, it reports a `VISUAL_BROWSER_MISSING` diagnostic with the
  install remedy (exit 1, not a crash).
- **Diagnostic codes** (schema): `VISUAL_OCCLUSION` (target, symbol or
  callout covered or overlapping), `VISUAL_RUNTIME` (console or page error,
  undeclared or offline request, idle timeout, seek mismatch),
  `VISUAL_BROWSER_MISSING`, plus J2's `VISUAL_GOLDEN_MISMATCH` and
  `BUDGET_EXCEEDED`. Each carries `sceneId`. The message names the viewport,
  `p` and the overlapping element, and the remedy points at the
  matching layout, camera or callout setting.
- **Flight sweep.** Each scene is still captured at p = 0, 0.5 and 1 with
  screenshots. For each camera track, the sweep also samples geometry (no
  screenshot unless a sample has a finding) every 0.05 across the track's
  `range`. Each finding is tagged `phase: "rest"` or `"flight"`. Flight
  samples are those inside a track's range where the camera moves.
- **Severity.** Every rest finding is an error, as today. In flight, callout
  findings (`callout-occluded`, `callout-overlap`, `callout-covers-*`,
  `callout-offscreen`) stay errors: a label must never be covered. In
  flight, `symbol-occluded` and `target-occluded` become warnings. The map
  moves under the panels, and K fixes what is worth fixing. `--fail-on-warnings`
  makes them gate too.
- **Deterministic GPU.** Visual runs launch Chromium with
  `--use-angle=swiftshader --enable-unsafe-swiftshader` on every OS, so
  Windows and Linux use the same software rasteriser.

Done when: `mapbard check --visual` on both Potomac variants matches today's
`scripts/visual-qa.mjs` findings at the rest positions. The sweep reproduces
the recorded mid-flight overlaps (about 24 on the 2024 flight), each tagged
with the right phase. CLI tests cover argument parsing, the missing-browser
diagnostic, finding-to-diagnostic mapping and phase tagging, using a fake
capture so they don't need a browser. The browser smoke still passes.

As built (2026-10-22):

- **Codes for the whole wave land in 4.1**, so J2 and K never edit the
  schema's code list in parallel: `VISUAL_OCCLUSION`, `VISUAL_RUNTIME`,
  `VISUAL_BROWSER_MISSING`, `VISUAL_GOLDEN_MISMATCH`, `BUDGET_EXCEEDED` and
  K's `TEXT_OVERFLOW_LIKELY`.
- **Phase.** A sample is `flight` when a **scrub** camera track moves the
  camera there: strictly inside the track's `range`, on a keyframe segment
  whose two ends differ. The range ends and held segments are `rest`. This
  applies to the p = 0, 0.5 and 1 captures too, so Potomac's 2024 p = 0.5
  capture is a flight sample. Play, loop and step cameras are not swept,
  because captures settle them and scroll position never shows them moving.
- **Severity.** `target-offscreen` also warns in flight, like
  `target-occluded`. A target the camera carries past the edge is the same
  kind of problem.
- **Diagnostics are grouped.** Findings with the same scene, viewport, phase
  and subject become one diagnostic that lists each `p`, with the worst
  measurement. Visual findings use `artifact: "design"` and
  `path: ["scenes", i]`. Runtime findings use `"export"`.
  `--fail-on-warnings` promotes only visual warnings. The offline
  basemap-removal warning stays a warning.
- **`check --visual` leaves the project untouched.** `build` gained
  `refresh` and `record` options, so the visual build neither refreshes nor
  records into `mapbard.lock.json`. A stale lock fails the check step first.
  `--network` defaults to `offline`. `--network` or `--fail-on-warnings`
  without `--visual` is a usage error (exit 2).
- **Result.** Only the p = 0, 0.5 and 1 captures go on the contact sheet.
  Sweep samples are in `report.json` (`sweep`), with a screenshot only when
  they have a finding.
- **Repository wiring.** `scripts/visual-qa.mjs` imports `mapbard` (a root
  dev dependency now) and also runs the sweep. `tests/browser.mjs` stays for
  the smoke test and the frame probe, which J2 moves.
- **Checked on Potomac (the only variant until K).** Rest positions show 0
  findings at stub and offline, matching `scripts/visual-qa.mjs` before the
  move. The 2024 flight shows 19 findings at stub and 14 offline. Offline
  differs because the offline attribution is smaller. The limits push-in shows
  none. Without the SwiftShader flags the geometry is the same (19). The
  earlier one-off sweep reported 24. Its script was not kept, so the gap was
  not traced. A live run adds two rest findings on phones (see STATUS).

### J2. Goldens, budgets, "tiles unavailable" and CI (step 4.2)

- **Goldens.** `check --visual --update` writes
  `goldens/<scene>-p<P>-<viewport>.png` and `goldens/manifest.json` (MapBard
  version, Chromium version, platform, viewport list, tolerance) in the
  project. They come only from offline builds, so goldens never depend on
  live tiles. Without `--update`, each rest capture is compared with
  `pixelmatch` (ISC) and `pngjs` (MIT), with per-pixel threshold 0.1. A
  capture fails when more than the manifest's `maxDiffRatio` of its pixels
  differ. The ratio is set at three times the noise measured over five
  repeated runs on one machine, and the measurement is recorded in the
  manifest. A mismatch is `VISUAL_GOLDEN_MISMATCH` (error) and writes
  `<name>.diff.png` next to the capture. If the manifest's platform differs
  from the current one, mismatches are warnings, unless a measured
  cross-platform diff (Windows SwiftShader vs Linux CI) shows the goldens
  match across platforms. Linux is the canonical golden platform. About
  2.8 MB of PNGs per story, so each `--update` is a deliberate commit.
- **"Tiles unavailable" run.** New `--network unavailable`: an online build
  with every request aborted, style URLs included. It must reach
  `data-mb-state="ready"`, show `#mb-basemap-notice`, draw the local context
  layers and log no page errors. Otherwise it reports `VISUAL_RUNTIME`.
- **Budgets** in `@mapbard/knowledge`: core JavaScript (MapLibre main and
  worker, player, compiled app) ≤ 450 KB gzip, and ≤ 1.2 MB gzip with every
  tier. `check --visual` and `build` report the gzip size of each part, plus
  data and media sizes (reported only, no budget yet).
  `BUDGET_EXCEEDED` is a warning.
- **Frame sample.** `check --visual --frames` runs the frame probe from
  `scripts/frame-probe.mjs` (moved into the CLI) during each camera track and
  reports p95/p99 frame intervals. It is info only: software WebGL measures
  main-thread cost, not GPU frame rate.
- **CI.** A new `visual` job on `ubuntu-latest`: build, then
  `check --visual --network offline` with goldens gating for both Potomac
  variants, a `--network unavailable` run, and the budget report. It always
  uploads `.mapbard-visual/` as an artifact. A `workflow_dispatch` input
  `update_goldens` runs with `--update` and uploads the new goldens, so the
  owner can commit Linux goldens from a Windows machine. The three-OS
  `verify` job stays as it is.

Done when: goldens round-trip (an `--update` followed by a check passes; a
changed colour fails with a diff image). Unit tests cover the diff ratio,
the manifest and budget arithmetic. The unavailable run passes on Potomac.
The workflow passes `actionlint`, or is checked by hand if actionlint isn't
available. Running it in CI waits for a push.

As built (2026-10-22):

- **Goldens** (`packages/cli/src/visual/goldens.ts`, `pixelmatch` 7.2.0 ISC and
  `pngjs` 7.0.0 MIT, pinned). Every screenshot capture (p = 0, 0.5 and 1,
  including a capture that falls in flight) has a golden. `--update` needs
  `--network offline` (else exit 2). It runs the full capture five times,
  sweep included, and the noise is the worst diff of runs 2–5 against run 1.
  Captures-only runs are not used: the sweep's path changes what the captures
  show (about 0.7% of pixels on Potomac), while full runs repeat exactly. On
  this Windows machine the noise was **0** over five runs, so the tolerance
  takes its floor, `maxDiffRatio` 0.0005 (0.05% of pixels, 3 × noise
  otherwise). The manifest records the noise, factor and floor. Goldens are
  compared only on offline runs, and only when `goldens/manifest.json`
  exists. A missing golden or a golden with no capture is also
  `VISUAL_GOLDEN_MISMATCH`. Another platform's goldens give one summary
  warning that `--fail-on-warnings` never promotes. Measured on Potomac,
  Windows against Linux goldens: the WebGL map rasterises alike, but DOM text
  (narration, callouts, legend) wraps differently with the same bundled
  fonts, so 0.8–4.5% of pixels differ in every capture. Cross-platform
  goldens therefore stay non-gating. On Potomac
  the 18 goldens are 2.8 MB, and changing the river colour failed all 18
  captures at 0.20–0.22% with diff images. `--update` takes about 3 minutes here.
- **`--network unavailable`** aborts every request on an online build.
  Chromium's own "Failed to load resource" console lines are expected there
  and ignored. In the first scene it checks that `#mb-basemap-notice` is
  visible and that, with every overlay hidden, more than 0.1% of the map
  differs from its background colour. The run found a player bug: when every
  provider style failed, the fallback chain stopped at the second style and
  the story never reached `ready`. Fixed in `compiled.ts`. It also runs the
  full capture, so occlusion findings are reported too (see STATUS).
- **Budgets** (`@mapbard/knowledge` `budgets.ts`): file kinds from the build
  path (core, tier `tier-*.js`, data, media, style, font, other). Gzip level 9
  for text files. Fonts, images and video count at their raw size. `build`
  and `check --visual` return `sizes` (the core and tier parts, totals by kind,
  budgets). Potomac core is 407,735 bytes (398.2 KiB) gzip, inside 450 KiB.
- **Frames.** `check --visual --frames` samples desktop and phone in a second
  browser on Chromium's default WebGL path. Forced SwiftShader is several times
  slower at desktop size (p99 about 117 ms), so it would mostly measure the
  software rasteriser. Per scene with a moving scrub camera, it counts
  the frames whose `progress()` falls in flight. `scripts/frame-probe.mjs` is a
  wrapper (`--swiftshader` to force it) and matches the earlier 8.5 ms p99.
  Frame times swing with machine load (p99 from 8.5 to 90 ms between runs
  while another worker ran browsers). Info only.
- **CI** `visual` job: a matrix over `potomac` and `potomac-night`. It
  fails when a project has no goldens, unless `update_goldens` is set, and it
  uploads `goldens-<project>`. The budget table goes to the step summary.
  `actionlint` 1.7.7 passes on every workflow (shellcheck was not
  installed, so the inline scripts were run by hand on local outputs).
- The CLI's test timeout is 20 s, because Potomac builds under parallel load
  passed 5 s.

### K. Potomac V1 redesign, two variants (step 4.2)

- **Variants.** `examples/projects/potomac` becomes the **atlas** variant
  with terrain and hillshade. The new `examples/projects/potomac-night` is
  the **night** variant. They share the same data, media and story text.
  Identical files are stored once by git, so the copy costs nothing in the
  repository. A root test asserts the two have identical resource hashes and
  that their `story.json` and `mapbard.json` differ only in `theme`,
  `basemap.style` and layer colours.
- **Context colours from the theme.** When a layer omits
  `constant.color`, the compiler takes it from theme tokens (fill: `land` at
  a low default opacity, line: `water`, points: `accent`), resolved in
  `@mapbard/knowledge` and emitted in the compiled spec. Both variants drop
  their hard-coded hex colours. The opaque state fill (`#dce8df` at 0.96)
  becomes a light outline, so the basemap tint and hillshade show.
- **Bigger symbols.** Optional `maxRadius` (px, 4–48, default 16) on size
  encodings and shared size scales. Potomac sets it so Point of Rocks 2024
  reads clearly and the 2025 circles stay visible (about a tenth of the
  area). Nested-circle legends and callout halos follow the new radius.
- **Basemap.** Atlas and night provider styles with theme tint; Mapterhorn
  terrain with hillshade; sky on, so the pitched flight shows a horizon.
  Offline builds drop terrain with the existing diagnostic and keep the
  context layers. `reveal-from-overview` starts wide enough to show the
  Chesapeake region before closing in on the river.
- **Flight overlaps.** The player hides (fades) a callout when no placement
  candidate clears every occluder, and when its target is more than 20%
  under a panel, instead of drawing it colliding. Potomac's 2024 callouts
  fade out over the flight's range and back in for the closing overview.
  Target: zero callout findings at every sweep sample, and fewer in-flight
  symbol warnings than today's 24, with each remaining one listed in
  STATUS.md.
- **Attribution.** The MapBard credit line leaves out a provider credit that
  the style's own source attribution already shows, so OpenFreeMap appears
  once.
- **Phone narration.** New critic warning `TEXT_OVERFLOW_LIKELY`: it
  estimates a card's line count from the layout's phone sheet and the
  theme's type scale, and warns when narration would scroll inside the
  sheet. Potomac's 2024 and limits narration is tightened or split, keeping
  every value, date and qualification, until the warning clears.
- **README.** It describes the size scale (not the old equal-interval colour
  scale), the two variants and how to run `check --visual`.

Done when: both variants build online and offline with a clean critic. On
both, `check --visual` has 0 errors (rest and flight) at stub, offline and
unavailable. A live run with OpenFreeMap tiles and Mapterhorn terrain has
inspected screenshots of tint, hillshade, sky and pitch. The frame probe
p99 is no worse than today's 8.5 ms.

As built (2026-10-22):

- **Context colours.** `contextPaint` in `@mapbard/knowledge` gives the
  defaults. A fill is the land colour at 35% alpha, kept in the colour
  (`#rrggbb59`) with opacity 1, because MapLibre draws a fill's outline at
  the fill's opacity; the compiled layer carries `outline` (the theme's
  boundary colour). Lines take water and points the accent, each moved in
  lightness only until it has 3:1 against land (and water, for points), so
  the defaults never trip the palette critic. On night, water on land was
  about 1.1:1.
- **maxRadius** sits on `encode` and on shared size scales. Members that set
  a different value are `MEASUREMENT_INCOMPATIBLE`. One distinct value draws
  at half of it. Potomac uses 26 px.
- **Callout hiding** (`placeShownCallouts`). A callout whose target halo is
  20% or more under a panel or off screen is hidden. While a placed callout
  still collides with anything, the least important colliding callout is
  hidden and the rest are placed again. A hidden callout's targets stay
  obstacles for the others. It hides at once, so QA never sees a covered
  label, and fades back in (0.25 s) when it returns. Potomac also fades its
  2024 callouts with scrub tracks: they come in downstream during the
  reveal, go out at p = 0.27–0.31 and return at 0.91–0.95.
- **Attribution.** The credit line drops each `©` part whose provider name
  the style's sources already show. It is recomputed when TileJSON metadata
  arrives, because OpenFreeMap carries its attribution there. The Mapterhorn
  credit is a link (`attributionUrl`) rather than a long URL. A tile error
  after the style loads no longer moves down the style fallback, which had
  switched providers on the first failed terrain tile.
- **Phone rail.** With a basemap notice, the notice is a thin full-width
  strip and media is capped at 15vh, so the rail never scrolls the photo
  half out of view. That clipped photo was behind the 7 rest errors in J2's
  unavailable run.
- **TEXT_OVERFLOW_LIKELY** estimates on a 390×844 phone with a greedy word
  wrap at 0.52 em per character, calibrated on the bundled fonts against
  phone captures. To clear it, Potomac's narration was tightened and the
  limits scene split. `limits` ("What the records mean") keeps the approval,
  time zone, qualifier, regulation, hydroelectric, diversion and reservoir
  text and pushes in to zoom 11. A new `scope` scene ("Where the comparison
  stops") holds drainage area, travel time and the five things the dates do
  not show, and pulls back from Little Falls to the overview.
- **Camera.** The 2024 reveal starts from a Chesapeake view (`from`: center
  [-77.0, 38.6], zoom 6.9). The fly-along pitches to 70°, because at 55° the
  horizon and sky never entered the frame.
- **Stub terrain.** `--network stub` aborts Mapterhorn tiles, which logs
  console errors and keeps the map from going idle, so a terrain story
  cannot pass stub. The smoke test now answers them with a flat terrarium
  tile (`FLAT_DEM` in `tests/browser.mjs`). The lead landed the same change in
  `packages/cli/src/visual/capture.ts`, sized to the source's `tileSize`.
  Live runs also ignore 404s from the terrain host: Mapterhorn answers 404
  where it has no tile (open sea, such as 6/19/25), and MapLibre draws those
  flat.
- **Results** (both variants, 4 scenes, 24 captures and 98 sweep samples
  each): 0 errors at stub, offline, unavailable and live. Flight findings fell from 19 (stub) to 8 at stub, 6 offline
  and 7 unavailable, all symbol warnings: a gauge under the media or legend
  in the 2024 flight and in the limits and scope pull-backs on phones, and
  under the story column on desktop at 2024 p = 0.9. No callout findings
  remain at any sample. Frame probe on the offline atlas build: p99 8.5 ms
  on desktop and phone.

### 4.3 Goldens and scoring

Commit the goldens for both variants from the final look (Linux ones from
the CI artifact once CI runs). For the owner, prepare a one-page scoring
sheet per variant: the seven quality-bar areas, each with evidence (contact
sheets, sweep results, live screenshots, frame numbers, critic output) and
known gaps. The owner gives the score. Defects the owner names are fixed
before L. The scores go in STATUS.md. The target is ≥ 75 for each variant.

As built (2026-10-22): the Linux goldens were made locally in the
`mcr.microsoft.com/playwright:v1.64.1-noble` Docker image, which has the
Chromium build (156.0.8078.4) that `playwright-core` 1.64.1 installs in CI.
Noise was 0 over five runs for both variants, and a check in the same image
matched all 24 captures of each. Whether ubuntu-latest matches the image
exactly is confirmed by the first CI run. If it doesn't, rerun the workflow
with `update_goldens`. The scoring sheets are in
[m2-scoring.md](m2-scoring.md) (2026-10-23). The owner scored both
variants 77/100 the same day and named no defects, so L follows directly.

### L. Skill pack and release (step 4.4)

- `skills/mapbard`: `format.md` (theme, layout, basemap terrain, sky and
  projection, motion, callouts, size scales and `maxRadius`, colour
  defaults); `techniques.md` (graduated symbols, motion presets and when not
  to use them); new `motion.md` and `layout.md` references; `diagnostics.md`
  with every code added in M2 (the critic codes, `TEXT_OVERFLOW_LIKELY`,
  `VISUAL_*`, `BUDGET_EXCEEDED`) and their remedies; `SKILL.md` adds
  `check --visual` to the workflow, with the contact sheet read as advisory.
- `mapbard capabilities` lists themes, layouts, motion presets and modes,
  and whether visual checks can run. A test asserts that every capability ID
  the compiler accepts is listed.
- Package READMEs for the new commands and fields. A changeset bumps all
  five packages to 0.2.0 (compiled spec 0.3.0 and new authored fields). The
  tarball install smoke passes.
- Push and publish only when the owner asks. Release through the existing
  workflow.

As built (2026-10-23): `capabilities` also renames its old `techniques`
list (capability IDs) to `capabilities` and returns the compiled techniques
as `techniques`. The visual-check readiness comes from launching and closing
a headless Chromium (`probeBrowser`), so it is accurate but takes about
0.7 s. The skill pack moved the motion field reference from `format.md` to
`motion.md`. The changeset is committed but not applied; `changeset
version` runs when the owner asks for the release, and the tarball smoke
passed at the 0.1.x versions.

V1 closes when both variants score ≥ 75 and the `visual` CI job passes.
Then V2 gets its detailed section here.

**V1 closed 2026-10-23.** Atlas and night each scored 77. The first pushed
CI run (39910445623) passed on all three OSes, and both `visual` jobs
matched all 24 goldens on ubuntu-latest (worst difference 0), with 0 errors
and only the known in-flight symbol warnings. All five packages
were published at 0.2.0 the same day.

## V2 — 3D data, change and flows

Planned 2026-10-23. Status: **proposed.** Decisions marked **(owner)** wait
for the owner; step 5.0 starts once they are settled.

V2 is the second slice in
[visual-engine.md](visual-engine.md#delivery-slices): 3D columns,
extrusions, change symbols, hexbins, arcs and trips, data transitions
between scenes, and the deck.gl tier. Proportional symbols shipped in V1 as
`graduated-symbol` (sqrt-area, nested-circle legend, largest drawn first),
so V2 does nothing more for them.

**V2 is done when:**

1. Both Potomac variants show the gauges as 3D columns in 2024, and in 2025
   the columns shrink from their 2024 heights while 2024 ghosts stay. In
   live runs the columns stand on the terrain. `check` is clean, and
   `check --visual` has 0 errors at stub, offline, unavailable and live.
2. A flows example (arcs) builds online and offline, with 0 visual errors
   and committed goldens.
3. Every new technique meets the catalog rule (schema entry, compiler
   resolution with diagnostics, player, legend, screenshot test, skill
   page). The screenshot test is a scene in a technique gallery fixture
   with goldens.
4. Budgets: a story with no deck.gl technique loads no tier and keeps core
   JS ≤ 450 KB gzip; `tier-deck.js` ≤ 400 KB gzip, so V3's three.js tier
   still fits under 1.2 MB for all tiers.
5. Frame probe on Potomac: p99 ≤ 16.7 ms on desktop and phone (default
   WebGL path). A 1,000-feature morph also stays within 16.7 ms.
6. The `visual` CI job passes with the new projects in its matrix.
7. **(owner)** The owner scores both Potomac variants. Proposed target:
   **≥ 80** (V1 was 77; V4 needs 85).

### Decisions for V2

- **(owner) Each technique uses the cheapest tier that draws it
  correctly.** The design puts columns, extrusions, change symbols and
  hexbins in deck.gl. Two facts point the other way. deck.gl layers draw
  at sea level under MapLibre terrain: `@deck.gl/maplibre` 9.4 syncs the
  camera's elevation but drapes nothing. Potomac, the V2 acceptance
  story, uses terrain. MapLibre's `fill-extrusion` sits on terrain, shares
  the style's lighting and label order, and adds no bytes. Proposal:
  columns, extrusions, change symbols and hexbins are MapLibre layers, and
  deck.gl draws what MapLibre cannot, arcs and trips. Step 5.0 confirms or
  reverses this with measurements. If the owner prefers deck.gl columns
  anyway, columns move from M to N, Potomac loads the deck tier, and N
  also lifts each column base to the terrain elevation sampled at
  runtime.
- **deck.gl 9.4.0 through `@deck.gl/maplibre` 9.4.0** (MIT; new in 9.4,
  peer `maplibre-gl` ^6), interleaved: deck.gl layers share MapLibre's
  WebGL2 context and go below the labels through `beforeId`. The package
  imports `maplibre-gl` for types only, so MapLibre is never bundled
  twice. `@deck.gl/core`, `layers`, `geo-layers`, `maplibre` and the
  `luma.gl` packages are pinned to exact versions.
- **The compiler does data computations; the player does
  tessellation.** Joined before-values (change symbols, morphs) and hexbin
  aggregates are computed by the compiler. They go into the compiled data
  as derived sources with provenance (input source IDs and hashes,
  parameters), so legends and labels stay compiled text and every value
  can be traced. Column footprints are tessellated in the player from the
  points (a pure, tested function), so compiled data does not grow by a
  polygon ring per point.
- **(owner) Change values are computed at compile time, before M3.**
  Change symbols need signed and percent change. The compiler computes
  them from two declared observations matched by feature ID and lists the
  inputs. M3 later moves the operation into lockfile results with the same
  definition. Until then, change labels are generated text written by the
  compiler, never by the author. The operation stays in one module
  (`core/src/compile/change.ts`) so M3 can replace it.
- **Formats.** The authored format stays 0.2.0 (optional additions only).
  The compiled spec moves to **0.4.0** in the foundation commit: layer
  backends, derived sources, height and width scales and new track
  properties change the player contract.
- **Heights are linear from zero** (bar semantics). Negative values cannot
  be extruded; the diagnostic suggests change symbols.
- **Height legends draw no pixel scale.** On-screen height changes with
  pitch and zoom, so the legend names the attribute, the unit, "from 0" and
  the tallest value. Exact values go in callouts.
- **Not in V2:** heatmap (keeps its diagnostic), dot density, contours,
  H3, picking and tooltips, CSV layers. deck.gl techniques on terrain or
  globe are diagnosed as `CAPABILITY_UNSUPPORTED`, unless 5.0 shows globe
  works; V3 revisits terrain, since its three.js adapter needs elevation
  anyway. The phone layout gaps from the scoring sheet (tall attribution,
  rail size) are a separate fix if the owner wants one.

### Authored additions (format 0.2.0, all optional)

Columns. `column.radiusMeters` sets the footprint. `maxHeightMeters`
defaults to a fifth of the reference desktop view height at the first
member scene's camera zoom:

```json
{
  "id": "gauges",
  "technique": "column",
  "sourceId": "potomac-2024",
  "encode": {
    "attribute": "daily_mean_discharge",
    "visualVariable": "height",
    "maxHeightMeters": 30000
  },
  "column": { "radiusMeters": 1500 }
}
```

- **Shared scales** gain `visualVariable: "height"` (with
  `maxHeightMeters`) and `"width"` (with `maxWidth` in px), both linear
  from 0 over every member.
- **`extrusion`** extrudes polygons by `encode` height. It has the same
  prerequisite as a numeric choropleth (a ratio with a declared
  denominator), or `MEASUREMENT_REQUIRED`. An optional `classification`
  colours it by the same attribute.
- **`change`** draws before and after for each feature. It takes
  `compare: { "sourceId": "potomac-2024", "labels": true }`. With
  `visualVariable: "size"` it draws a ring (before) and a disc (after) on
  the size scale; with `"height"`, a translucent ghost column and a solid
  one. Colour follows the sign, from the ends of the theme's diverging
  ramp. `labels` adds one compiled callout per feature, for example
  "−21,580 ft³/s (−91%)", which goes through the normal callout placement
  and QA. Both sources must declare the attribute with the same unit
  (`MEASUREMENT_INCOMPATIBLE`). Every drawn feature must match a feature
  ID in the compared source (`REFERENCE_MISSING`, listing the IDs).
  Before-values must fit the layer's scale (`SCALE_INCONSISTENT`, remedy:
  add the compared layer to the shared scale). A before-value of 0 drops
  the percentage.
- **`transition`** on a layer morphs its values from another scene's
  layer: `"transition": { "from": { "sceneId": "context-2024" } }`
  (`layerId` defaults to the same ID). Both layers must use the same
  technique family and the same shared scale (`SCALE_INCONSISTENT`).
  Features only in the new layer grow in, and features only in the old
  one fade out. The compiler emits a `morph` track: by default `play`,
  1,200 ms, `ease-in-out`, from the trigger; scene `motion.layers` can
  override it with `property: "morph"`. Reduced motion steps to the final
  values.
- **`hexbin`** aggregates points:
  `"aggregate": { "cellKm": 25, "op": "count" }` (`sum` and `mean` take a
  quantity attribute), with any classification method, and optional
  `"extrude": { "maxHeightMeters": 40000 }`. The grid is flat-topped
  hexagons in Web Mercator, anchored at (0, 0) so cells don't move when
  the data changes. `cellKm` is the ground width at the data's centre
  latitude, and empty cells are not drawn. Legend titles are compiled
  ("Count per 25 km cell"). A new critic warning,
  `ENCODING_AREA_DISTORTED`, fires when cell ground area varies by more
  than 10% across the data's latitude span.
- **`arc`** draws two-vertex LineStrings from origin to destination
  (other lines are `VALUE_INVALID`, listing feature IDs). Width is linear
  from 0 (`visualVariable: "width"`, `maxWidth` in px). Colour runs from
  an origin to a destination token so direction reads, or follows a
  `classification`. `arc.greatCircle` is optional.
- **`trip`** animates LineStrings with `trip: { "timeProperty": "times",
"trailHours": 24 }`, where `times` holds one ISO 8601 UTC string per
  vertex, in ascending order (`VALUE_INVALID` otherwise). The compiler
  emits the time domain and en-US UTC clock labels.
- **Track properties:** `grow` (height factor 0–1; can stagger), `morph`
  (0 = from-values, 1 = own values) and `trail` (trip time; `scrub` by
  default, so scroll moves the clock; reduced motion shows the full
  tracks). `opacity` applies to every new technique, `line-reveal` to
  arcs, and `highlight` to columns, extrusions and change symbols.
- **Capability IDs:** `height.column`, `height.extrusion`,
  `change.symbol`, `aggregate.hexbin`, `flow.arc`, `flow.trip`,
  `motion.grow`, `motion.morph`, `motion.trail`.
- **New diagnostic codes:** `ENCODING_AREA_DISTORTED`, and
  `DEPTH_UNSEEN`, a critic warning for a 3D layer in a scene whose camera
  never pitches. Everything else reuses existing codes.
- **Theme token `light`** (direction, intensity, colour) per preset,
  applied as the MapLibre style `light`, so extrusions are shaded to suit
  each theme.

### Steps

Wave 5 is staggered like Waves 3 and 4:

| Step | Work                                                                         | Runs                   |
| ---- | ---------------------------------------------------------------------------- | ---------------------- |
| 5.0  | Spike: measure the open questions and settle the backend table               | Lead, throwaway branch |
| 5.1  | Foundation: compiled 0.4.0, schema, codes, tier loading, altitude projection | Lead                   |
| 5.2  | M: MapLibre 3D and change ‖ N: deck.gl tier, arcs and trips                  | Parallel worktrees     |
| 5.3  | O: Potomac V2, both variants ‖ P: flows example                              | Parallel worktrees     |
| 5.4  | Goldens, CI matrix, live terrain checks, owner scoring                       | Lead; needs the owner  |
| 5.5  | Q: skill pack, capabilities, READMEs, 0.3.0 changeset                        | Lead, last             |

Owner checkpoints: the decisions above before 5.0, the backend table
after 5.0, the flows dataset before P, scoring in 5.4, and any push or
publish.

### 5.0 Spike

On a throwaway branch that is never merged. The answers and numbers are
recorded here, and the backend table is confirmed with the owner.

1. **MapLibre extrusions on terrain.** `fill-extrusion` columns at the
   Potomac gauges, on Mapterhorn terrain, in the 2024 flight (pitch 70).
   Pass: bases sit on the ground, without sinking or floating, in
   inspected live screenshots.
2. **deck.gl columns on terrain.** The same with an interleaved
   `ColumnLayer`, to confirm sea-level placement. Also try `getPosition`
   with a z from `map.queryTerrainElevation`, and note any jitter as the
   DEM tiles change with zoom.
3. **Morph cost.** 1,000 and 5,000 extrusions with heights changed every
   frame through (a) `setPaintProperty` with a literal `t`, (b) feature
   state and (c) `global-state`, if MapLibre 6.1 accepts it in
   `fill-extrusion-height`. Report p95 and p99 from the frame probe on
   desktop and phone. Pass: 1,000 features within 16.7 ms by at least one
   method. Otherwise, morphs over a feature limit move to deck.gl
   attribute transitions.
4. **Tier size.** Gzip size of an IIFE with core, layers and `maplibre`
   (ArcLayer), then with `TripsLayer` from `geo-layers`, tree-shaken.
   Pass: ≤ 400 KB. If `geo-layers` brings in too much (loaders.gl,
   mesh-layers), port `TripsLayer` (MIT, a `PathLayer` with a shader hook)
   and credit it.
5. **SwiftShader determinism.** Five runs of an arcs page, measuring the
   pixel noise as J2 does.
6. **`file://` and offline.** The tier loads from `file://`, makes zero
   requests (no CDN debug loaders) and logs no console errors.
7. **Globe.** deck.gl arcs on MapLibre's globe through `_GlobeView`: they
   work, or V2 diagnoses the combination.
8. **Altitude projection.** A no-op custom layer keeps the frame's
   projection matrix and projects lng/lat/altitude to the screen. Pass:
   within 0.5 px of `map.project` at altitude 0, and on the drawn column
   tops in screenshots.

### 5.1 Foundation (lead)

- **Schema.** The technique enums (authored and `COMPILED_TECHNIQUES`),
  `encode` height and width, the layer fields `column`, `compare`,
  `transition`, `aggregate`, `extrude`, `arc` and `trip`, and height and
  width shared scales. Compiled spec 0.4.0: each layer's `backend`
  (`maplibre` or `deck`); `derived` sources with provenance;
  `numeric-height` and `numeric-width` scale kinds; the `grow`, `morph`
  and `trail` track properties; generated callouts with a `generated`
  record of their inputs. Also the capability IDs, the two diagnostic
  codes and the `light` theme token. Schema tests and the JSON Schema
  export follow.
- **Compile dispatch.** Each new technique goes to its own module
  (`compile/height.ts`, `change.ts`, `aggregate.ts`, `flows.ts`). Each
  starts as a stub that returns `CAPABILITY_UNSUPPORTED` until M or N
  fills it in, so the workers never edit `compile.ts` at the same time.
- **Tier loading.** `MapBardCompiledPlayer.registerTier(name, factory)`.
  The adapter routes each layer by `backend`. `write-compiled` copies
  `vendor/tier-<name>.js` and adds its script tag before
  `compiled-app.js` only when the compiled spec uses that backend. A
  `build-tier-deck.mjs` builds a stub tier first, which proves loading,
  the size report, `file://` and zero offline requests before N adds
  deck.gl.
- **Altitude projection** (`projectAltitude`) through the probe custom
  layer from 5.0. `MapBardStory.symbols()` can report a 3D symbol as two
  circles, base and top, so the QA geometry in the CLI does not change.
- Done when: build, tests, lint and browser smoke pass. Potomac compiles
  with only the version changed, and its goldens still match. A test story
  with a stub deck layer gets `tier-deck.js` and its script tag; Potomac
  gets neither.

### M. MapLibre 3D data and change (step 5.2)

M owns `compile/height.ts`, `change.ts` and `aggregate.ts`; the player's
MapLibre adapter, resolved style, legends and 3D callout anchors; the new
critic rules; the theme `light` values; and `fixtures/visual/gallery-maplibre`.

- **Columns:** 24-sided footprints tessellated in the player
  (`columnFootprints`, unit-tested), `fill-extrusion` height from the
  height scale times `grow`, theme colour, vertical gradient, theme
  light.
- **Extrusions:** `fill-extrusion` of polygons, with the choropleth
  prerequisite.
- **Change symbols:** size form (ring and disc) and height form (ghost
  and solid column); colour by sign; compiled labels as generated
  callouts.
- **Morph:** compiled from-values in a derived source; the player
  interpolates with the fastest method from 5.0.
- **Hexbins:** the compile-time grid and aggregation as a derived polygon
  source with provenance; drawn flat or extruded.
- **Callouts on 3D layers** anchor at the column top through the altitude
  projection, and avoid the projected column as an obstacle.
- **Legends:** the height key (text, no pixel scale), the change key
  (before and after named by their observation labels, colour by sign),
  the hexbin ramp.
- **Critic:** `DEPTH_UNSEEN`, `ENCODING_AREA_DISTORTED`, and the
  extrusion, morph and change scale checks above.
- **Gallery:** one scene per technique (column, extrusion, change in both
  forms, morph, flat and extruded hexbin), offline-buildable, from real
  public-domain data with recorded provenance: Potomac gauges for columns
  and change; for example Census state polygons with population and land
  area for extrusions, and USGS earthquake points for hexbins.
- Done when: compile and diagnostic tests cover each technique and each
  failure; player tests cover tessellation, morph values and grow with
  stagger; the gallery has 0 errors in `check --visual` (stub and
  offline), with captures inspected.

### N. deck.gl tier, arcs and trips (step 5.2)

N owns `player/tiers/deck/`, `scripts/build-tier-deck.mjs`,
`compile/flows.ts`, the flow legends (`player/legend-flows.ts`) and
`fixtures/visual/gallery-deck`.

- **Tier:** `MapLibreOverlay` interleaved, below the first label layer,
  with `pickable: false` and debug off. Scene bind and unbind update the
  overlay's layer list. Track values (opacity, `line-reveal` through a
  small `ArcLayer` subclass with a shader hook, `trail` as the current
  time, stagger through accessors and `updateTriggers`) are applied each
  frame.
- **Arcs:** the width scale, the origin-to-destination gradient, the
  great-circle option and two-vertex validation. Callouts on arcs anchor
  at the destination.
- **Trips:** time validation, `TripsLayer` current time, trail length, a
  clock label in the rail (compiled text), and `loop` with the existing
  pause control.
- **Readiness:** `whenIdle()` also waits for the tier's first drawn frame,
  so captures never catch shaders still compiling.
- **Diagnostics:** deck.gl techniques with terrain or (per 5.0) globe are
  `CAPABILITY_UNSUPPORTED`, with the remedy.
- **Budgets:** the size report lists `tier-deck.js`, and
  `BUDGET_EXCEEDED` also warns when one tier is over 400 KB gzip.
- **Gallery:** an arcs scene (a subset of the flows dataset) and a trips
  scene, for example NOAA HURDAT2 2024 hurricane tracks (U.S. public
  domain).
- Done when: the gallery builds online and offline, works from `file://`
  with zero offline requests, has 0 errors in `check --visual`, stays
  within the budgets, and has measured SwiftShader noise.

### O. Potomac V2, both variants (step 5.3)

O owns `examples/projects/potomac` and `potomac-night` and the root test
that compares them.

- **2024:** the gauges become columns on one shared height scale across
  every scene, the compared source included. They rise downstream with
  `grow` and a stagger during the reveal. Callouts anchor at the column
  tops.
- **2025:** `change` columns with `transition.from: context-2024`. The
  solid columns shrink from their 2024 to their 2025 heights while
  translucent 2024 ghosts stay, so the drop no longer depends on memory.
  Compiled change labels name each gauge's change, which fills the "only
  Point of Rocks has a 2025 callout" gap. A slow camera move (a low orbit
  or an ease towards Point of Rocks) replaces the static view.
- **Limits and scope:** 3D only where the camera pitches. The top-down
  end of the scope pull-back uses the size form of the change symbols.
- Narration keeps every value, date and qualification;
  `TEXT_OVERFLOW_LIKELY` stays clean. The README describes the new
  encoding.
- Done when: both variants are critic-clean, with 0 `check --visual`
  errors at stub, offline, unavailable and live. Inspected live captures
  at 2024 p = 0.5 and 2025 p = 1 show the bases on the terrain. Remaining
  in-flight warnings are listed in STATUS.md. Frame probe p99 ≤ 16.7 ms.

### P. Flows example (step 5.3)

- **(owner) Dataset.** Proposed: U.S. Census Bureau state-to-state
  migration flows, the latest ACS release (U.S. public domain), for
  example where movers from one state went. ACS margins of error stay
  visible as the qualification.
- `examples/projects/<name>`: three or four scenes (an overview of the top
  flows, arcs revealed largest first, a regional focus, a limits card),
  Mercator, no terrain, a theme other than atlas.
- Done when: it builds online and offline, has 0 `check --visual` errors
  at stub, offline and unavailable, and its budget report shows core and
  tier within budget.

New data needs network access to public hosts. If this machine cannot
reach them, the owner supplies the files; either way the source URL,
licence and retrieval date go in the attribution.

### 5.4 Goldens, CI and scoring

- Linux goldens from the Docker image for both Potomac variants (their
  look changes), both galleries and the flows example. The `visual` CI
  matrix grows from 2 projects to 5.
- Non-gating live runs for Potomac's terrain columns, with inspected
  captures.
- V2 scoring sheets for both Potomac variants in
  [m2-scoring.md](m2-scoring.md); the owner scores them. Named defects are
  fixed before Q.
- The CI part of done-when waits for a push, which the owner asks for.

### Q. Skill pack and release (step 5.5)

- `skills/mapbard`: each new technique in `techniques.md` with when to use
  and when not to; the new fields in `format.md`; `grow`, `morph` and
  `trail` in `motion.md`; the new codes and remedies in `diagnostics.md`;
  height honesty and change symbols in `cartography.md`; generated change
  labels and their inputs in `data-honesty.md`.
- `capabilities` lists the new techniques and their backends, and its test
  asserts they match the schema enums.
- READMEs, and a changeset that bumps all five packages to 0.3.0 (compiled
  0.4.0, new authored fields, the deck.gl tier). The tarball smoke passes.
  Publish only when the owner asks.

### Risks for V2

- **deck.gl and MapLibre move together.** deck.gl 9.4 supports MapLibre 6
  today, so a MapLibre upgrade needs a matching deck.gl check. Both stay
  pinned, and 5.0 tests the pair.
- **Terrain is not in the goldens.** Offline builds drop terrain, so column
  placement on terrain is checked only in live runs and by eye. Stub runs
  with flat terrain still exercise the code path.
- **deck.gl under SwiftShader** may be noisier than MapLibre. The golden
  tolerance is measured as in J2.
- **Generated change labels overlap M3.** They stay in one module with
  listed inputs, so M3 can replace them without changing the format.

## Later slices (outline)

- **V3 — three.js tier:** in-house custom-layer adapter, flow particles along
  the river, glTF models from the starter pack, lighting; `tier-three.js`.
- **V4 — comparison and charts:** swipe, synced maps, small multiples, inline
  charts linked to features; Potomac reaches ≥ 85.

## Risks

- **WebGL in headless CI.** SwiftShader is slow and may differ from GPU
  output; goldens need a tolerance and the offline build.
- **Provider style drift.** Tinting depends on OpenMapTiles layer IDs; unknown
  layers are skipped, and a live non-gating check reports drift.
- **Scroll-scrub performance on phones.** Camera tracks update every frame;
  the FPS sample in QA guards it, and reduced motion is always available.
