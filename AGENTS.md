# AGENTS.md — MapBard

Repository instructions for coding agents. Updated 2026-10-21.

## Read first

1. [docs/STATUS.md](docs/STATUS.md): current state, known issues, recent log.
2. [docs/ROADMAP.md](docs/ROADMAP.md): product, principles, milestones.
3. The active milestone plan, currently [docs/m1-cli.md](docs/m1-cli.md).
4. [docs/visual-engine.md](docs/visual-engine.md) before touching rendering,
   the player, themes or techniques.

`docs/archive/` is history, not instructions. Check source and tests before
assuming that a planned capability exists.

## Repository map

| Package              | Today                                                                   | Heading to                                                         |
| -------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `@mapbard/schema`    | Zod contracts: project/narrative/design 0.1, compiled spec, diagnostics | Format 0.2 (`mapbard.json`, `story.json`, lockfile), JSON Schema   |
| `@mapbard/core`      | Project load/validate, compiler, ingest/profiling                       | Lockfile, migrate, M3 analysis and bindings                        |
| `@mapbard/knowledge` | Capability IDs and encoding prerequisites                               | Technique catalog, critic rules, basemap provider registry         |
| `@mapbard/renderer`  | Compiled publication + TypeScript player (MapLibre)                     | Multi-tier player (MapLibre + deck.gl + three.js), layouts, themes |
| `mapbard`            | CLI with project, build, preview, schema and skill commands             | npm release, then agent authoring trial                            |

Fixtures live in `fixtures/`; examples in `examples/projects/`.

## Architecture rules

- **Plain-file projects.** Authored files are for agents and humans. Derived
  state (hashes, profiles, results) belongs to the CLI-managed lockfile.
  Generated HTML/JS is never canonical.
- **Deterministic engine, no model required.** Agents propose; the engine
  validates, compiles and renders. Engine and CLI must never call an LLM.
- **Contracts first.** Define them with Zod and inferred types. Validate every
  external edit, including semantic references. Version formats explicitly,
  migrate non-destructively, and reject unknown versions.
- **Diagnostics, not silent fallbacks.** Unsupported or dishonest requests
  produce a diagnostic with code, path, IDs and remedy.
- **Never invent data.** Observations, computed results and media come from the
  project. Keep units, denominators, qualifications and attribution visible.
- **Keep generation separate from I/O.** Preserve escaping, asset path
  containment and source attribution.
- **Depend inward** toward `schema`. Use `workspace:*` dependencies and public
  package barrels only; never import another package's private source.
- **Renderer tiers:** MapLibre (base), deck.gl interleaved (data 3D), three.js
  custom layer (scene 3D), DOM overlay. Load only the tiers a story uses, and
  keep IIFE output so `file://` works.
- **Network is explicit.** Online basemap/terrain hosts are declared in the
  build output, and `--offline` builds make zero requests.

## Dependency policy

Open source only: MIT, BSD, ISC or Apache-2.0 code; OFL fonts. No proprietary
SDKs (for example Mapbox GL JS v2+). Never require a service that needs an API
key. Pin exact versions for runtime libraries bundled into published stories.
Note the license when adding a dependency.

## Toolchain

Node 20+, pnpm 9.15.0 (`corepack pnpm` if a different global pnpm is installed),
strict TypeScript ESM/NodeNext, `.js` suffixes on relative imports, no `any` in
public APIs.

```sh
pnpm install --frozen-lockfile
pnpm -r build        # build first: package exports resolve to dist
pnpm test            # all packages + root integration tests
pnpm lint
node examples/scripts/build-first-slice.mjs out/potomac   # example publication
```

Tests are colocated `*.test.ts` files. Target one package with `pnpm --filter
@mapbard/core test`. Routine tests never touch the network. The Playwright
smoke/visual tests (M1+) are the only browser tests.

Format only the files you changed: `pnpm exec prettier --write <paths>`. Do not
hand-edit `dist/`, `out/` or vendor files.

## Workflow

- Inspect `git status` first and preserve unrelated work.
- Work from the active milestone plan. If the plan is wrong, update the plan
  doc in the same change; don't work around it.
- Keep commits small and focused, with tests. Commit completed work locally.
  **Push only when the user asks.** Never commit secrets or `.env` files.
- Each session, add one line to the STATUS.md log: date, what changed, checks
  run, next step. Update "What works today" and "Known issues" when they change.
- For visual or player changes, build the example and check it in a real
  browser or with Playwright screenshots, and say which you did. File
  generation alone is not a browser check.
- Report honestly: say plainly what was not run or not verified.
