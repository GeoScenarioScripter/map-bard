# MapBard — Project Story and Direction

Updated 2026-10-17. This document records the agreed direction, not delivered
features. Implementation status lives in [BUILD_LOG.md](BUILD_LOG.md); refinement
inputs live in [refinement-roadmap.md](refinement-roadmap.md). The
[stage roadmap](implementation-stages.md) and [Stage 1 plan](stage-1-plan.md)
now define the delivery sequence; implementation has not started.

The [refinement idea register](refinement-ideas.md) preserves the discussion's
individual recommendations, rationale, concrete examples, and changes in direction.
Use it to check coverage when evolving these plans.

## The story

MapBard helps people turn geographic data, text, supporting images/video, and an
intent into a compelling interactive map story. A creator can work with their own
coding agent, inspect and adjust the result in a visual workbench, and publish a
portable website. Both interfaces operate on the same editable project.

The promise is to investigate what the resources support, express it through
geographic narrative, and let the author revise the telling without losing the
connection to its evidence. MapBard supplies the representation, cartographic
knowledge, execution, and feedback; it does not require a new hosted assistant.

MapBard remains the narrative sibling of MapMate: MapMate configures map style;
MapBard composes a story. It remains standalone, independent of the existing
platform. Its two main threads are unchanged: a research contribution in geographic
narrative representation and a product that operationalizes it.
Commercialization, pricing, and marketplace economics are deferred.

## Thread 1 — The research contribution

### Working contribution

A computable representation that connects geographic content and narrative
discourse to explicit evidence, visual attention, and interaction constraints,
enabling agents and humans to author, inspect, and revise geographic stories.

`GeoNarrative` remains the semantic center. The research asks whether this
representation improves geographic appropriateness, cartographic quality,
traceability, and revision consistency compared with less structured authoring.
These are hypotheses to evaluate, not results already established.

Geographic scene theory remains a convergent influence. The representation must
stand on an independent derivation from what a geographic story needs to specify.
Do not claim novelty simply because an agent generates a map story or uses JSON;
a proper related-work review must establish the actual distinction.

### Representation to investigate

- **Content:** semantics, location/time, geometry, attributes, relationships, and
  processes. A scene uses the dimensions appropriate to its purpose.
- **Discourse:** narrative role, emphasis, pacing, viewpoint, and reader agency.
- **Evidence:** claims linked to identified features, reproducible calculations,
  supplied media, or cited contextual sources. Separate observations, computed
  findings, interpretations, and externally sourced context.
- **Attention:** selected geographic entities, annotations, comparison targets,
  and the part of a view a reader should notice.
- **Operators:** sequence, reveal, comparison, progression, drill-down, and
  synthesis; begin with a linear authored story.
- **Interaction constraints:** which changes preserve a claim, which require
  recomputation, and how exploration returns to the authored narrative.

An evidence link records provenance; it does not establish causality, remove
measurement uncertainty, or prove an interpretation. Uncertainty, incomplete
coverage, units, denominators, and author qualifications must remain visible.

### Argument and paper structure

1. Explain the difficulty of coordinating geographic reasoning, narrative design,
   and reliable interactive presentation.
2. Review geographic storytelling, declarative visualization, agent-assisted
   analysis/authoring, provenance, and mixed-initiative editing. Establish the gap
   without blanket claims that prior systems cannot reason spatially.
3. Derive the representation and its content/discourse/evidence relationships.
4. Describe executable analysis, constrained design compilation, and local edits
   as mechanisms that operationalize the representation.
5. Present the standalone engine and agent/workbench interfaces as the apparatus.
6. Evaluate output quality, author effort, and reader understanding.
7. Bound the claims: data quality, interpretation, model variability, design
   expressiveness, and limits of automated checking.

The technique rules and evaluation rubric remain candidates for publishable
research artifacts. Venue framing remains cartography/GIS and visual
communication; venue selection is not an engineering requirement.

### Evaluation from the beginning

Retain full/content-only/discourse-only/no-schema comparisons where meaningful.
Add targeted ablations for evidence bindings, compiler diagnostics, and scoped
revision. Do not confound representation with a stronger model, better data,
extra tools, or a larger unreported budget.

Use two complementary designs: controlled component ablations with shared data,
tools, and comparable budgets; and a clearly labeled end-to-end comparison with
free-form authoring. Record models, prompts, versions, seeds where supported,
tool calls, repair attempts, costs/latency, and failures. Repeated runs should
expose variability; deterministic engine output does not make generation deterministic.

Measure:

- Appropriate geographic reasoning for the task, rather than the number of
  content dimensions mentioned.
- Unsupported or overstated claims, reproducibility of calculations, and
  evidence coverage for factual assertions.
- Expert-assessed cartographic honesty, visual hierarchy, legibility, and
  consistency of comparisons.
