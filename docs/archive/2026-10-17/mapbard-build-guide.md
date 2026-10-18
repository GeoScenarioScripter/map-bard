# MapBard — Build Guide (for the coding agent)

This is the working brief for building **MapBard**: an agent that turns geographic data + text + intent into an **interactive HTML map story** (a "storymap"). Read this fully once, then start at Milestone 0. It is scoped to **Phase A (MVP)** on purpose — build that end to end before reaching for anything in *Out of scope*.

---

## 0. How to work on this

- **The schema is the contract.** Everything flows through one object, `GeoNarrative`. Build it first; every stage reads and writes it.
- **Vertical slice over horizontal completeness.** Get one tiny story working end to end (data → bundle that opens in a browser) as early as possible, then deepen. Do not build all of `core` before any of `renderer`.
- **The renderer is deterministic. LLMs never emit raw HTML.** The model fills the schema; a fixed template turns the schema into HTML/JS. This is the single most important reliability rule.
- **Validate every LLM output against the schema.** Invalid → repair or retry, never pass through.
- **Scenes need not be complete.** A scene may use only some content dimensions. Don't force all of them.
- **Keep dependencies few and the ops surface near zero.** No database server, no message bus.

---

## 1. What MapBard is (one paragraph)

A user brings resources (a GeoJSON or CSV, some text, maybe a rough script, **and supporting media — photos and video**) and an intent ("show how the river eroded the north bank over five years"). MapBard **plans** a narrative as an ordered graph of scenes, **designs** how each scene is drawn and moved through, and **builds** a self-contained interactive web page where a map is the narrator, **with the user's media woven into the scenes and pinned to places**. The output is a portable static bundle that runs anywhere, independent of MapBard itself.

---

## 2. Phase A scope (build this)

A single linear story over vector data **plus supporting media (images/video)**, run headless through a CLI with human-editable JSON between stages.

**In scope**
- Ingest **GeoJSON** and **CSV-with-coordinates**; profile each source.
- Ingest **media assets** — images (png/jpg/webp) and video (mp4/webm), each **local file or URL** — and register them for use in scenes.
- **Plan** → **Design** → **Build** as three explicit steps, each producing/enriching one `GeoNarrative`.
- A **linear scrollytelling** output: stacked scenes, a sticky MapLibre map, camera moves between scenes, narration text.
- **Media in the story two ways**: illustrating a scene's **narration panel**, and **anchored to map locations** (a marker/popup that shows a photo or video).
- A **basic runtime control panel** (a few declared sliders/toggles bound to layer properties).
- A working **CLI**: resources in → static bundle out.

**Explicitly Out of scope for now** (see §9): branching plan tree, raster/temporal data, the vision self-check loop, vector-RAG knowledge base, a full Studio UI, auth, multi-user, multiple LLM providers.

**Definition of done:** running the CLI on one real GeoJSON (+ at least one supplied media asset) + a one-line intent produces an `out/` bundle that opens in a browser as a coherent multi-scene map story, with at least one working runtime control and at least one scene that incorporates a media asset (in its narration panel or anchored to the map).

---

## 3. Architecture

A single **pnpm + TypeScript monorepo**. The `schema` package is the heart; everything depends on it.

```
mapbard/
├── packages/
│   ├── schema/      # GeoNarrative: Zod schemas + inferred types  (build first)
│   ├── core/        # ingest+profiling, LLM adapter, the 3-stage pipeline
│   ├── knowledge/   # static element→technique table (JSON) — no RAG yet
│   ├── renderer/    # GeoNarrative + data → static bundle (MapLibre + scrollama)
│   └── cli/         # `mapbard ...` — wires the stages together
│   # studio/  (Phase B — the authoring UI; skip for MVP)
├── examples/        # sample data + a hand-written GeoNarrative to test against
├── package.json     # pnpm workspaces
└── tsconfig.base.json
```

**Stack and key decisions**

