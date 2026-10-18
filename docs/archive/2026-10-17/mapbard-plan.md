# MapBard — Project Plan

*An agent that authors interactive cartographic storymaps from data, text, and intent.*

MapBard is the narrative sibling of MapMate: where MapMate configures map **style** through natural language, MapBard composes a whole **story** — an interactive HTML map narrative — from the resources a user brings. This document holds two interlocking threads: the **paper story** (the research contribution and how it reads) and the **standalone product** (a clean, self-contained build, deliberately *not* wired into the existing platform).

Both threads share one spine: a single formal object, the **geographic narrative schema**, which is simultaneously the paper's contribution and the engineering contract. The guiding test for everything below: *the contribution must survive deletion of the borrowed theory.* If you stripped every reference to geographic scene theory, the schema must still stand on its own derivation.

---

## Thread 1 — The paper story

### One-sentence contribution

A computable intermediate representation for geographic storytelling — a *scene graph* whose nodes carry geographic **content dimensions** bound to data and **discourse dimensions** bound to narrative intent — that lets an agent plan, design, and generate interactive map narratives, and that measurably produces *more geographic* and better-designed storymaps than unstructured LLM generation.

The contribution is the **representation**, not the agent and not the theory. The agent operationalizes it; the theory is one of several influences on it.

### The argument arc

1. **Tension.** Map-based storytelling is exploding on the geoweb, but authoring is manual, expertise-gated, and inconsistent on two axes at once — cartographic and narrative. LLMs already emit HTML, but they treat the map as decoration and the story as prose; they do not reason about *geographic* narrative structure or about whether the data can support the story being told.

2. **Gap.** Three literatures almost touch but never meet. Narrative-visualization and cartographic-storytelling theory (Segel & Heer; Roth) is *descriptive* — it classifies genres and tropes but is neither computable nor generative. GenAI-in-cartography work makes *single maps* and explicitly stops short of deep cartographic reasoning. LLM story generation is *non-spatial*. No one has a computable, generative intermediate representation connecting **what the data affords → what the story needs → how to express it as interactive cartography**.

3. **Move.** Derive the schema from first principles — *what must a geographic story specify?* — and two kinds of dimensions fall out:
   - **Content dimensions** (the geographic substrate): semantics, location/time, geometry, attribute, relationship, process.
   - **Discourse dimensions** (the telling): narrative role, salience/emphasis, viewpoint/camera, reader-agency level.
   - **Inter-scene operators**: sequence, transition, comparison, drill-down, reveal/pacing.

   Geographic scene theory enters *here and only here*: the content dimensions converge with its element set, so we cite it as convergent support, adapt the set (fold shape into geometry, treat time explicitly), and *add* the discourse dimensions and operators a scene ontology does not contain — because a scene ontology describes a **world**, not a **telling**. This is the line that stakes what is ours: the discourse layer and the operators.

4. **Operationalize.** The agentic pipeline produces and consumes the schema across three stages (plan → design → build), each operating *on the schema*. The schema is the thing; the agent is the demonstration.

5. **Prove.** Evaluation is the spine of acceptance (see below), designed as a contribution rather than an afterthought.

6. **Bound it.** Honest limits: cartographic honesty, the weakness of current vision models at fine cartographic judgment, the risk of over-constraining creativity.

### Section skeleton

1. Introduction — tension + gap.
2. Related work — narrative visualization & cartographic storytelling; GenAI in cartography; geographic representation/scene theories (as *one input*). Pinpoint the missing computable generative representation.
3. The geographic narrative schema (**core**) — content/discourse dimensions, inter-scene operators, formal types, data binding, and the **element → technique mapping table** as a centerpiece figure.
4. The agentic pipeline — plan, design, build, each over the schema.
5. Implementation — brief; the standalone system (Thread 2).
6. Evaluation.
7. Discussion & limits.
8. Conclusion.

### Evaluation plan (make-or-break)

