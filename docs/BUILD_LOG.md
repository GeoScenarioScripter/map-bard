# MapBard — Build Log

The single session/phase journal. Each work session is one chapter. This is how a future session resumes: read the **current-state banner**, then the **last session entry**.

**How to use**
- Append the newest session at the **bottom** (newest last).
- Open a session before working: `## Session NN — YYYY-MM-DD — 🟢 OPEN`. Close it when done: `🔴 CLOSED`.
- Mark milestone completions inline and mirror status into `phase-a-plan.md`.
- Park out-of-scope ideas in the **Parking lot** at the bottom; don't build them.

**Marker legend:** 🟢 OPEN session · 🔴 CLOSED session · ✅ milestone DONE · 🟡 milestone IN PROGRESS · ⬜ milestone NOT STARTED · ▶ phase opened · ⏹ phase complete.

---

## Current state banner

- **Phase:** A (MVP) — **OPENED** (Session 03).
- **Active milestone:** **M5 — `core` Stage 2 Design (rule-based via `knowledge` table)** (⬜ NOT STARTED, next). M0 ✅ · M1 ✅ · M2 ✅ · M3 ✅ · M4 ✅ DONE.
- **Milestones:** M0 ✅ · M1 ✅ · M2 ✅ · M3 ✅ · M4 ✅ · M5 ⬜ · M6 ⬜ · M7 ⬜.
- **Scope:** vector data **+ supporting media (images/video, local or URL)** — media appears in scene narration panels and anchored to map locations. Threads through M1–M4, M6 (not a separate milestone).
- **Next action:** **M5** — Stage 2 Design: a static element→technique table in `packages/knowledge`, then a rule-based pass filling each scene's `layers` (technique + encode + classification), refined per-scene `camera`, `transitionIn`, and chosen `controls`. Feed M4's plan through it → a `narrative.design.json` the renderer accepts. Schema is `v0.1.0`, not frozen.
- **Repo:** pushed to GitHub `origin` → `https://github.com/GeoScenarioScripter/map-bard.git` (`main` tracks `origin/main`) as of Session 04.
- **Toolchain:** pnpm 9.15.0 (via corepack), Node 22.19, TypeScript 5.9, vitest 2.1, eslint 9.39. MapBard has **its own git repo** on `main` (not the `D:/code` parent).
- **LLM:** DashScope (OpenAI-compat endpoint), default model `qwen3.7-max-2026-05-17`. See `CLAUDE.md §d`.

---

## Session 01 — 2026-06-15 — 🔴 CLOSED

**Goal:** Stand up project governance before any code — session/phase/memory protocol, a detailed Phase A plan, and the LLM provider decision.

**Did:**
- Read the three docs (`mapbard-build-guide.md`, `mapbard-plan.md`, `mapbard-story.html`); confirmed repo is greenfield (docs only).
- Created `CLAUDE.md` (prime directives + session / phase / memory / LLM / conventions protocols).
- Created `docs/phase-a-plan.md` (M0–M7 expanded into objectives, tasks, done-when, verification; milestone status table; parking lot).
- Created this `docs/BUILD_LOG.md` (journal + current-state banner + session template).
- Created project memories: `project_mapbard`, `feedback_mapbard_dashscope` (+ `MEMORY.md` pointers).

**Decisions:**
- Task scope = **governance docs only** (no code this session).
- Session updates = **single `BUILD_LOG.md`** with a chapter per session (not per-file).
- LLM = **DashScope** via **OpenAI-compatible endpoint**, default model **`qwen3.7-max-2026-05-17`**, behind the guide's single adapter; kept swappable via env (`MAPBARD_LLM_KEY` / `MAPBARD_LLM_BASE_URL` / `MAPBARD_LLM_MODEL`). One provider only for now.

**Files touched:** `CLAUDE.md`, `docs/phase-a-plan.md`, `docs/BUILD_LOG.md`, memory (`project_mapbard.md`, `feedback_mapbard_dashscope.md`, `MEMORY.md`).

**Verification:** All three docs cross-checked — milestone table matches guide §8; LLM section names DashScope + model + three env vars; markers/legend consistent. No source/package files created (docs-only scope honored).

