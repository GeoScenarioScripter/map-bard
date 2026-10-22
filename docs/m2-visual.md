# M2 — Visual Engine: execution plan

Updated 2026-10-21. Status: **active**. Waves 1–3 are complete; Wave 4 is next. Part of the
[roadmap](ROADMAP.md). The design reference is
[visual-engine.md](visual-engine.md) (architecture, motion model, technique
catalog, quality bar). This file is the order of work.

## Outcome

M2 is delivered in the four slices V1–V4 from
[visual-engine.md](visual-engine.md#delivery-slices). This plan details **V1**
(Tier-0 polish, motion, layouts, callouts, visual QA and critic). V2–V4 get a
detailed section here when V1 closes; their outline is at the end.

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

### J. `mapbard check --visual`, goldens and CI

- `check --visual [--update]` runs the Wave 1 capture through the CLI and
  returns findings in the JSON envelope. `playwright-core` becomes a CLI
  dependency; a missing browser gives a diagnostic with the remedy.
- Goldens per showcase story with a perceptual-diff tolerance (`pixelmatch`,
  ISC, and `pngjs`, MIT), updated only with `--update`.
- CI job on Linux with SwiftShader: offline Potomac goldens, a "tiles
  unavailable" run, and JS/data size per story against the budgets in
  visual-engine.md.

### K. Potomac V1 redesign and scoring

Apply V1 to the example: atlas or night theme, terrain with hillshade,
`reveal-from-overview` intro, `fly-along` the river in 2024, the shared size
scale, collision-free callouts and a `limits` push-in on Little Falls. The
owner scores it; the score and any defects go in STATUS.md. Target ≥ 75.

### L. Skill pack and release

Update `skills/mapbard` (format guide, technique pages, motion and layout
references, new diagnostic codes), `mapbard capabilities`, and package READMEs;
then release with a changeset. Push and publish only when the owner asks.

## Later slices (outline)

- **V2 — deck.gl tier:** interleaved `@deck.gl/maplibre`, 3D columns, change
  symbols, extrusions with the normalization critic, arcs, trips, hexbin, GPU
  data transitions; `tier-deck.js` emitted only when used.
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
