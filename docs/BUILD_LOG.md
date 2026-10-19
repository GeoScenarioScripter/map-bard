# MapBard — Build Log

The single session/phase journal. Each work session is one chapter. This is how a future session resumes: read the **current-state banner**, then the **last session entry**.

**How to use**

- Append the newest session at the **bottom** (newest last).
- Open a session before working: `## Session NN — YYYY-MM-DD — 🟢 OPEN`. Close it when done: `🔴 CLOSED`.
- Mark stage completions inline and mirror them in the active implementation plan when one exists; `phase-a-plan.md` now preserves the historical transition.
- Park out-of-scope ideas in the **Parking lot** at the bottom; don't build them.

**Marker legend:** 🟢 OPEN session · 🔴 CLOSED session · ✅ milestone DONE · 🟡 milestone IN PROGRESS · ⬜ milestone NOT STARTED · ▶ phase opened · ⏹ phase complete.

---

## Current state banner

- **Phase:** Stage 1 opened in Session 11 after Session 10's R01–R40 planning review. The original Phase A execution plan is superseded, not completed.
- **Active implementation stage:** **Stage 1 — Trustworthy Project and Publication**, Wave 1 handoffs complete; G1 **CLOSED** in Session 19 after the reader's direct-file report. Contract revision g1-r1, bounded Potomac source acceptance and the esbuild IIFE build choice are recorded in the [G1 review](stage-1/g1-review.md). Wave 2 handoffs S1-W2-A/B/C closed in Sessions 21–23; [G2 CLOSED](stage-1/g2-review.md) in Session 24. Wave 3 S1-W3-A/B closed in Sessions 26–27; C and G3 remain. See [stage roadmap](implementation-stages.md) and [detailed Stage 1 waves/sessions](stage-1-plan.md).
- **Historical milestones:** M0 ✅ · M1 ✅ · M2 ✅ · M3 ✅ · M4 ✅ recorded done; M5–M7 were not started and their old sequence is superseded. See `phase-a-plan.md` and archived checklists.
- **Target product:** portable editable project + model-independent engine + first-class coding-agent toolkit + local visual workbench, followed by MapBard's own hosted community / market center for uploading, serving, and visualizing user-written story pages. Geographic data, text, and supplied images/video remain central. Complete the local pipeline first; pricing, payment, and commercialization details remain deferred.
- **Next action:** start S1-W3-C publication/assets against the [W3-A compiler handoff](stage-1/w3-a-handoff.md) and [W3-B playback handoff](stage-1/w3-b-handoff.md). G3 then composes the public pipeline. The [browser report](stage-1/browser-handoff.md) closes only the G1 direct-file gate; the new player's browser behavior and full capability matrix remain unverified. Do not resume old M5 automatically.
- **Actual code:** GeoNarrative v0.1.0, Stage 0, DashScope Plan and the legacy example renderer remain available. G2 integrates public project/design/compiled schemas and strict load/import/validation. W3-A adds a pure compiler and bounded knowledge rules on owned paths, with an actual compiled fixture matching g1-r1 semantic output. W3-B adds a MapLibre adapter, compiled styling/legends/annotations, scene observation and keyboard controls. G3 still needs public barrel/composition and W3-C must wire compiled HTML/assets. The normal build emits the IIFE at the public `@mapbard/renderer/player.js` asset subpath. The legacy renderer accepts an explicit, inlined local context map for the example; authored PMTiles remain unimplemented. No complete Stage 1 publication/workbench/toolkit capability is delivered.
- **Repo:** `main` tracks GitHub `origin/main` → `https://github.com/GeoScenarioScripter/map-bard.git`. Session 25 collected work through G2 into separate commits and established the standing per-session local commit rule. Sessions 26–27 are local commits only; no push is authorized for them.
- **Toolchain:** pnpm 9.15.0 (via corepack), Node 22.19, TypeScript 5.9, vitest 2.1, eslint 9.39. MapBard has **its own git repo** on `main` (not the `D:/code` parent).
- **LLM:** DashScope remains the only implemented adapter, default `qwen3.7-max-2026-05-17`; its target role is optional authoring. External agents must not require that provider. See `AGENTS.md`.
- **Built-in agent decision (Session 07):** one LLM + system prompt + dynamically loaded skills + a purpose-built harness managing the loop. No LangGraph-style framework or fixed specialized-agent team. The harness is not implemented and remains separate from the engine and story player.
- **Agent guidance:** root `AGENTS.md` is shared; `CLAUDE.md` points to it. Original plans/instructions are preserved in `docs/archive/2026-10-17/` as history, not active commands.
- **Idea retention:** Session 08's audit, resumed 2026-10-18, is captured in [the refinement idea register](refinement-ideas.md): 40 stable R IDs with rationale, status, planning coverage, concrete examples, and superseded/deferred discussion. Session 09's stage sequence is preserved.
- **Idea-to-plan review:** Session 10 maps every R ID to planned work or deferral. Stage 1's existing sessions now explicitly cover author-task framing, attention/comparison references, measurement overrides, stale-build checks and verification records; later outlines add evidence-led story redirection and denominator-sensitive revision. W3-A's compiler implementation does not establish Stage 1 end-to-end acceptance.

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

**Goal:** Fold **supporting media (images/video)** into Phase A so the MVP produces a _full_ storymap, not just vector + text — per user direction.

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

## Session 05 — 2026-10-17 — 🔴 CLOSED

**Goal:** Understand the project and write repository-wide agent guidance for the current scope.

**Did:**

- Reviewed the build guide, research/product plan, milestone plan, prior journal, package/tooling configuration, schema, ingestion, planning/repair, renderer/runtime, fixtures, and test coverage.
- Added root `AGENTS.md` with the Phase A/M5 scope, package boundaries, schema and LLM invariants, development commands, verification expectations, and session handoff conventions.
- Documented implementation limits relevant to Design: classification is not consumed by the runtime, categorical bindings currently render as circles, controls do not implement general filters, and the basemap remains neutral. Also recorded media-path portability and profiling limitations.

**Decisions:** Use source/tests to distinguish implemented behavior from roadmap intent. Keep M5 next; this onboarding task does not start implementation or change milestone completion status. Keep shared agent guidance in the repository without requiring private agent memory.

**Files touched:** `AGENTS.md`, `docs/BUILD_LOG.md`. Baseline commands also regenerated ignored `dist/` and `out/` artifacts.

**Verification:** `pnpm -r build` passed for all five packages; `pnpm -r test` passed all 53 tests (schema 12, core 35, renderer 6; knowledge/cli still have no tests); `pnpm lint` passed. `node packages/renderer/scripts/render-example.mjs` generated nine files with no warnings. `node --check` passed for runtime `app.js` and generated `out/bundle-data.js`. No live DashScope call or interactive browser check was performed. Reviewed the documentation diff and checked `AGENTS.md` formatting.

**Next:** M5 — implement the static knowledge table and deterministic Design stage, checking chosen techniques against actual renderer support. The previously outstanding live-provider and browser-interaction checks remain outstanding.

---

## Session 06 — 2026-10-17 — 🔴 CLOSED

**Goal:** Consolidate the agreed product direction and refinement recommendations into the project story, research/product threads, architectural brief, and roadmap. Prepare for a separate implementation-planning session.

**Did:**