**Next:** Session 02 — open Phase A (`### ▶ PHASE A — OPENED`) and start **M0**: pnpm workspace, `tsconfig.base.json`, empty packages (`schema`/`core`/`knowledge`/`renderer`/`cli`), `examples/`, vitest, Prettier/ESLint. Done when `pnpm -r build && pnpm -r test` run clean.

---

## Session 02 — 2026-06-15 — 🔴 CLOSED

**Goal:** Fold **supporting media (images/video)** into Phase A so the MVP produces a *full* storymap, not just vector + text — per user direction.

**Did:**
- Updated the authoritative brief `docs/mapbard-build-guide.md`: §1 framing, §2 scope + Definition of Done, §4 schema (new `MediaAsset`, `SceneMedia`, `MediaAnchor` types; `GeoNarrative.mediaAssets`; scene `media`/`mediaAnchors`), §5 pipeline (Stage 0 registers media, Stage 1 attaches by `assetId`, Stage 3 bundles local media), §6 renderer (panel + map-anchored media), §7 CLI (`--media`), §8 milestone note.
- Updated `docs/phase-a-plan.md`: scope, DoD, and media tasks woven into M1–M4, M6, M7.
- Updated `CLAUDE.md` orientation and the `project_mapbard` memory.

**Decisions (confirmed with user):**
- Media is **built into Phase A**, not deferred.
- Media appears **both** in the scene narration panel **and** anchored to map locations (marker/popup).
- Kinds = **images + video**, source = **local file or URL** (local copied into bundle, URL referenced). No external embeds/iframes; no transcoding.
- Media is **not a separate milestone** — it threads through M1 (types+example), M2 (ingest/profile), M3 (render), M4 (Plan attaches by `assetId`), M6 (CLI `--media`). The model **never invents media** — only references registered `assetId`s.

**Files touched:** `docs/mapbard-build-guide.md`, `docs/phase-a-plan.md`, `CLAUDE.md`, `docs/BUILD_LOG.md`, memory (`project_mapbard.md`).

**Verification:** Cross-checked schema additions are consistent across guide §4 ↔ plan M1; DoD updated in both guide §2 and plan; CLI `--media` consistent in guide §7 and plan M6. Still docs-only — no source/package files created.

**Next:** Session 03 — open Phase A (`### ▶ PHASE A — OPENED`) and start **M0** (scaffold), unchanged by this scope addition.

---

## Session 03 — 2026-06-15 — 🟢 OPEN

### ▶ PHASE A — OPENED

**Goal:** M0 — stand up the pnpm + TypeScript monorepo scaffold; then M1 — the `schema` package (Zod `GeoNarrative` + media types, hand-written example, validation tests).

**Did (M0):**
- **Gave MapBard its own git repo.** The folder was sitting inside `D:/code`'s git repo (a messy parent tracking dozens of unrelated projects, no commits). Per user direction, ran `git init -b main D:\code\MapBard` — toplevel is now `D:/code/MapBard`, independent of the parent.
- Activated **pnpm 9.15.0** via corepack (pnpm was not installed; corepack 0.34.0 was). Node v22.19.0.
- Root config: `package.json` (workspaces, `type: module`, scripts `build`/`test`/`lint`/`format`), `pnpm-workspace.yaml` (`packages/*`), `tsconfig.base.json` (strict + ESM `NodeNext`, `noUncheckedIndexedAccess`, `isolatedModules`), `.gitignore`, `.prettierrc.json` + `.prettierignore`, flat `eslint.config.js` (typescript-eslint recommended).
- Five empty packages under `packages/` — `schema`, `core`, `knowledge`, `renderer`, `cli` — each with `package.json` (`@mapbard/<name>`, `build: tsc -p`, `test: vitest run --passWithNoTests`), `tsconfig.json` (extends base, excludes `*.test.ts`), and a placeholder `src/index.ts` exporting `packageName`.
- One trivial passing test in `schema` (`src/index.test.ts`). `examples/` created (`.gitkeep`).

