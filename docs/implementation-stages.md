# MapBard — Implementation Stages

Updated 2026-10-20, Session 32 S1-W4-C browser findings.
**Stage 1 Wave 1 handoffs complete (Sessions 11–13); G1 CLOSED and Wave 2
handoffs complete (S1-W2-A/B/C in Sessions 21–23). G2 CLOSED in Session 24;
Wave 3A/B/C closed in Sessions 26–28; G3 CLOSED in Session 29. Wave 4 A/B closed
in Sessions 30–31; W4-C's Session 32 reader review found defects. G4 correction
and retest remain.
No complete Stage 1 publication capability is delivered yet.**
The [G1 record](stage-1/g1-review.md) freezes the g1-r1 contract decisions,
records source acquisitions and accepted bounded Potomac comparability, and
selects the runtime build approach after the direct-file browser report.
Only its [wave/session plan](stage-1-plan.md) is detailed. This does not resume
old M5.

The [G2 record](stage-1/g2-review.md) integrates public project contracts,
load/import/validation and the dedicated player asset build. All 89 tests pass;
the compiled player's browser acceptance still waits for Wave 4 review.
S1-W3-A is recorded in [the compiler handoff](stage-1/w3-a-handoff.md)
and S1-W3-B in [the playback handoff](stage-1/w3-b-handoff.md). S1-W3-C is in
[the publication handoff](stage-1/w3-c-handoff.md). The
[G3 review](stage-1/g3-review.md) records public composition and releases Wave 4.
The [W4-C browser record](stage-1/browser-checks.md) reports wheel-navigation,
geographic-context and presentation defects from the compiled direct-file page;
the user selected a credited local offline context map for G4 correction.

Read this alongside the [product direction](mapbard-plan.md),
[architecture](mapbard-build-guide.md), [refinement inputs](refinement-roadmap.md),
and [actual build log](BUILD_LOG.md). The historical M0–M4 baseline is retained;
M5–M7 remain unstarted and superseded.

Use [the refinement idea register](refinement-ideas.md) as a coverage checklist
when detailing each stage: map relevant R IDs to work or record an explicit
deferral. Its stage mappings are explanatory and do not widen the gates below.

## Idea-review decisions

Reviewing R01–R40 did not expose a dependency requiring stage reordering. The main
gaps were ideas mentioned as principles without an owner, contract or observable
acceptance case. This revision makes these additions explicit:

- Stage 1 adds an author/audience question to case selection, minimum feature-based
  attention and comparison references, declared measurement overrides, and a
  reproducible verification record. These refine existing sessions and gates;
  they do not add waves, a general profiler, analysis engine or agent framework.
- Stages 2–3 add the unsupported-trend → defensible-comparison example as an
  evidence-sufficiency and authoring acceptance case. Stage 6 reuses it for the
  built-in harness. Only the authoring interfaces propose revised prose.
- Stage 3 makes denominator-sensitive revision and shared portable skill material
  explicit. Stage 4 inspects the same attention, measurement and evidence state.
- Stage 5 separates inspectable evidence from data-changing controls and requires
  a portable execution strategy for the latter. Research instrumentation starts
  in Stage 1; the comparative pilot still belongs to Stage 5.

The coverage table below assigns every R ID. Inclusion in a plan is not delivery.
Later-stage additions are acceptance threads, not detailed wave/session plans.

## Execution convention

- A **stage** delivers a bounded user outcome and closes against recorded evidence.
- A stage contains several sequential **waves**, separated by integration gates.
- A wave contains multiple **sessions** that can execute in parallel against the
  same frozen inputs, with disjoint write ownership. They are implementation work
  units, not MapBard product agents and not automatically created Codex tasks.
- Plan IDs such as `S1-W2-B` identify work; actual `BUILD_LOG` Session NN numbers
  identify executions. Record both when work starts. Retries retain the plan ID.
- A coordinator opens the stage, assigns ownership, integrates each wave, and
  records gate evidence. Gate work is sequential and is not another parallel wave.
  A failed gate blocks dependent waves; independent diagnostics may continue.
- Only after stage N closes does its coordinator detail stage N+1 using observed
  code, fixture results, unresolved issues, and updated estimates. Later rows below
  are roadmap threads, not ready-to-run backlogs.