- Rewrote `docs/mapbard-plan.md` around the retained research and product threads: evidence/attention-aware representation, appropriate geographic reasoning, agent-independent execution, precise revision, local workbench, and fair early evaluation.
- Replaced the old build brief with target architectural boundaries for editable projects, analysis/evidence, GeoNarrative, compiled rendering, diagnostics, agent operations, shared editing, and export. Documented current behavior separately from planned APIs.
- Added `docs/refinement-roadmap.md` with prioritized workstreams, dependencies, a first-product acceptance envelope, open decisions, and the required output of the next stage-planning session. No detailed implementation stages were activated.
- Converted `docs/phase-a-plan.md` into a historical transition record. Preserved the preceding plan, build guide, Phase A checklist, and Claude instructions under `docs/archive/2026-10-17/` with an explicit historical-only notice.
- Updated the seven-stop HTML story and its route labels to the new direction while preserving layout, styling, and interaction structure.
- Updated `AGENTS.md`, simplified `CLAUDE.md` to reference shared guidance, and aligned this banner so future agents do not automatically resume the old M5 sequence.

**Decisions:** External coding agents are first-class authoring interfaces; the engine must not require a built-in model. The existing DashScope planner is a baseline for an optional path. Engine + agent toolkit + local workbench is the first product target. Evidence and revision semantics, compiler/runtime fidelity, bounded analysis, limited vector comparison, annotations, meaningful reader agency, and early evaluation form the refinement direction. Exact types, dependencies, package splits, and stage order remain planning decisions. Hub/remixing is later; commercialization is deferred. The original Phase A sequence is superseded, not completed.

**Files touched:** `AGENTS.md`, `CLAUDE.md`, `docs/{mapbard-plan.md,mapbard-build-guide.md,refinement-roadmap.md,phase-a-plan.md,mapbard-story.html,BUILD_LOG.md}`, and `docs/archive/2026-10-17/{README.md,mapbard-plan.md,mapbard-build-guide.md,phase-a-plan.md,CLAUDE.md}`. No package source, manifests, dependencies, or generated story bundles changed in this session.

**Verification:** Formatting passed for the seven new/rewritten guidance Markdown files; `git diff --check` passed. Verified 30 local documentation links, parsed the HTML with Prettier and its inline script with Node, checked all seven ordered steps and referenced DOM IDs, and confirmed the stylesheet is unchanged. All four archived snapshots match the preceding tracked files (normalized line endings). Reviewed the active documents for stale M5-first/Phase A-only instructions; historical entries retain their original wording. Browser visual inspection was attempted but blocked by the browser URL policy for the local `file://` page, so no visual/browser pass is claimed. Application tests were not rerun for this documentation-only change; Session 05 remains the implementation baseline.

**Next:** Define executable refactor/refinement/implementation stages from `docs/refinement-roadmap.md`: select the real-data slice, resolve migration/artifact boundaries, and specify dependencies, affected packages, acceptance gates, tests/browser checks, and exclusions. No new implementation stage is active yet.

---

## Session 07 — 2026-10-17 — 🔴 CLOSED

**Goal:** Record the user's architecture decision for MapBard's built-in agent: one LLM, a system prompt, dynamically loaded skills, and a purpose-built harness managing the agent loop.

**Did:** Added the built-in agent architecture to the product plan, build guide, roadmap, shared agent instructions, and Claude entry point. Specified the separation between agent harness, deterministic engine, and browser player; identified on-demand skill loading and bounded loop/session responsibilities for planning. Updated the story page to acknowledge both external-agent and built-in-agent authoring paths.

**Decisions:** No LangGraph-style orchestration framework or fixed collection of specialized agents. Engine operations remain shared capabilities; external coding agents remain first-class. This is a target architecture clarification, not a claim that such a framework exists in the current code.

**Files touched:** `AGENTS.md`, `CLAUDE.md`, `docs/{mapbard-plan.md,mapbard-build-guide.md,refinement-roadmap.md,mapbard-story.html,BUILD_LOG.md}`. No implementation or dependency changes.

**Verification:** Formatted the five changed guidance Markdown files; `git diff --check` passed. Confirmed the runtime decision appears in all five documents and 20 local links resolve; HTML and inline JavaScript parse. Repository search found no LangGraph/LangChain references in package source/manifests/lockfile, so this is an architecture decision rather than removal of an existing framework. No browser visual pass or application test rerun was needed/claimed for the documentation change.

**Next:** Include the harness scope in the upcoming implementation-stage planning.

---

## Session 08 — 2026-10-17 — 🔴 CLOSED

Resumed and completed 2026-10-18, preserving the independent Session 09 planning work added while this audit was paused.

**Goal:** Audit the refinement discussion against repository documentation and preserve the recommendations in a durable, traceable idea register.

**Did:** Audited the refinement, product-form, external-agent, and built-in-agent discussions against the active documents. Added `docs/refinement-ideas.md` with 40 stable R IDs, rationale, direction/proposed/candidate/deferred status, planning homes and stage coverage. Restored condensed concrete examples (claim evidence, narrative redirection, targeted edits, shared editing, useful diagnostics, reader controls, recipes, and skill/tool iteration). Preserved the shift from Studio-led recommendation to first-class external agents and the earlier commercial hypothesis as explicitly deferred history. Linked the register from the product plan, refinement roadmap, implementation stages, agent guidance, and current-state banner.

**Decisions:** Preserve recommendations without promoting candidates or deferred ideas into implementation commitments. Link the register from active planning and agent instructions so future sessions can find it.

**Files touched:** `docs/refinement-ideas.md`, `AGENTS.md`, `docs/{mapbard-plan.md,refinement-roadmap.md,implementation-stages.md,BUILD_LOG.md}`. No source, dependency, fixture, or stage-gate changes. The detailed Stage 1 plan and Session 09 history were preserved.

**Verification:** Reviewed the substantive recommendations against the discussion and grouped them into R01–R40; checked all 40 IDs are unique, ordered, and present. Verified 79 local documentation links across the register and linked active documents. Formatted the five changed guidance Markdown files; `git diff --check` passed. No application tests were needed for this documentation-only audit. These files are saved locally; no commit or push was performed.

**Next:** Use R IDs as a coverage checklist when executing the existing Stage 1 plan and detailing later stages. Assign relevant ideas to bounded work or explicitly defer them, retaining rationale; do not expand stage scope merely because the register records an idea.

---

## Session 09 — 2026-10-17 — 🔴 CLOSED

**Goal:** Execute the scheduled planning task: detail the first implementation stage as waves of parallel sessions, and retain later stages as outlines to expand only after the preceding stage closes.

**Did:**

- Read active direction documents and inspected schema, profiling, renderer, runtime, example, tests, and package configuration to distinguish targets from implemented behavior.
- Added `docs/implementation-stages.md`: six outcome stages, dependencies, entry/exit gates, coverage/deferment and the rule to detail each later stage only after its predecessor closes.
- Added `docs/stage-1-plan.md`: four waves with three parallel sessions each, exclusive ownership, frozen inputs, handoffs, integration gates, migration/artifact targets, case-selection spike, capability envelope, fixtures, verification, risks and exclusions.
- Aligned agent entry points, product/build direction, refinement brief and this banner with the new plans. Preserved the original handwritten example and historical milestone entries.

**Decisions:** Stage 1 — Trustworthy Project and Publication is the next planned stage and remains NOT STARTED. It keeps GeoNarrative v0.1.0 with separate versioned project/design/compiled contracts; exact signatures freeze at G1. Start with a bounded vector comparison and explicit unsupported-capability diagnostics. The original example's PMTiles/quantile/radius-control requests must be preserved and diagnosed, with an explicitly adapted copy for new-path checks. Stage 2 adds evidence; 3 external-agent operations/revisions; 4 shared workbench; 5 semantic reader interaction/product evaluation; 6 the optional single-LLM harness. Later stages are outlines only. Preserve existing changes and the independent open Session 08 audit. No product implementation, commit, or push.