**Did (M1 — `schema`):**
- Implemented **all guide §4 interfaces as Zod** in `packages/schema/src/geo-narrative.ts`: `GeoNarrative`, `DataSource`, `DataProfile`, `Attribute`, `MediaAsset`, `Scene`, `ContentDimensions`, `DiscourseDimensions`, `LayerBinding`, `Camera`, `Control`, `SceneMedia`, `MediaAnchor`, `ThemeTokens`, `Basemap`, plus primitives (`LngLat`, `Extent`, `TemporalExtent`). Scene content fields kept **optional** (directive 5).
- Exported every inferred type via `z.infer`; added `SCHEMA_VERSION = '0.1.0'`, `parseGeoNarrative()` (throws) and `safeParseGeoNarrative()` (non-throwing).
- **Referential integrity** via top-level `superRefine`: every scene `media`/`mediaAnchor` `assetId` must resolve to a `MediaAsset`; every layer `dataSourceId` to a `DataSource`; every control `bindsTo.layerId` to a layer **in the same scene**. Dangling refs fail with a pathed issue.
- Wrote the hand-written **2-scene example** `examples/sf-waterfront.geonarrative.json` — scene 1 has **panel media** (`SceneMedia`, skyline figure), scene 2 has **map-anchored media** (`MediaAnchor`, Ferry Building marker) **and a runtime control** (size slider). Validates clean.
- **12 unit tests** (`packages/schema/src/index.test.ts`): example validates; version matches; panel+anchored media and a control are present; missing required field fails; bad enum fails; `parseGeoNarrative` throws; and four referential-integrity failures (dangling SceneMedia/MediaAnchor assetId, unknown dataSourceId, control→foreign layer).
- **Wired the first inward dependency** to prove importability: `core` now depends on `@mapbard/schema` (`workspace:*`) and imports the `GeoNarrative` type + `parseGeoNarrative` (`loadNarrative` helper). `pnpm -r build` builds schema → core in topo order.

**Did (M3 — `renderer`):**
- Built the deterministic renderer: **`render(narrative, dataMap, options) → RenderedBundle`** (pure: generates `index.html` + `bundle-data.js`, plus a media-copy manifest; no I/O) and **`writeBundle(bundle, outDir)`** (the I/O half: writes text, copies the static runtime, **vendors maplibre-gl + scrollama out of node_modules**, copies local media).
- **Static runtime** shipped verbatim (`packages/renderer/runtime/app.js` + `style.css`, listed in `files`): sticky full-bleed MapLibre map + scrollama-driven `goToScene(i)` doing camera moves (`jumpTo`/`flyTo`/`easeTo` per `transitionIn`), per-scene layer visibility toggling, `LayerBinding → MapLibre` layer specs (circle/fill/line/heatmap with data-driven size/color interpolation from the actual feature domain), a tiny `"attr OP value"` filter parser, **scene-panel media** (in HTML), **map-anchored media** (runtime markers + image/video popups, marker vs auto trigger), and a **controls** strip writing paint/layout props live.
- **Self-contained / offline:** data is **inlined** into `bundle-data.js` (no fetch → works from `file://`); `<script>`-breaking chars escaped. Basemap is a neutral background for now (real PMTiles parked — needs a real tileset + range-request handling).
- Generated the data fixture `examples/data/landmarks.geojson` (3 points) and **placeholder PNGs** `examples/media/{skyline,ferry-building}.png`; switched the example's media to PNG to match. Added dev script `packages/renderer/scripts/render-example.mjs`.
- **6 render() unit tests** (pure, no fs): HTML has title/intent/scenes + runtime wiring; panel media inlined while anchor-only media is left to the runtime; data inlined with no surviving `</script>`; both local images listed to copy; missing-data warning; clean when data supplied.
- Added **`@types/node`** (tsc needed it for `node:*` + `import.meta.url` in renderer).