Parallelism describes safe work boundaries, not mandatory simultaneous execution.
If fewer sessions can run at once, serialize within the wave without changing its
gate. Shared files, manifests, barrels, lockfiles, and the journal have one owner
at a time. Never treat an uncommitted shared checkout as an isolated branch.

## Stage sequence and acceptance gates

Stage 1 is **IN PROGRESS**; Stages 2–6 are **NOT STARTED**. Stage 1 is detailed;
Stages 2–6 are outlines.
The first product acceptance review occurs in Stage 5. The optional built-in agent
follows in Stage 6 and does not gate the external-agent product.

| Stage                                                | Intended user outcome                                                                                                                                                  | Entry/dependency                                                                                  | Exit evidence and planning handoff                                                                                                                                                                                                             |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Trustworthy project and publication**           | An author can load a versioned local project, compile a bounded vector comparison, inspect actionable diagnostics, and export faithful local playback without a model. | Existing baseline and the detailed plan; first wave selects a real case and freezes contracts.    | Preserved legacy example, audited real case, explicit version handling, tested compiler/runtime agreement, safe assets, and actual browser/offline checks. Only then detail Stage 2.                                                           |
| **2. Reproducible findings and evidence**            | An author can recompute a real finding, attach qualified evidence to scenes, and see when a changed source invalidates it.                                             | Stage 1 closed; source identity, supported comparisons and compiler boundary usable.              | One calculation reproduced from pinned inputs; claim/result/feature links inspectable; units and comparability explicit; changed inputs invalidate dependents; qualified claims survive export. Then detail Stage 3.                           |
| **3. External-agent authoring and precise revision** | A fresh coding-agent session can inspect, author, preview, diagnose, revise, and export using documented operations while preserving author work.                      | Stage 2 closed; evidence and dependency semantics tested.                                         | One Codex integration completes creation/revision/error recovery without private imports or built-in model calls; locks, conflicts, undo and invalidation demonstrated with recorded diffs. Then detail Stage 4.                               |
| **4. Shared local visual workbench**                 | An author can inspect evidence/design and adjust a scene visually in the same project used by their agent.                                                             | Stage 3 closed; stable operation and edit protocol.                                               | Visual camera/style edit survives subsequent agent edit and reverse order; stale base revision is rejected; preview and disk state agree; basic keyboard/responsive checks pass. Then detail Stage 5.                                          |
| **5. Meaningful interaction and product evaluation** | A reader can explore a supported data-scope change without seeing misleading stale claims; an author can complete the first product loop.                              | Stage 4 closed; shared project and revision path proven.                                          | Reader control updates qualified facts or visibly enters exploration with return to authored state; full first-slice envelope passes; usability/research pilot records failures and bounded claims. Then detail Stage 6.                       |
| **6. Optional built-in agent**                       | A user can use MapBard's own single-LLM authoring loop over the same engine and project.                                                                               | Stage 5 closed; engine operations, portable skills, edit protocol and evaluation fixtures stable. | Scripted and opt-in live runs cover skill loading, tool feedback, waiting/completion, budgets, cancellation and resume without repeated mutations; engine-only workflow remains independent. Later expansion requires a new planning decision. |

## Later-stage threads — intentionally not wave/session plans

### Stage 2 — Reproducible findings and evidence

Likely ownership: `schema` for analysis/result/claim contracts, `core` for bounded
execution and dependency tracking, `knowledge` for justified design requirements,
and `renderer` for evidence presentation. Select the minimum operation set from
the actual Stage 1 case: compatible attribute change or a documented geographic
measure, plus only necessary selection/aggregation. DuckDB Spatial remains a
candidate; compare it with a focused implementation when the method is known.

Version new artifacts explicitly; retain Stage 1 projects and migrate only when
necessary, with a report. Fixtures should include a hand-checkable result, missing
values, incompatible observations, changed input fingerprints and an interpretation
that must not be presented as a computed fact. Verify determinism, units,
denominators, stale dependencies, and browser-visible qualifications. Exclude a
general GIS/query platform, causal inference, raster processing and unrestricted
generated execution. Method choice, exact schemas and session breakdown wait for
Stage 1's closure.