**Files touched:** `AGENTS.md`, `CLAUDE.md`, `docs/{BUILD_LOG.md,mapbard-plan.md,mapbard-build-guide.md,refinement-roadmap.md,implementation-stages.md,stage-1-plan.md}`. No package source, manifests, dependencies, fixtures or generated bundles changed.

**Verification:** Formatted the eight changed Markdown files; `git diff --check` passed. Checked 47 local Markdown links with no broken targets; confirmed all 12 Stage 1 session IDs (three per wave) and no detailed later-stage session IDs. Reviewed source-to-plan claims, legacy compatibility exceptions, parallel ownership, gates and deferred scope. Application tests and browser checks were not rerun for this documentation-only task; Session 05 remains the executed code baseline. Real-case selection and exact contract/runtime-build choices remain explicit Wave 1 gates, not claimed completed work.

**Next:** When implementation begins, open Stage 1 and dispatch Wave 1's case audit, contract design and baseline/runtime spike under the coordinator's ownership rules. Integrate at G1 before dependent work. Check the independent Session 08 audit for completed coverage input; do not close or overwrite its work. Detail Stage 2 only after Stage 1 closes.

---

## Session 10 — 2026-10-18 — 🔴 CLOSED

**Goal:** Review the completed R01–R40 idea register against the stage plans and incorporate bounded omissions without starting implementation or detailing later stages prematurely.

**Did:**

- Compared all R01–R40 ideas with the product/build direction, refinement roadmap and stage plans; added a complete per-ID disposition with minimum acceptance and explicit boundaries/deferrals.
- Refined existing Stage 1 sessions/gates with an author/audience/question brief, feature-bound annotations and comparison references, declared measurement/override semantics, stale compiled-input checks and reproducible verification records. Added corresponding fixtures, owners and completion checks.
- Added later-stage acceptance threads for insufficient evidence and narrative redirection, denominator-sensitive revision preserving locked text, shared skill/reference material, workbench inspection parity, and portable claim-consistent reader controls. Kept later stages at outline level.
- Linked the dispositions from the idea register and roadmap, corrected stale references to the unfinished Session 08 audit, and updated the current-state banner.

**Decisions:** Keep the six-stage order and Stage 1's four waves of three parallel sessions; no dependency justified reordering. Exact Stage 1 contracts still freeze at G1. The engine reports evidence prerequisites while authoring interfaces propose story changes; no automatic intent replacement. Measurement overrides do not certify facts or transform data. Local verification records are not a telemetry platform. Charts, richer attention/rendering, Hub/remixing, hosted features and commercial work retain explicit conditional/deferred boundaries. No product implementation or stage activation.

**Files touched:** `docs/{BUILD_LOG.md,implementation-stages.md,stage-1-plan.md,refinement-ideas.md,refinement-roadmap.md}`.

**Verification:** Formatted all five changed Markdown files and reviewed the diff, ownership and scope. Verified 105 local links including five heading anchors; all 40 IDs appear exactly once and in order in both the original register and the new disposition table. Checked the original register rows and historical Sessions 01–09 are unchanged, the 12 Stage 1 session IDs remain intact, and no later-stage wave/session breakdown was introduced. `git diff --check` and changed-file formatting checks passed. No application tests/browser checks were run for this documentation-only review; no source/dependency/fixture changes, commit or push.

**Next:** When implementation begins, execute Stage 1 Wave 1 with the refined author brief, attention/measurement contracts and verification-record handoffs. Use G1 to freeze exact details and retain R IDs through stage closure. Detail Stage 2 only after Stage 1 completes.

---

## Session 11 — 2026-10-18 — 🔴 CLOSED

### ▶ STAGE 1 — OPENED · WAVE 1 IN PROGRESS · S1-W1-A

**Goal:** Audit at most two real cases and select a defensible, reusable vector comparison with supplied media for the first Stage 1 project, or record a precise no-go and missing inputs.

**Did:**

- Opened Stage 1 and S1-W1-A after inspecting the active plan, repository state, and pre-existing Session 10 planning edits.
- Audited two real candidates: the USGS Matanuska River 1949/1962/2006 braid-plain-margin report and a narrower three-gauge Potomac River daily-discharge comparison. Checked source authority, stated methods/coverage, coordinates, units, stable station IDs, contextual photography and reuse notices against official USGS pages.
- Wrote `docs/stage-1/case-dossier.md` with a repository-authored creator/audience/question brief, scene purposes, source inventory, qualifications, explicit no-go, acquisition/fingerprint requirements and handoffs for G1, S1-W1-B and S1-W2-B. No source data or media bytes were pinned because their original responses could not be retrieved and hashed.

**Decisions:** S1-W1-A is complete as a bounded **no-go audit**, as the plan allows when neither candidate is fully qualified. Prefer the Potomac WGS84 point case conditionally; its six actual values, statuses, qualifiers and image bytes must be checked before selection. Keep G1's real-case gate open. The Matanuska vectors need source-file/CRS/identity inspection and must not silently expand Stage 1 into reprojection or geomorphology analysis. No schema or feature work begins before G1.

**Files touched:** `docs/BUILD_LOG.md`, `docs/implementation-stages.md`, `docs/stage-1-plan.md`, `docs/stage-1/case-dossier.md`. No `examples/projects/first-slice/source/` files were created.

**Verification:** Cross-checked the dossier's three Potomac station IDs and WGS84 coordinates against the USGS station pages, the discharge/mean codes and GeoJSON fields against USGS API documentation, and both proposed photos' public-domain notices against their individual media pages. The shell's USGS HTTPS request failed with a socket permission error; the research tool could not fetch query responses, and the in-app browser reported `ERR_BLOCKED_BY_CLIENT` for the legacy service. Therefore no data values, original hashes, source CRS files or image bytes were verified. Formatted changed Markdown files and reviewed the scoped diff; documentation-only work did not rerun application tests.

**Next:** S1-W1-B can design contracts against synthetic specimens and the conditional station identities. S1-W1-C can verify the baseline independently. At G1, retrieve and hash the real observations and photo, or select another audited case; do not close the real-case gate using placeholders.

---

## Session 12 — 2026-10-18 — 🔴 CLOSED

**Plan ID:** S1-W1-B — Contract design.

**Goal:** Specify the Stage 1 project, design, compiled-spec and diagnostic contracts and synthetic producer/consumer specimens for G1 review, without implementing or freezing the contracts.

**Did:**

- Read the active Stage 1 plan, Session 11 case dossier, GeoNarrative schema, handwritten example, profiling and renderer/runtime source; preserved inherited Session 10/11 changes.
- Wrote `contracts.md` with proposed strict versioned project/design/compiled/diagnostic Zod shapes, scoped identities and semantic checks, explicit legacy field mapping, public operation signatures, capability and measurement rules, stale-input publication checks, representation rationale and R-ID handoffs.
- Added synthetic manifest/narrative/design/GeoJSON inputs, a proposed compiled consumer specimen, diagnostic mutations and edge-case oracles. The values are invented software fixtures and do not stand in for the unverified Potomac case.

**Decisions:** Keep the proposal provisional for G1. GeoNarrative 0.1.0 stays unchanged; explicit import preserves legacy intent while unsupported PMTiles, quantile and conflicting radius control requests diagnose. A shared numeric scale requires compatible quantity declarations and full-data values. Snapshot fingerprints bind source, manifest, narrative and design bytes; export rejects stale results. No real case was selected and no Wave 2 feature work began.

**Files touched:** `docs/stage-1/contracts.md`, `docs/stage-1/specimens/`, `docs/BUILD_LOG.md`, `docs/stage-1-plan.md` (status only).

