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

**Stage planning complete (Session 09); Stage 1 — Trustworthy Project and Publication
is next and NOT STARTED.** No implementation stage is active. Do not continue old
M5 automatically. Only Stage 1 has detailed waves/sessions; detail each later stage
after its predecessor closes. The planning task does not authorize implementation.

Historical M0–M4 are recorded done. M5–M7 were not started and their execution
sequence is superseded, not completed. The existing code remains the baseline.
The revised story and roadmap do not authorize implementing all proposed features
during a documentation or planning task.

The first product target is an external-agent authoring loop: inspect resources,
compute supported findings, author/design, preview/test, make precise revisions,
and export; a local workbench edits the same project. A MapBard account or hosted
assistant must not be required. The old prohibition on any early Studio/temporal
work is superseded by a narrow workbench and compatible vector comparisons.

Later: Hub/remix workflows, hosted creation, collaboration, richer extensions.
Deferred from the initial slice: general raster/temporal GIS, elaborate branching,
RAG infrastructure, unrestricted generated execution, multiple built-in provider
integrations, and mandatory cloud infrastructure. Pricing, marketplace, and other
commercial planning are outside current concerns.

## Existing repository map

| Package              | Implemented today                                                                                               |
| -------------------- | --------------------------------------------------------------------------------------------------------------- |
| `@mapbard/schema`    | `src/geo-narrative.ts`: Zod schemas, inferred types, parse helpers, SCHEMA_VERSION 0.1.0                        |
| `@mapbard/core`      | `src/stage0/` ingestion/profiling/media; `src/llm/` repair/DashScope; `src/stage1/plan.ts` constrained planning |
| `@mapbard/knowledge` | Scaffold only                                                                                                   |
| `@mapbard/renderer`  | Pure `src/render.ts`, I/O `src/write.ts`, plain-JS/CSS browser runtime                                          |
| `@mapbard/cli`       | Scaffold only; no public executable commands yet                                                                |

The new project format, analysis/evidence layer, compiler boundary, agent toolkit,
and workbench are targets, not delivered APIs. Stage 1 plans modules within the
existing packages; freeze exact contracts at its first integration gate.

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
- The player constructs a neutral basemap and ignores basemap configuration.
  PMTiles is not implemented.
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
is currently plain JS copied verbatim; a tested TypeScript/bundled runtime is a
planned refinement, not today's build behavior.

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

- Inspect git status first and preserve unrelated work. Commit/push only when asked.
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
