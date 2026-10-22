# M2 — Visual Engine

Updated 2026-10-21. Status: **active**. This is the design reference; the
order of work is in [m2-visual.md](m2-visual.md). Part of the
[roadmap](ROADMAP.md).

The goal is to take MapBard's published stories from "correct but plain" to
newsroom-grade: a real basemap, terrain and depth, cinematic camera motion,
animated data, 3D, and a deliberate typographic layout. All of it stays
open-source, deterministic and checkable.

## Why: the current output

The product owner scored the Stage 1 Potomac page below 60/100. A browser review
on 2026-10-20 confirmed these concrete problems:

- **No basemap.** A flat green ground with faint state outlines and a river
  line gives no sense of place.
- **The encoding hides the story.** A three-class equal-interval colour scale
  over 580–23,600 ft³/s puts all three 2025 values in the lightest class. The
  roughly 90% drop, which is the whole point, is visible only in the text.
- **Static, step-triggered scenes.** There are cuts between identical cameras,
  with no motion, no data transition and no sense of travel along the river.
- **Layout collisions.** The narrative card covers the Hancock gauge, and the
  legend overlaps the card.
- **Raw labels.** The legend title is the internal ID `daily-discharge` and
  units read `ft^3/s`.
- **No depth or atmosphere.** There is no terrain, sky, lighting or 3D, so
  everything reads as a 2010-era web map.

## Quality bar

Each scene and story is scored out of 100. Flagship stories need **≥ 85**.

| Area                         | Points | What "excellent" means                                                                                  |
| ---------------------------- | -----: | ------------------------------------------------------------------------------------------------------- |
| Sense of place               |     15 | Fitting basemap, terrain/hillshade where relief matters, readable labels that don't fight the data      |
| Encoding clarity and honesty |     20 | The story's key contrast is visible at a glance; scales consistent across compared scenes; critic clean |
| Motion and camera            |     15 | Purposeful camera travel and data transitions tied to scroll; smooth 60 fps; reduced-motion fallback    |
| Attention and annotation     |     15 | Reader's eye lands on the right feature: callouts, halos, spotlight; no occlusion                       |
| Typography and layout        |     15 | Deliberate type scale, layout template fits the story, mobile-first, no collisions                      |
| Depth and atmosphere         |     10 | Lighting, sky/fog, 3D used where it adds meaning                                                        |
| Performance and polish       |     10 | Fast first paint, loading states, no console errors, works on a mid-range laptop and phone              |

## Rendering architecture

All tiers render into one MapLibre WebGL2 context, so depth, terrain and label
ordering compose correctly. The compiled spec stays renderer-agnostic. The
compiler picks a backend per resolved layer, and the published page loads only
the tiers that its story uses.

```
 story.json ──compile──▶ compiled spec (techniques, scales, tracks, backends)
                                │
                     player (TypeScript, IIFE chunks)
   ┌──────────────┬─────────────┴──────────┬────────────────────┬──────────────┐
   │ Tier 0       │ Tier 1                  │ Tier 2             │ Overlay      │
   │ MapLibre 6   │ deck.gl 9 (interleaved) │ three.js custom    │ HTML/SVG     │
   │ basemap,     │ 3D thematic, flows,     │ layer: particles,  │ cards, call- │
   │ terrain,     │ aggregation, GPU        │ glTF models,       │ outs, legends│
   │ globe, sky,  │ transitions, trips      │ shaders, lights    │ inline charts│
   │ simple layers│                         │                    │              │
   └──────────────┴─────────────────────────┴────────────────────┴──────────────┘
```

| Tier         | Library (license)                                               | Integration                                                                                                                                                     |
| ------------ | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 — Base map | MapLibre GL JS 6.x (BSD-3-Clause), upgraded from 4.7 in M1      | Style from the basemap provider, `raster-dem` terrain + hillshade, globe projection, sky/fog, native fill/line/circle/symbol layers                             |
| 1 — Data 3D  | deck.gl 9.x (MIT) via `@deck.gl/maplibre` interleaved mode      | Shares the WebGL2 context and inserts layers into the style below labels. Note: with terrain on, z=0 data renders at sea level unless draped (TerrainExtension) |
| 2 — Scene 3D | three.js (MIT) via MapLibre `CustomLayerInterface`              | A small in-house adapter places objects by lng/lat/alt (`MercatorCoordinate`), syncs the camera matrix, and handles lights and raycast picking                  |
| Overlay      | DOM/SVG; Observable Plot (ISC) is a candidate for inline charts | Annotation layout engine, legends, cards; positioned from map projection each frame                                                                             |