**Verification:** All seven specimen JSON/GeoJSON files parse; both manifest data hashes and the three compiled input snapshot hashes match their current bytes. Checked project IDs, scene/layer/comparison references and the synthetic full-data domain/count oracle. All six relative Markdown links in the new documents resolve, and their lines have no trailing whitespace. `git diff --check` passed. Prettier was unavailable because this checkout lacks `node_modules`; `pnpm install --offline --frozen-lockfile` stopped on a missing cached `@eslint/js` tarball. Formatting was reviewed manually. No application build/tests or browser checks were run for this documentation-only design session.

**Next:** S1-W1-C establishes the baseline/runtime proposal. G1 reviews and freezes contract/specimen revision, exact public module names, floating-edge behavior, fingerprint canonicalization and publication API, while keeping the real-case gate open until source observations/media are verified or another audited case is chosen. Do not start Wave 2 before G1.

---

## Session 13 — 2026-10-18 — 🔴 CLOSED

**Plan ID:** S1-W1-C — Baseline and runtime spike.

**2026-10-19 completion audit (Session 14):** The original baseline lint run
predated the final spike files: full-tree lint found eight `no-undef` errors in
the three Node scripts. Reopened verification in Session 14 before continuing
G1; explicit Node imports and `globalThis.structuredClone` fix that scope without
changing runtime behavior. Final rerun results are recorded in Session 14.

**Goal:** Re-establish the M0–M4 build/runtime baseline, spike a TypeScript player bundle and scene-isolation approach outside production source, and hand a bounded build/browser proposal to G1 and W2-C.

**Did:** Re-ran the existing build, tests, lint, example generation and JS syntax checks; documented the environment, hashes and a small verification-record template in `baseline.md`. Reproduced the legacy scene-layer reuse and unapplied slider-default bugs with a mock runtime. Built a disposable TypeScript player IIFE with the transitively installed esbuild and checked local classic-script initialization plus scene-local bindings, marker cleanup and revisit defaults in Node's VM. Browser access to the local file was rejected by the browser URL policy, so no browser/visual pass is claimed.

**Decisions:** Propose esbuild as a minimal candidate for G1, with MapLibre/scrollama retained as vendored local scripts and scene-local runtime IDs. Do not add a direct dependency or select the build path until authorized `file://` browser loading can be verified. The spike is illustrative, not a frozen player contract; no production source changed.

**Files touched:** `docs/BUILD_LOG.md`, `docs/stage-1-plan.md` (status), `docs/stage-1/baseline.md`, `docs/stage-1/runtime-spike/`. Generated artifacts stayed under ignored `out/`.

**Verification:** Five packages build; 53 tests pass; lint passes; nine-file example generated without warnings; both syntax checks pass. Spike TypeScript check, esbuild IIFE build, VM verification and legacy bug reproduction pass. Changed files pass Prettier and diff checks. Clean dependency install and real browser playback remain unverified; the browser blocked the local URL and prohibited an alternate route.

**Next:** G1 reviews the case, contracts and baseline handoffs; keeps the real-case gate open until source bytes/rights are verified, and establishes an authorized direct-file browser check before approving the player build path. W2-C begins only after G1 freezes contracts and the runtime approach.

---

## Session 14 — 2026-10-19 — 🔴 CLOSED

**Plan ID:** S1-G1 — Wave 1 integration review.

**Goal:** Verify the completed Session 13 handoff, review the case/contracts/runtime
inputs, and resolve supported G1 decisions without passing blocked checks.

**Did:** Confirmed the preceding task completed and preserved all inherited
uncommitted work. Finished Session 13 verification by fixing eight Node-global
lint errors in its spike scripts, then reviewed all three Wave 1 handoffs.
Recorded G1 decisions and revised contracts/specimens to g1-r1: typed categories,
explicit size mapping/legend labels, class-edge rules, byte-backed publication
inputs, auxiliary types and module/export ownership. Added a review-only checker.
An approved network retry acquired six original USGS daily responses and the
context JPEG with source URLs, retrieval times, hashes and credits. Checked
record identity, WGS84 coordinates, units, Approved status and null qualifiers;
kept station-day/method comparability open. Updated active guidance and plans.

**Decisions:** This review session is complete, but **G1 remains OPEN/BLOCKED**.
The reviewed input/numeric-color expectations and g1-r1 design decisions do not
certify the entire planned capability matrix. No runtime build dependency was
selected without direct-file browser evidence. Wave 2 is not released. Source
records are actual observations, separate from synthetic fixtures; numeric-string
conversion belongs in documented derived preparation, never silent loader
coercion. No production package implementation, branch, commit, push or PR.
Commit/push/PR authorization remains conditional on G1 closing.

**Files touched:** `AGENTS.md`, `.gitattributes`, `docs/BUILD_LOG.md`,
`docs/implementation-stages.md`, `docs/stage-1-plan.md`,
`docs/stage-1/{g1-review,contracts,case-dossier,baseline}.md`, reviewed compiled
and scale-variant specimens/README, three runtime-spike Node scripts,
`docs/stage-1/scripts/verify-g1.mjs`, and
`examples/projects/first-slice/source/` (original bytes, acquisition manifest,
README). Preserved handwritten examples, package source/manifests and lockfile.

**Verification:** Five packages build; 53 tests pass (12 schema, 35 core, 6
renderer); final integrated lint passes. Nine-file legacy generation has no
warnings; both syntax checks pass. TypeScript spike check, IIFE build, VM scene
checks and legacy bug reproduction pass. Review checker passes proposed shapes,
seven scale variants, 12 diagnostic shapes, five authored input hashes,
full-data/reference oracles, six original observations and seven acquisition
hashes. JPEG decoded and visually inspected. Verified 43 local Markdown links,
changed-file formatting and `git diff --check`. Install did not establish a
clean dependency tree: reinstall prompt and registry metadata network failure;
checks used existing dependencies. Production new-path behavior, browser,
accessibility/offline relocation and real-story comparability are not passed.

**Next:** Resume G1 with an authorized direct-file browser/manual report for
the legacy output and spike, and authoritative station-day aggregation/time
basis plus method qualifications for the pinned records. Record case selection
or a precise no-go, finalize runtime/capability approval and rerun affected checks.
Only after G1 closes create the scoped codex/ branch, commit/push and Stage 1
Wave 1/G1 PR requested by the user. Stage 1 as a whole remains in progress.

---

## Session 15 — 2026-10-19 — 🔴 CLOSED

**Plan ID:** G1 — continuation after Session 14.

**Goal:** Resolve source time/method comparability for the acquired Potomac case,
and prepare an actionable direct-file browser handoff without bypassing the
previously recorded browser URL restriction. Preserve inherited uncommitted work.

**Did:** Confirmed the 02:00 scheduled task completed and is idle, with no other
active MapBard writer listed at takeover. Preserved inherited uncommitted changes.
Retrieved and hashed three station metadata records, three exact time-series
records and two legacy daily-service cross-check responses. Joined both observation
dates to their primary Daily/Mean series; verified unit/time-zone metadata and
all six values against the legacy responses. Recorded source-backed regulation,
diversion, drainage-area and interpretation qualifications, and selected the
Potomac case for the bounded descriptive fixture. Extended the G1 review checker
and byte-preservation attributes. Prepared a direct-file browser procedure/report
template and regenerated the existing example/spike, including copying the spike
HTML beside its generated script. Updated current status without changing history.

