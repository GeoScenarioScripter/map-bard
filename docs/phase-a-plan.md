# MapBard — Phase A Baseline and Transition

Updated 2026-10-17. **Historical execution plan superseded; Phase A was not completed.**

The original M0–M7 plan is preserved unchanged in
[archive/2026-10-17/phase-a-plan.md](archive/2026-10-17/phase-a-plan.md).
Its imperative instructions and unchecked task lists are historical, not the
current queue. The current direction is in [mapbard-plan.md](mapbard-plan.md) and
[mapbard-build-guide.md](mapbard-build-guide.md). The next planning input is
[refinement-roadmap.md](refinement-roadmap.md).

## Historical milestone status

| Milestone                      | Recorded status at transition    | What that means now                                                                             |
| ------------------------------ | -------------------------------- | ----------------------------------------------------------------------------------------------- |
| M0 — Workspace scaffold        | Done                             | Retain pnpm, strict TypeScript, package boundaries, test/lint tooling                           |
| M1 — GeoNarrative schema       | Done                             | v0.1.0 is the baseline to migrate, not a frozen target                                          |
| M2 — Ingestion/profiling/media | Done                             | Reuse; deepen measurement semantics, analysis, evidence, and path handling                      |
| M3 — Example renderer          | Recorded done                    | Reuse; browser interaction check remains outstanding and runtime capabilities are incomplete    |
| M4 — DashScope Plan            | Recorded done                    | Mock-tested planning baseline; live call remains unverified; becomes an optional authoring path |
| M5 — Rule-based Design         | Not started; sequence superseded | Fold into explicit design compilation and runtime correctness planning                          |
| M6 — CLI wiring                | Not started; sequence superseded | Expand to an agent-independent CLI/SDK operation surface                                        |
| M7 — Real-data MVP             | Not started; sequence superseded | Replace the old gate with the agent/workbench product slice                                     |

No milestone was newly completed by the direction reset. Earlier session records
remain intact in [BUILD_LOG.md](BUILD_LOG.md).

## What changes from the old exit gate

The earlier gate was a one-command real-data story with media and a control.
Those remain useful requirements, but the revised first product also needs
traceable findings, meaningful visual design, external-agent iteration, actionable
diagnostics, precise revision, and a shared local workbench.

The old bans on early Studio work and all temporal work no longer govern the new
planning scope: a narrow workbench and limited compatible vector comparisons are
now candidates for the first slice. General temporal/raster GIS, hosted services,
RAG, and elaborate branching remain deferred.

## What happens next

Plan refactor/refinement/implementation stages using the roadmap. Do not resume
old M5 automatically, restart M0, or mark the new capabilities implemented merely
because they are documented. Stage names, detailed contracts, dependency choices,
and executable task ordering remain to be determined.