**Threebox is not adopted.** Its maintained fork (`threebox-plugin` 2.2.7) was
last released in June 2022. It targets Mapbox GL JS v2, which is no longer
open source, and it has no MapLibre support. We will build the narrow adapter
we need on MapLibre's documented three.js custom-layer pattern, borrowing
threebox's ideas: geographic object placement, model loading and picking.

**Bundle strategy:** the build continues to emit classic IIFE scripts, so
stories still open from `file://`. The player core stays small. Separate chunks
(`tier-deck.js`, `tier-three.js`, `charts.js`) are written only when the compiled
story needs them. Budgets: core ≤ 300 KB gzip including MapLibre, ≤ 1.2 MB gzip
with all tiers. CI reports the size per story.

## Motion model: scroll-driven tracks

The current step-only scene switching is replaced by **progress-driven
tracks**. Each scene exposes scroll progress `p ∈ [0, 1]` (our own
IntersectionObserver plus scroll module; scrollama, last released in 2022, is
dropped). The compiler resolves authored motion into typed tracks:

- **Camera tracks:** keyframes of center/zoom/pitch/bearing (and altitude on
  globe), with easing, interpolated by `p`. There are also presets: `orbit`,
  `fly-along <line feature>` (follows a river/route), `reveal-from-overview`,
  `push-in <feature>`.
- **Layer property tracks:** opacity, extrusion scale, line reveal fraction
  (draw-on), trail time (TripsLayer), particle rate, highlight strength.
- **Data transitions:** between scenes that share a layer and scale, values
  interpolate on the GPU (deck.gl transitions), so 2024 → 2025 visibly falls.
- **Modes:** `scrub` (tied to scroll), `play` (triggered timeline with duration),
  `loop` (ambient: particles, orbit, pulse) or `step` (instant final state).
  Every track declares its final state.

### Defaults and configuration

The defaults are decided: **the camera scrubs with scroll, data transitions
play once when triggered, and ambient effects loop.** Every part of that can be
overridden. Settings cascade from most general to most specific, and the most
specific one wins:

1. Built-in defaults.
2. Story-wide `motion` in `mapbard.json`.
3. Named presets in `motionPresets`, reusable across scenes. Later they can be
   shared through the community hub (M7).
4. Scene-level `motion` in `story.json`.
5. Per-track overrides on a camera, layer or annotation.

| Setting            | Meaning                                                                                            |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| `mode`             | `scrub`, `play`, `loop` or `step`, per track type (`camera`, `data`, `ambient`, `annotation`)      |
| `easing`           | Named (`linear`, `ease-in-out`, `expo-out`, …), `cubic-bezier(…)` or `spring(stiffness, damping)`  |
| `durationMs`       | For `play`/`loop`, in ms                                                                           |
| `delayMs`, stagger | Offset tracks (`delayMs`); stagger per feature (columns rising one after another) is not built yet |
| `scrollLength`     | Viewport heights the card rests while `p` runs 0 → 1, so long camera flights get more scroll       |
| `range`            | The progress window `[start, end]` a track occupies, so tracks can be sequenced inside one scene   |
| `trigger`          | When a scene becomes active in the one-viewport transit between cards (`top`, `center`, fraction)  |
| `keyframes`        | Explicit camera or property keyframes at progress positions, which take precedence over presets    |
| `reducedMotion`    | `step` (default), `shorten` (fast cross-fades) or `keep`, honouring `prefers-reduced-motion`       |

Short form: `"camera": {"preset": "fly-along", "feature":
"<sourceId>/<featureId>", "pitch": 60}` (for example
`"potomac-river-context/mdimap-132"`; `fly-along` also takes a list of line
features in travel order). Each scene section is `scrollLength` + 1 viewports
tall: its card rests for `scrollLength` viewports (p = 0 to 1), and the extra
viewport is the transit in which the outgoing card leaves, the incoming card
arrives, the active scene switches at `trigger` and the camera hands over.
Full control: explicit `keyframes` plus any setting above. Readers always get
a pause control for looping animation (WCAG 2.2.2). The M5 workbench will
capture keyframes from the live map. The critic warns about motion that hides content, such as a camera flight that
outruns its narration.

## Technique catalog v1

Every technique ships with: a schema entry, compiler resolution with
prerequisites and diagnostics, a player implementation, a legend form, a
screenshot test and a skill reference page with "when to use / when not to".

### Base map and context (Tier 0)