- Narrative coherence, pacing, and purposeful use of media.
- Author correction effort, unintended edits, and preservation of locked content.
- Reader comprehension and recall, with engagement as a complementary measure.
- Functional success, responsive/accessibility behavior, and repair effectiveness.

Publish the rubric and representative failures. Automated checks and visual model
critiques support evaluation; expert review is still needed for interpretation
and deeper cartographic judgment.

## Thread 2 — The product

### Who it serves first

Researchers, analysts, and geographic storytellers who bring their own evidence
and need to explain it. Coding-agent users are a primary audience. Visual
authoring should lower friction without creating an incompatible product.

### Product form

| Component               | Purpose                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------- |
| Portable project format | Editable narrative, evidence/analysis references, assets, design intent, and versioned dependencies     |
| Engine                  | Resource inspection, executable analysis, validation, design compilation, preview, tests, and export    |
| Agent toolkit           | Skills/plugin guidance, examples, capability discovery, and an inspect–edit–render–test–repair workflow |
| Local Studio/workbench  | Scene outline, map preview, evidence/design inspector, direct manipulation, and change review           |
| Hub, later              | Publish, inspect, attribute, and remix stories and reusable recipes                                     |

The first product target is **Engine + agent toolkit + local visual workbench**.
No account or MapBard-hosted assistant should be required for the local workflow.
The engine should run without a built-in LLM. The existing DashScope planner can
remain an optional adapter; supporting external agents does not require building
an internal multi-provider platform.

Studio is a complementary interface, not a gate to essential engine operations.
It can run in a browser against a local process; a desktop shell is not assumed.
Hosted creation, collaboration, and publishing services can follow when useful.

### The agent inside MapBard

MapBard will also offer its own in-product agent. Its architecture is **one LLM
with a system prompt, dynamically loaded skills, and a purpose-built harness that
maintains the agent loop**. It will not use LangGraph or an equivalent graph-based
agent orchestration framework, nor a fixed team of planner/designer/critic agents.
Ordinary model SDKs and utility libraries remain compatible with this decision.

The system prompt supplies enduring role and operating rules. Skills supply
task-specific knowledge and workflows, loaded when relevant rather than placing
every instruction into the initial prompt. The harness manages context, model
turns, tool execution/results, progress, interruption, and termination. The agent
chooses its next action from observations and user feedback; inspect, investigate,
plan, design, and verify are capabilities, not separate agent identities.

This agent uses the same engine operations and editable project as external
coding agents. Reuse domain skills across both where possible, with thin adapters
for host conventions. The agent harness is separate from the deterministic engine
and the published story's browser runtime. The existing one-shot DashScope Plan
adapter is a baseline to refactor, not an implementation of this agent loop.

The architecture decision is settled; the first harness scope is outlined in
[Stage 6](implementation-stages.md), with details deferred until Stage 5 closes.
Engine-only and external-agent workflows
must remain usable without starting the built-in agent.

### The authoring cycle

1. **Inspect:** understand resources, geometry, measurement semantics, quality,
   missingness, temporal coverage, and available media.
2. **Investigate:** pose questions, execute bounded analyses, and inspect results.
3. **Plan:** propose a narrative grounded in findings and the author's intent.
4. **Design:** select scene patterns, encodings, annotations, cameras, and controls.
5. **Compile and preview:** produce resolved render instructions and a live story.
6. **Inspect and revise:** use diagnostics, browser checks, and author feedback to
   patch affected parts while preserving other work.
7. **Export:** produce a publication independently usable from MapBard.

These are discoverable operations, not a mandatory monolithic agent workflow.
A human can author a project directly; an agent can start from an existing draft;
the engine can validate or rebuild without generating a new story.

### A concrete flagship experience

A researcher supplies two compatible riverbank observations, field photographs,
and the intent to explain change. Their coding agent uses MapBard to establish
comparability, compute a documented change measure, and propose scenes. The author
inspects a claim's evidence, adjusts framing visually, then asks the agent to
change the comparison while preserving the introduction and captions.

The engine recomputes affected results, catches inconsistent scales or stale
claims, previews the repaired scenes, and exports a portable story. An evidence
inspector explains calculations and qualifications without overwhelming the reader.

This is a target, not a working demo. The Yangtze riverbank case is preferred only
if suitable, usable data exists. Begin with a smaller verified vector comparison
if necessary; never invent observations to fit the demonstration. Later cases
should cover socioeconomic comparison and movement/flow.

### Refinements that define the experience

- **Investigate before writing:** filtering, aggregation, ranking, normalization,
  spatial relationships, and comparable-period changes produce real findings.
  Start with a small typed operation set, not unrestricted generated execution.
- **Compile design explicitly:** transform author intent into resolved scales,
  breaks, legends, annotations, cameras, and interactions. Unsupported requests
  produce diagnostics rather than silent visual substitutions.