**Decisions:** Source comparability is accepted only for published station-day
summaries. Calendar labels are not UTC measurement instants; no rating-curve or
source daily-mean recomputation, trend or causal finding is claimed. The metadata
review supports this bounded case selection, not a general comparability engine.
The prior browser URL-policy restriction remains respected; no alternate
automated route or browser pass was attempted/claimed. This session is complete,
but **G1 remains OPEN/BLOCKED** on direct-file evidence and resulting runtime
build/capability approval. No Wave 2 release, Stage 2 planning or production changes.

**Files touched:** `.gitattributes`, `AGENTS.md`, `docs/BUILD_LOG.md`,
`docs/implementation-stages.md`, `docs/stage-1-plan.md`,
`docs/stage-1/{g1-review,case-dossier,case-comparability,browser-handoff}.md`,
`docs/stage-1/scripts/verify-g1.mjs`,
`examples/projects/first-slice/source/README.md` and `source/metadata/` (eight
original responses and acquisition inventory). Generated files remain in ignored
`out/`. No changes to the seven original acquired files or synthetic specimens.

**Verification:** Five packages build; 53 tests pass (schema 12, core 35, renderer
6); lint passes. Nine-file legacy render has no warnings; generated data syntax,
spike IIFE build and VM checks pass. G1 checker passes existing contract/specimen
checks, all 15 acquisition hashes, both-date series joins, metadata fields and
six legacy-value cross-checks. Its first new date assertion exposed the legacy
response's optional `.000` suffix; corrected the assertion/documentation without
rewriting source bytes, and reran successfully. Changed files pass formatting,
39 local Markdown file targets resolve (anchors not checked), and
`git diff --check` passes. The new metadata JSON paths have Git text normalization
disabled. Checks used existing dependencies; no new install/clean-install pass.
Browser, offline relocation and production new-path behavior remain unverified.

**Next:** An authorized reviewer supplies the [direct-file browser report](stage-1/browser-handoff.md)
for the legacy output and spike. Review failures and finalize G1 before starting
Wave 2. Commit/push/PR remain conditional on completed G1, so none was performed;
checkout remains on `main` at `8b8d3f0` with inherited and continuation edits intact.
Stage 1 has not passed G4 and Stage 2 remains unstarted.

---

## Session 16 — 2026-10-19 — 🔴 CLOSED

**Plan ID:** G1 — direct-file browser feedback and bounded legacy playback repair.

**Goal:** Investigate the reader's direct-file screenshots, restore ordinary
mouse-wheel story scrolling, and improve legibility of the legacy story shell
without claiming the unsupported basemap or compiled player.

**Did:** Reviewed four screenshots of the direct-file legacy output. The reader
could reach the intro, both scenes and outro with the scrollbar, but wheel input
over the map zoomed it instead of advancing the document. The neutral background
is the implemented legacy map style; the solid blue panel exactly matches the
handwritten example's placeholder image. Disabled MapLibre wheel zoom while
retaining zoom buttons. Gave intro, outro and scene cards darker text and clearer
surfaces; added a scroll cue and reduced-motion treatment. Regenerated `out/` and
updated the G1 browser handoff/review with the partial evidence and remaining
checks. A localhost Browser Use attempt was rejected with
`net::ERR_BLOCKED_BY_CLIENT` and its temporary server was stopped.

**Decisions:** This is a bounded repair to the existing legacy player, not a
decision to implement PMTiles, quantile classification or the compiled player.
The screenshots prove direct-file scene progression by scrollbar but do not prove
post-fix wheel behavior, Console/Network cleanliness, offline portability or
runtime-spike initialization. G1 remains **OPEN/BLOCKED**; Wave 2 remains closed.

**Files touched:** `packages/renderer/runtime/{app.js,style.css}`,
`packages/renderer/src/index-html.ts`,
`docs/stage-1/runtime-spike/legacy-repro.mjs`, `docs/BUILD_LOG.md`,
`docs/stage-1/{browser-handoff,g1-review}.md`, and `docs/stage-1-plan.md`.
Generated files stayed in ignored `out/`.

**Verification:** Five packages build; 53 tests and lint pass. The legacy Node
mock verifies wheel zoom is disabled and preserves its known-bug reproductions;
example generation produces nine files without warnings; runtime and generated
data syntax checks pass. The checked-in skyline image was visually confirmed as
the blue placeholder. Browser Use could not open either local file or localhost;
no post-fix browser, offline or relocation pass is claimed.

**Next:** Human reviewer reloads the regenerated `out/index.html` directly and
tests wheel scrolling over the map, scene camera/layer/media/popup/controls,
Console/Network, spike, offline and relocated-copy checks in the browser handoff.
Review failures before deciding G1. No commit/push/PR while G1 is open.

---

## Session 17 — 2026-10-19 — 🔴 CLOSED

**Plan ID:** G1 — reader-reported local basemap failure in the legacy example.

**Goal:** Supply truthful, portable geographic context for the San Francisco
example and make the renderer's basemap behavior explicit.

**Did:** The reader's two new direct-file screenshots confirmed the Session 16
text repair and the persistent neutral background. Traced the cause to the
legacy runtime ignoring the handwritten narrative's `protomaps-light`/PMTiles
request and the absence of a PMTiles archive. Acquired two bounded, untouched
City and County of San Francisco GeoJSON extracts under PDDL: shoreline-clipped
2020 block groups as a land mask and active street centerlines. Recorded official
query URLs, SHA-256 hashes, counts and coverage in
`examples/basemap/README.md`. Added an explicit `localContextMap` render option;
the example script supplies those sources, which are inlined into
`bundle-data.js`. The runtime paints water, land and street layers under story
points and shows city attribution. Unsupported authored basemaps now yield a
warning explaining the neutral fallback or explicit local substitution.

**Decisions:** Keep the handwritten narrative unchanged. The bounded city
context is an explicit legacy-example fallback, not a silent PMTiles
implementation or a frozen Stage 1 compiled basemap contract. Source geometry
remains untouched and bundled inline for direct-file portability. G1 remains
**OPEN/BLOCKED** pending wheel/interaction, Console/Network, spike, offline and
relocation evidence of the newly generated candidate; Wave 2 remains closed.

**Files touched:** `packages/renderer/src/{types,bundle-data,render,index-html,index,render.test}.ts`,
`packages/renderer/runtime/{app.js,style.css}`,
`packages/renderer/scripts/render-example.mjs`,
`docs/stage-1/runtime-spike/legacy-repro.mjs`,
`examples/basemap/`, `docs/BUILD_LOG.md`, `AGENTS.md`,
`docs/stage-1/{browser-handoff,g1-review}.md`, and `docs/stage-1-plan.md`.
Generated files stayed in ignored `out/`.

**Verification:** Five packages build; 55 tests and lint pass. Example generation
produces nine files and an explicit unsupported-PMTiles/substitution warning.
Both runtime and generated data pass Node syntax checks. The Node VM probe checks
wheel zoom, base layers, local source/credit wiring and preserves its known-bug
reproductions. MapLibre's style validator reports no errors for the constructed
local style. Source hashes, feature counts and all three point/land joins were
checked. Formatting and diff checks pass. The reader hard-refreshed the direct-file
page and confirmed land, water, streets and city attribution are visible. Browser
Use remains blocked for local and localhost URLs, and no wheel/interaction,
Console/Network, offline or relocation pass is claimed.

**Next:** Human reviewer checks wheel scrolling, scene changes and popup/control
behavior in `out/index.html`. Complete the browser handoff's Console/Network, spike,
offline and relocated-copy checks before deciding G1. No commit/push/PR while
G1 is open.

---

## Session 18 — 2026-10-19 — 🔴 CLOSED

**Plan ID:** G1 — candidate preparation, relocation byte check and browser access attempt.

**Goal:** Complete the available model-free G1 checks and narrow the remaining direct-file browser handoff.

