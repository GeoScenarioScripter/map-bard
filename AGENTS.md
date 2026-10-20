# AGENTS.md — MapBard

Repository-wide instructions for coding agents. More specific AGENTS.md files,
if introduced, govern their subdirectories. Current direction updated 2026-10-17.

## Purpose and reading order

MapBard turns geographic resources, text, supporting images/video, and intent into
interactive map stories. Its two threads are a research contribution in geographic
narrative representation and a standalone product that operationalizes it.

The agreed product direction is **portable project format + model-independent
engine + coding-agent toolkit + local visual workbench**. Users' own coding agents
are first-class authoring interfaces. GeoNarrative remains the semantic center;
typed analysis/evidence artifacts and a compiled render specification are planned
alongside it. Commercialization is deferred.

Read before implementation:

1. `docs/BUILD_LOG.md`: current-state banner and latest actual session entry.
2. `docs/mapbard-plan.md`: agreed product story and research/product threads.
3. `docs/mapbard-build-guide.md`: architectural constraints and target boundaries.
4. `docs/refinement-roadmap.md`: priorities, coverage inputs, and deferred decisions.
5. [Implementation stages](docs/implementation-stages.md), then the detailed
   [Stage 1 plan](docs/stage-1-plan.md): waves, parallel sessions, ownership and gates.

For scope/design planning, consult [the refinement idea register](docs/refinement-ideas.md).
Its stable R01–R40 IDs preserve recommendations, rationale, examples, and deferred
options. Map relevant ideas to stage work or explicitly defer them; retain IDs and
reasons when an idea is superseded. The register does not expand execution scope.

`docs/phase-a-plan.md` records the historical baseline and transition.
`docs/archive/2026-10-17/` is historical reference, **not active instructions**.
`CLAUDE.md` points to this shared guidance rather than maintaining another rulebook.
Check source/tests before treating a target capability as implemented.

## Current scope and status

**Stage 1 — Trustworthy Project and Publication is active; Wave 1 handoffs are
complete (Sessions 11–13), G1 closed in Session 19, and G2 closed in Session 24.
Wave 2 is integrated; Wave 3A/B/C closed in Sessions 26–28 and G3 closed in
Session 29. Wave 4 started with S1-W4-A in Session 30; W4-B/C and G4 remain.**
See `docs/stage-1/g1-review.md` for frozen contract revision g1-r1, verified
acquisitions, the bounded Potomac comparison and selected esbuild IIFE approach.
Sessions 16–17 repaired reader-reported legacy demo issues, including an explicit
local context map. Session 19 accepted the reader's direct-file Edge/Chrome,
Console/Network, offline and relocated-copy report, recorded in
`docs/stage-1/browser-handoff.md`. This closes the G1 build-choice gate; it does
not certify the planned compiled player or full capability matrix.
See `docs/stage-1/g2-review.md` for public load/import/validation and player asset
contracts, 89 passing tests and the bounded Node VM check. See
`docs/stage-1/w3-a-handoff.md`, `docs/stage-1/w3-b-handoff.md` and
`docs/stage-1/w3-c-handoff.md` for the compiler, playback and publication
handoffs. The `docs/stage-1/g3-review.md` records public composition, the
synthetic compiled fixture and the bounded capability gate. Session 30 adds the
real-source author example and reproducible build record. Independent regression
and browser review are next.
No complete Stage 1 publication capability is delivered. Do not resume old M5. Only Stage 1
has detailed waves/sessions; detail each later stage after its predecessor closes.

Historical M0–M4 are recorded done. M5–M7 were not started and their execution
sequence is superseded, not completed. The existing code remains the baseline.
The revised story and roadmap do not authorize implementing all proposed features
during a documentation or planning task.

The first product target is an external-agent authoring loop: inspect resources,
compute supported findings, author/design, preview/test, make precise revisions,
and export; a local workbench edits the same project. A MapBard account or hosted
assistant must not be required. The old prohibition on any early Studio/temporal
work is superseded by a narrow workbench and compatible vector comparisons.

Later, after the local pipeline: MapBard's own community / market center, where
creators can upload user-written story pages for MapBard to serve and visualize,
along with discovery and reuse workflows. This is a confirmed destination; its
detailed scope follows the local pipeline.
Deferred from the initial slice: general raster/temporal GIS, elaborate branching,
RAG infrastructure, unrestricted generated execution, multiple built-in provider
integrations, and mandatory cloud infrastructure. Pricing, payments, and
commercialization details are outside current concerns.

## Existing repository map

