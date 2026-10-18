# CLAUDE.md — MapBard

Read [AGENTS.md](AGENTS.md) first. It is the shared repository rulebook for all
coding agents; this file intentionally does not duplicate scope or architecture.

## Resume a session

1. Read the current-state banner and latest actual session in
   [docs/BUILD_LOG.md](docs/BUILD_LOG.md).
2. Read [docs/mapbard-plan.md](docs/mapbard-plan.md) for the research/product story.
3. Read [docs/mapbard-build-guide.md](docs/mapbard-build-guide.md) and
   [docs/refinement-roadmap.md](docs/refinement-roadmap.md) for architecture and planning.
4. Read [the stage roadmap](docs/implementation-stages.md) and the detailed
   [Stage 1 plan](docs/stage-1-plan.md).
5. Inspect working-tree changes and follow the shared session/verification protocol.

## Current transition

The 2026-10-17 direction reset establishes a portable project format, a
model-independent engine, first-class external coding-agent support, and a local
visual workbench. Commercialization is deferred. Stage planning is complete:
Stage 1 — Trustworthy Project and Publication is next and not started. Its four
waves contain parallel sessions with explicit ownership and integration gates.
Later stages remain outlines until the preceding stage closes. Do not automatically
continue historical M5 or begin implementation during a documentation-only task.

The built-in product agent will use one LLM, a system prompt, dynamically loaded
skills, and a purpose-built harness for its agent loop. No LangGraph-style
orchestration framework or fixed specialized-agent team. Read the corresponding
sections in AGENTS.md and the build guide; this runtime is not implemented yet.

The old M0–M4 code remains the baseline. M5–M7 were not started and their old
execution sequence is superseded. The previous version of this file and the
original plans are archived under [docs/archive/2026-10-17/](docs/archive/2026-10-17/).
Those files are historical reference, not active instructions.

Keep durable decisions in the repository. No machine-specific private memory
directory is required to work on MapBard. Existing DashScope configuration and
commands are documented in AGENTS.md; engine independence is a target, not a
claim that the existing planner has already been refactored.