**Did:** Rebuilt all five packages; generated the nine-file legacy bundle and
the spike player; ran the spike VM verifier, 55 tests, lint and the G1 specimen/
source verifier. Recorded SHA-256 for the six browser review files. Copied the
entire generated `out/` tree to a fresh temporary directory outside the checkout
and compared SHA-256 for all 14 files, with zero mismatches. Checked generated
JavaScript syntax and confirmed all eight local HTML script/style/media references
resolve to files.
Tried the available browser UI: inventory failed twice, Chrome was unavailable,
Edge failed to connect, and the in-app browser rejected the `file:` URL under
browser security policy. Stopped browser attempts and updated the G1 evidence
record without claiming interaction or offline playback.

**Decisions:** Byte-identical relocation and local automated checks are recorded
as model-free evidence only. G1 remains **OPEN/BLOCKED** pending human direct-file
browser observations; the runtime build choice and Wave 2 remain unapproved.

**Files touched:** `docs/BUILD_LOG.md`, `docs/stage-1/browser-handoff.md`, `docs/stage-1/g1-review.md`.

**Verification:** Build, 55 tests, lint, G1 verifier, spike VM verifier and three
generated JavaScript syntax checks and eight local HTML reference checks pass.
Six review-file hashes recorded in the browser handoff; all 14 copied file hashes
match. No browser/offline result was
obtained through automation.

**Next:** Human reviewer runs the wheel/scene/media/control and Console/Network
checks in the direct-file legacy page, the spike global check, and offline reloads
in the original and relocated copy. Coordinator adjudicates failures and G1.

---

## Session 19 — 2026-10-19 — 🔴 CLOSED

**Plan ID:** G1 — reader direct-file report review and gate disposition.

**Goal:** Record the reader's Edge/Chrome observations, resolve any ambiguous browser evidence, and decide the G1 runtime gate.

**Did:** Received the reader's Windows direct-file report from Edge
`155.0.4283.45` and Chrome `155.0.8059.80`. The reader reported working legacy
interactions, including the popup on marker click, a spike global type of
`"function"`, no Console errors or failed/remote Network requests, and matching
behavior for original and relocated story/spike files after reload with both
networking and cache disabled. Checked the handwritten example's `marker`
trigger against runtime behavior and reconfirmed the six candidate hashes.
Accepted this bounded browser evidence for G1. Selected esbuild `0.21.5` as the
direct renderer development dependency for W2-C's browser IIFE build; updated
the renderer manifest and lockfile. The first offline `pnpm add` hit a store-path
mismatch. Retrying with the existing store stalled after resolving and was
cancelled; it had written the lockfile importer, so the manifest was aligned
explicitly. Updated the G1 handoff/review and current stage guidance.

**Decisions:** **G1 CLOSED; Wave 2 released but not started.** The browser report
approves the bounded legacy/spike direct-file check and build approach, not the
new compiled player or full capability matrix. The current `node_modules` tree
was not relinked; W2-C must install before importing esbuild. No commit/push/PR
was performed as part of this gate record.

**Files touched:** `AGENTS.md`, `docs/BUILD_LOG.md`,
`docs/{implementation-stages,stage-1-plan}.md`,
`docs/stage-1/{browser-handoff,g1-review}.md`,
`packages/renderer/package.json`, `pnpm-lock.yaml`.

**Verification:** Reader browser report with versions, direct-file interactions,
Console/Network, spike and offline relocation recorded separately from automation.
Six output hashes unchanged. Five packages build; 55 tests, lint, G1 specimen/
source verifier and spike VM verifier pass. Pnpm frozen lockfile-only offline
check passes. Formatting and diff checks pass. No clean install or new compiled
player browser check is claimed.

**Next:** Begin S1-W2-A/B/C against g1-r1 and the bounded Potomac dossier,
respecting their file ownership. W2-C installs the pinned direct dependency and
builds the new player separately from the legacy runtime. G2 integrates the
foundation outputs and tests their composition.

---

## Session 20 — 2026-10-19 — 🔴 CLOSED

**Goal:** Record the confirmed hosted story-page and community / market-center direction while preserving the local-pipeline-first sequence.

**Did:** Updated the product plan, refinement roadmap, idea dispositions, active stage overview, and agent guidance to distinguish a confirmed later destination from deferred commercial details. The confirmed destination includes upload, serving, and visualization of user-written story pages in MapBard's own center.

**Decisions:** The local portable-project, engine, coding-agent, and workbench pipeline is the first release. MapBard's community / market center is a confirmed later product capability, planned only after that pipeline. Upload-format and hub / market mechanics remain to be designed. Pricing, payments, and commercialization remain deferred.

**Files touched:** `AGENTS.md`, `docs/{BUILD_LOG,mapbard-plan,refinement-roadmap,refinement-ideas,implementation-stages}.md`.

**Verification:** Documentation diff reviewed for consistency with the Stage 1 scope and later-stage sequencing. No code behavior changed; no code tests run.

**Next:** Complete Stage 1 and the local authoring pipeline in the agreed sequence; plan the hosted center after the local loop is established.

---

## Session 21 — 2026-10-19 — 🔴 CLOSED

**Plan ID:** S1-W2-A — Wave 2 kickoff and schemas/validation.

**Goal:** Implement the frozen g1-r1 project, design, compiled, and diagnostic contracts in `@mapbard/schema`, including version dispatch and reference validation, while preserving the legacy narrative parser.

**Did:** Opened Wave 2 against the G1 handoff. Added strict project, design, compiled, diagnostic and process-local operation schemas with independently dispatched `0.1.0` versions and JSON-only namespaced extensions. Added a new validation boundary that detects unknown nested fields before the legacy narrative parser can strip them, checks ID/reference scopes and full-data feature targets, validates measurement declarations, paths and WGS84 coordinates, and checks compiled scale/resource consistency. Tested the frozen positive specimens and mutations for versions, unknown fields, required extensions, duplicates, missing/mismatched targets, measurements, paths, coordinates and compiled variants. The legacy GeoNarrative module and package barrel were left unchanged.

**Decisions:** Serialize Wave 2 sessions in this checkout. S1-W2-A owns only its new schema modules/tests; the coordinator owns this journal and stage status documents. Existing uncommitted changes are preserved. The new modules remain private until G2 wires public exports. Schema validation uses supplied full data; W2-B owns real-path containment, byte hashing, import and loaded-data construction. W3 owns capability compilation and complete data value checks. No Stage 1 story/player capability is claimed from these schemas alone.

**Files touched:** `packages/schema/src/{project,design,compiled,diagnostics,project-validation}.ts`, `packages/schema/src/project-validation.test.ts`, `docs/{BUILD_LOG,stage-1-plan,implementation-stages}.md`.

**Verification:** `pnpm -r build` passed; 65 tests passed (schema 22, core 35, renderer 8); `pnpm lint` passed; frozen G1 verifier passed. New tests: 10. Formatting and diff review completed. No production compiler/player or browser acceptance is claimed.

**Next:** S1-W2-B builds project/resource I/O and the derived Potomac resources against these schema contracts, using local boundary doubles until G2. G2 later exports the modules publicly and composes a loaded-project validation test; W2-C remains independently owned.

---

## Session 22 — 2026-10-19 — 🔴 CLOSED

**Plan ID:** S1-W2-B — Project and resource I/O.

**Goal:** Implement the g1-r1 project loader and legacy import boundary in `packages/core/src/project/`, materialize the bounded Potomac data/media resources, and verify relocation, hashes, safe paths, source preservation, and extension round-trip without touching final authored story files.

