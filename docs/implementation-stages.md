# MapBard — Implementation Stages

Updated 2026-10-17, Session 09. **Planning complete; implementation not started.**
Stage 1 is the next planned stage. Only its [wave/session plan](stage-1-plan.md)
is detailed. Nothing here marks a new capability delivered or resumes old M5.

Read this alongside the [product direction](mapbard-plan.md),
[architecture](mapbard-build-guide.md), [refinement inputs](refinement-roadmap.md),
and [actual build log](BUILD_LOG.md). The historical M0–M4 baseline is retained;
M5–M7 remain unstarted and superseded.

Use [the refinement idea register](refinement-ideas.md) as a coverage checklist
when detailing each stage: map relevant R IDs to work or record an explicit
deferral. Its stage mappings are explanatory and do not widen the gates below.

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

All stages below are **NOT STARTED**. Stage 1 is detailed; Stages 2–6 are outlines.
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

Hub/remixing, larger static-host exports/tiles, richer extension execution, hosted
creation/collaboration and additional datasets remain unnumbered future threads.
General raster/temporal GIS, RAG infrastructure, elaborate branching, marketplace
and commercialization are outside this sequence. Do not turn every recorded idea
into a Stage 1 requirement. Consult any completed Session 08 idea register when
opening Stage 1 and record coverage/deferment without expanding scope silently.

## Stage closure and replanning rule

The closing record must list delivered contracts and migrations, fixture/source
identity, check results (pass/fail/skipped/manual judgment), unresolved defects,
changed assumptions, and the exact next-stage entry conditions. A blocked browser
check or missing real dataset remains an open gate, not a pass. Only then write
the next detailed plan and update the journal banner. Do not preallocate future
session numbers, promise dates from untested estimates, or auto-start all stages.