| Technique             | Notes                                                                                                                                                            |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Basemap presets       | OpenFreeMap `positron`, `dark`, `liberty`, `bright`, `fiord`; VersaTiles `colorful` and its other styles; custom style URL. M1 delivers loading; M2 adds theming |
| Theme-tinted basemap  | Recolour provider style layers from theme tokens (water, land, roads, labels) so data colours pop; label density `full/minimal/off`                              |
| Terrain and hillshade | Mapterhorn or AWS Terrarium DEM (keyless, attribution required); per-scene exaggeration track                                                                    |
| Globe and atmosphere  | Globe projection for global/continental stories; sky, fog, horizon blend                                                                                         |
| 3D buildings          | `fill-extrusion` from OpenMapTiles `building` layer (OpenFreeMap includes it), with theme colours and lighting                                                   |
| Spotlight / mask      | Dim everything outside a focus geometry or radius; animated in/out                                                                                               |
| Locator inset         | Small overview map showing the current extent                                                                                                                    |

### Thematic encodings (Tiers 0–1)

| Technique                 | Notes                                                                                                                            |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Choropleth                | quantile / natural breaks (Jenks) / equal / manual breaks; sequential and diverging (midpoint required)                          |
| Bivariate choropleth      | 3×3 with square legend                                                                                                           |
| Proportional symbols      | sqrt-area scaling, nested-circle legend, overlap ordering                                                                        |
| Change symbols            | before → after dumbbell/arrow glyphs, signed delta colour (diverging), percent-change labels; first-class for comparison stories |
| 3D columns                | deck.gl `ColumnLayer` at points; linear height (bar semantics); animated growth                                                  |
| Extruded polygons         | 3D choropleth; critic requires normalized/intensive attribute or explicit override                                               |
| Hexbin / grid aggregation | 2D or 3D (deck.gl `HexagonLayer`/`GridLayer`, H3 hexagons)                                                                       |
| Heatmap                   | Density with documented bandwidth                                                                                                |
| Dot density               | Generated dots per unit with disclosed dot value                                                                                 |
| Contours / isolines       | deck.gl `ContourLayer` from points                                                                                               |

### Lines, flows and movement (Tiers 1–2)

| Technique            | Notes                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------ |
| Animated line reveal | Draw-on along a path, driven by progress                                                   |
| Flow particles       | Particles moving along line geometry; speed/density bound to a value (three.js or deck.gl) |
| Arcs / great circles | OD flows with width/colour by volume (`ArcLayer`, `GreatCircleLayer`)                      |
| Trips                | Animated trails over time (`TripsLayer`)                                                   |
| Glowing paths        | Bloom-style emphasis for the narrative's focal route                                       |

### 3D objects (Tier 2)

glTF/GLB models, 3D text labels, pulsing beacons and lights/shadows for model
scenes. Models come from the asset library below.

### Asset library

Models, icons, textures, themes, palettes and motion presets are all
**assets**. A story references them the same way wherever they come from:

| Source       | Reference form              | Notes                                                                                                                                                                                                                                                                  |
| ------------ | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Starter pack | `builtin:<id>`              | A curated set of free models and icons in a separate package (`@mapbard/assets-starter`) so the CLI stays small. Only CC0 sources such as Kenney, Quaternius, Poly Haven and CC0 items from Smithsonian Open Access; each asset's license is verified when it is added |
| Author's own | `./assets/…` (project path) | Registered with `mapbard add`; licence and credit fields are required                                                                                                                                                                                                  |
| Community    | `community:<user>/<id>@<v>` | M7: shared through the hosted hub with licence, attribution and version pinning                                                                                                                                                                                        |

- **Licence metadata is mandatory** for every asset. `build` writes the credits
  into the story, and `check` rejects assets with an unknown licence.
- **Builds copy assets locally,** so stories stay portable and offline-capable.
  Community assets are pinned by version and content hash.
- **Budgets:** `check` warns about models over a size or triangle limit and
  suggests compressing them (glTF with Draco/meshopt compression).

### Comparison

Swipe (before/after slider), side-by-side synced maps, small multiples, and
morph transitions between periods on one map.

### Attention and annotation (Overlay)

Callouts with leader lines and collision-aware placement (never covering their
target or the card), feature halos/glow, pulse markers, region outline draw-on,
brackets across features, bound value labels (M3), auto scale bar and north
arrow when bearing ≠ 0, and legends generated per technique (ramps, classes,
nested circles, bivariate squares, column height keys).

### Media and charts

A hero intro with full-bleed image/video and a title sequence; media anchored
to map features; inline charts (sparkline, slope chart, bar) that highlight
linked features on hover.

## Layouts, themes and typography

- **Layout templates:** `sidecar` (current), `overlay-cards`, `full-bleed`
  (immersive map, minimal text), `split` (50/50) and `chapter` (title cards
  between acts). Mobile-first: each defines its narrow-screen form.