**Did:** Implemented project-relative path checks with real-path containment, case-insensitive collision detection, exact SHA-256 fingerprints and a `loadProject` boundary that reads narrative/design and data/media from declared bytes. Added a staged, non-overwriting legacy import that preserves the original narrative and source-resource bytes, reports normalized paths and leaf fields, identifies stable feature keys, and retains unsupported author intent as warnings. Materialized two three-station Potomac GeoJSON resources and the credited context photo from pinned acquisitions, with a repeatable derive/verify script and byte hashes. Recorded the G1 loaded snapshot and handwritten-example import report for G2/W3-A.

**Decisions:** Preserve the existing uncommitted work and stay within the W2-B ownership boundary. Keep local boundary types private until G2 wires public schema/core exports and cross-package composition. Require an explicit `EPSG:4326` legacy profile before import rather than treating an absent CRS as proof; retain CSV copies with an unsupported-compilation warning. The derived station-day values are descriptive reported daily means, not a trend or causal inference. No final narrative/design files were written.

**Files touched:** `packages/core/src/project/{types,paths,fingerprint,load,import-legacy,project.test}.ts`, `packages/core/src/project/README.md`, `examples/projects/first-slice/data/{.gitattributes,derive.mjs,README.md,potomac-2024-10-01.geojson,potomac-2025-10-01.geojson}`, `examples/projects/first-slice/media/potomac-context.jpg`, `docs/{BUILD_LOG,stage-1-plan,implementation-stages}.md`.

**Verification:** Five packages build; 72 tests pass (schema 22, core 42, renderer 8); lint and G1 verifier pass. The derive script passes again without changing existing bytes. Tests exercise relocation/fingerprint identity, extension/override retention, hash/missing/traversal failures, byte-preserving import, path mapping, non-destructive failure and six source-to-derived observation joins. Formatting and `git diff --check` pass. No compiler, public API composition or new-player browser acceptance is claimed.

**Next:** Begin S1-W2-C player foundation in a new session, separate from the legacy runtime. G2 later integrates schema/core/player outputs and public exports.

---

## Session 23 — 2026-10-19 — 🔴 CLOSED

**Plan ID:** S1-W2-C — Wave 2 runtime foundations.

**Goal:** Build the separate TypeScript compiled-player foundation and dedicated browser IIFE, consuming the frozen g1-r1 specimen with a testable map adapter. Verify scene binding isolation, control resets, marker cleanup, reduced motion, and safe media markup without changing the legacy player or publication writer.

**Did:** Added a private typed consumer of the frozen compiled specimen, a scene controller with map/view adapters, safe media and anchor markup, a DOM control/panel view, and a classic-script IIFE entry. Media markup retains placement, caption, credit and qualification. The controller removes scene bindings, markers and view listeners before switching; re-entry reapplies authored defaults. It uses `cut` for first entry and reduced motion. Added tests for shared authored IDs with distinct runtime IDs, reset and control bounds, marker cleanup, media escaping and unsafe paths, version rejection, and preflight failure preserving the active scene. Built `out/player/player.js` with no external module imports and recorded its integration surface and asset requirements.

**Decisions:** Preserve the existing uncommitted Wave 1/2 work and own only `packages/renderer/player/`, its dedicated browser build script, and session/status docs. Keep a private structural compiled type until G2 connects the public schema barrel. The IIFE exposes injection functions rather than claiming a complete browser player; W3-B supplies MapLibre styling and scroll wiring, and W3-C supplies compiled publication wiring.

**Files touched:** `packages/renderer/player/{README.md,tsconfig.json,types.ts,media.ts,player.ts,dom-view.ts,entry.ts,player.test.ts}`, `packages/renderer/scripts/build-player.mjs`, `docs/{BUILD_LOG.md,stage-1-plan.md,implementation-stages.md}`.

**Verification:** Frozen-lockfile install restored the local dependencies. Dedicated player typecheck, IIFE build, `node --check`, and Node VM global-surface smoke passed; the bundle has no external imports. All five packages build; 79 tests pass (schema 22, core 42, renderer 15); lint and changed-file formatting/diff checks pass. The legacy nine-file example renders with its expected unsupported-basemap warning, and both legacy JS syntax checks pass. The new player was not exercised in a browser because compiled HTML/MapLibre wiring belongs to W3-B/C.

**Next:** G2 integrates public schema/core exports, the player build contract and cross-package composition against the frozen specimen, preserving the legacy example.

---

## Session 24 — 2026-10-19 — 🔴 CLOSED

**Plan ID:** G2 — Wave 2 foundation integration.

**Goal:** Wire public schema/core contracts and the dedicated compiled-player build, validate loaded artifacts and exercise the built IIFE against the frozen g1-r1 specimen, preserving the legacy example and all existing uncommitted work.

**Did:** Read the active guidance and Sessions 21–23 handoffs. Checked task inventory: this was the only active MapBard G2 task; the W2-C task was idle. Started after the scheduled time (17:52 Asia/Shanghai). Exported shared schemas and core load/import/validation, replaced temporary contract shapes, and connected strict artifact parsers to loading. Added the renderer's dedicated player build to the normal build and exposed its classic-script asset subpath. Added eight public core composition tests and two built-IIFE tests against the unchanged g1-r1 specimen. Recorded the contract, artifact hash and gate evidence in `docs/stage-1/g2-review.md`.

**Decisions:** **G2 CLOSED / PASS; Wave 3 released but not started.** Core validation currently re-exports the schema validator; capability compilation remains W3-A. The public player asset resolves to `packages/renderer/dist/player/player.js`, separate from legacy runtime. Existing direct dependencies already cover all new imports; no dependency/lockfile additions were needed. Corrected the shared Uint8Array generic to match Node Buffer/runtime acceptance. All pre-existing uncommitted work remains; no commit/push, provider call or browser acceptance is claimed.

**Files touched:** `packages/schema/src/{index,project-validation}.ts`, `packages/core/src/index.ts`, `packages/core/src/project/{types,load,g2.integration.test}.ts`, `packages/core/src/project/README.md`, `packages/renderer/package.json`, `packages/renderer/scripts/build-player.mjs`, `packages/renderer/player/{types,built-player.test}.ts`, `packages/renderer/player/README.md`, `AGENTS.md`, `docs/{BUILD_LOG,stage-1-plan,implementation-stages}.md`, `docs/stage-1/g2-review.md`.

**Verification:** Frozen offline install using the existing store passed (already up to date; no clean reinstall claim). Five packages and the dedicated IIFE build passed. All 89 tests passed (schema 22, core 50, renderer 17); lint passed after correcting two prefer-const findings, followed by successful build and affected core tests. Both new test files passed a strict NodeNext typecheck. Legacy nine-file generation passed with its expected unsupported-basemap warning; legacy source, generated data and new IIFE syntax checks passed. G1 verifier, changed-file formatting, documentation links and diff review passed. Built player is 7,806 bytes; exact SHA-256 and earlier corrected integration/test failures are in the G2 review. New-player browser/offline/accessibility checks were not run because W3-B/C page and map wiring do not exist yet.

**Next:** Start S1-W3-A compiler/rules in a new session; W3-B/C follow their owned paths and the G2 asset contract. G3 integrates compile → playback → publication before Wave 4 acceptance.

---

## Session 25 — 2026-10-19 — 🔴 CLOSED

**Plan ID:** Repository handoff — commit accumulated work through G2.

**Goal:** Preserve and commit all preceding uncommitted work in coherent groups,
push the resulting history to `main`, and establish a standing per-session local
commit rule in `AGENTS.md`.

