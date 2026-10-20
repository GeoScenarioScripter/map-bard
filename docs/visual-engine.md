# M2 — Visual Engine

Updated 2026-10-20. Status: **planned** (starts after M1's basemap and format
work). Part of the [roadmap](ROADMAP.md).

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
  or `step` (current behaviour). `prefers-reduced-motion` forces step with final
  states, and every track declares its final state.

The authored form stays short. For example `"camera": {"preset": "fly-along",
"feature": "river-context/potomac", "pitch": 60}` or explicit `keyframes`. The
M5 workbench will capture keyframes from the live map.

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

glTF/GLB landmark models (bundled locally, with licence attribution required),
3D text labels, pulsing beacons and lights/shadows for model scenes.

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

## Open questions

- Should `scrub` or `play` be the default motion mode? The proposal is `scrub`
  for camera and `play` for data transitions.
- Bundled model library: ship a few CC0 glTF landmarks/icons, or require
  author-supplied models only?
- Imagery basemap: keyless, openly licensed satellite imagery is limited (for
  example EOX Sentinel-2 cloudless 2016 is CC BY 4.0, while later years are
  non-commercial). Verify the terms before adding a preset.
- Reach from mainland China: all listed providers responded from the
  development machine, but slowly. Keep the provider list configurable and allow
  custom/self-hosted tile URLs.