| Package              | Implemented today                                                                                                                              |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `@mapbard/schema`    | GeoNarrative plus public project/design/compiled/diagnostic Zod contracts, strict parsers and reference validation                             |
| `@mapbard/core`      | Stage 0 ingestion/profiling/media; optional DashScope planning; public project load/import/validation                                          |
| `@mapbard/knowledge` | Scaffold only                                                                                                                                  |
| `@mapbard/renderer`  | Legacy render/write/runtime plus separate TypeScript compiled player and MapLibre adapter; classic IIFE asset at `@mapbard/renderer/player.js` |
| `@mapbard/cli`       | Scaffold only; no public executable commands yet                                                                                               |

Project loading/import/validation and shared contracts are integrated. G3 exports
the W3-A compiler and W3-C publication APIs and composes them with the built
player in a synthetic example. Analysis/evidence, agent toolkit and workbench
remain targets.
The player has a MapLibre adapter and compiled HTML wiring without browser acceptance. Stage 1 uses existing
packages and the frozen g1-r1 contracts; keep new work within its released wave.

Depend inward toward shared contracts. Use direct `workspace:*` dependencies and
public package barrels; do not import private source across packages. Stage 0
currently returns `{ dataSource, data }`; raw features travel separately from
profiles, keyed by source ID in the renderer's DataMap. Samples are not full data.

## Architectural constraints for future changes

- Keep one semantic center but allow distinct typed artifacts for analysis,
  evidence, project metadata, and compiled rendering. Do not force every operation
  into one progressively filled GeoNarrative.
- Define contracts with Zod and inferred types. Validate external project/agent
  edits and semantic references. Current `render()` expects a validated narrative.
- Preserve references between media, data sources, layers, and scene controls.
  Content dimensions remain optional. Do not reward unnecessary dimensions.
- Plan explicit migration/version handling before breaking v0.1.0. Preserve the
  handwritten example; reject unsupported versions rather than silently losing data.
- Engine operations must be usable without a built-in LLM. Existing DashScope
  calls still use the validated adapter and bounded repair loop; external coding
  agents do not have to call that adapter.
- Agents may propose narrative and design intent. Deterministic code executes
  analysis, checks capabilities, and compiles/render stories. Do not treat generated
  HTML/JS as canonical narrative content. Custom code needs explicit extensions.
- Never invent observations, computed results, or supplied media. Preserve current
  fit-check questions. Evidence links establish provenance, not automatic truth
  or causality; record qualifications and stale dependencies.
- Unsupported techniques must produce actionable diagnostics. Coordinate schema,
  compiler, runtime, examples, and tests when adding capabilities.
- Keep generation/compilation separate from I/O. Preserve escaping, asset path
  containment, missing-resource diagnostics, and source attribution.
- Preserve portable small-story `file://` output. Larger static-host export is a
  separate target; remote media and tiles must have explicit network requirements.
- Agent and visual edits must share project state. Plan stable IDs, scoped edits,
  locks, undo, and conflict detection. Generated-page edits have no guaranteed
  round trip; extension parameters are the supported customization path.
- Distinguish visual controls from data-scope changes. Recompute linked claims or
  explicitly mark exploration/staleness when a reader changes their meaning.
- Model-free checks come first; browser verification is distinct from generation.
  Optional visual critique is advisory. Keep repairs local and bounded.

## Known baseline limitations

Inspect `packages/renderer/runtime/app.js` before relying on an encoding.

- Classification is ignored; categorical falls through to circles and numeric
  color interpolation; data-driven opacity is not implemented.
- Controls set paint properties or toggle visibility; general filter controls are
  absent. Layers are registered once by ID, so reused IDs do not rebuild bindings.
- The player ignores authored basemap configuration. The example can explicitly
  supply a bounded local context map, but PMTiles is not implemented and other
  outputs still use a neutral background.
- Profiling infers number→ratio/date→interval/other→nominal and samples only five
  distinct values. Exact classifications need actual distributions.
- Ingest helpers read local files; CRS is recorded/defaulted, not reprojected.
- Media source and bundle destination paths are conflated. Absolute/traversal
  paths, collisions, and video poster references need explicit handling.
- Existing Plan uses empty layers/default cameras; its temporal fit check surfaces
  questions but does not correct unsupported narration.

These are planning inputs, not permission to fix every issue in any task.

## Built-in agent architecture decision

MapBard's own in-product agent is planned as **one LLM + system prompt + dynamically
loaded skills + a purpose-built agent harness**. No LangGraph-style orchestration
framework and no fixed team of specialized planner/designer/critic agents.
Ordinary provider SDKs and focused utilities are allowed.

