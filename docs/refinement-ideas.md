# MapBard — Refinement Ideas and Decision Register

Audited 2026-10-18 against the refinement, product-form, external-agent, and
built-in-agent discussions in this task. This is the durable coverage register
for those discussions, including rationale and examples that were condensed in
the plans. It is a synthesis of substantive ideas, not a verbatim transcript or
a claim that every idea is implemented.

## How to use this register

- **Direction:** an agreed architectural/product constraint; exact implementation
  can remain open.
- **Proposed:** a recommendation retained for scoped planning and evaluation.
- **Candidate:** an option to investigate, not a selected dependency or commitment.
- **Deferred:** preserved deliberately, outside the initial delivery scope.
- **Superseded:** an earlier recommendation replaced by a later user decision;
  retained in the evolution notes below rather than silently forgotten.

The [product plan](mapbard-plan.md) explains the story and two threads. The
[build guide](mapbard-build-guide.md) explains architecture. The
[refinement roadmap](refinement-roadmap.md) records priorities and open choices.
Session 09 subsequently created [implementation stages](implementation-stages.md)
and the detailed [Stage 1 plan](stage-1-plan.md). Their sequencing is preserved.

Stage references below are coverage mappings, not promises that every subfeature
will ship in that stage. Stage 1 is planned and not started; later stages are
outlines. When detailing a stage, explicitly select a minimum subset and retain
the rest as deferred items. This register does not expand an active stage's scope.

