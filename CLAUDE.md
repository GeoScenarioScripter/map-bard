# CLAUDE.md — MapBard

The standing rulebook for every MapBard working session. Read this first, every session.

MapBard is an agent that turns geographic data + text + **supporting media (images/video)** + intent into a **self-contained interactive HTML map story** (a "storymap"). It is a schema-centered **pnpm + TypeScript monorepo**. The authoritative brief is **`docs/mapbard-build-guide.md`** (read it for any milestone detail); **`docs/mapbard-plan.md`** is background (paper + product framing). The current phase is **Phase A (MVP)** — see **`docs/phase-a-plan.md`** for the milestone breakdown and **`docs/BUILD_LOG.md`** for where we are.

## Prime directives (from the build guide §0 — never violate)

1. **The schema is the contract.** Everything flows through one object, `GeoNarrative`. Build it first; every stage reads and writes it.
2. **Vertical slice over horizontal completeness.** Get one tiny story working end to end early, then deepen. Do not build all of `core` before any of `renderer`. Do not build ahead of the current milestone.
3. **The renderer is deterministic. LLMs never emit raw HTML.** The model fills the schema; a fixed template turns the schema into HTML/JS. This is the single most important reliability rule.
4. **Validate every LLM output against the schema.** Invalid → repair or retry, never pass through.
5. **Scenes need not be complete.** A scene may use only some content dimensions. Don't force all of them.
6. **Depend inward toward `schema`.** `renderer`/`core`/`cli` depend on `schema`, never the reverse. Few dependencies, near-zero ops (no DB server, no message bus).

---

## a. Session protocol

**On session start**
1. Read this `CLAUDE.md`.
2. Read `docs/BUILD_LOG.md` — the **last session entry** tells you the current phase, the active/next milestone, and any open threads. The **current-state banner** at the top is the quick answer.
3. Skim the relevant milestone section in `docs/phase-a-plan.md`.
4. **Open a new session**: append a heading to `docs/BUILD_LOG.md`:
   `## Session NN — YYYY-MM-DD — 🟢 OPEN` (NN = previous + 1; use today's date).

**During the session**
- Keep work scoped to the **current milestone**. Resist building ahead (directive 2).
- If you hit an out-of-scope idea (guide §9), drop it in the BUILD_LOG **Parking lot**, don't build it.
- Make small, reviewable commits per milestone — **but commit only when the user asks**.

**On session end / pause**
- Fill the session entry using the template (Goal / Did / Decisions / Files touched / Verification / Next).
- Flip the marker: `## Session NN — YYYY-MM-DD — 🔴 CLOSED`.
- If a milestone's Definition of Done was met and verified, mark it ✅ (see §c).
- Update the current-state banner at the top of `docs/BUILD_LOG.md`.
- Capture any durable decision/gotcha in memory (see §d).

---

## b. Phase & milestone protocol

- Phase A milestones are **M0–M7** (table + detail in `docs/phase-a-plan.md`). Each has a status:
  `⬜ NOT STARTED` / `🟡 IN PROGRESS` / `✅ DONE`.
- A milestone is **DONE only when** its "Done when" criterion (guide §8) is met **and verified** (build / test / render as applicable). When it flips, update the status in **both** places: the milestone table in `docs/phase-a-plan.md` **and** `docs/BUILD_LOG.md`.
- Mark phase boundaries in `docs/BUILD_LOG.md` with explicit lines:
  `### ▶ PHASE A — OPENED` (written when M0 work actually begins) and
  `### ⏹ PHASE A — COMPLETE`.
- **Phase A is complete** when all M0–M7 are ✅ **and** the §2 Definition of Done passes: running the CLI on one real GeoJSON + a one-line intent produces an `out/` bundle that opens in a browser as a coherent multi-scene map story with at least one working runtime control.
- **Do not start Phase B work.** Branching, raster/temporal, vision self-check, RAG, Studio UI, multi-provider, auth — all deferred (guide §9). Park ideas; don't build them.

---

## c. Memory management

Two stores, two jobs — keep them distinct:

- **`docs/BUILD_LOG.md` = the journal.** Chronological narrative of *what happened* each session. This is how a future session resumes work. Verbose is fine.
- **`.claude` file-based memory** (`C:\Users\JohnnyTang\.claude\projects\D--code\memory\`, indexed by `MEMORY.md`) **= distilled durable facts/decisions** that matter *across* sessions and aren't derivable from the repo (e.g. "DashScope adapter uses the OpenAI-compat endpoint"; "schema frozen at vX because Y"). One fact per file, with frontmatter; add a one-line pointer to `MEMORY.md`. Link related memories with `[[slug]]`.

Rules:
- Write a memory when a **decision or gotcha** will matter beyond this session and isn't already recorded in code/git/CLAUDE.md.
- **Don't** copy repo-derivable facts (file layout, code, history) into memory — capture the non-obvious *why*.
- Existing MapBard memories: `[[project_mapbard]]`, `[[feedback_mapbard_dashscope]]`.

---

## d. LLM configuration (DashScope)

- **Provider:** DashScope (Alibaba Qwen) via the **OpenAI-compatible endpoint** `https://dashscope.aliyuncs.com/compatible-mode/v1`, used with the `openai` SDK. One provider only — do **not** generalize to many providers yet (guide §9).
- **Adapter:** a single interface `complete({ system, prompt, schema }) → validated object` (guide §5). All stages go through it.
- **Default model:** `qwen3.7-max-2026-05-17` (swappable via env).
- **Structured output:** request JSON, then **validate against the Zod schema**; on invalid → repair/retry, never pass through (directive 4). Prefer the model's `response_format` JSON mode where supported; otherwise constrain via prompt + strict Zod `.parse()`.
- **Secrets via env, never committed.** Provide `.env.example` (do this when M4 lands):
  - `MAPBARD_LLM_KEY` — the DashScope API key.
  - `MAPBARD_LLM_BASE_URL` — defaults to the compat endpoint above.
  - `MAPBARD_LLM_MODEL` — defaults to `qwen3.7-max-2026-05-17`.

---

## e. Conventions (guide §10)

- TypeScript **strict**, **ESM** modules; no `any` in package public APIs.
- **One responsibility per package**; depend inward toward `schema`.
- All cross-package data is a **validated `GeoNarrative`** or its sub-types — no ad-hoc shapes.
- Tests live with their package; **prioritize `schema` validation and Stage 0 profiling**.
- Prettier + ESLint. Small, reviewable commits per milestone.
- Secrets via env (`MAPBARD_LLM_KEY`, etc.); never commit keys.
- `pnpm -r build` and `pnpm -r test` must run clean.

---

**Where we are right now:** check the current-state banner at the top of `docs/BUILD_LOG.md`. As of setup, Phase A is not yet opened and **M0 (repo scaffold) is the next action**.
