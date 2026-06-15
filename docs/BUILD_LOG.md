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
- **Active milestone:** **M2 — `core` Stage 0** (⬜ NOT STARTED, next). M0 ✅ · M1 ✅ · M3 ✅ DONE.
- **Milestones:** M0 ✅ · M1 ✅ · M2 ⬜ · M3 ✅ · M4 ⬜ · M5 ⬜ · M6 ⬜ · M7 ⬜.
- **Scope:** vector data **+ supporting media (images/video, local or URL)** — media appears in scene narration panels and anchored to map locations. Threads through M1–M4, M6 (not a separate milestone).
- **Next action:** **M2** — `core` Stage 0 ingest & profiling (GeoJSON + CSV-with-coords) + media registration into `MediaAsset[]`, thoroughly tested on fixtures. Renderer (M3) + schema (M1) are the concrete targets. Schema is `v0.1.0`, not frozen.
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

**Decisions:**
- **MapBard owns its git** at the folder root (`main`), not the `D:/code` parent. Commits will target this repo.
- **Build = per-package `tsc -p` via `pnpm -r build`** (not a root project-reference graph) — simplest for now; revisit if cross-package type-checking speed matters.
- **`vitest run --passWithNoTests`** as the per-package test script so empty packages keep `pnpm -r test` green until they have real tests.
- Tooling versions resolved: typescript 5.9.3, vitest 2.1.9, eslint 9.39.4, prettier 3.8.4, typescript-eslint 8.61.0. Added **zod ^3.24.1** to `schema`.
- **Schema is `v0.1.0` and explicitly NOT frozen** (guide §4 calls it a starter). Referential checks chosen for M1 = "references resolve" (assetId / dataSourceId / control layerId); attribute-name and CRS-value checks deferred (need data profiles from M2).
- **Renderer is split pure/`render()` vs I/O `writeBundle()`** so generation is unit-testable without disk. **Data is inlined**, not fetched, to guarantee `file://` works. **Vendor libs are copied from node_modules**, not CDN, to stay offline. **Basemap = neutral background in MVP**; real PMTiles deferred (parked) — it needs a real tileset and `file://` range-request handling, out of M3's "renders to a browsable bundle" bar.

**Open thread / note:** there is a stray **empty `D:\code\MapBard\code\` directory** (pre-existing, not created this session) — harmless but worth deleting when convenient.

**Files touched:** _M0_ — `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore`, `.prettierrc.json`, `.prettierignore`, `eslint.config.js`, `packages/{schema,core,knowledge,renderer,cli}/{package.json,tsconfig.json,src/index.ts}`, `examples/.gitkeep`. _M1_ — `packages/schema/{package.json,src/geo-narrative.ts,src/index.ts,src/index.test.ts}`, `packages/core/{package.json,src/index.ts}`, `examples/sf-waterfront.geonarrative.json`. _M3_ — root `package.json` (+`@types/node`), `eslint.config.js` (runtime/script globals), `packages/renderer/{package.json,runtime/app.js,runtime/style.css,scripts/render-example.mjs,src/{types,index-html,bundle-data,render,write,index,render.test}.ts}`, `examples/data/landmarks.geojson`, `examples/media/{skyline,ferry-building}.png`. _Docs_ — `docs/BUILD_LOG.md`, `docs/phase-a-plan.md`.

**Verification:**
- M0: `pnpm install` ✅ → `pnpm -r build` ✅ (5/5) → `pnpm -r test` ✅ → `pnpm lint` ✅. **M0 DoD met.**
- M1: `pnpm --filter @mapbard/schema test` ✅ (12/12). Full `pnpm -r build` ✅ (schema → core topo order; `GeoNarrative` type imports across the package boundary), `pnpm -r test` ✅, `pnpm lint` ✅. **M1 DoD met** (example validates; types exported and importable).
- M3: `pnpm -r build` ✅, `pnpm -r test` ✅ (renderer 6/6), `pnpm lint` ✅. Rendered example via the dev script → **9-file self-contained `out/`** (`index.html`, `app.js`, `style.css`, `bundle-data.js`, `media/*.png` copied, `vendor/{maplibre-gl.js,maplibre-gl.css,scrollama.min.js}`), **0 warnings**. `node --check` clean on `app.js` + `bundle-data.js`; eval of `bundle-data.js` → 2 scenes / 2 assets / landmarks=3 features; every `index.html` reference resolves to a present file. **M3 DoD met** (renders to a browsable bundle). _Final human eyeball in a browser (scroll/popup/control) is the user's to do — `file:///D:/code/MapBard/out/index.html`._

**Next:** **M2** — `core` Stage 0: GeoJSON + CSV ingest & profiling, plus media registration into `MediaAsset[]`. Test thoroughly on fixtures (it grounds everything downstream).

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
