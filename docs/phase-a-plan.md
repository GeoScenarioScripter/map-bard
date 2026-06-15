# MapBard — Phase A Plan (M0–M7)

Detailed, executable expansion of the build guide's milestones. Source of truth for *what* each milestone means is `mapbard-build-guide.md` (§4 schema, §5 pipeline, §6 renderer, §7 CLI, §8 milestones). This file is the *how* and the *checklist*. Track live status in the table below and mirror it in `BUILD_LOG.md`.

## Scope (Phase A only)

A **single linear story over vector data + supporting media (images/video), run headless through a CLI** with human-editable JSON between stages.

- Ingest **GeoJSON** and **CSV-with-coordinates**; profile each source.
- Ingest **media assets** — images (png/jpg/webp) and video (mp4/webm), each **local file or URL** — and register them for scenes.
- **Plan → Design → Build** as three explicit steps, each producing/enriching one `GeoNarrative`.
- A **linear scrollytelling** output: stacked scenes, a sticky MapLibre map, camera moves between scenes, narration text.
- **Media in the story two ways**: in a scene's **narration panel**, and **anchored to map locations** (marker/popup with a photo or video).
- A **basic runtime control panel** (a few declared sliders/toggles bound to layer properties).
- A working **CLI**: resources in → static bundle out.

**Definition of Done (the phase exit gate):** running the CLI on **one real GeoJSON (+ at least one media asset) + a one-line intent** produces an `out/` bundle that opens in a browser as a **coherent multi-scene map story, with at least one working runtime control and at least one scene that incorporates a media asset** (in its narration panel or anchored to the map).

## Status legend

`⬜ NOT STARTED` · `🟡 IN PROGRESS` · `✅ DONE`

## Milestone table

| # | Milestone | Done when | Status |
|---|---|---|---|
| M0 | Repo scaffold (pnpm workspace, tsconfig, empty packages, vitest, lint) | `pnpm -r build` and `pnpm -r test` run clean | ✅ DONE |
| M1 | `schema`: Zod `GeoNarrative` + inferred types + example JSON | example validates; types exported | ✅ DONE |
| M2 | `core` Stage 0: GeoJSON + CSV ingest & profiling | profiles correct on sample files (tested) | ⬜ NOT STARTED |
| M3 | `renderer` against the example JSON | example renders to a browsable bundle | ✅ DONE |
| M4 | `core` LLM adapter + Stage 1 Plan (validated, with fit check) | intent → valid planned `GeoNarrative` | ⬜ NOT STARTED |
| M5 | `core` Stage 2 Design (rule-based via `knowledge` table) | plan → design with layers/camera/controls | ⬜ NOT STARTED |
| M6 | `cli` wiring `plan`/`design`/`build` + gates | one command path works | ⬜ NOT STARTED |
| M7 | MVP: one real dataset end to end | matches Definition of Done | ⬜ NOT STARTED |

**Build-order note:** do **M1 and M3 early**. Once the renderer works on a hand-written narrative, the LLM stages (M4+) have a concrete target to aim at.

**Media note:** media is **not a separate milestone** — it threads through M1 (types + example), M2 (register/profile assets), M3 (render panel + map-anchored media), M4 (Plan attaches media by `assetId`), and M6 (CLI `--media` + bundling). Each milestone below carries the relevant media tasks.

---

## M0 — Repo scaffold

**Objective:** a clean pnpm + TS monorepo skeleton that builds and tests green with empty packages.
**Depends on:** nothing.

**Tasks**
- [ ] `package.json` at root with pnpm workspaces; `pnpm-workspace.yaml` listing `packages/*`.
- [ ] `tsconfig.base.json` (strict, ESM) + per-package `tsconfig.json` extending it.
- [ ] Create empty packages: `schema`, `core`, `knowledge`, `renderer`, `cli` (each with `package.json`, `src/index.ts`, `tsconfig.json`). `examples/` folder.
- [ ] vitest configured at root (or per package); one trivial passing test.
- [ ] Prettier + ESLint config; `.gitignore` (node_modules, dist, `.env`).
- [ ] Root scripts: `build` (`tsc -b` / `pnpm -r build`), `test` (`pnpm -r test`), `lint`.

**Done when:** `pnpm -r build` and `pnpm -r test` run clean.
**Verify:** run `pnpm install`, then `pnpm -r build && pnpm -r test` — both succeed with no errors.

---

## M1 — `schema` (the contract — build first)

**Objective:** `GeoNarrative` and all sub-types as Zod schemas with inferred TS types, plus a hand-written example.
**Depends on:** M0.

