# M1 — CLI and Foundation

Updated 2026-10-20. Status: **in progress; A–D implemented**. Part of the [roadmap](ROADMAP.md).

## Outcome

A fresh coding-agent session (Claude Code or Codex) gets raw data files, a
photo and an intent. Using only the `mapbard` CLI and the MapBard skill pack, it
produces a published story with a real online basemap, without anyone editing
a hash or writing a Node script. A human can follow the same quickstart by hand.

## Work items

The order is A → B → (C, D in parallel) → E → F. Each item lands as one or more
focused commits with tests.

### A. Retire legacy code

| Remove                                                                                                                                                 | Notes                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `renderer`: `render.ts`, `write.ts`, `bundle-data.ts`, `index-html.ts`, legacy types, `runtime/app.js`, `scripts/render-example.mjs`, `render.test.ts` | Keep `runtime/style.css` only while the compiled page uses it (M2 replaces it with themes) |
| `core`: `llm/` (DashScope adapter), `stage1/plan.ts`, `scripts/plan-example.mjs`, the `openai` dependency, `.env.example`                              | M6 builds a new harness; nothing here is reused                                            |
| `core`: `project/import-legacy.ts` and its tests                                                                                                       | Superseded by `mapbard migrate` (0.1 project → 0.2)                                        |
| `examples/sf-waterfront.geonarrative.json`, `examples/basemap/`                                                                                        | Legacy-only demo and its local context map                                                 |
| `examples/data/`, `examples/media/`                                                                                                                    | Move to `fixtures/ingest/` (the stage0 ingest tests use them), not delete                  |

Also fix the root build: the renderer's nested `pnpm run build:player` breaks
when a different global pnpm is installed. Call the steps directly instead. The
`stage0` modules become the profiling behind `mapbard add` and `mapbard
inspect`; rename the directory to `inspect/`.

### B. Project format 0.2

The current split forces an agent to keep three files and hashes consistent:
`mapbard.project.json`, `narrative.geonarrative.json` (which has its own data
list and the layer encodings) and `design.json` (constants, annotations, shared
scales). Format 0.2:

