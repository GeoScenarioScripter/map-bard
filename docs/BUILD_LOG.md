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
- **Active implementation stage:** **Stage 1 — Trustworthy Project and Publication**, Wave 1 in progress. S1-W1-A closed in Session 11 with a no-go real-case gate; S1-W1-B delivered a contract proposal and synthetic specimens in Session 12. See [stage roadmap](implementation-stages.md) and [detailed Stage 1 waves/sessions](stage-1-plan.md).
- **Historical milestones:** M0 ✅ · M1 ✅ · M2 ✅ · M3 ✅ · M4 ✅ recorded done; M5–M7 were not started and their old sequence is superseded. See `phase-a-plan.md` and archived checklists.
- **Target product:** portable editable project + model-independent engine + first-class coding-agent toolkit + local visual workbench. Geographic data, text, and supplied images/video remain central. Hub/remixing is a later horizon; commercialization is deferred.
- **Next action:** run S1-W1-C baseline/runtime spike, then review all Wave 1 handoffs at G1; reacquire and verify the conditional Potomac case or select another audited case before the real-case gate closes. Exact contracts are not frozen. Do not resume old M5 automatically.
- **Actual code:** still the M0–M4 baseline with GeoNarrative v0.1.0, Stage 0, DashScope Plan, and example renderer. No new engine/compiler/workbench/toolkit capabilities implemented by this reset.
- **Repo:** pushed to GitHub `origin` → `https://github.com/GeoScenarioScripter/map-bard.git` (`main` tracks `origin/main`) as of Session 04.
- **Toolchain:** pnpm 9.15.0 (via corepack), Node 22.19, TypeScript 5.9, vitest 2.1, eslint 9.39. MapBard has **its own git repo** on `main` (not the `D:/code` parent).
- **LLM:** DashScope remains the only implemented adapter, default `qwen3.7-max-2026-05-17`; its target role is optional authoring. External agents must not require that provider. See `AGENTS.md`.
- **Built-in agent decision (Session 07):** one LLM + system prompt + dynamically loaded skills + a purpose-built harness managing the loop. No LangGraph-style framework or fixed specialized-agent team. The harness is not implemented and remains separate from the engine and story player.
- **Agent guidance:** root `AGENTS.md` is shared; `CLAUDE.md` points to it. Original plans/instructions are preserved in `docs/archive/2026-10-17/` as history, not active commands.
- **Idea retention:** Session 08's audit, resumed 2026-10-18, is captured in [the refinement idea register](refinement-ideas.md): 40 stable R IDs with rationale, status, planning coverage, concrete examples, and superseded/deferred discussion. Session 09's stage sequence is preserved.
- **Idea-to-plan review:** Session 10 maps every R ID to planned work or deferral. Stage 1's existing sessions now explicitly cover author-task framing, attention/comparison references, measurement overrides, stale-build checks and verification records; later outlines add evidence-led story redirection and denominator-sensitive revision. No Stage 1 capability has been delivered yet.

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

## Parking lot (review against the new stage plan before implementation)

- **Real PMTiles basemap:** the baseline has a neutral background. Revisit tileset availability and access/export strategy during planning; do not assume `file://` range requests or silently introduce an online dependency.
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