**Tasks**
- [ ] Implement guide §4 interfaces as Zod: `GeoNarrative`, `DataSource`, `DataProfile`, `Attribute`, `MediaAsset`, `Scene`, `ContentDimensions`, `DiscourseDimensions`, `LayerBinding`, `Camera`, `SceneMedia`, `MediaAnchor`, `Control`, `ThemeTokens`. Keep scene content fields **optional** (a scene uses what it needs).
- [ ] Media: `GeoNarrative.mediaAssets: MediaAsset[]`; scene `media?: SceneMedia[]` and `mediaAnchors?: MediaAnchor[]`. `SceneMedia`/`MediaAnchor` reference assets by `assetId` (validate references resolve to a `MediaAsset`).
- [ ] Export inferred types via `z.infer`. No `any` in public API.
- [ ] `schemaVersion` constant; export a `parseGeoNarrative()` / safe-parse helper.
- [ ] Write a **hand-written 2-scene example** `GeoNarrative` JSON in `examples/` that both renderer (M3) and pipeline tests target — **include at least one scene-panel media and one map-anchored media** so downstream stages have a concrete target.
- [ ] Unit tests: the example validates; a deliberately broken variant fails; a dangling `assetId` fails.

**Done when:** the example validates against the schema; types are exported and importable by other packages.
**Verify:** `pnpm --filter schema test` passes; importing `GeoNarrative` type in another package type-checks.

---

## M2 — `core` Stage 0: Ingest & profile (no LLM)

**Objective:** parse vector sources into a correct `DataProfile` **and register media assets into `MediaAsset[]`**. This grounds everything downstream, so test it thoroughly.
**Depends on:** M1.

**Tasks**
- [ ] GeoJSON ingest → `DataSource` + `DataProfile`: geometry type (point/line/polygon/mixed/none), `featureCount`, `extent` `[minX,minY,maxX,maxY]`, `crs` (assume EPSG:4326 if absent).
- [ ] CSV-with-coordinates ingest: detect lon/lat columns → point features → same profile.
- [ ] Attribute profiling: `name`, `dataType` (number/string/boolean/date), inferred `measurement` level (nominal/ordinal/interval/ratio), `sample` values.
- [ ] `temporalExtent` when a date attribute is present.
- [ ] **Media registration → `MediaAsset[]`:** for each `--media` input, classify `kind` (image/video) and `source` (local/url), record `mimeType`, best-effort `width`/`height`, `location` if available; validate local files exist and URLs are well-formed. **No transcoding.** No LLM.
- [ ] Sample fixtures in `examples/` (a small GeoJSON, a small CSV, and a couple of small media files).
- [ ] **Thorough unit tests** on the fixtures — data profiles must be exactly correct; media assets classified correctly (incl. a URL and a missing-file error case).

**Done when:** data profiles and media assets are correct on the sample files, verified by tests.
**Verify:** `pnpm --filter core test` — Stage 0 tests pass on GeoJSON, CSV, and media fixtures.

---

## M3 — `renderer` (deterministic; build against the M1 example)

**Objective:** `render(geoNarrative, dataMap) → { 'index.html', 'app.js', 'style.css', ...data }` producing a self-contained, browsable bundle. **No LLM.**
**Depends on:** M1 (and M2 fixtures for real data).

**Tasks**
- [ ] Template: a **sticky MapLibre map**; scenes are stacked text blocks; **scrollama** fires per scene → `goToScene(i)`.
- [ ] `goToScene(i)` runs the camera move (`flyTo` / `easeTo` / `cut` per `transitionIn`) and toggles layer visibility/paint per that scene's `layers`.
- [ ] **Scene-panel media**: render the active scene's `media` in its narration card — inline `<img>`/`<video>`, a captioned `figure`, or a panel `background` per `placement`. Video uses native controls + `poster`.
- [ ] **Map-anchored media**: for each `mediaAnchor`, place a marker at `at` (or `asset.location`); `trigger: "marker"` opens an image/video popup on click, `trigger: "auto"` opens it on scene enter.
- [ ] **Control panel**: a thin side strip generated from the **active scene's `controls`** only; each control writes directly to the bound MapLibre paint/filter property at runtime (constrained reader agency).
- [ ] Self-contained output: inline/co-located JS+CSS, data + **local media copied into the bundle** (URL media referenced in place), basemap via PMTiles. Must open from `file://` with no server.
- [ ] Render the M1 example to `out/` and eyeball it (panel media + a map marker popup both show).

**Done when:** the example renders to a browsable bundle.
**Verify:** render the M1 example, open `out/index.html` from `file://`, scroll through scenes (camera moves, layers toggle, panel media appears), open a map-anchored media popup, and operate at least one control.

---

## M4 — `core` LLM adapter + Stage 1 Plan

**Objective:** the DashScope adapter + Plan stage: `(profiles, intent) → GeoNarrative` with scenes filled at `content` + `narration` + `discourse` level.
**Depends on:** M1, M2. (Targets the M3 renderer.)