- **Ablation as a config switch**, not a second system: full schema vs content-only vs discourse-only vs no-schema (vanilla "make me an HTML storymap"). Isolates what each layer buys.
- **Metrics**
  - *Geographic completeness* — does the story actually use relationship and process, or default to location + attribute like a naive LLM? **This is the headline result**, because it is where the schema earns its keep.
  - *Cartographic design quality* — expert rubric (visual hierarchy, symbol–data fit, legibility, honesty), grounded in Roth and standard cartographic principles.
  - *Narrative quality* — coherence, arc, pacing.
  - *Data–narrative honesty* — count of misleading encodings flagged/avoided.
  - *User study* — comprehension (post-viewing Q&A), engagement (self-report + interaction logs), recall.
- **Case studies** — at least one authentic dataset with a real process dimension (e.g., riverbank-collapse / 崩岸 monitoring along the Yangtze), plus a socioeconomic choropleth-over-time story and a movement/flow story, so the content-dimension profiles differ.
- **The rubric is itself a second citable object.** Publish it.

### Venue framing

Theory-forward and cartography-tilted: IJGIS, *Cartography and Geographic Information Science*, *The Cartographic Journal*, or *Transactions in GIS*. Lead with the **knowledge contribution** (the schema + rubric), keep the system supporting. A standalone, openly releasable artifact (Thread 2) strengthens the reproducibility story.

---

## Thread 2 — The standalone product

Deliberately a **side product**: self-contained, easy to manage, easy to evolve, and decoupled from the existing platform. The priorities are *one clear contract, few moving parts, zero-ops where possible, and portable output*.

### Design goals

1. **One spine.** The geographic narrative schema is the single source of truth, defined once, shared everywhere.
2. **Few parts.** A small monorepo over a sprawling service mesh. Each package has one job.
3. **Zero-ops storage.** No external database cluster; embedded stores that ship with the app.
4. **Portable output.** A finished storymap is a self-contained static bundle that runs anywhere, with no dependency on MapBard itself.
5. **Swappable model.** The LLM sits behind a thin adapter; no lock-in to one provider or to local vs. API.

### Architecture — schema-centered monorepo

A single TypeScript-first monorepo (pnpm workspaces). TypeScript everywhere means the schema's types are shared verbatim between the agent, the studio UI, and the emitted storymap — no drift, no re-modeling.

```
mapbard/
├── packages/
│   ├── schema/      # THE CONTRACT — Zod-defined geographic narrative schema + types
│   ├── core/        # 3-stage pipeline, LLM adapter, tools, data profiling
│   ├── knowledge/   # carto-narrative knowledge base + element→technique table + RAG
│   ├── studio/      # React authoring UI (plan tree, design editor, HITL gates)
│   ├── renderer/    # MapLibre + scrollama storymap template + runtime control panel
│   └── cli/         # headless "resources in → bundle out" (optional, great for eval)
└── docker-compose.yml
```

The `schema` package is the heart; everything depends on it. Versioned schema documents make the **branching plan tree** trivial — a branch is a fork of the JSON, the tree is a version graph (git-like, without needing git).

### Pipeline (three stages, explicit state machine, human gate at each)

Use an explicit three-state machine rather than a heavyweight agent framework — far easier to reason about, test, and evolve.

- **Stage 0 — Ingest & resource profiling.** Accept GeoJSON, Shapefile→GeoJSON, CSV-with-coordinates, and (later) COG raster, plus texts and an optional script. Auto-profile each source: geometry type, attribute schema, measurement levels, CRS/extent, temporal extent, value distributions. Output a structured *resource profile* — the input to data–narrative-fit checks.

- **Stage 1 — Plan (narrative planning).** From profiles + intent, draft 2–3 candidate scene graphs along *principled* axes (genre, tone, author/reader balance), run a per-scene fit check ("this scene needs a *process* but the data is single-time → ask for a series or change the angle"), ask clarifying questions, and emit a navigable branch tree. User picks/edits one → a partially filled schema instance.

- **Stage 2 — Design (technique binding).** Bind each scene's content dimensions to cartographic + interaction techniques using the `knowledge` package (RAG over curated guidelines + annotated exemplars; the element→technique table exposed as a tool). Decide basemap style, symbolization, classification, per-scene camera keyframes, transitions, layout pattern, and — critically — *which* runtime controls to expose (constrained reader agency, so the panel never dissolves the narrative). Output: schema enriched with technique bindings. User adjusts.