**Did:** Reviewed Git status, branch/history and the accumulated Wave 1/G1,
legacy renderer, product-direction, Wave 2 and G2 changes. Added the requested
rule to the existing canonical `AGENTS.md` rather than creating a second file.
Created these focused commits; this journal and the shared gate/status documents
form the eighth, final governance commit:

| Commit    | Scope and provenance                                                                              |
| --------- | ------------------------------------------------------------------------------------------------- |
| `62387a9` | G1 g1-r1 contracts, specimens, source acquisition and comparability; Sessions 14–15.              |
| `aaeab66` | Legacy playback/local context, baseline/spike and reader browser evidence; Sessions 13 and 16–19. |
| `3cb9388` | Confirmed later community / market center; Session 20.                                            |
| `049829e` | Public schema contracts and validation; S1-W2-A / Session 21 plus G2 integration.                 |
| `7ea738c` | Project load/import and derived Potomac resources; S1-W2-B / Session 22 plus G2 integration.      |
| `647dc90` | Typed player, esbuild dependency and public asset build; S1-W2-C / Session 23 plus G2 wiring.     |
| `c2e3156` | Public project and built-IIFE composition tests, G2 gate report; Session 24.                      |

Historical journal entries retain their accurate statements that no commits had
been made at those earlier handoffs; Session 25 commits the accumulated results.

**Decisions:** Use separate topic commits with session/plan provenance. Do not
invent historical snapshots of overlapping uncommitted edits. Keep generated
output and dependencies ignored; preserve pinned source bytes. Future completed
sessions commit their own verified work by default; pushing still requires
authorization. This request explicitly authorizes pushing these commits to main.

**Files touched:** `AGENTS.md`, `docs/BUILD_LOG.md`; accumulated prior changes
staged by ownership/topic without rewriting their implementation.

**Verification:** Fresh fetch showed `HEAD` and `origin/main` both at `8b8d3f0`
before this commit series. Five packages build; all 89 tests and lint pass.
Legacy nine-file generation passes with the documented basemap fallback warning;
all three JavaScript syntax checks, G1 source/specimen verifier, runtime-spike
build/VM check and legacy reproduction pass. No new browser check is claimed.
Changed governance files pass formatting. Staged groups pass whitespace checks;
the original acquisition inventories retain CRLF bytes and were checked with
Git's `cr-at-eol` setting rather than rewriting source bytes. Reviewed all staged
paths; `.env`, dependencies and generated output remain ignored. The final
governance commit is followed by a normal push and remote-HEAD/status verification
in this task's handoff; no force-push or historical rewrite is authorized.

**Next:** After publishing this closure commit, start S1-W3-A compiler/rules in
a new numbered session. Commit that session's own verified work before handoff.

---

## Session 26 — 2026-10-19 — 🔴 CLOSED

**Plan ID:** S1-W3-A — Compiler and rules.

**Goal:** Implement pure compilation and the bounded capability/prerequisite rules against G2's loaded-project contract and frozen g1-r1 specimens; hand off tested compiled output and actionable diagnostics to G3/W4-A.

**Did:** Opened after confirming a clean `main` checkout and G2 handoff. Added the bounded knowledge catalog/prerequisite rules and a pure compiler over validated loaded projects. It rechecks data buffer hashes and map consistency, resolves complete-feature shared/local scales, filters, scene-local IDs, legends, annotations, media locations and presentation controls, and rejects unsupported or incompatible requests with typed diagnostics. Generated a real compiled g1-r1 fixture; added 15 focused compiler/scale tests and the [handoff record](stage-1/w3-a-handoff.md). Updated active status docs.

**Decisions:** Preserve the frozen contracts/specimens and legacy example. Keep `compileProject` inside its owned module until G3 updates the public core barrel and composes playback/publication. Use a direct core→knowledge workspace dependency. Do not treat the compiler catalog as evidence that the player or export has passed. Data bytes are checked in pure compilation; fresh authored manifest/design identity remains a loader/publication responsibility.

**Files touched:** `packages/core/src/compile/{compile,data,scales}*` and `fixtures/compiled.g1-r1.json`, `packages/knowledge/src/index.ts`, `packages/{core,knowledge}/package.json`, `pnpm-lock.yaml`, `AGENTS.md`, `docs/{BUILD_LOG,stage-1-plan,implementation-stages}.md`, `docs/stage-1/w3-a-handoff.md`.

**Verification:** Frozen offline lockfile update/install passed. Five package builds, all 104 tests (schema 22, core 65, renderer 17), lint, and targeted strict typechecks of both new test files passed. The actual compiled fixture matches all frozen semantic fields aside from its real compiler version, and repeat calls leave input unchanged. Legacy nine-file generation passed with the expected unsupported-basemap warning; legacy/data/player JavaScript syntax checks and the G1 source/specimen verifier passed. Changed-file formatting and `git diff --check` passed. No model/provider call or new-player browser acceptance is claimed.

**Next:** Commit this session locally. Start S1-W3-B faithful playback in a new Codex task with GPT-6 Sol high; W3-C and G3 follow their plan ownership and gate.

---

## Session 27 — 2026-10-19 — 🔴 CLOSED

**Plan ID:** S1-W3-B — Faithful playback.

**Goal:** Implement compiled layer, scale, legend, annotation and interaction playback against the W3-A fixture; verify scene cleanup and hand off the consumer behavior to G3.

**Did:** Implemented a MapLibre adapter with scene-owned GeoJSON sources, geometry-specific layers, exact compiled color/category/area expressions, typed filters, controls and keyboard-focusable media/annotation popups. Added compiled legends, a required legend host, keyboard slider increments, scene observation and partial-entry cleanup. Extended the classic IIFE surface and renderer styling. Tested the actual W3-A compiled fixture with the full synthetic GeoJSON pair and recorded the [W3-B handoff](stage-1/w3-b-handoff.md). Updated active status docs and agent guidance.

**Decisions:** Preserve the compiler's resolved edges, category types, size endpoints, labels and no-data treatment; the player makes no new classification/domain decision. The adapter owns source registration and rejects source-ID collisions. W3-C creates the neutral map, supplies data and page hosts, waits for map load, and composes the player. Keep the legacy runtime separate. Browser acceptance remains a later gate.

**Files touched:** `packages/renderer/player/{types,player,dom-view,entry,README,legend,resolved-style,maplibre-adapter,scroll}*`, `packages/renderer/runtime/style.css`, `AGENTS.md`, `docs/{BUILD_LOG,stage-1-plan,implementation-stages}.md`, `docs/stage-1/w3-b-handoff.md`.

**Verification:** Five package builds, 110 tests (schema 22, core 65, renderer 23), lint, strict typechecking of three new test files and changed-file formatting pass. The actual W3-A fixture and full g1-r1 GeoJSON pair drive adapter tests; the installed MapLibre style expression parser accepted the numeric, category, area and filter forms. Legacy nine-file generation and its expected basemap warning, three JavaScript syntax checks, G1 source/specimen verifier and diff whitespace check pass. CSS received static desktop/narrow-screen/focus review. No compiled browser page exists yet; computer-use browser inventory failed, so rendered layout, `file://`, keyboard and offline browser acceptance were not run.

**Next:** Make this session's local commit, then start S1-W3-C publication/assets in a separate task. G3 composes the public pipeline and W4-C checks the browser path.

---

## Parking lot (review against the new stage plan before implementation)

- **Real PMTiles basemap:** the legacy example has an explicit bounded local context fallback, while PMTiles remains unimplemented. Revisit tileset availability and access/export strategy during planning; do not assume `file://` range requests or silently introduce an online dependency.
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

On close: flip the heading marker to `🔴 CLOSED`, update the **current-state banner**, and mirror stage status changes into the active implementation plan when one exists. Preserve the historical Phase A record.