Session 10 (2026-10-18) reviewed all 40 IDs against the plans. The
[planning disposition](implementation-stages.md#r01r40-planning-disposition)
now assigns each ID to bounded work or an explicit deferral; the
[Stage 1 handoffs](stage-1-plan.md#required-handoffs-from-the-idea-review)
name owners and acceptance for the added attention, measurement, author-task and
verification requirements. Later-stage outlines now preserve the narrative
redirection and denominator-revision scenarios. The six-stage order is unchanged;
no idea's status is promoted to implemented by that review.

## Product form and agent interfaces

| ID  | Idea and why it matters                                                                                                                                                                                                                                                                                       | Status                             | Planning home / coverage                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------- |
| R01 | **Preserve the two main threads.** The geographic narrative representation is the research contribution; a useful standalone authoring product operationalizes and tests it. Derive it independently, with geographic scene theory as supporting influence.                                                   | Direction                          | [Product plan](mapbard-plan.md), research throughout                                           |
| R02 | **Serve evidence-owning creators first.** Researchers, analysts, and geographic storytellers bring data and need to explain it convincingly. Their real authoring tasks should determine the first slice.                                                                                                     | Proposed focus                     | [Product plan](mapbard-plan.md), Stage 1 case selection                                        |
| R03 | **One product with several interfaces.** Portable project format + engine + agent toolkit + visual workbench; a Hub can follow. Local agent users and visual creators should not get incompatible products.                                                                                                   | Direction                          | [Product plan](mapbard-plan.md), Stages 1–4                                                    |
| R04 | **Users' coding agents are first-class.** A creator can investigate, author, preview, diagnose, revise, and export through their preferred agent without a MapBard account or hosted assistant. Fast-changing agent hosts should not dictate the project format.                                              | Direction                          | [Build guide](mapbard-build-guide.md), Stage 3                                                 |
| R05 | **Our built-in agent has a purpose-built harness.** One LLM + system prompt + dynamically loaded skills; MapBard owns the loop. No LangGraph-style orchestration or fixed planner/designer/critic team. Agent identities are not pipeline stages.                                                             | Direction, explicit user decision  | [Build guide](mapbard-build-guide.md), Stage 6                                                 |
| R06 | **Skills teach a working method.** Combine concise operating guidance, on-demand domain references, valid examples, discovery, and repair workflows. Share geographic knowledge across the built-in harness and external-agent integrations with thin host adapters.                                          | Direction                          | [Build guide](mapbard-build-guide.md), Stages 3 and 6                                          |
| R07 | **CLI/SDK first; wrappers stay thin.** Expose stable operations, machine-readable diagnostics, artifact IDs, bounded outputs, and clear completion/error behavior. Start with one tested host; MCP is optional access to those same operations, not a second engine.                                          | Direction; MCP remains conditional | [Implementation stages](implementation-stages.md), Stage 3; Codex is the first planned host    |
| R08 | **The engine does not need an LLM.** Human-authored and agent-authored projects use the same validation, analysis, compiler, preview, and export. Retain/refactor the existing DashScope adapter as an optional path; do not require external agents to invoke it.                                            | Direction                          | [Build guide](mapbard-build-guide.md), Stages 1–3 and 6                                        |
| R09 | **Authoring portability and publication portability are separate.** Preserve an editable project with resources, analysis, evidence, assets, design, and versions; generate a website that works independently. Keep a local small-story export and consider an optimized static-host target for larger work. | Direction; larger target deferred  | [Build guide](mapbard-build-guide.md), Stage 1 and later export expansion                      |
| R10 | **Provide explicit extension points.** Themes, scene components, and interactions declare capabilities and editable parameters. Preserve unknown optional metadata and diagnose missing required extensions. Arbitrary generated HTML/JS edits have no guaranteed Studio round trip.                          | Direction                          | [Build guide](mapbard-build-guide.md), Stage 1 compatibility; richer extension execution later |

## Geographic meaning, investigation, and evidence

| ID  | Idea and why it matters                                                                                                                                                                                                                                                             | Status                                    | Planning home / coverage                                                          |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------- |
| R11 | **Make factual claims inspectable.** Bind assertions to source features, attributes, transformations, computed results, or cited context. Prose alone cannot tell the engine which evidence supports a statement.                                                                   | Proposed core refinement                  | [Product plan](mapbard-plan.md), Stage 2                                          |
| R12 | **Represent attention and comparisons explicitly.** Record focus entities, selected regions/features, compared groups/periods, and annotation targets. The engine needs to know what the reader should notice, not merely where the camera points.                                  | Proposed                                  | [Build guide](mapbard-build-guide.md), Stages 1–2, richer vocabulary later        |
| R13 | **Preserve qualifications and uncertainty.** Distinguish observation, computed finding, interpretation, and external context; carry missingness, coverage, units, and denominators. Provenance is not proof of causality or truth.                                                  | Direction                                 | [Product plan](mapbard-plan.md), Stages 2 and 5                                   |
| R14 | **Investigate before writing.** Let the authoring agent pose questions and use bounded filter/group/rank/normalize/spatial relation/distance/area/change operations. Code computes results; the model explains them. Do not infer full-dataset findings from a few profile samples. | Proposed                                  | [Build guide](mapbard-build-guide.md), Stage 2 selects a minimal operation subset |
| R15 | **Improve measurement semantics.** Replace unconditional number→ratio assumptions with units, identifiers, distributions, null handling, comparability, and author overrides. Numeric data alone does not justify a choropleth or a rate.                                           | Proposed                                  | [Build guide](mapbard-build-guide.md), Stages 1–2                                 |
| R16 | **Allow evidence to redirect the narrative.** If an intended trend is unsupported but a spatial comparison is defensible, offer that alternative. Candidate story directions should differ meaningfully, rather than merely rewriting tone; a branch-tree UI is not required.       | Proposed; concrete behavior retained here | [Product plan](mapbard-plan.md), Stages 2–3 and 6 authoring evaluations           |
| R17 | **Evaluate embedded analysis without committing early.** DuckDB Spatial is one candidate for joins and geographic processing. Compare it with a focused implementation for the actual case; ship prepared results to readers instead of requiring an analysis service.              | Candidate                                 | [Implementation stages](implementation-stages.md), Stage 2 technical choice       |
| R18 | **Trace inputs and invalidate stale results.** Record source identity/fingerprints, operation parameters, relevant versions, and dependencies so changes can trigger recomputation. Traceability supports both trustworthy editing and reproducible research.                       | Direction                                 | [Build guide](mapbard-build-guide.md), Stages 1–3                                 |

## Cartographic design and publication

| ID  | Idea and why it matters                                                                                                                                                                                                                                                         | Status                           | Planning home / coverage                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| R19 | **Introduce an explicit compiler boundary.** Keep GeoNarrative as the semantic center but separate editable project, analysis/evidence, and resolved render output. Scale domains, class breaks, legends, cameras, and interaction bindings should be resolved before playback. | Direction                        | [Build guide](mapbard-build-guide.md), Stage 1                                                             |
| R20 | **Make technique rules explainable and capability-aware.** Rules need prerequisites, geometry/measurement fit, alternatives, and rationale. A valid enum must not silently compile into a different visual meaning.                                                             | Proposed core refinement         | [Build guide](mapbard-build-guide.md), Stages 1–2                                                          |
| R21 | **Refactor the browser runtime into testable TypeScript modules.** Preserve deterministic rendering and pure generation versus I/O separation while bundling a maintainable runtime. Copying handwritten JavaScript is not a requirement for determinism.                       | Proposed; planned                | [Stage 1 plan](stage-1-plan.md)                                                                            |
| R22 | **Use a deliberate scene vocabulary.** Establish context, reveal a pattern, compare, follow a progression, explain an exception, and synthesize. Coordinate framing, emphasis, pacing, and media. A story should explain, not simply fly between locations.                     | Proposed                         | [Product plan](mapbard-plan.md), minimum comparison/reveal in Stage 1; breadth retained for later planning |
| R23 | **Make annotations and legends first-class.** Labels, callouts, brackets, highlighted regions, and explanatory legends connect the visible map to its point. Comparisons should align relevant places and hold scales consistent unless differences are explicit.               | Proposed                         | [Build guide](mapbard-build-guide.md), minimum supported subset in Stage 1                                 |
| R24 | **Coordinate maps, charts, and supplied media.** Linked charts can clarify a geographic comparison; photos/video can establish place or explain observations. Use each only when it serves the story, preserving caption/credit and panel/anchor semantics.                     | Proposed; richer charts deferred | [Product plan](mapbard-plan.md), existing media retained; broader composition follows the verified slice   |
| R25 | **Bring limited temporal comparison forward.** Two compatible vector snapshots can support a meaningful process story before general temporal GIS, raster support, or animated time sliders. Compatibility and method must be explicit.                                         | Direction                        | [Implementation stages](implementation-stages.md), Stages 1–2                                              |
| R26 | **Be honest about basemaps and assets.** Neutral basemap is the current implementation, not PMTiles. Plan tile access deliberately and resolve source versus bundle paths, posters, collisions, missing resources, credits, and network requirements.                           | Direction; PMTiles deferred      | [Stage 1 plan](stage-1-plan.md), asset correctness now; tiles later                                        |

## Author control and reader agency

| ID  | Idea and why it matters                                                                                                                                                                                                                                        | Status    | Planning home / coverage                                      |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------- |
| R27 | **Bring a narrow visual workbench into the first product.** Outline + live preview + evidence/design inspector + limited direct manipulation make geographic authoring assessable. Studio is complementary to external agents, not the mandatory doorway.      | Direction | [Implementation stages](implementation-stages.md), Stage 4    |
| R28 | **Make local revision the defining edit experience.** Stable IDs, scoped edits, locks, visible diffs, and undo let users change one comparison while preserving an introduction, captions, or framing. Avoid regenerating the whole story after every request. | Direction | [Implementation stages](implementation-stages.md), Stage 3    |
| R29 | **Agent and visual edits share canonical state.** Support both edit orders, detect stale revisions/conflicts, preserve unrelated work, and recompute affected dependencies. An editor-only document hidden from the agent would break the product promise.     | Direction | [Implementation stages](implementation-stages.md), Stages 3–4 |
| R30 | **Give readers meaningful questions to explore.** Prefer comparisons of time, geography, or population and inspectable evidence over exposing every paint property. Distinguish presentation-only controls from controls that change the meaning of the data.  | Proposed  | [Product plan](mapbard-plan.md), Stage 5                      |
| R31 | **Keep reader interaction consistent with claims.** Data-scope changes must update linked facts/annotations or explicitly enter exploration, with a way back to the authored story. Constrained reader agency becomes executable and measurable.               | Direction | [Implementation stages](implementation-stages.md), Stage 5    |

## Quality, repair, and research

| ID  | Idea and why it matters                                                                                                                                                                                                                                                                            | Status                                    | Planning home / coverage                                            |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------- |
| R32 | **Validate multiple kinds of correctness.** Separate structural/referential, evidence, cartographic, runtime, and presentation/accessibility checks. Include real browser controls, mobile layout, keyboard use, contrast, alternatives, and reduced motion where applicable.                      | Direction                                 | [Build guide](mapbard-build-guide.md), checks throughout Stages 1–6 |
| R33 | **Use actionable diagnostics and bounded repairs.** Identify the affected scene/property and a remedy; let an agent repair locally and rerun relevant checks. Stop with unresolved issues when budgets are exhausted. Screenshot critique is advisory, not proof of truth or cartographic quality. | Direction; visual model critique optional | [Build guide](mapbard-build-guide.md), Stages 1, 3 and 6            |
| R34 | **Evaluate the representation fairly.** Retain full/content-only/discourse-only/no-schema ablations where meaningful; add evidence, compiler-feedback, and revision comparisons. Hold data/tools/models/budgets comparable and distinguish component tests from end-to-end product comparisons.    | Proposed research design                  | [Product plan](mapbard-plan.md), early fixtures; Stage 5 pilot      |
| R35 | **Measure appropriateness, not dimension count.** Track unsupported claims, cartographic errors, narrative coherence, comprehension/recall, correction effort, unintended edits, and repair effectiveness. More dimensions or controls do not necessarily make a better story.                     | Direction                                 | [Product plan](mapbard-plan.md), Stage 5; instrumentation earlier   |
| R36 | **Capture reproducibility and publish limits.** Record versions, prompts/model configuration, observable tool actions, budgets, failures, and repeat-run variability. Publish the rubric and representative failures; do not claim efficacy from a working demo or require hidden model reasoning. | Proposed research practice                | [Product plan](mapbard-plan.md), all stages; Stage 5 evaluation     |

## Case studies, ecosystem, and deliberate deferrals

| ID  | Idea and why it matters                                                                                                                                                                                                                                                                                                              | Status                                      | Planning home / coverage                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- | ------------------------------------------------------------------------------- |
| R37 | **Prove one compelling real case first.** Prefer a riverbank-change story if compatible observations and usable media exist. A simpler verified vector comparison is acceptable. Later broaden to socioeconomic and movement stories; do not invent evidence for a demonstration.                                                    | Proposed case; selection unverified         | [Stage 1 plan](stage-1-plan.md), case audit, then Stages 2–5                    |
| R38 | **Preserve useful foundations without sunk-cost constraints.** Keep strict TypeScript, Zod, inward dependencies, deterministic rendering, portable output, and a working vertical slice. Revisit completed designs through explicit migrations. Branch trees, general GIS, RAG, and internal provider breadth are not prerequisites. | Direction                                   | [Build guide](mapbard-build-guide.md), [historical transition](phase-a-plan.md) |
| R39 | **Build a Hub around inspectable remixing and recipes.** Read a story → inspect construction → remix with compatible data → publish. Recipes encode analysis requirements, narrative structure, and design; preserve attribution and distinguish public artifacts from restricted sources. Prove reuse before feeds/social systems.  | Deferred horizon                            | [Product plan](mapbard-plan.md), outside Stages 1–6                             |
| R40 | **Keep hosted/community/commercial options without letting them drive the slice.** Hosted Studio, collaboration, organization features, paid templates/extensions/services, and a marketplace were discussed. The user explicitly deferred commercialization; none is a current delivery or business-model commitment.               | Deferred; commercial hypothesis not adopted | [Product plan](mapbard-plan.md), history below                                  |

## Concrete examples worth preserving

These examples express intended behavior, not new API promises or factual claims
about a real dataset.

1. **Evidence-bound assertion (R11–R13):** “Erosion accelerated along the northern
   reach” should identify the relevant segments, comparable observations, method,
   computed result, and qualifications. A general temporal extent is insufficient.
2. **Narrative redirection (R16):** “You asked about deterioration, but these
   observations support a spatial comparison more strongly than a trend.” The
   product can help choose an honest angle without needing a branching-tree UI.
3. **Precise revision (R28–R29):** “Compare these districts using rates, keep the
   introduction, and preserve my captions.” Recompute the denominator-dependent
   results and affected design; show changes and retain locked text.
4. **Shared editing (R27–R29):** Adjust framing visually, ask a coding agent to
   improve comparison logic, then reopen the workbench with the camera adjustment
   intact. Test the reverse order and conflicting edits too.
5. **Useful diagnostic (R20/R33):** “Comparison scenes use different color domains;
   use a shared domain or explicitly explain the difference.” Include machine IDs
   and paths so an agent can repair the correct objects.
6. **Meaningful controls (R30–R31):** “Compare with the previous period,” “Show the
   surrounding region,” and “Inspect evidence for this statement.” Changing opacity
   generally preserves a factual claim; changing period or denominator may not.
7. **Recipe examples (R39):** explain river change; compare neighborhood service
   access; follow migration; explain a spatial exception; connect field observations
   to a regional pattern. Replacing the data must recheck prerequisites.
8. **Agent loop (R05–R07/R33):** discover a relevant skill, load its instructions,
   execute an engine operation, inspect the result, revise or ask for input, and
   verify completion. Waiting, cancellation, bounded failure, and resume are real
   outcomes; a skill is guidance, not a separate agent or permission grant.

## How the recommendation evolved

- The initial product-form recommendation put an open format/engine underneath a
  flagship Studio and a later Hub. The user's subsequent emphasis on their own
  coding agents changed the priority: external-agent authoring is first-class and
  the visual workbench is a peer interface. Keep both the reason and the correction.
- “Studio” was suggested as a creator-facing name for finishing/publishing work;
  “Lab” could describe an investigation mode. Naming is optional, not an architecture
  decision or a requirement to build a separate lab.
- The earlier product discussion suggested monetizing managed execution, private
  workspaces, collaboration, and publishing while preserving usable local exports.
  Possible paid templates/design systems/extensions/services were also mentioned.
  These are historical hypotheses only. The user deferred the entire commercial
  discussion; no price, license, or charging model is selected.
- The user's built-in-agent clarification fixes the architecture: one LLM, system
  prompt, dynamic skills, and our own harness. Planning/design/verification remain
  capabilities. This does not imply the existing repository contains LangGraph
  or that specialized agents are globally obsolete.
- The first refinement discussion proposed a progression rather than committed
  milestones. Session 09 later scheduled Stages 1–6 and detailed Stage 1 alone.
  This audit preserves that work and does not revert it to “planning not started.”

## What this audit added

The active plans already captured the main recommendations. This audit makes them
individually traceable and restores details that were condensed: evidence-driven
story redirection, exact edit/diagnostic/control examples, the shared-edit round
trip, recipe examples, Studio/Lab naming, and the historical commercial hypothesis
with its explicit deferral. It also records the shift from Studio-led presentation
to first-class external agents so the earlier recommendation cannot override the
user's later direction.

No new product feature or dependency was selected by this audit. The 40 IDs group
related ideas; they are not 40 tasks or an exact count of every sentence in chat.

## References and limits of the earlier landscape scan

The discussion used these sources as precedents or related work. They are not
dependency commitments or a systematic novelty review:

- [Vega-Lite](https://vega.github.io/vega-lite/docs/): declarative specifications and compilation.
- [Observable Notebook Kit](https://observablehq.github.io/notebook-kit/kit): editable artifacts, local preview, and static output.
- [Remotion Studio](https://www.remotion.dev/docs/terminology/studio): a visual workbench within developer tooling.
- [DuckDB Spatial](https://www.duckdb.org/docs/lts/core_extensions/spatial/overview): candidate embedded geographic analysis.
- [ArcGIS StoryMaps AI](https://doc.esri.com/en/arcgis-storymaps/latest/learn/arcgis-storymaps-assistant.html): related assisted-authoring capabilities.
- [Cinematic spatiotemporal storytelling research](https://arxiv.org/abs/2510.17301): related geographic narrative generation.
- [Excalidraw product comparison](https://plus.excalidraw.com/pricing) and [integration documentation](https://plus.excalidraw.com/docs): precedents discussed for local tools, a managed workspace, and agent access; not a chosen commercial model.

## Keeping ideas from disappearing later

During stage planning, map relevant R IDs to concrete work or explicitly defer
them. On completion, link to implementation and verification evidence; do not mark
an idea delivered solely because a plan mentions it. When rejecting or replacing
an idea, retain its ID and record the reason. Add new IDs instead of renumbering.

Use the execution plans for scope and the build log for current status. Use this
register to check coverage and recover rationale. It complements those documents
without becoming a second, conflicting implementation schedule.
