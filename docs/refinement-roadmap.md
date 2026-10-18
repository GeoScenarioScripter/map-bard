# MapBard — Refinement Roadmap and Planning Brief

Updated 2026-10-18. **Stage planning complete; implementation not started.**
This retains the refinement discussion and coverage inputs. Session 09 produced
the [stage roadmap](implementation-stages.md) and detailed [Stage 1 plan](stage-1-plan.md).
Only Stage 1 has waves/sessions; later stages remain outlines until their predecessor closes.
It does not authorize executing every workstream or declare a new milestone done.

Read [the project story](mapbard-plan.md) for purpose and research/product threads,
[the build direction](mapbard-build-guide.md) for architecture, and
[the build log](BUILD_LOG.md) for the actual baseline.

The [idea register](refinement-ideas.md) audits the discussion into stable R IDs,
including rationale, examples, candidate choices, and explicit deferrals. Keep
those IDs traceable as future stages are detailed; not every retained idea is a
first-release commitment.

Session 10 reviewed that register against the existing plans. See the complete
[R-ID disposition](implementation-stages.md#r01r40-planning-disposition) and
[Stage 1 handoffs](stage-1-plan.md#required-handoffs-from-the-idea-review).
The sequence is unchanged. Stage 1 now explicitly owns author-task framing,
attention/comparison references, measurement overrides, stale-build checks and
verification records. Evidence-led story redirection and denominator-sensitive
revision are acceptance threads in Stages 2–3 and 6, not Stage 1 feature work.

## First product outcome

A creator uses their existing coding agent with MapBard's toolkit to inspect real
data and supplied media, develop a supported narrative, preview and test it,
make a targeted revision, and export a compelling geographic story. A local
workbench permits inspection and visual adjustments to that same project.
No MapBard account, hosted assistant, or mandatory built-in model call is required.

The first release is **engine + agent toolkit + local visual workbench**, with a
portable editable format and publication output. Hub/remixing is a later horizon;
commercialization and marketplace planning are deferred.

MapBard's own in-product agent will use **one LLM + a system prompt + dynamically
loaded skills + a purpose-built harness maintaining the agent loop**. No LangGraph
or comparable agent orchestration framework, and no fixed team of specialized
agents. This architecture is decided; the minimum harness is outlined for Stage 6,
with detailed planning after Stage 5 closes. It must use the same engine operations as external
coding agents without becoming a dependency of their workflows.

## Baseline to carry forward

Old M0–M4 are recorded done: strict TypeScript/pnpm workspace, Zod v0.1.0 contract,
local GeoJSON/CSV profiling, media registration, example renderer, and an optional
future role for the existing DashScope planner. The example includes two scenes,
panel and anchored media, and a size control.

Old M5–M7 were not started. Their sequence is superseded, not completed or silently
renumbered. See [phase-a-plan.md](phase-a-plan.md) for the transition record and
[the archived original](archive/2026-10-17/phase-a-plan.md) for historical checklists.

The 2026-10-17 review passed build, 53 tests, lint, and nine-file example generation.
That review did not verify live-provider planning or interactive browser behavior.
Neither the agent toolkit, built-in agent harness, nor the workbench currently
exists. The existing constrained Plan call is not a general agent runtime.

## Prioritized workstreams for stage planning

The ordering below suggests dependencies, not a waterfall or committed sprint list.
Choose a narrow end-to-end slice that touches the necessary parts.

| Workstream                   | Refinement                                                                                                            | Evidence needed before considering it delivered                                                                                                                               |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract and migration       | Separate editable project, evidence/analysis, semantic narrative, and compiled render output; stable IDs and versions | Existing example migrates without lost content; incompatible versions produce clear errors                                                                                    |
| Runtime/compiler correctness | Resolve categorical styling, classifications, legends, annotations, supported encodings, and capability diagnostics   | A rendered comparison faithfully realizes the requested technique and shared scale; unsupported intent is diagnosed                                                           |
| Analysis and provenance      | Bounded operations, measurement semantics, source identity, reproducible results, claim bindings                      | A real finding recomputes from its sources; changed inputs invalidate dependent evidence                                                                                      |
| Agent operation surface      | CLI/SDK operations with discovery, structured results, targeted preview, and actionable checks                        | An external agent can complete the loop without importing private source files or using the built-in planner                                                                  |
| Precise revision             | Scoped edits, locks, reviewable changes, undo, conflicts, and dependency invalidation                                 | One comparison changes while preserved scenes/captions remain intact; concurrent edits are not silently lost                                                                  |
| Local workbench              | Outline, preview, evidence/design inspection, limited visual manipulation                                             | A visual edit survives a subsequent agent edit in the same project, and vice versa                                                                                            |
| Agent toolkit                | One tested skill/plugin, examples, workflow references, and task evaluations                                          | A fresh agent session can create, revise, and recover from a deliberate error using documented operations                                                                     |
| Built-in agent harness       | One LLM with a system prompt, on-demand skills, and a MapBard-owned model/tool loop over shared operations            | Scripted and live checks demonstrate skill loading, tool feedback, completion/waiting, bounded failure, cancellation, and safe resume without specialized-agent orchestration |
| Narrative expression         | Context/reveal/comparison/progression/exception/synthesis patterns, media, limited linked charts                      | A coherent story directs attention deliberately rather than merely changing cameras                                                                                           |
| Reader interaction           | Semantic controls with updated claims or explicit exploration states                                                  | Reader changes cannot leave apparently authoritative but stale factual text                                                                                                   |
| Verification and evaluation  | Structural, evidence, cartographic, browser, accessibility checks; fair research comparisons                          | Checks expose distinct failure classes and produce reproducible evaluation artifacts                                                                                          |

The compiler/runtime gap is a prerequisite for trusting more ambitious design
rules. The engine's operation surface is a prerequisite for a reliable agent
toolkit. Shared edit semantics are a prerequisite for promising agent/workbench
interchangeability. Evaluation fixtures should accompany these changes, not wait
until the last workstream.

The built-in harness also depends on stable engine operations and skill contracts.
Reuse domain guidance between its dynamically loaded skills and external-agent
toolkits; adapters may differ by host. Do not turn each engine capability into a
specialized agent or require external agents to invoke the built-in loop.

## Progression used as the stage-planning input

1. **Establish a trustworthy slice:** select the case and capture baseline behavior;
   plan contract migration and correct the rendering capabilities that case needs.
2. **Connect evidence to authored scenes:** implement only the analysis, provenance,
   and design semantics needed to explain a real finding.
3. **Expose an agent-driven loop:** make operations discoverable and scriptable;
   run a first integration through creation, preview, diagnosis, and targeted repair.
4. **Share editing with a small workbench:** support inspection and a few meaningful
   visual edits using the same project model and conflict rules.
5. **Prove and broaden:** exercise a semantic reader interaction, test usability and
   quality, and extend to additional datasets only after the first story succeeds.

These five horizons informed the [six-stage sequence](implementation-stages.md),
which also places the optional built-in harness after the first product evaluation.
They are not separate active implementation milestones.
Do not build the entire new schema, all analysis operators, or a full editor before
maintaining a runnable story through the loop.

## First-slice candidate and acceptance envelope

Prefer a real riverbank-change case if two compatible observations and usable
media are available. Verify CRS, measurement method, spatial/temporal comparability,
data quality, and reuse conditions before choosing it. A simpler verified vector
comparison is an acceptable first slice; the scientific narrative must follow
the data. Example PNG placeholders are not a substitute for real field evidence.

The slice should demonstrate:

- Creation through a user's coding agent with no required MapBard model call.
- At least one reproducible finding referenced by the narrative, with an
  inspectable qualification or evidence explanation where relevant.
- A coherent linear story with functioning legends/annotations, supplied media,
  deliberate framing, and a supported comparison or reveal.
- At least one meaningful reader control whose effect on claims is handled.
- A targeted author revision preserving locked content and invalidating affected
  results, followed by a successful bounded diagnosis/repair cycle.
- A visual edit and an agent edit round-tripping through the same project.
- A portable local export opening without a server when all required assets are
  local; external dependencies are disclosed for other export modes.
- Actual browser verification, basic accessibility/responsive checks, and recorded
  failure cases. A screenshot or valid JSON alone does not establish correctness.

This is a product-level acceptance envelope. The [stage roadmap](implementation-stages.md)
distributes it across Stages 1–5; do not treat it as one giant implementation task.

## Decision register and planning disposition

The table below preserves the direction-reset questions. Session 09 selected
Stage 1 artifact/package boundaries, limited sequential comparison, neutral/local
export and a first-gate contract freeze; Stage 3 targets Codex first, Stage 4 the
shared local workbench, and Stage 6 the optional harness. See the linked plans for
those decisions. Real-case discovery and runtime tooling resolve at Stage 1 G1;
analysis-method, edit-protocol, UI and evaluation details resolve when their stages
are planned. The original positions below are inputs, not overrides of that sequence.

When detailing Stage 6, resolve the initial system-prompt responsibilities, skill
discovery/loading/versioning, context management, tool-call interface, session
checkpoints, cancellation, stopping/waiting states, budgets, and test strategy.
Use the bounded harness outline and shared Stage 3 skills/scenarios. The use of our
own single-agent harness rather than LangGraph or a specialized-agent team is not
an open framework-selection question.

| Decision                             | Why it matters                                                       | Present position                                                                 |
| ------------------------------------ | -------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Real case and minimum analysis       | Determines justified schema, design, and runtime requirements        | Riverbank change preferred, data availability unconfirmed                        |
| Artifact layout/version migration    | Prevents source/output confusion and loss of v0.1.0 projects         | Logical boundaries agreed; filenames/types/version numbers open                  |
| Analysis engine and operation subset | Affects dependencies, CRS handling, performance, and reproducibility | Evaluate a small approach; DuckDB Spatial is a candidate only                    |
| Compiler/runtime boundary            | Prevents schema/runtime mismatch and duplicated design logic         | Explicit compilation agreed; module/package placement open                       |
| Initial scene/control vocabulary     | Limits breadth while making the demonstration compelling             | Purposeful comparison/reveal and claim-aware interaction favored                 |
| CLI/SDK contracts and diagnostics    | Makes the loop usable across coding agents                           | Stable structured results required; commands not yet specified                   |
| First agent integration              | Makes the toolkit testable without platform sprawl                   | Codex is a candidate; portable guidance and engine independence required         |
| Shared edits and workbench scope     | Protects author work and bounds UI cost                              | Stable IDs/locks/conflict handling agreed; UI framework/open-file transport open |
| Export/asset policy                  | Establishes what portable/offline actually means                     | Preserve small local export; larger static-host target can follow                |
| Evaluation fixtures and budgets      | Makes claims attributable and failures visible                       | Early instrumentation; exact tasks, sample sizes, and thresholds open            |

## Later horizons and explicit non-goals

- Curated Hub: inspectable stories, recipes, attribution, remix compatibility;
  publishable artifacts must be separated from restricted source data.
- Hosted creation, team collaboration, and richer extensions only after the local
  workflow is useful; no account system or server platform is required now.
- General raster/temporal pipelines, elaborate branching/version graphs,
  unrestricted code execution, RAG infrastructure, and multiple built-in provider
  integrations are outside the initial slice.
- Vision critique may be explored as advisory feedback; no claim that it certifies
  geography, factual truth, or complete accessibility.
- Commercialization, pricing, payment systems, and a marketplace are deferred.

## Planning output and continuing rule

Session 09 produced [implementation-stages.md](implementation-stages.md) and
[stage-1-plan.md](stage-1-plan.md). Stage 1 alone has detailed waves of parallel
sessions, ownership, contracts, fixtures, verification gates and exclusions.
Later stages retain outcome/dependency/entry/exit outlines and are expanded only
after the preceding stage closes. Each future detailed plan must cover affected
packages, schema/API changes, compatibility/migration, representative fixtures,
tests/browser checks, definition of done and explicit exclusions; distinguish
technical spikes from feature work. Preserve the historical M0–M7 record and
update guidance and the banner without declaring unimplemented targets delivered.
