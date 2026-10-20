# G2 — Foundation integration

2026-10-19, BUILD_LOG Session 24. **CLOSED / PASS. Wave 3 is released but not
started in this session.** Contract/specimen revision remains **g1-r1**.

The existing uncommitted Wave 1/2 work was preserved. Task inventory showed only
this G2 task active; the Session 23 task was idle. No commit/push was performed.

## Integrated contracts

- `@mapbard/schema` publicly exports project/design/compiled/diagnostic schemas,
  inferred types, strict parsers, loaded/publication types and reference validation.
- `@mapbard/core` exports `loadProject`, `importLegacyNarrative` and
  `validateProject`. Validation currently re-exports the schema validator; W3-A
  adds compile prerequisites and `compileProject`. Loading establishes exact
  byte hashes and real-path containment. Arbitrary manually constructed loaded
  objects are not independently byte-hashed by schema validation.
- The loader now uses real schema parsers instead of its temporary shape guards.
  Unknown narrative fields are rejected before stripping; original source bytes
  and snapshot hashes remain unchanged. Optional extensions and measurement
  overrides survive load/validation. Required unknown extensions diagnose.
- Core boundary types and player consumer types derive from public schema types.
  A TypeScript 5.9 typed-array mismatch discovered during composition was repaired
  by typing the byte schema as `ZodType<Uint8Array>`, matching its runtime check
  and accepting Node Buffer backing stores without copying or narrowing them.
- Existing direct edges are sufficient: core → schema and renderer → schema use
  `workspace:*`; renderer's esbuild `0.21.5` remains pinned. No renderer → core
  edge or private cross-package source import was added. No new lockfile change
  was needed for G2.

## Dedicated player build contract

The normal `pnpm -r build` now runs the renderer's `build:player` command after
its legacy library build. That command typechecks `player/tsconfig.json`, then
bundles `player/entry.ts` with esbuild for browser / ES2020 / IIFE and rejects
external module imports.

The canonical artifact is `packages/renderer/dist/player/player.js`, included in
the package's existing `dist` files. The public asset subpath is
`@mapbard/renderer/player.js`; resolve its path and copy its bytes for publication.
It is a classic-script asset exposing `globalThis.MapBardCompiledPlayer` with
`createPlayer` and `createDomView`, not an ESM library. W3-C must diagnose missing
build output instead of silently selecting the legacy player. Historical
`out/player/player.js` output is no longer the publication contract.

The built artifact is 7,806 bytes with SHA-256
`d5d8ee7ded0fbb0615c9993bec04c6ebe0b3fefabde3c5c5e7bb518fef4693a7`.
Schema imports in the player are type-only. This foundation still needs W3-B's
MapLibre adapter, styling/legends/annotations and scrolling, and W3-C's HTML and
payload wiring. It is not an accepted browser story.

## Verification

Environment: Windows, Node 22.19.0, pnpm 9.15.0, TypeScript 5.9.3, Vitest 2.1.9.
No model/provider or source-acquisition network calls were needed.

| Check                                                                                                            | Result and bounded evidence                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `corepack pnpm install --frozen-lockfile --offline --store-dir D:/.pnpm-store`                                   | PASS, existing tree already up to date. The first command without the existing store path only prompted for replacement; it was not an install pass. No clean-tree reinstall is claimed.                                                                                                                                                                    |
| `corepack pnpm -r build`                                                                                         | PASS, all five packages; includes player typecheck, self-contained IIFE build and external-import assertion.                                                                                                                                                                                                                                                |
| `corepack pnpm -r test`                                                                                          | PASS, 89 tests: schema 22, core 50, renderer 17. Ten G2 tests added. CLI/knowledge have no tests.                                                                                                                                                                                                                                                           |
| Core public composition                                                                                          | Eight tests load real bytes through package barrels, validate the shared frozen project, compare its snapshot exactly with `compiled.expected.json`, repeat after relocation, retain overrides/extensions, reject missing feature targets/incompatible units/unknown keys/required extensions/malformed manifests, and preserve legacy import bytes/report. |
| Built-player composition                                                                                         | Two tests resolve the public package asset, execute the actual IIFE in Node VM, and consume the schema-validated frozen compiled specimen. Verify scene-specific bindings, camera cuts, control changes/default reset, cleanup, reduced motion, version rejection and unchanged specimen. No DOM/browser evidence implied.                                  |
| `corepack pnpm lint`                                                                                             | PASS. Two new prefer-const findings were corrected; affected core's 50 tests and build reran successfully afterward.                                                                                                                                                                                                                                        |
| Targeted strict TypeScript check of both new integration test files                                              | PASS with NodeNext / ES2022 / noEmit.                                                                                                                                                                                                                                                                                                                       |
| `node packages/renderer/scripts/render-example.mjs`                                                              | PASS, nine legacy files generated. Expected warning: unsupported `protomaps-light`, supplied local context used.                                                                                                                                                                                                                                            |
| `node --check packages/renderer/runtime/app.js`, `out/bundle-data.js`, `packages/renderer/dist/player/player.js` | PASS for all three.                                                                                                                                                                                                                                                                                                                                         |
| `node docs/stage-1/scripts/verify-g1.mjs`                                                                        | PASS, frozen shape/oracle/hash/reference checks and pinned source checks; specimens were not edited.                                                                                                                                                                                                                                                        |
| Changed-file formatting, documentation link review and `git diff --check`                                        | PASS. Existing line-ending warnings are separate from whitespace errors.                                                                                                                                                                                                                                                                                    |
| Browser / offline publication / accessibility / cartographic review                                              | NOT RUN for the new player; no complete compiled page exists yet. G1's reader report is not reused as new-player acceptance.                                                                                                                                                                                                                                |

During test development, Vitest's transformed `import.meta` did not support
`resolve`; the bundle test now uses Node `createRequire(...).resolve` against the
same public export. Two test assertions initially addressed the wrong fixture
field/report location; corrected to `target.featureIds` and
`ImportReport.unsupportedRequests`. All final checks above pass.

## Next action

Start **S1-W3-A — Compiler and rules** in a new numbered session against these
public boundaries and unchanged g1-r1 specimens. W3-B/C consume the documented
player/asset contract under their existing ownership. G3 must integrate the
compiler, faithful playback and publication before Wave 4 browser acceptance.
No `compileProject`, `renderCompiled`, compiled publication or full Stage 1
product capability is claimed by G2.