Carry R11–R18 into the exit criteria: distinguish observation, computed finding,
interpretation and cited context, and expose a trace from claim to source selection,
operation/result, units and qualifications. Extend Stage 1's declared measurements
only as required by the selected calculation. Evidence inspection should be
available in the publication as well as authoring tools; a reader need not change
data scope merely to inspect provenance. Ship prepared results without requiring
an analysis service for local playback (R09/R17).

Add an insufficient-evidence fixture (R16): a requested trend with observations
that do not support that inference. Engine operations report the failed
comparability/method prerequisites and available supported facts; they do not
invent an alternative conclusion or rewrite narration. Record when a descriptive
comparison is justified and when more data is required. This is a handoff to
Stage 3's authoring evaluation, separate from general natural-language fact checking.

### Stage 3 — External-agent authoring and precise revision

Likely ownership: `core` edit/operation services, `cli` human and structured access,
`schema` operation/change results, and repository toolkit guidance with portable
domain references. Start with Codex as the first tested host, using CLI/SDK
operations; add MCP only if a demonstrated access need justifies it.

Expose capabilities, inspect, analyze, validate, compile, preview, check and export;
add scoped patches with stable IDs, base revision, locks, reviewable changes, undo
and dependency invalidation. Structured results need version/status, IDs, artifact
references, diagnostics, output limits and documented exits. Final names and
protocols are deferred. Existing projects remain readable; edit metadata must not
be required by the published player. Verify creation, a locked-introduction
revision, conflicting edits, and recovery from a deliberate error with bounded
repairs. Exclude multiple host integrations, mandatory MCP, elaborate branches
and a built-in model loop.

Make two acceptance scenarios explicit (R06/R16/R28/R29/R33): an external agent
responds to the insufficient-evidence fixture with a materially different,
supported story angle or a request for missing input; and a scoped revision
changes a comparison's denominator while preserving locked introduction/captions.
For the latter, use the selected case's normalization operation if applicable;
otherwise use a small labeled synthetic edit fixture and implement only the
normalization needed for that test. Do not expand the case into general GIS.
Recompute/invalidate affected results and scales, show the diff and verify undo.
Never silently change the author's intent or force an unsupported alternate story.

Version the portable domain references and diagnostic remedies once, with a thin
Codex wrapper; reserve host-specific invocation details for that wrapper. Record
loaded skill/reference versions and observed tool actions in authoring evaluations,
including bounded failure and unresolved issues. Stage 6 should reuse these assets
and scenarios rather than inventing a second set of geographic rules.

### Stage 4 — Shared local visual workbench

Plan a dedicated workbench boundary consuming the existing operation surface;
decide its package, UI framework and local transport when Stage 3 closes. Scope
to scene outline, preview, evidence/design inspector, camera and limited style
edits, and change review. Retain file-based projects and compare-and-swap revision
checks; do not give the UI a separate canonical document or parser.

Verify round trips, conflicting disk changes, cancellation/error presentation,
locks, undo, keyboard use and narrow screens. The same project should still work
without the workbench. Exclude hosted accounts, collaborative real-time editing,
a desktop shell requirement and a full GIS editor.

The inspector must expose the same source/feature attention references, comparison
members, measurement overrides and evidence qualifications that agents read
(R12/R15/R27/R29). Camera/style manipulation must not erase them or create an
editor-only source of truth. Test the register's framing-edit → agent-comparison
revision → reopen sequence and the reverse order, with locked captions intact.

### Stage 5 — Meaningful interaction and product evaluation

Likely ownership: semantic control contracts and invalidation in `schema`/`core`,
playback in `renderer`, authoring through the established toolkit/workbench, and
evaluation fixtures/reports. Introduce one justified time/population/geography
selection. Choose recomputation or explicit exploration according to the actual
operation's cost and meaning; visible return to authored state is required.

Retain prior projects without semantic controls. Verify that facts and annotations
cannot silently outlive the scope supporting them. Exercise the roadmap's full
acceptance envelope, including supplied media, targeted revisions and portable
export. Plan a small usability/research pilot with comparable data/tools/model
budgets, component ablations, author correction effort, reader comprehension,
cartographic review, repeat runs and recorded failures. Set sample sizes and
thresholds during this stage's planning, before running the pilot; do not claim
research efficacy from a functional demo. Exclude broad dataset expansion until
the first slice passes, and exclude claims that visual AI critique certifies truth.