| Concern | Choice | Note |
|---|---|---|
| Language | TypeScript (strict, ESM) everywhere | shared schema types across pipeline + output |
| Schema/validation | **Zod**; types via `z.infer` | one definition, runtime-checked |
| Map engine (output) | **MapLibre GL JS** | open, no token |
| Basemap | **PMTiles** (Protomaps) | single static file → portable output |
| Scrollytelling | **scrollama.js** | in the renderer template |
| Pipeline | explicit 3-stage state machine | legible, testable; not a heavy agent framework |
| LLM | one provider behind an adapter interface | structured output validated vs schema |
| Storage | **SQLite** for projects/versions | zero-ops; can defer until needed in MVP |
| Tests | **vitest** | unit-test schema + profiling first |

---

## 4. The schema (`packages/schema`) — build this first

Implement as Zod; the interfaces below are the shape. Keep fields optional where a scene might omit them. This is a **starter** — extend it, don't treat it as frozen.

```ts
// A whole story.
interface GeoNarrative {
  id: string;
  title: string;
  intent: string;                 // the user's original goal (kept for traceability)
  dataSources: DataSource[];
  mediaAssets: MediaAsset[];      // images/video the story can use (may be empty)
  scenes: Scene[];                // ordered; index = narrative order
  basemap: { style: string; pmtilesUrl?: string };
  theme?: ThemeTokens;            // colors, fonts (optional in MVP)
  schemaVersion: string;
}

interface DataSource {
  id: string;
  name: string;
  kind: "geojson" | "csv";
  path: string;                   // local path or URL
  profile: DataProfile;           // filled by Stage 0
}

interface DataProfile {
  geometryType?: "point" | "line" | "polygon" | "mixed" | "none";
  featureCount: number;
  attributes: Attribute[];
  extent?: [number, number, number, number];   // [minX,minY,maxX,maxY]
  temporalExtent?: [string, string];
  crs?: string;                   // assume EPSG:4326 if absent
}

interface Attribute {
  name: string;
  dataType: "number" | "string" | "boolean" | "date";
  measurement: "nominal" | "ordinal" | "interval" | "ratio";
  sample?: (string | number)[];
}

// A photo or video the story can show. Profiled by Stage 0 like a data source.
interface MediaAsset {
  id: string;
  name: string;
  kind: "image" | "video";
  source: "local" | "url";        // bundled file vs remote reference
  path: string;                   // local path or URL
  mimeType?: string;              // e.g. image/jpeg, video/mp4
  width?: number; height?: number;// intrinsic size if known (best-effort)
  poster?: string;                // optional poster image for video (asset id or path)
  caption?: string;               // default caption/alt text
  credit?: string;                // attribution
  location?: [number, number];    // optional [lon,lat] if the media is place-bound
}

interface Scene {
  id: string;
  title: string;
  narration: string;              // the prose shown for this scene
  media?: SceneMedia[];           // images/video illustrating this scene's panel
  mediaAnchors?: MediaAnchor[];   // media pinned to map locations (marker/popup)
  content: ContentDimensions;     // what this scene is *about* (geographic substrate)
  discourse: DiscourseDimensions; // how it is *told*
  layers: LayerBinding[];         // what's drawn
  camera: Camera;                 // where the map sits for this scene
  transitionIn?: "fly" | "ease" | "cut";
  controls?: Control[];           // runtime DIY exposed in this scene
}

// The geographic substrate. All optional — a scene uses what it needs.
interface ContentDimensions {
  semantics?: string;             // what the scene means / the point
  location?: string;             // place + time framing in words
  geometry?: string;             // which features/shapes are in focus
  attribute?: string;            // which measured property matters here
  relationship?: string;        // links/comparisons between elements
  process?: string;             // change / evolution shown in this scene
}

interface DiscourseDimensions {
  narrativeRole: "establish" | "develop" | "compare" | "reveal" | "drill" | "resolve";
  emphasis: "low" | "medium" | "high";
  readerAgency: "none" | "guided" | "open";   // how much the reader can fiddle
}

interface LayerBinding {
  id: string;
  dataSourceId: string;
  technique: "choropleth" | "graduated-symbol" | "categorical" | "heatmap" | "line" | "point" | "fill";
  encode?: { attribute: string; visualVariable: "color" | "size" | "opacity" };
  classification?: { method: "quantile" | "equal-interval" | "natural-breaks"; classes: number };
  filter?: string;               // simple expression, e.g. "year == 2020"
}

interface Camera { center: [number, number]; zoom: number; bearing?: number; pitch?: number }

// Media shown inside a scene's narration panel.
interface SceneMedia {
  assetId: string;                               // → MediaAsset.id
  placement?: "inline" | "figure" | "background";// how it sits in the card
  caption?: string;                              // overrides the asset's caption
}

// Media pinned to a map location, surfaced by interaction.
interface MediaAnchor {
  assetId: string;                               // → MediaAsset.id
  at?: [number, number];                         // [lon,lat]; defaults to asset.location
  trigger?: "marker" | "auto";                   // click a marker vs auto-open on enter
  label?: string;                                // marker label
}

interface Control {
  id: string;
  kind: "slider" | "toggle" | "select" | "colorpicker";
  label: string;
  bindsTo: { layerId: string; property: string };   // a paint/filter property
  range?: [number, number]; options?: string[]; default?: unknown;
}

interface ThemeTokens { palette?: string[]; displayFont?: string; bodyFont?: string }
```