**Did (M2 — `core` Stage 0: ingest & profile):**
- **GeoJSON ingest** (`stage0/geojson.ts`): parse → validate FeatureCollection → `DataSource` with a filled `DataProfile` + the raw FC for the renderer. **CSV-with-coordinates ingest** (`stage0/csv.ts`): a dependency-free RFC-4180-ish parser, lon/lat column detection (lon/lng/long/longitude/x + lat/latitude/y), cell coercion (numbers/booleans; zero-padded codes and dates stay strings), → point features → same profile path.
- **Shared profiling** (`stage0/profile.ts`, pure): geometry classification (point/line/polygon/mixed/none incl. GeometryCollection), `[minX,minY,maxX,maxY]` extent via a recursive position walker, attribute profiling (`dataType` number/string/boolean/date; `measurement` heuristic number→ratio, date→interval, boolean/string→nominal; first-5 distinct `sample`), and `temporalExtent` from date attributes. CRS defaults to EPSG:4326 (reads a 2008-style `crs` member if present).
- **Media registration** (`stage0/media.ts`): `--media` input (local path or URL) → validated `MediaAsset`; classify kind (image/video) + source (local/url) + mimeType by extension; validate local files exist and URLs are well-formed; **best-effort intrinsic image size** via a header sniffer (`stage0/image-size.ts`: PNG/JPEG/GIF/WebP, no deps). No transcoding, no LLM.
- **Extension dispatcher** `ingestDataFile()` (.geojson/.json vs .csv) + `registerMediaInputs()` batch. New fixtures: `examples/data/neighborhoods.geojson` (polygons + dates) and `examples/data/sensors.csv` (lon/lat + numeric + date); reuses the existing media PNGs.
- **14 unit tests** across geojson/csv/media: exact profiles (geometry, count, extent, temporalExtent, per-attribute type+measurement), lon/lat excluded from attributes, point features built correctly; media classification incl. a URL asset (no dims) and a missing-local-file error; PNG size sniff (800×450 / 600×400); parser + coercion edge cases.

**Decisions:**
- **MapBard owns its git** at the folder root (`main`), not the `D:/code` parent. Commits will target this repo.
- **Build = per-package `tsc -p` via `pnpm -r build`** (not a root project-reference graph) — simplest for now; revisit if cross-package type-checking speed matters.
- **`vitest run --passWithNoTests`** as the per-package test script so empty packages keep `pnpm -r test` green until they have real tests.
- Tooling versions resolved: typescript 5.9.3, vitest 2.1.9, eslint 9.39.4, prettier 3.8.4, typescript-eslint 8.61.0. Added **zod ^3.24.1** to `schema`.
- **Schema is `v0.1.0` and explicitly NOT frozen** (guide §4 calls it a starter). Referential checks chosen for M1 = "references resolve" (assetId / dataSourceId / control layerId); attribute-name and CRS-value checks deferred (need data profiles from M2).
- **Renderer is split pure/`render()` vs I/O `writeBundle()`** so generation is unit-testable without disk. **Data is inlined**, not fetched, to guarantee `file://` works. **Vendor libs are copied from node_modules**, not CDN, to stay offline. **Basemap = neutral background in MVP**; real PMTiles deferred (parked) — it needs a real tileset and `file://` range-request handling, out of M3's "renders to a browsable bundle" bar.
- **Stage 0 measurement inference is a documented heuristic** (number→ratio, date→interval, boolean/string→nominal) — good enough for MVP; the Design stage / future profiling can refine ordinal vs nominal. **CSV numeric coercion deliberately preserves zero-padded codes** (e.g. ZIPs) and date strings as strings. **Ingest returns the raw FeatureCollection alongside the profile** so the renderer's `dataMap` comes straight from Stage 0 with no second parse.