Distinguish three reader actions (R30/R31): presentation-only changes, opening
evidence explanations already delivered in Stage 2, and changing the comparison
scope introduced here. For the last, plan a finite set of prepared results or
bounded local recomputation; otherwise show explicit exploration with a return
to the authored story. Do not make the portable story depend on a hidden analysis
server. Test visible facts, units, qualifications and annotations in every supported
state. An opacity slider alone does not satisfy meaningful reader agency.

Use the earlier verification records and representation rationale as pilot inputs
(R01/R34–R36). Establish the related-work scope and controlled ablation hypotheses
before drawing novelty/efficacy conclusions. Human interpretation/cartographic
judgment remains separate from deterministic checks. Consider one linked chart or
additional scene pattern only if the first case demonstrates a communication need
(R22/R24); it is not an automatic release requirement and needs an explicit
scope/verification decision during Stage 5 planning.

### Stage 6 — Optional built-in agent

Create a dedicated agent boundary, separate from the engine and publication.
Keep the settled architecture: one LLM, stable system prompt, dynamically loaded
skills, and a purpose-built harness. Reuse the existing provider adapter where
compatible; no LangGraph-style framework or specialized-agent team.

Initial responsibilities are bounded author/revise/repair on one project, using
existing operations. The system prompt owns role, evidence rules, discovery and
stop conditions. Skill metadata is discoverable initially; load content/resources
on demand from a versioned allowlist, sharing domain material with the external
toolkit. Tool inputs/results use the same schemas and revision checks. Keep a
bounded context of current project summaries, diagnostic references and loaded
skills; store observable actions and checkpoint IDs, not hidden reasoning.

The harness needs running/waiting/completed/failed/cancelled states, configured
turn/token/time/repair ceilings, and explicit user interruption. Persist tool-call
identity and outcome before continuing so resume reconciles uncertain mutations
against project revisions instead of replaying them blindly. Skills grant no
permissions; untrusted project content remains data. Numeric budgets, storage
schema, provider tool-call adaptation and UI integration are deferred until this
stage is planned. Use scripted model/tool responses for routine tests and a
separately configured live-provider check for integration. Exclude multiple
providers, autonomous background work, distributed orchestration and general
execution of generated code. These are scope decisions, not delivered APIs.

Reuse Stage 3's evidence-redirection and denominator-revision scenarios, the same
versioned skill material, and the same observable outcome checks (R06/R16/R28).
Valid stopping outcomes include a supported changed narrative, a justified wait
for data, or an explicit unresolved diagnostic. Waiting/failure must remain
distinct from successful completion; generating fluent prose alone is not success.

## Coverage and deferred horizons

| Refinement concern                                   | First delivery gate                 | Subsequent proof                                               |
| ---------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------- |
| Portable format, migrations, source identity         | Stage 1                             | Evidence artifacts in 2; edit metadata in 3                    |
| Compiler/runtime fidelity, legends, attention, media | Stage 1, bounded vocabulary         | Evidence-aware design in 2; broader patterns only as justified |
| Analysis, provenance, qualifications, staleness      | Stage 2                             | Revision in 3; reader scope in 5                               |
| External agent, structured operations, local repair  | Stage 3                             | Workbench parity in 4                                          |
| Shared edits, locks, undo, conflicts                 | Stage 3                             | Bidirectional visual/agent round trip in 4                     |
| Reader agency and first product envelope             | Stage 5                             | Further cases after evaluation                                 |
| Single-LLM internal harness                          | Stage 6                             | Optional authoring path, never engine dependency               |
| Reproducibility and evaluation                       | Fixtures and failure records from 1 | Full pilot in 5; harness-specific checks in 6                  |

### R01–R40 planning disposition

Each row records a minimum commitment or a reason for deferral. Stage 1 owners use
the session IDs in [its detailed plan](stage-1-plan.md); later stages remain outlines.
No idea is marked implemented by this mapping.