Put a **hand-written example** `GeoNarrative` JSON in `examples/` (2 scenes is enough). The renderer and the pipeline tests both target it, so the renderer can be built and verified *before* the LLM stages exist.

---

## 5. The pipeline (`packages/core`)

Three pure-ish steps. Each takes a `GeoNarrative` (or the inputs to make one) and returns a more complete one. A human-editable JSON sits between steps in the MVP (the CLI writes it out, the user can edit, the next step reads it).

**Stage 0 — Ingest & profile.** `(files) → DataSource[] + MediaAsset[]`. Parse GeoJSON/CSV; compute `DataProfile` (geometry type, attributes with inferred `measurement` level, extent, value samples). Also register **media assets**: resolve/validate each image or video (local file or URL), record `kind`, `mimeType`, best-effort `width`/`height`, and any `location` — no transcoding. No LLM. Unit-test this thoroughly — it grounds everything downstream.

**Stage 1 — Plan.** `(profiles + media profiles, intent) → GeoNarrative` with scenes filled at the `content` + `narration` + `discourse` level, **and relevant media attached** (a scene's `media`, or `mediaAnchors` for place-bound assets — referenced by `assetId` only). LLM produces structured output; validate against the schema; on failure, repair/retry. **Never invent media that wasn't supplied** — only reference registered `MediaAsset` ids. Include a **fit check**: if a scene's `content.process` is requested but no source has a `temporalExtent`, flag it and surface a question rather than inventing data.

**Stage 2 — Design.** `(planned GeoNarrative) → GeoNarrative` enriched with `layers`, `camera`, `transitionIn`, and `controls`. Use the static **element→technique table** in `packages/knowledge` (e.g. ratio attribute → choropleth with quantile classes; categorical → categorical fill; relationship → side-by-side or filter control). LLM optional here in MVP; a rule-based pass over the table is fine to start.

**Stage 3 — Build.** `(complete GeoNarrative + data + media) → static bundle`. Pure code, no LLM: hand the schema to the renderer template (§6). The `controls` array drives the runtime panel. **Local media is copied into the bundle; URL media is referenced in place** — keep the bundle self-contained for local assets.

**LLM adapter:** a single interface — `complete({system, prompt, schema}) → validated object`. One provider behind it (read key from env). Don't generalize to many providers yet.

---

## 6. The renderer (`packages/renderer`)

A deterministic template: **`render(geoNarrative, dataMap) → { 'index.html', 'app.js', 'style.css', ...data }`**.

- A **sticky MapLibre map**; scenes are stacked text blocks; `scrollama` fires on each scene to call a `goToScene(i)` that runs the camera move (`flyTo`/`easeTo`/`cut`) and toggles layer visibility/paint per that scene's `layers`.
- **Media** renders two ways: a scene's `media` appears inside its narration panel (inline `<img>` / `<video>`, a captioned figure, or a panel background per `placement`); `mediaAnchors` place markers on the map that open an image/video popup (or auto-open on scene enter per `trigger`). Local assets are loaded from the bundle, URL assets from their host.
- The **control panel** is a thin side strip generated from the active scene's `controls`; each control writes directly to the bound MapLibre paint/filter property at runtime. Only render controls the scene declares (constrained reader agency).
- Output is **self-contained**: inline or co-located JS/CSS, data shipped alongside, basemap via PMTiles. The bundle must open from `file://` or any static host with no server.

Build and verify the renderer against the hand-written `examples/` `GeoNarrative` **before** wiring the LLM stages.

---

## 7. The CLI (`packages/cli`)

One command that runs the slice and writes human-editable JSON at each gate:

```
mapbard plan   --data path.geojson --media photo.jpg --media clip.mp4 --intent "..."   # → narrative.plan.json
mapbard design --in narrative.plan.json             # → narrative.design.json
mapbard build  --in narrative.design.json --out ./out
```

`--media` is repeatable and accepts a local path or a URL (each becomes a `MediaAsset`). A convenience `mapbard story --data ... --media ... --intent ... --out ./out` can chain all three for quick tests. Keep the gates inspectable; they are how the "human in the loop" works before the Studio UI exists.

---

## 8. Build order (milestones)

| # | Milestone | Done when |
|---|---|---|
| M0 | Repo scaffold: pnpm workspace, tsconfig, empty packages, vitest, lint | `pnpm -r build` and `pnpm -r test` run clean |
| M1 | **`schema`**: Zod `GeoNarrative` + inferred types + example JSON | example validates; types exported |
| M2 | `core` Stage 0: GeoJSON + CSV ingest & profiling | profiles correct on sample files (tested) |
| M3 | **`renderer`** against the example JSON | example renders to a browsable bundle |
| M4 | `core` LLM adapter + Stage 1 Plan (validated, with fit check) | intent → valid planned `GeoNarrative` |
| M5 | `core` Stage 2 Design (rule-based via `knowledge` table) | plan → design with layers/camera/controls |
| M6 | `cli` wiring `plan`/`design`/`build` + gates | one command path works |
| M7 | **MVP**: one real dataset end to end | matches Definition of Done (§2) |

Do M1 and M3 early; once the renderer works on a hand-written narrative, the LLM stages have a concrete target to aim at.

**Media is not a separate milestone — it threads through existing ones:** M1 (the `MediaAsset` / `SceneMedia` / `MediaAnchor` types + a media-bearing example), M2 (register/profile assets in Stage 0), M3 (render scene-panel media + map-anchored popups), M4 (Plan attaches media by `assetId`), and M6 (CLI `--media` + bundling local assets).

---

## 9. Out of scope (defer; do not build yet)

Branching/alternative plan trees and version graph · raster + temporal data (PMTiles raster, time slider) · the **vision self-check loop** (Playwright screenshots + critique) · vector-RAG knowledge base (keep the static table for now) · the **Studio UI** (`studio` package) · multiple LLM providers · auth, accounts, collaboration · deployment/hosting automation.

When the MVP in §2 is met and stable, the next step is the **branching plan tree + a minimal Studio UI** to replace the JSON gates — not any of the others.

---

## 10. Conventions

- TypeScript strict, ESM modules, no `any` in package public APIs.
- One responsibility per package; depend **inward** toward `schema` (renderer/core/cli depend on schema, never the reverse).
- All cross-package data is a validated `GeoNarrative` or its sub-types — no ad-hoc shapes.
- Secrets via env (`MAPBARD_LLM_KEY`, etc.); never commit keys; provide `.env.example`.
- Tests live with their package; prioritize `schema` validation and Stage 0 profiling.
- Prettier + ESLint; small, reviewable commits per milestone.

---

**Start now at M0, then M1 (the schema). The schema is the contract — get it right and runnable, and the rest of the project hangs off it.**