**Tasks**
- [ ] **LLM adapter** `complete({ system, prompt, schema }) → validated object`, single provider = **DashScope OpenAI-compat** (see `CLAUDE.md §d`). Read `MAPBARD_LLM_KEY` / `MAPBARD_LLM_BASE_URL` / `MAPBARD_LLM_MODEL` (default `qwen3.7-max-2026-05-17`).
- [ ] Ship `.env.example` with the three vars.
- [ ] Plan stage: prompt the model with the data **and media** profiles to produce a schema-valid `GeoNarrative` (scenes with `content`/`narration`/`discourse`). **Validate vs Zod; on invalid → repair/retry**, never pass through.
- [ ] **Media attachment:** the model attaches relevant assets to scenes (`media`) or anchors place-bound ones (`mediaAnchors`), **referencing only registered `assetId`s — never invent media**. Validate every referenced `assetId` resolves; on dangling reference → repair/retry.
- [ ] **Fit check:** if a scene's `content.process` is requested but no source has a `temporalExtent`, flag it and **surface a question** rather than inventing data.
- [ ] Tests: a stubbed/mocked adapter returns a fixture; validation, media-reference, and fit-check logic unit-tested without network.

**Done when:** an intent → a valid planned `GeoNarrative`.
**Verify:** `pnpm --filter core test` (mocked) passes; a live smoke run with a real key turns one intent into a schema-valid `narrative.plan.json`.

---

## M5 — `core` Stage 2 Design (rule-based)

**Objective:** `(planned GeoNarrative) → GeoNarrative` enriched with `layers`, `camera`, `transitionIn`, `controls`. LLM optional in MVP — a rule-based pass is fine to start.
**Depends on:** M1, M4, and the `knowledge` table.

**Tasks**
- [ ] In `packages/knowledge`: a static **element → technique table** (JSON), e.g. ratio attribute → choropleth w/ quantile classes; categorical → categorical fill; relationship → side-by-side or filter control. **No RAG yet.**
- [ ] Design stage: rule-based pass over the table → fill each scene's `layers` (technique + encode + classification), derive `camera` from data extent / scene focus, set `transitionIn`, and choose **which** `controls` to expose (constrained reader agency — never expose everything).
- [ ] Tests on the planned-example fixture → expected design bindings.

**Done when:** a plan → a design with `layers`/`camera`/`controls` populated.
**Verify:** `pnpm --filter core test`; feed M4's plan output through Design → a `narrative.design.json` that the M3 renderer accepts.

---

## M6 — `cli` wiring + human-editable gates

**Objective:** one command path that runs the slice and writes inspectable JSON at each gate.
**Depends on:** M2, M4, M5, M3.

**Tasks**
- [ ] `mapbard plan --data path.geojson --media photo.jpg --media clip.mp4 --intent "..."` → `narrative.plan.json` (`--media` repeatable; local path or URL).
- [ ] `mapbard design --in narrative.plan.json` → `narrative.design.json`.
- [ ] `mapbard build --in narrative.design.json --out ./out` (calls the renderer; bundles local media).
- [ ] Convenience `mapbard story --data ... --media ... --intent ... --out ./out` chaining all three.
- [ ] Gates are human-editable JSON: the user can edit between steps (incl. media attachments); the next step reads the edited file.

**Done when:** one command path works.
**Verify:** run `plan` → edit JSON → `design` → `build`; confirm `out/` opens and reflects edits. Also confirm `mapbard story` produces the same end state in one shot.

---

## M7 — MVP: one real dataset end to end

**Objective:** prove the Definition of Done on a real dataset.
**Depends on:** M0–M6.

**Tasks**
- [ ] Pick one real GeoJSON + **at least one media asset** + a one-line intent.
- [ ] Run `mapbard story` (or the three gates) → `out/`.
- [ ] Verify the bundle is a coherent multi-scene story with ≥1 working control **and ≥1 scene incorporating a media asset** (panel or map-anchored), opening with no server.
- [ ] Note any rough edges in `BUILD_LOG.md`; record durable lessons in memory.

**Done when:** matches the Definition of Done (§2).
**Verify:** open the final `out/index.html` from `file://`; scroll the whole story; operate a control; open the media (panel and/or anchored popup); confirm scenes/camera/narration/media cohere.

---

## Parking lot (guide §9 — do NOT build in Phase A)

Branching / alternative plan trees + version graph · raster + temporal data (PMTiles raster, time slider) · the vision self-check loop (Playwright screenshots + critique) · vector-RAG knowledge base (keep the static table) · the Studio UI (`studio` package) · multiple LLM providers · auth / accounts / collaboration · deployment/hosting automation.

When Phase A is met and stable, the next step is the **branching plan tree + a minimal Studio UI** to replace the JSON gates — nothing else first.