- **Stage 3 — Build (generation + self-check).** Emit from a **component/template scaffold, not free-form** — the single most important reliability decision. Run a vision self-check loop: render each scene/state headless (Playwright), screenshot, critique against a concrete checklist (legend present, label collision, contrast, overflow, mobile breakpoint), patch, cap iterations. Be honest about scope: this catches layout/legibility, not deep cartographic judgment.

### Technology choices (and why)

| Concern | Choice | Why |
|---|---|---|
| Language | TypeScript end-to-end | Shared schema types across agent, studio, output; one toolchain |
| Map engine | **MapLibre GL JS** (Mapbox optional) | Open, no token/billing, same API surface — right for a side product |
| Basemap | **Protomaps / PMTiles** | A single static file, no tile server — makes output truly portable |
| Scrollytelling | **scrollama.js** | Lightweight, framework-agnostic, the de-facto standard |
| Orchestration | Explicit 3-stage state machine | Legible and testable; avoids heavyweight agent-framework lock-in |
| LLM | Provider-agnostic adapter | Swap Anthropic / OpenAI / local; structured outputs validated against the schema |
| Project storage | **SQLite** | Single file, zero-ops, versioned schema docs |
| Knowledge store | Embedded vector store (e.g. LanceDB / sqlite-vec) | No pgvector cluster; ships with the app |
| Asset storage | Filesystem / simple blob | Side-product simplicity |
| Self-check | Playwright + vision model | Dev-dependency only; no standing infrastructure |
| Output | Self-contained static bundle | Hosts anywhere; independent of MapBard |

### Knowledge provisioning

The cartographic-narrative knowledge lives entirely in the `knowledge` package: design *principles* as a prompt module, *specifics* as RAG over a curated guideline + annotated-exemplar corpus, and the *element → technique* mapping as structured data the design stage queries. This is the same knowledge object the paper formalizes — so the paper describes exactly what the product runs.

### Output as a first-class, portable artifact

A finished storymap is a static bundle (HTML + JS + CSS + GeoJSON/PMTiles), deployable to any static host and fully decoupled from the authoring tool. The **factory** (MapBard studio) and the **product** (the storymap) are cleanly separated — this is what keeps the side project small and the outputs durable.

### Deployment

A single `docker-compose.yml` brings up studio + core service + Playwright. Alternatively the studio deploys to a static host (Vercel/Netlify) with `core` as one container. No database server, no message bus, no orchestration platform.

### Build phasing

- **Phase A (proof).** `schema` + vector-only ingest + linear scrollytelling renderer + the three stages without branching + a basic control panel. One dataset, end to end. (This alone is a strong figure / short paper.)
- **Phase B.** Branching scene tree + studio HITL editing + richer technique binding + knowledge RAG.
- **Phase C.** Raster/temporal support + the vision self-check loop + the full runtime control panel.
- **Phase D.** Evaluation harness — baseline toggle (no-schema path), full logging (schema versions, prompts, generated code, screenshots), rubric tooling, user-study instrumentation. Shared with the paper.

Phases A→D map directly onto the paper's milestones: the engineering work *is* the experimental apparatus.

### Engineering risks held in view

- *Free-form HTML fragility* → templated renderer (decided).
- *Multi-stage latency/cost* → cache profiles and design specs; stream reasoning.
- *Reader-agency vs narrative integrity* → the design stage decides exposable knobs; never expose everything.
- *Vision-model judgment ceiling* → scope the self-check to layout/legibility; leave deep cartographic judgment to the knowledge layer.

---

## How the threads interlock

- The **schema** is both the paper's contribution and the product's contract.
- The **no-schema baseline** is a runtime flag in the product *and* the ablation in the paper — one lever, two purposes.
- The **case study data** (e.g., 崩岸) is both a product demo and an evaluation instance.
- The **element → technique table** is both the product's `knowledge` package and the paper's centerpiece figure.

**Lock first:** draft the schema itself — the concrete content dimensions, discourse dimensions, operators, their types, and how each binds to data and to a technique. Once that JSON exists, the paper has its core figure and the product has its contract, and everything else hangs off it.