| ID  | Planning home and minimum acceptance                                                                                                              | Boundary / deferred remainder                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| R01 | S1-W1-B explains why slice contracts represent content/discourse/attention; Stage 5 tests stated hypotheses.                                      | A design rationale is not a novelty claim; full landscape review/pilot waits for Stage 5.            |
| R02 | S1-W1-A records creator, audience, question, available evidence and a useful first-story outcome; W4 reviews against it.                          | Do not select a case solely because it is easy to render; no broad user study in Stage 1.            |
| R03 | Stage 1 format/engine → Stage 3 toolkit → Stage 4 peer workbench.                                                                                 | Shared artifacts first; no separate host/editor document model.                                      |
| R04 | Stage 3 fresh Codex session completes documented author/revise/recover loop without MapBard model/account.                                        | Additional hosts wait until the first integration works.                                             |
| R05 | Stage 6 single-LLM harness over shared operations, with wait/cancel/resume tests.                                                                 | Never an engine dependency; no specialized-agent framework.                                          |
| R06 | Stage 3 versions portable skills/references and validates discovery/repair; Stage 6 reuses them.                                                  | No giant static prompt or duplicate geographic rules per host.                                       |
| R07 | Stage 3 CLI/SDK structured outcomes, bounded output, clear exits and public contracts.                                                            | MCP only if access needs justify a thin wrapper.                                                     |
| R08 | Stage 1 compilation and export run without credentials/model calls; Stages 2–3 preserve this.                                                     | Optional provider refactoring belongs to Stage 6, not the engine foundation.                         |
| R09 | S1-W2-B/W3-C/W4 verify editable-project relocation separately from publication portability.                                                       | Larger static-host export remains a later horizon.                                                   |
| R10 | S1-W2-A/B preserve optional opaque extension data and diagnose missing required extensions.                                                       | Custom execution/themes/components need a later explicit capability/trust design.                    |
| R11 | Stage 2 claim → selected source/result/context trace, inspectable with qualifications.                                                            | Stage 1 annotations are not evidence certification.                                                  |
| R12 | S1-W1-B/W2-A/W3-A/B bind annotation targets to source/feature IDs and comparison members; Stage 2 links evidence.                                 | Arbitrary regions, target inference and a general attention grammar wait for demonstrated need.      |
| R13 | Stage 1 records case limits and declared units; Stage 2 types claims/qualifications; Stage 5 preserves them across reader states.                 | Provenance never establishes causal truth automatically.                                             |
| R14 | Stage 2 selects and tests only operations needed for the real finding.                                                                            | Broad filter/join/distance/area operator catalogs are not Stage 1 work.                              |
| R15 | S1-W1-B/W2-A/B/W3-A record inferred versus declared measurement, units and overrides and reject unmet encoding prerequisites.                     | Rich statistical profiling and geographic calculations remain Stage 2 choices.                       |
| R16 | Stage 2 exposes insufficient evidence; Stage 3 tests alternate angle or request for data; Stage 6 reuses scenario.                                | No automatic intent replacement or branch-tree UI.                                                   |
| R17 | Stage 2 compares focused analysis with an embedded-engine candidate against the selected method.                                                  | DuckDB Spatial is not selected; playback must not require an analysis service.                       |
| R18 | Stage 1 records fingerprints and detects stale build inputs; Stage 2 result dependencies; Stage 3 edit invalidation.                              | A general dependency graph/service is unnecessary in Stage 1.                                        |
| R19 | S1-W2-A/W3-A/C establish versioned compile → generate → write boundaries with deterministic fixtures.                                             | Compiled rendering is derived, never canonical authoring content.                                    |
| R20 | S1-W3-A records prerequisites, rationale and a supported alternative or missing requirement in diagnostics.                                       | Rules do not autonomously redesign a story; broader techniques wait.                                 |
| R21 | S1-W1-C/W2-C/W3-B deliver and test the TypeScript player/build path.                                                                              | Preserve MapLibre/scrollama unless the spike demonstrates a need to change.                          |
| R22 | S1-W4-A/C check context → comparison → synthesis against the author question and attention targets.                                               | Progression/drill/exception/reveal breadth follows evidence and a scoped need, not dimension counts. |
| R23 | S1-W3-A/B align scales, text annotation targets and generated legends.                                                                            | Brackets, drawn highlights and rich callouts are deferred beyond the minimal text-anchor vocabulary. |
| R24 | Stage 1 retains purposeful supplied panel/anchored media and credits; Stage 5 reviews any chart need.                                             | Linked charts remain conditional; no chart engine in Stage 1.                                        |
| R25 | S1-W1-A audits compatible vector views; Stage 2 computes a justified change if supported.                                                         | No general temporal/raster processing or time-slider platform.                                       |
| R26 | S1-W3-C/W4 test safe paths/posters/credits/missing files and network requirements.                                                                | PMTiles needs a separate verified access/export strategy.                                            |
| R27 | Stage 4 delivers a limited peer workbench over existing operations and shared state.                                                              | No hosted Studio, full GIS editor or mandatory desktop shell.                                        |
| R28 | Stage 3 tests denominator-sensitive revision, locks, diff, undo and affected dependencies.                                                        | No whole-story regeneration or elaborate branching as a prerequisite.                                |
| R29 | Stage 4 proves both edit orders and conflict detection using Stage 3's revision rules.                                                            | No editor-private canonical data; concurrent collaboration is later.                                 |
| R30 | Stage 2 exposes evidence inspection; Stage 5 adds one meaningful data-scope question.                                                             | Paint-property controls alone do not meet the acceptance condition.                                  |
| R31 | Stage 5 checks all linked facts/annotations through scope change and return to authored state.                                                    | Bounded prepared/local results or explicit exploration; no hidden mandatory server.                  |
| R32 | Stage 1 categorizes actual checks and records browser/accessibility outcomes; later stages add evidence/interaction checks.                       | Not-run and manual judgment stay distinct from pass.                                                 |
| R33 | Stage 1 diagnostic path/ID/remedy; Stage 3 local bounded repair; Stage 6 harness stopping behavior.                                               | Screenshot/model critique remains advisory and optional.                                             |
| R34 | Stage 1 retains reusable positive/negative fixtures; Stage 5 defines and runs controlled comparisons.                                             | No pilot outcome or ablation efficacy claimed before evaluation.                                     |
| R35 | S1-W4-C reviews purpose, attention and pacing; Stage 3 measures unintended edits/repair; Stage 5 reader/author outcomes.                          | No proxy scoring by schema-dimension or control count.                                               |
| R36 | S1-W1-C/W4-A/B/C establish repeatable local verification records; later stages add observable model/tool budgets.                                 | No telemetry platform or hidden-reasoning logs.                                                      |
| R37 | S1-W1-A selects one audited useful case, with a documented simpler fallback.                                                                      | Socioeconomic/movement cases wait until the first product slice passes.                              |
| R38 | All Stage 1 gates preserve inward dependencies, explicit migrations and a runnable legacy example.                                                | No sunk-cost requirement to preserve silent misrendering in the new path.                            |
| R39 | Confirmed later community / market center retains inspect → remix → compatibility check → publish and recipe examples, after the local pipeline.  | Detailed hosted reuse scope follows the first trustworthy local project loop.                        |
| R40 | MapBard-hosted upload, serving, and visualization of user-written story pages, with community / market discovery, is confirmed for a later phase. | Pricing, payments, and commercialization remain deferred; detailed mechanics are unplanned.          |

The confirmed community / market center, larger static-host exports/tiles, richer
extension execution, hosted collaboration and additional datasets remain outside
Stages 1–6 and must be planned after the local authoring pipeline. General
raster/temporal GIS, RAG infrastructure, elaborate branching, pricing, payments,
and commercialization are outside this sequence. Do not turn later capabilities
into Stage 1 requirements. Session 08's register is complete; Session 10 maps its
ideas above. Keep IDs and reasons when later planning revises a disposition.

## Stage closure and replanning rule

The closing record must list delivered contracts and migrations, fixture/source
identity, check results (pass/fail/skipped/manual judgment), unresolved defects,
changed assumptions, R-ID dispositions with evidence links or deferral reasons,
and the exact next-stage entry conditions. A blocked browser
check or missing real dataset remains an open gate, not a pass. Only then write
the next detailed plan and update the journal banner. Do not preallocate future
session numbers, promise dates from untested estimates, or auto-start all stages.