- **Theme presets:** `editorial-light`, `night`, `atlas` (warm paper),
  `newsroom` (high contrast). Tokens cover palette, ramps, type scale, card
  style and basemap tint.
- **Fonts:** open-licensed (OFL) families bundled locally for offline builds.
  Basemap label glyphs come from the provider.
- **Card placement:** the layout engine reserves the card's screen rectangle,
  and camera framing (`fitBounds` padding) keeps targets out of it.

## Honest-cartography critic

These are rules in `@mapbard/knowledge`, run by `mapbard check`. Each yields a
diagnostic with a remedy:

- **Story contrast hidden:** features the narration compares fall in the same
  class or within a small colour distance. Suggest change symbols, quantiles or
  manual breaks.
- **Extrusion of an extensive quantity** without normalization.
- **Diverging scale without a meaningful midpoint;** truncated or non-zero
  baseline for columns/bars.
- **Inconsistent scales** across scenes that compare the same attribute.
- **Occlusion:** annotation targets or focus features under a card, legend or
  another annotation (checked with projected coordinates in the visual QA run).
- **Raw identifiers** in user-facing text, and unformatted units (`ft^3/s` →
  ft³/s).
- **Colour accessibility:** palette contrast against the basemap, and
  colour-blind-safe categorical sets.

## Visual QA pipeline

`mapbard check --visual` runs the published story in headless Chromium through
Playwright (Apache-2.0). Lightweight Playwright smoke tests arrive in M1. WebGL
uses SwiftShader in CI and the GPU locally.

- It captures each scene at progress 0, 0.5 and 1 at desktop (1440×900) and
  phone (390×844), and writes a contact sheet PNG for human/agent review.
- **Golden screenshots** per showcase story, with perceptual-diff tolerance;
  updated deliberately with `--update`.
- **Runtime checks:** no console errors, the expected network hosts only
  (none for `--offline`), occlusion via DOM rects vs projected targets, FPS
  sample during camera tracks, and JS/data size budgets.
- Agents can read the contact sheet to self-critique, which is advisory only.
  Deterministic rules decide pass/fail.

## Acceptance demo: Potomac, redesigned

1. **Intro:** dark or atlas basemap, terrain with hillshade over the Potomac
   valley, a slow push-in from the Chesapeake region, and a title sequence.
2. **2024:** the camera flies along the river from Hancock to Little Falls.
   3D columns rise at the three gauges (linear height in ft³/s) with bound
   callouts. Flow particles along the river run at a density set by
   discharge.
3. **2025:** a GPU transition shrinks the columns and thins the particles.
   Change symbols show −5,000, −21,580 and −15,500 ft³/s (−90%, −91%, −90%).
   Swipe comparison is available.
4. **Limits:** spotlight on Little Falls with diversion and regulation
   annotations; the particles calm, and qualifications are visible.

All values come from the existing oracle in
[fixtures/potomac-change](../fixtures/potomac-change/method-case.json). The demo
needs M3 bindings for the callouts, or uses literal text until M3 lands.

## Delivery slices

| Slice | Contents                                                                                                                                                                    | Done when                                                                  |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| V1    | Tier-0 polish: theming/tint, terrain, globe, sky; progress-driven motion and camera tracks; layouts/themes; legends and callout engine; visual QA pipeline and critic rules | Potomac with terrain, motion and fixed encoding scores ≥ 75; QA runs in CI |
| V2    | Tier 1 deck.gl: columns, extrusions, change symbols, proportional symbols, arcs, trips, hexbin; GPU data transitions                                                        | Potomac columns + transitions; one flows example; budgets met              |
| V3    | Tier 2 three.js: adapter, flow particles, glTF models, lighting                                                                                                             | Potomac particles; a model scene; 60 fps on reference laptop               |
| V4    | Comparison and charts: swipe, synced maps, small multiples, inline charts                                                                                                   | Potomac swipe; one chart-linked scene; Potomac scores ≥ 85                 |

## Reliable tiles

Stories use a provider fallback chain (for example OpenFreeMap → VersaTiles),
load timeouts, and graceful degradation to authored local context layers with a
visible notice when tiles fail. Custom or self-hosted style URLs are
first-class. Visual QA includes a "tiles unavailable" run.

## Open questions

- Imagery basemap: keyless, openly licensed satellite imagery is limited (for
  example EOX Sentinel-2 cloudless 2016 is CC BY 4.0, while later years are
  non-commercial). Verify the terms before adding a preset.
- Starter pack contents: which 20–40 models and icons give the most storytelling
  range (landmarks, vehicles, infrastructure, nature, people markers)?
