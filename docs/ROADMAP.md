# MapBard — Product Roadmap

Updated 2026-10-20 (process reset). Current state lives in [STATUS.md](STATUS.md).
The active milestone plan is [M1 — CLI and foundation](m1-cli.md); the visual
direction is [the visual engine plan](visual-engine.md). Earlier stage/wave/gate
plans are archived in [archive/2026-10-20-process-reset/](archive/2026-10-20-process-reset/README.md).

## What MapBard is

**Cinematic map stories where every number is traceable, authored with your own
coding agent.**

A creator brings geographic data, photos or video, and an intent. Their coding
agent (Claude Code, Codex, …) drives the `mapbard` CLI to inspect the data,
write the story, preview it live, fix diagnostics and publish a static site. The
published story should look like it came from a newsroom graphics desk: real
basemaps, terrain, 3D and motion. Every figure in it is bound to the data that
produced it.

Product comes first. The research thread (a paper on geographic narrative
representation) is deferred, not abandoned. The fixtures, diagnostics and
reproducible builds we keep producing are its future evaluation material.

### Who it serves first

Data journalists, researchers, analysts and educators who have their own data
and use a coding agent. A human can still author directly, because the project
is plain files and the CLI is human-friendly.

### Positioning

| Alternative                           | What they do well           | What MapBard does differently                                                    |
| ------------------------------------- | --------------------------- | -------------------------------------------------------------------------------- |
| ArcGIS StoryMaps, Mapbox storytelling | Polished editors/templates  | Agent-native CLI, plain-file projects, no account, open-source stack             |
| Flourish, Datawrapper                 | Fast charts and simple maps | Cinematic 3D/terrain/motion and full geographic stories                          |
| Hand-built scrollytelling (newsroom)  | Unlimited visual ceiling    | Comparable visual quality in hours, with checked encodings and traceable numbers |

## Principles

1. **A project is a folder of plain files.** Agents and humans edit the same
   authored files. The CLI owns derived state (lockfile, hashes, profiles), so
   nobody hand-edits a digest.
2. **Deterministic engine, no model required.** Agents propose content and
   design. The engine validates, compiles and renders it. Generated HTML/JS is
   never canonical.
3. **Every number is traceable.** Narrated figures come from data bindings or
   computed results, and the linter flags literal numbers that disagree with the
   data (M3).
4. **Spectacle serves the claim.** 3D, motion and effects are welcome, but the
   critic flags dishonest encodings: unnormalized extrusions, truncated scales,
   classes that hide the story's own contrast, and occluded targets.
5. **Capabilities are real or diagnosed.** Every catalog technique compiles,
   plays and has a screenshot test. Unsupported requests get an actionable
   diagnostic, never a silent substitution.
6. **Open source only.** Runtime and build dependencies must be MIT, BSD, ISC
   or Apache-2.0 (fonts may be OFL). No proprietary SDKs. No service that needs
   an API key is required.
7. **Online by choice, offline by option.** Free keyless tile providers supply
   basemaps and terrain, declared as network requirements. `build --offline`
   produces a self-contained story with local context layers.
8. **Screenshots are tests.** Visual changes ship with headless-browser
   screenshots and checks, not only unit tests.

## Milestones

Each milestone has one short plan document, written when it becomes active.
Work proceeds in small, committed increments. There are no waves or gates; a
milestone closes when its acceptance list passes and STATUS.md says so.

| #      | Milestone                 | Outcome                                                                                                                                                        | Status   |
| ------ | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| **M1** | CLI and foundation        | `mapbard` CLI and agent skill pack, format 0.2 with a CLI-managed lockfile, live preview, free online basemaps, legacy code retired. [Plan](m1-cli.md)         | **Next** |
| **M2** | Visual engine             | Multi-tier renderer (MapLibre + deck.gl + three.js), cinematic camera/scroll motion, technique catalog v1, layouts/themes, visual QA. [Plan](visual-engine.md) | Planned  |
| **M3** | Evidence-bound narration  | Computed results, `{{bindings}}` in narration/annotations, number linter, evidence popovers, staleness on data change                                          | Planned  |
| **M4** | Showcase and recipes      | 3–5 flagship stories (hydrology, socioeconomic, movement/flows, urban 3D, terrain); reusable recipes; landing page                                             | Planned  |
| **M5** | Local workbench           | Browser workbench over the same project: scene outline, live preview, camera capture, style tweaks, evidence inspector                                         | Outline  |
| **M6** | Built-in agent            | One LLM + system prompt + dynamically loaded skills + purpose-built harness, reusing the CLI operations and the M1 skill pack                                  | Outline  |
| **M7** | Community center (hosted) | Upload, serve and discover stories; remix recipes; attribution and reuse terms                                                                                 | Outline  |

M2 and M3 can run in parallel once M1 lands format 0.2 and the CLI, because
they touch different parts (renderer/player vs core analysis/bindings).

### M3 — Evidence-bound narration (summary)

This is a slimmed version of the archived Stage 2. Its hand-checked oracle is
kept as [fixtures/potomac-change/method-case.json](../fixtures/potomac-change/method-case.json).

- A small typed operation set: value lookup, signed change, percent change,
  ratio/normalization, rank, aggregate (sum/mean/min/max) by group. Results are
  stored in the lockfile with input hashes.
- Bindings in narration, annotations and legends, for example
  `{{value potomac-2025 USGS-01613000 daily_mean_discharge}}` and
  `{{change hancock-change}}`, with number/unit formatting rules. The build
  fills them in, so the authored text never contains a stale figure.
- The number linter warns when narration contains a literal number that
  matches no bound value (with tolerance and units), and `mapbard explain
<claim>` prints the trace.
- Reader evidence popovers: clicking a bound number shows its source, operation,
  inputs and qualifications. Offline-capable, no analysis runtime in the page.
- Staleness: a changed source hash, declaration or operation invalidates
  results, and `check` blocks publishing stale bound claims.
- An insufficient-evidence diagnostic (two snapshots requested as a "trend")
  reports what is supported instead of inventing a conclusion.

### M4 — Showcase and recipes (summary)

Stories are the product's marketing and its hardest test. Each flagship story
must score **≥ 85/100** on the [visual rubric](visual-engine.md#quality-bar),
as judged by the product owner, and pass the visual QA pipeline. Each one adds a
recipe (a scene pattern plus a skill reference) that agents can reuse. The
Potomac story is redesigned first as the M2 acceptance demo.

### M5–M7 (outlines)

- **M5 workbench:** a local browser app talking to `mapbard preview`'s server.
  It edits the same files with revision checks, and its camera capture writes
  keyframes into `story.json`. No editor-private document model.
- **M6 built-in agent:** settled architecture of one LLM, a stable system
  prompt, dynamically loaded skills and a purpose-built harness. No LangGraph-style
  framework or specialized-agent team. The retired DashScope planner is not
  reused. The provider choice is made when M6 starts.
- **M7 community center:** hosted upload/serve/discover for published stories,
  recipe remix, attribution and reuse conditions, and separation of public story
  assets from restricted source data. Commercial terms are deferred.

## Deferred

General raster analytics, unrestricted generated code execution, branching
story trees, real-time collaboration, multiple built-in LLM providers, pricing
and payments, and the research evaluation pilot (it will reuse M1–M4 fixtures).