- **Direct attention:** establish context, reveal a pattern, compare, follow a
  progression, explain an exception, and synthesize. Coordinate maps, media, and
  limited linked charts. Annotations and legends are first-class design elements.
- **Revise precisely:** stable IDs, scoped changes, locks, reviewable diffs, undo,
  and dependency invalidation preserve author work. A full branching tree can wait.
- **Explore without losing meaning:** distinguish presentation controls from
  changes to data scope; update affected facts or enter an explicit exploration
  state with a return to the authored story.
- **Check and repair:** combine structural, evidence, cartographic, runtime, and
  presentation checks. Repairs are bounded and local; visual critique is advisory.
- **Broaden comparison selectively:** bring two compatible vector snapshots
  forward; defer general temporal playback, raster pipelines, and complex GIS.

### Portability and extensibility

The editable project and the publication are different artifacts. A project
retains resources or resolvable references, transformations, evidence, narrative,
assets, design, and version information. A publication is built from that project.

Keep a small-story export that works from `file://` with local assets. A separate
optimized static-host target may support larger stories. State external asset
dependencies explicitly; remote media is not available offline by magic.

Agents and Studio must share project state. Arbitrary edits to generated HTML/JS
do not automatically round-trip into the structured project. Supported custom
themes, scenes, and interactions should declare parameters and capabilities;
unknown extensions should be preserved or diagnosed, never silently discarded.

### Hub and community horizon

Start with curated examples and inspectable, remixable projects. Reusable story
recipes combine analysis requirements, narrative structure, and design choices;
dataset substitution should trigger compatibility checks. Show attribution and
reuse conditions, and separate public story assets from restricted source data.

Hosted Studio, team features, feeds, and a full Hub are later possibilities.
Marketplace, payment, pricing, and commercialization planning are deferred and
are not success criteria for the current work.

## Decisions revised from the first plan

| Earlier assumption                                 | Revised direction                                                                  |
| -------------------------------------------------- | ---------------------------------------------------------------------------------- |
| MapBard owns the primary agent conversation        | Users' coding agents are first-class; the built-in planner is optional             |
| One progressively filled object for everything     | One semantic center with typed analysis artifacts and compiled render output       |
| Static technique lookup is sufficient              | Rules need prerequisites, alternatives, explanations, and capability checks        |
| CLI first, visual authoring only after the MVP     | CLI/SDK and a narrow local workbench support one early authoring loop              |
| Branch trees precede other editing work            | Reliable scoped revisions, locks, and undo come first                              |
| All temporal work waits                            | Limited, comparable vector snapshots can enter the initial slice                   |
| Every story embeds everything                      | Preserve portable small-story export; design an explicit larger static-host target |
| Validation primarily checks schema shape           | Also check evidence, cartography, interaction, and presentation                    |
| More geographic dimensions indicate better stories | Evaluate appropriate reasoning and reader understanding                            |
| Evaluation is a late phase                         | Build fixtures, diagnostics, and reproducibility into the first slice              |

## How the threads reinforce each other

The open representation and engine make the research reproducible. The agent
toolkit tests whether the contract can guide an external authoring system. The
workbench tests whether humans can understand and control that representation.
The same claims, diagnostics, edits, and outputs supply evaluation artifacts.
Future remixing tests whether techniques transfer across datasets.

## Next planning boundary

The old Phase A M0–M4 work is a reusable baseline, not a completed new product.
M5–M7 were never started and their execution order is superseded. Session 09 turned
[refinement-roadmap.md](refinement-roadmap.md) into the
[stage sequence](implementation-stages.md), detailing only [Stage 1](stage-1-plan.md).
Stage 1 is next and not started. Its first gate freezes exact contracts after case
and runtime spikes; later stages are detailed only when their predecessor closes.
This document does not start those stages or declare a new schema/API delivered.

## Architectural references from the direction discussion

These inform design choices; they do not establish research novelty or commit us
to dependencies. Technical adoption still requires a focused evaluation.

- [Vega-Lite](https://vega.github.io/vega-lite/docs/): declarative specification and compilation.
- [Observable Notebook Kit](https://observablehq.github.io/notebook-kit/kit): editable local artifacts, preview, and static publication.
- [Remotion Studio](https://www.remotion.dev/docs/terminology/studio): a visual workbench within developer tooling.
- [DuckDB Spatial](https://www.duckdb.org/docs/lts/core_extensions/spatial/overview): a candidate embedded analysis engine.
- [ArcGIS StoryMaps AI](https://doc.esri.com/en/arcgis-storymaps/latest/learn/arcgis-storymaps-assistant.html) and [cinematic spatiotemporal storytelling research](https://arxiv.org/abs/2510.17301): related capabilities to examine in a full landscape review.