**Open thread / note:** there is a stray **empty `D:\code\MapBard\code\` directory** (pre-existing, not created this session) — harmless but worth deleting when convenient.

**Files touched:** _M0_ — `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore`, `.prettierrc.json`, `.prettierignore`, `eslint.config.js`, `packages/{schema,core,knowledge,renderer,cli}/{package.json,tsconfig.json,src/index.ts}`, `examples/.gitkeep`. _M1_ — `packages/schema/{package.json,src/geo-narrative.ts,src/index.ts,src/index.test.ts}`, `packages/core/{package.json,src/index.ts}`, `examples/sf-waterfront.geonarrative.json`. _M3_ — root `package.json` (+`@types/node`), `eslint.config.js` (runtime/script globals), `packages/renderer/{package.json,runtime/app.js,runtime/style.css,scripts/render-example.mjs,src/{types,index-html,bundle-data,render,write,index,render.test}.ts}`, `examples/data/landmarks.geojson`, `examples/media/{skyline,ferry-building}.png`. _M2_ — `packages/core/src/{index.ts,stage0/{geojson-types,profile,ingest-types,geojson,csv,image-size,media,index,geojson.test,csv.test,media.test}.ts}`, `examples/data/{neighborhoods.geojson,sensors.csv}`. _Docs_ — `docs/BUILD_LOG.md`, `docs/phase-a-plan.md`.

**Verification:**
- M0: `pnpm install` ✅ → `pnpm -r build` ✅ (5/5) → `pnpm -r test` ✅ → `pnpm lint` ✅. **M0 DoD met.**
- M1: `pnpm --filter @mapbard/schema test` ✅ (12/12). Full `pnpm -r build` ✅ (schema → core topo order; `GeoNarrative` type imports across the package boundary), `pnpm -r test` ✅, `pnpm lint` ✅. **M1 DoD met** (example validates; types exported and importable).
- M3: `pnpm -r build` ✅, `pnpm -r test` ✅ (renderer 6/6), `pnpm lint` ✅. Rendered example via the dev script → **9-file self-contained `out/`** (`index.html`, `app.js`, `style.css`, `bundle-data.js`, `media/*.png` copied, `vendor/{maplibre-gl.js,maplibre-gl.css,scrollama.min.js}`), **0 warnings**. `node --check` clean on `app.js` + `bundle-data.js`; eval of `bundle-data.js` → 2 scenes / 2 assets / landmarks=3 features; every `index.html` reference resolves to a present file. **M3 DoD met** (renders to a browsable bundle). _Final human eyeball in a browser (scroll/popup/control) is the user's to do — `file:///D:/code/MapBard/out/index.html`._
- M2: `pnpm --filter @mapbard/core test` ✅ (14/14 — geojson 3, csv 4, media 7). Full `pnpm -r build` ✅, `pnpm -r test` ✅ (**32 total**: schema 12, core 14, renderer 6), `pnpm lint` ✅. **M2 DoD met** (profiles + media assets correct on fixtures, verified by tests).

**Next:** **M4** — `core` LLM adapter (DashScope OpenAI-compat) + Stage 1 Plan: `(profiles + media, intent) → validated GeoNarrative` with scenes filled at content/narration/discourse, media attached by `assetId` only, fit check, repair/retry. Ship `.env.example`. Then M5 (Design), M6 (CLI), M7 (MVP).

---

## Session 04 — 2026-06-16 — 🔴 CLOSED

**Goal:** M4 — `core` LLM adapter (DashScope OpenAI-compat) + Stage 1 Plan: `(profiles + media, intent) → validated GeoNarrative` with scenes filled at content/narration/discourse, media attached by `assetId` only, fit check, repair/retry. Ship `.env.example`.

**Did:**
- **Pushed the repo to GitHub** (start of session): added remote `origin` → `https://github.com/GeoScenarioScripter/map-bard.git` and pushed `main` (3 commits). `main` now tracks `origin/main`.
- **LLM adapter** (`src/llm/`): the provider-agnostic seam `LlmAdapter.complete({ system, prompt, schema }) → validated T` (`adapter.ts`), plus the **DashScope** implementation (`dashscope.ts`) over the OpenAI-compat endpoint via the `openai` SDK (`response_format: json_object`). The **repair/retry loop is a standalone `completeWithRepair(req, generate, opts)`** decoupled from any provider — it parses (`extractJson`: fenced-block aware), validates with Zod `safeParse`, and on failure feeds the assistant's bad output + the specific Zod issues back as a follow-up turn, up to `maxAttempts` (default 3), then throws `LlmValidationError`. Env config via `dashScopeConfigFromEnv` (`MAPBARD_LLM_KEY` required; `MAPBARD_LLM_BASE_URL`/`MAPBARD_LLM_MODEL` optional, defaults = compat endpoint + `qwen3.7-max-2026-05-17`).
- **Stage 1 Plan** (`src/stage1/plan.ts`): `planNarrative({ intent, dataSources, mediaAssets, title? }, adapter, opts) → { narrative, questions }`. The model emits a **constrained plan object** (title + scenes with `narration`/`content`/`discourse`/`media`/`mediaAnchors` only) validated by **`makePlanSchema(assetIds)`** — a per-call Zod schema whose media `assetId`s are `superRefine`d against the known set, so a **dangling/invented media reference is repaired by the adapter like any other schema violation**. The full `GeoNarrative` is then **assembled deterministically**: scene ids (`scene-N`), `layers: []` (Stage 2's job), a **default camera framed on the unioned data extent** (`cameraFromExtent` — coarse log2 zoom heuristic), neutral basemap, `schemaVersion`. Final `parseGeoNarrative` guards the assembly.
- **Fit check:** after assembly, any scene with `content.process` while **no** source has a `temporalExtent` yields a surfaced **question** (not an error, not invented data) — returned in `questions[]`.
- **`.env.example`** shipped at repo root with the three `MAPBARD_LLM_*` vars (`.gitignore` already allows it past the `.env*` block).
- **Dev smoke script** `packages/core/scripts/plan-example.mjs` — ingests the example data+media, builds the env adapter, writes `narrative.plan.json` (for the user's live-key run; superseded by `mapbard plan` at M6).
- Exported `llm` + `stage1` from the `core` barrel.

**Decisions:**
- **Plan emits a constrained sub-object, not the full `GeoNarrative`.** The LLM owns only content/narration/discourse + media attachment; ids, layers, camera, basemap are filled deterministically. Keeps the model away from data/visual invention and makes media-reference validation a pure schema concern.
- **Media-reference integrity rides the adapter's repair loop** via a dynamically-built `superRefine` (asset ids known only at call time) — no separate validate-and-retry path.
- **Repair loop is provider-independent** (`completeWithRepair` + a `generate` fn) so retry/repair is unit-tested with a fake generator, zero network. The `openai` client is constructed only inside `createDashScopeAdapter`.
- **`zod` is now a direct `core` dependency** (was only transitive via `schema`); pnpm strict linking requires it for the `core` source to import `zod`. Added `openai ^6.42.0`, `zod ^3.24.1` (resolved 3.25.76).
- **Default camera is a placeholder** framed on the data extent — Stage 2 (Design) will set real per-scene framing. Plan output is still renderable as-is.

**Files touched:** `packages/core/src/llm/{adapter,dashscope,index}.ts` (+ `adapter.test.ts`), `packages/core/src/stage1/{plan,index}.ts` (+ `plan.test.ts`), `packages/core/src/index.ts`, `packages/core/scripts/plan-example.mjs`, `packages/core/package.json` (+`openai`,`zod`), root `.env.example`, `pnpm-lock.yaml`, `docs/BUILD_LOG.md`, `docs/phase-a-plan.md`, memory (`feedback_mapbard_dashscope.md`).

**Verification:**
- `pnpm -r build` ✅ (6/6) · `pnpm -r test` ✅ (**53 total**: schema 12, core **35** [+21 this session — adapter 8, plan 13, stage0 14], renderer 6) · `pnpm lint` ✅.
- New M4 tests cover (mocked, no network): `extractJson` (bare/fenced/prose/non-JSON); repair loop (first-good, JSON-repair, schema-type-repair with error fed back, exhaustion → `LlmValidationError`); Plan assembly (valid `GeoNarrative`, ids, empty layers, camera-on-extent, media attachment), title override, **dangling assetId rejected**, **fit check fires / stays silent** by temporal presence; `makePlanSchema` accept/reject; `cameraFromExtent`/`unionExtents`.
- **M4 DoD met** (intent → valid planned `GeoNarrative`, verified by mocked tests). _Live-key smoke (`narrative.plan.json` from a real DashScope call) is the user's to run — no key in env; `scripts/plan-example.mjs` is ready for it._

**Next:** **M5** — `core` Stage 2 Design (rule-based via the `knowledge` element→technique table): plan → enrich each scene with `layers` (technique + encode + classification), refined per-scene `camera`, `transitionIn`, and chosen `controls`. Output a `narrative.design.json` the M3 renderer accepts.

---

## Parking lot (out-of-scope ideas — do not build in Phase A)

- **Real PMTiles basemap** (M3 currently ships a neutral background). Needs a real Protomaps tileset bundled + `file://` range-request handling. Wire for a polished M7; not a blocker for the slice.
- Stray empty `D:\code\MapBard\code\` directory — delete when convenient.

---

## Session entry template (copy for each new session)

```markdown
## Session NN — YYYY-MM-DD — 🟢 OPEN

**Goal:** <the one or two outcomes this session targets — usually a single milestone>

**Did:**
- <what was actually done>

**Decisions:**
- <durable choices made; copy the important ones into memory>

**Files touched:** <paths>

**Verification:** <commands run + result, e.g. `pnpm -r build && pnpm -r test` ✅; or what was observed in the browser>

**Next:** <the precise next action for the following session>
```
On close: flip the heading marker to `🔴 CLOSED`, update the **current-state banner**, and mirror any milestone status change into `phase-a-plan.md`.