| File                | Who edits    | Contents                                                                                                                                                                                            |
| ------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mapbard.json`      | author/agent | `formatVersion`, id, title, intent, theme, basemap, resources (data: id, path, feature-id rule, attribute declarations, attribution; media: id, path/url, credit)                                   |
| `story.json`        | author/agent | Ordered scenes: title, narration, media, layers (source, technique, encoding, classification, constants, filter), camera, annotations, controls; shared scales; optional content/discourse metadata |
| `mapbard.lock.json` | CLI only     | Resource hashes, profiles (geometry, extent, attribute stats), revision, last compile inputs; later M3 computed results. Never hand-edited                                                          |

- Validation still uses strict Zod schemas. `mapbard schema` exports JSON
  Schema (via `zod-to-json-schema`, MIT, or Zod 4's built-in export if we
  upgrade). Editors and agents then get completion and inline errors.

  Format 0.2 schemas and JSON Schema exporters are implemented in
  `@mapbard/schema`; the CLI command exposing them belongs to C.

- **Staleness:** `check` compares lockfile hashes with the files on disk and
  reports drift. Every writing command (`add`, `lock`, `build`) refreshes the
  lock. `build` refuses stale inputs unless the lock was refreshed in the same run.
- **Cross-platform hashes:** a Windows checkout with `core.autocrlf=true`
  rewrote authored JSON to CRLF and broke byte hashes. This was found on
  2026-10-20 and patched for the example with `.gitattributes`. Hash text
  formats (JSON, GeoJSON, CSV) after normalizing line endings, and hash binary
  media as raw bytes. `init` also writes a `.gitattributes` that pins LF.
- `mapbard migrate <0.1-project> <new-dir>` converts the Potomac and fixture
  projects without modifying the source, and writes a migration report. Unknown
  versions are rejected.
- The compiler and compiled spec move to 0.2 and carry the resolved basemap.
  Existing compiler behaviour and tests carry over: scales, diagnostics and
  capability checks.

### C. The `mapbard` CLI (`@mapbard/cli`, bin `mapbard`)

| Command                             | Does                                                                                                       |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `init [dir] [--template]`           | Scaffold `mapbard.json`, `story.json`, lockfile, `.gitignore`, and optionally the skill pack               |
| `add <files…> [--id]`               | Register GeoJSON/CSV/media; profile; draft attribute declarations; flag missing attribution as diagnostics |
| `inspect [resourceId]`              | Geometry, extent, CRS, feature-ID uniqueness, attribute distributions, missingness, suggested techniques   |
| `check`                             | Schema + references + lock drift + compile diagnostics (M2 adds `--visual` and critic rules)               |
| `build [--out] [--offline]`         | Compile and publish; writes `verification.json`; prints required network hosts                             |
| `preview [--port] [--open]`         | Local server with file watching and live reload; diagnostics overlay in the page; serves on `127.0.0.1`    |
| `capabilities`                      | Techniques, basemap providers/styles, versions: the agent's discovery entry point                          |
| `schema [file]`                     | JSON Schema for `mapbard.json` / `story.json`                                                              |
| `migrate <src> <dest>`              | 0.1 → 0.2 conversion                                                                                       |
| `skill install [--claude\|--codex]` | Copy the versioned skill pack into the project                                                             |

- **Every command takes `--json`** and returns a stable envelope: `{ ok,
command, cliVersion, diagnostics[], result }`. Exit codes: `0` ok, `1`
  diagnostics with errors, `2` usage error, `3` internal error. Output is
  bounded (`--limit`) so agents don't flood their context.
- Human mode prints readable diagnostics with path, IDs and remedy, plus colour
  when the terminal supports it.
- Dependencies: `commander` (MIT) for parsing; `node:http` and `fs.watch` for
  preview (no extra watcher dependency unless Linux recursive watching proves
  unreliable).
- Distribution: published to npm as **`mapbard`**, so users run `npx mapbard
init` or `npm i -g mapbard` (see item G).

### D. Free online basemaps

```jsonc
// mapbard.json
"basemap": {
  "provider": "openfreemap",           // openfreemap | versatiles | none | custom
  "style": "positron",                 // openfreemap: positron, dark, liberty, bright, fiord
  "labels": "minimal",                 // full | minimal | off
  "terrain": { "provider": "mapterhorn", "exaggeration": 1.4 } // or aws-terrarium; optional
}
```

- Upgrade MapLibre GL JS from 4.7 to 6.x. The compiler resolves provider plus
  style to a style URL, attribution and the required network hosts. The player
  loads the style and inserts story layers below the label layers.
- `custom` takes `styleUrl` and `attribution`, for self-hosted tiles or any
  other open provider. No provider that needs an API key is built in.
- `fallback` lists alternative providers, tried in order when the primary
  fails to load (default: OpenFreeMap → VersaTiles). If all fail, the story
  degrades to its local context layers with a visible notice.
- `build --offline` drops online sources, keeps authored local context layers
  and warns that the basemap was removed. The output must make zero network
  requests.
- Provider terms are recorded in `knowledge`: attribution text, a no-uptime
  notice, and Terrarium/Mapterhorn attribution requirements.
- Provider URLs and attribution references are recorded in
  [basemap provider notes](basemap-providers.md). A local HTTP custom style was
  checked in headless Chrome; public tile loading still needs a browser run
  with access to those hosts.
- Theming and tinting of provider styles belong to M2.

### E. Agent skill pack

`skills/mapbard/` holds `SKILL.md` (the workflow: `capabilities` → `init`/`add`
→ `inspect` → write the story → `check` → `preview` → fix → `build`) plus
references:

- the format guide with annotated examples
- technique "when to use / when not to"
- cartography rules
- diagnostic codes with remedies
- the data-honesty rules: never invent values, and qualify comparisons

It is versioned with the CLI. A Claude Code skill and a Codex `AGENTS.md`
snippet are thin wrappers around the same content. M6's built-in agent reuses
it.

### F. Example, tests and quickstart

- Migrate the Potomac project to 0.2 and rebuild it through the CLI only.
  Visual redesign is M2.
- An end-to-end test drives the CLI binary: `init` → `add` → write `story.json`
  → `check` → `build`, then `--json` envelopes and exit codes.
- A Playwright smoke test (Apache-2.0) opens the built story headless and
  checks: page loads, no console errors, scenes advance on scroll, the basemap
  host is requested online, and there are no requests with `--offline`. This is
  the seed of M2's visual QA.
- The README gets a five-minute quickstart for humans and for agents.

### G. npm release

- **Packages:** the unscoped `mapbard` package is the CLI and the entry point
  users install. The libraries publish under the `@mapbard/` scope (`schema`,
  `core`, `knowledge`, `renderer`), and `@mapbard/assets-starter` follows in
  M2. `mapbard` depends on them with normal semver ranges, and `workspace:*` is
  rewritten at publish time.
- **Name status:** on 2026-10-20 the `mapbard` package and the `@mapbard/cli`
  name were both unclaimed on npm. The product owner needs to create the npm
  account or organization (`mapbard`) and claim the names early. Publishing uses
  the owner's credentials; agents never handle npm tokens.
- **Package hygiene:** `files` allowlists, an `exports` map, a `bin` entry with
  a shebang, `engines.node >= 20`, an MIT `LICENSE` and a README per package.
  The published player bundle and vendored MapLibre are included in
  `@mapbard/renderer`.
- **Versioning:** Changesets (MIT) for versions and changelogs. A GitHub
  Actions release workflow runs build, tests and lint, then publishes with npm
  provenance using a repository secret the owner adds.
- **Pre-release check:** `npm pack` each package, install the tarballs in a
  temp folder, and run `npx mapbard init && mapbard build` on Windows, macOS
  and Linux in CI. The first public release is `0.1.0` once acceptance below
  passes. Earlier builds go out under the `next` tag only.

## Acceptance

1. `pnpm install && pnpm build && pnpm test && pnpm lint` pass from a clean
   checkout, including the CLI end-to-end and Playwright smoke tests.
2. No legacy renderer, DashScope or import-legacy code remains, and the docs
   don't mention them as current.
3. The Potomac story is built with `mapbard build`, shows an OpenFreeMap
   basemap online, and makes zero network requests with `--offline`.
4. **Agent trial:** a fresh Claude Code session in an empty folder gets the raw
   Potomac GeoJSON, the photo, the intent and the skill pack. It reaches a
   successful `mapbard build` with no human file edits. Friction found in the
   transcript becomes skill or CLI fixes, recorded in STATUS.md.
5. Packed tarballs install and run `init` → `build` on Windows, macOS and
   Linux in CI, and `mapbard@0.1.0` is published once the owner has claimed the
   npm names.

## Out of scope for M1

Visual redesign, deck.gl/three.js, motion tracks and the asset library (M2);
computed results and bindings (M3); the workbench (M5).