The harness owns the model/tool loop, context, skill loading, budgets, interruption,
and session state. Skills supply on-demand domain guidance; they do not create
additional agents or grant new permissions. Plan/design/verify are capabilities
and artifact operations, not separate agent identities. Share domain skills and
engine operations with external coding-agent integrations where practical.

Keep the agent harness separate from both the deterministic engine and the story
player. Engine-only and external-agent workflows must not invoke the built-in
agent. The existing DashScope planning call is not this harness, and this decision
does not activate implementation; scope and delivery order are still to be planned.

## Toolchain and verification

Node 20+, pnpm 9.15.0, strict TypeScript ESM/NodeNext, `.js` relative import
suffixes, no `any` in public APIs. Use existing per-package exports. The runtime
has a legacy plain-JS path copied verbatim and a separate tested TypeScript
foundation. The renderer build includes `build:player` (typecheck plus esbuild
IIFE); publication consumers resolve `@mapbard/renderer/player.js` as an asset,
not an ESM API. It is not yet a complete compiled browser player.

Run from the root:

```sh
pnpm install --frozen-lockfile
pnpm -r build
pnpm -r test
pnpm lint
```

Build first on a clean checkout: package exports resolve to dist. Builds use
per-package `tsc -p`, not a root project-reference graph. Tests are colocated
`src/**/*.test.ts` and excluded from emitted code. Target a package with
`pnpm --filter @mapbard/core test`. Empty packages pass with no tests.

After building, renderer smoke:

```sh
node packages/renderer/scripts/render-example.mjs
node --check packages/renderer/runtime/app.js
node --check out/bundle-data.js
node --check packages/renderer/dist/player/player.js
```

For runtime changes, open the output and exercise scrolling, cameras, layers,
media/popups, and controls; inspect responsive/accessibility behavior as relevant.
Do not call file generation a browser check.

Format changed files only. `pnpm format` rewrites the repository. Use
`pnpm exec prettier --write <paths>`; if a local Windows shim fails, invoke
`node node_modules/prettier/bin/prettier.cjs --write <paths>`.
Do not hand-edit dist, out, or vendor artifacts.

## Existing LLM configuration

DashScope is the only currently implemented adapter, using the OpenAI-compatible
endpoint through the openai SDK. It becomes an optional authoring path in the
target architecture. See `packages/core/src/llm/dashscope.ts` and `.env.example`
for MAPBARD_LLM_KEY, MAPBARD_LLM_BASE_URL, and MAPBARD_LLM_MODEL. The checked-in model
is a repository default, not a provider-availability guarantee.

Never print or commit secrets. Routine tests use fake adapters and no network.
The helper does not auto-load .env. A separately chosen live smoke can use:

```sh
node --env-file=.env packages/core/scripts/plan-example.mjs "Introduce the waterfront"
```

It calls the provider and writes root `narrative.plan.json`, which is not ignored.
Do not commit that output accidentally or make live calls a prerequisite for
model-independent engine tests.

## Session protocol

- Inspect git status first and preserve unrelated work.
- Commit every completed session's work before handing it off. Use focused,
  descriptive commits for coherent changes, include the session's journal/docs,
  and run the applicable checks before committing. Stage explicit paths or hunks;
  never sweep unrelated work or secrets into a session commit. This is standing
  authorization to make local session commits; do not ask again each session.
  If checks or Git permissions block a commit, record the exact blocker and leave
  the work intact. Push only when explicitly requested or separately authorized;
  a local session commit does not authorize a push or history rewrite.
- Open a numbered, dated entry in BUILD_LOG before implementation; close it with
  Goal / Did / Decisions / Files touched / Verification / Next.
- Maintain the banner and the active stage plan when stages exist. Never rewrite
  historical completions as proof that new requirements are satisfied.
- Follow stage → sequential waves → parallel sessions. Record plan IDs alongside
  actual journal session numbers; freeze inputs and exclusive file ownership per
  wave. The coordinator owns shared files and integrates at each gate. Planned
  parallel sessions are work units, not the product's built-in agent architecture.
- Record durable decisions in repository docs; private agent memory is not required.
- Keep documentation truthful about implemented, planned, and unverified behavior.
  Documentation-only changes need formatting/link/diff review, not new code tests.
- Baseline verified in Session 05: five packages build, 53 tests pass (schema 12,
  core 35, renderer 6), lint passes, nine-file example generation has no warnings.
  Live-provider planning and interactive story-runtime checks remain unverified.
