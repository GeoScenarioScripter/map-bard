# G1 integration review — Sessions 14–19

2026-10-19 · **G1 CLOSED. Wave 2 is released against g1-r1.**

Reviewed the [case audit](case-dossier.md), [contract proposal](contracts.md),
[synthetic specimens](specimens/README.md), and [runtime baseline](baseline.md).
Session 13 is complete after the lint correction below. Stage 1 is not complete.
Existing uncommitted work was preserved. The preceding task was completed and
no other active MapBard task was editing this checkout at takeover.

**Session 15 continuation:** accepted the Potomac source case for the bounded
published-daily-mean comparison, with [time/method qualifications](case-comparability.md).
Eight additional metadata/cross-check responses are pinned and verified. Session
16 received partial direct-file screenshots and repaired the legacy player's
wheel-scroll conflict and text contrast. Session 17's screenshots confirmed the
remaining blank map; the candidate now includes an explicit offline city context
map while the authored PMTiles request remains unsupported. The reader confirmed
the local land/water/streets and city attribution after hard refresh.
Session 18 reran the candidate build, 55 tests, lint, G1 specimen verifier and
spike VM check; it recorded all six review-file hashes and verified that all 14
generated files retain their hashes in a fresh copy outside the checkout.
Browser automation could not open `file:` under the tool's URL security policy.
Session 19 received the reader's Edge/Chrome Windows direct-file report:
interactions work, the marker-triggered popup opens on click, the spike global is
a function, and no Console errors or failed/remote Network requests were seen.
The reader confirmed both original and relocated pages behaved the same with
networking and cache disabled. See the [browser handoff](browser-handoff.md) for
versions and limits. G1 accepts this bounded evidence and selects the esbuild
IIFE approach below. **No Stage 1 product capability or full runtime/capability
matrix is certified by G1.**

## Gate disposition

| Check                                      | Result                       | Evidence or next action                                                                                                                                                                                                                   |
| ------------------------------------------ | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Session 13 baseline/spike                  | Pass after completion fix    | Five packages build, 53 tests, lint, nine-file legacy smoke, syntax checks, TypeScript spike, IIFE/VM and legacy regressions.                                                                                                             |
| Author brief and representation boundaries | Accepted design decisions    | Dossier names creator, reader question and scene purposes; contracts separate content/discourse/attention and do not introduce evidence claims.                                                                                           |
| Real source bytes and reuse                | Acquired and checked         | Six untouched USGS responses and the context photo with seven hashes and source URLs; see the source README.                                                                                                                              |
| Real-case comparability                    | Accepted for bounded fixture | Session 15 joins both dates to primary Daily/Mean series, checks station time-zone metadata and legacy value agreement, and records regulation/diversion/coverage limits. No source-mean recomputation or causal finding.                 |
| Input specimens and numeric-color oracle   | Review checks pass           | Eight synthetic JSON files parse against proposed shapes where applicable; 12 diagnostic shapes, five input hashes, reference joins and full-data oracle checked. These are not production validator/compiler tests.                      |
| Contract revision                          | `g1-r1` reviewed             | Scale variants and byte-backed publication inputs resolve the identified design gaps below. Input shapes and numeric-color specimen are fixed review inputs; the full capability matrix is not certified by these checks.                 |
| Runtime build choice                       | Approved for W2-C            | esbuild IIFE/VM checks pass; reader reports clean direct-file story/spike interaction and Console/Network in Edge/Chrome, including offline relocated reloads; six candidate hashes and 14-file relocation byte equivalence are recorded. |
| Commit/push/PR                             | Not performed                | Existing checkout changes are preserved. Gate approval does not itself publish them.                                                                                                                                                      |

## Decisions accepted at G1

These decisions are fixed in contract revision `g1-r1`; they do **not** certify
unimplemented capabilities. Authored specimen input bytes
stay unchanged; the compiled specimen gains explicit labels/effective count,
and seven scale variants exercise the amended shape. All five input hashes
remain reproducible. Full runtime/capability acceptance awaits later gates.

1. Keep GeoNarrative `0.1.0`, independent project/design/compiled `0.1.0` version
   dispatch, strict new structures, a single canonical scene order/prose, and
   explicit legacy import. An import preserves unsupported intent and can succeed
   while compilation fails. The old parser must not be changed to implement the
   new boundary's unknown-field rejection. New validation must check raw narrative
   keys before the existing Zod parser strips them, including nested keys.
2. Fingerprints use SHA-256 of **exact file bytes**, not parsed/reformatted JSON.
   No newline normalization, timestamp or absolute machine path enters identity.
   Sort resource IDs using JavaScript UTF-16 code-unit ordering, not locale rules;
   reject duplicate IDs first. Include all local data/media/poster bytes. Remote
   URLs are covered by manifest bytes and declared network requirements, not by
   an invented digest of remote content. `revision` alone is not freshness proof.
3. Freeze the hand-calculated numeric-color oracle as a review expectation:
   domain `[0,120]`, edges `[0,40,80,120]`, counts `13/1/0`, intervals closed on
   the left, open on the right except for the inclusive final maximum. This
   accepts a software fixture, not a capability implementation or case finding.
4. Equal-interval precision uses finite IEEE-754 values with exact endpoint
   preservation. For interior `t=i/k`, use `(1-t)*min+t*max`; retain strictly
   increasing distinct edges without epsilon snapping. Reject nonfinite results.
   Constant domains have one class; otherwise effective classes are `edges.length
   - 1`. Take each surviving interval's lower-bound palette index from the
original requested intervals; for a constant use the first color. Labels
must expose the effective count and enough precision to distinguish boundaries.
Example: min `1`, max `1.0000000000000002`, four requested classes collapse
     to one effective interval; no invented extra range. Add this to the next
     executable compiler oracle set before freezing that variant.
5. Numeric data are finite JSON numbers; numeric strings remain invalid inside
   compilable project data. Source-specific preparation may explicitly convert
   verified USGS decimal strings to numbers in a **derived** file, retain the
   original response and record the transformation. No loader-wide coercion.
   Null, absent property and exactly empty string are missing; whitespace-only
   strings remain invalid numeric input. All-missing numeric scales return
   `VALUE_INVALID` with counts; all-missing categorical displays use only the
   no-data swatch and a `VALUE_INVALID` warning. Unknown columns are errors.
6. Preserve typed category values. Type rank is boolean, number, string; booleans
   order false/true, numbers numerically, strings by UTF-16 code units. Display
   labels must distinguish `1` from `"1"`. The amended category objects encode
   value, label and color together; the typed-category specimen checks this.
7. Use the compiled specimen's length-prefixed runtime ID form
   `mb:<scene.length>:<scene>:<layer.length>:<layer>` (UTF-16 length), with
   collision checking. The spike's different ID spelling is illustrative only.
   Scene entry removes prior bindings/markers/listeners, binds the next source,
   applies authored defaults, and resets on revisit. The player must consume
   resolved scales and labels, never choose domains or classification.
8. Session 14 kept the esbuild IIFE as a candidate only because the Node VM pass
   could not establish direct-file browser behavior. Session 19's reader report
   supplies the required browser/version, local requests, offline result and
   observed console/interaction results. The build selection below supersedes
   the earlier hold; a localhost pass was not used to close this check.

## G1 closure and runtime build selection

The bounded Potomac case and `g1-r1` producer/consumer specimens are frozen as
Wave 2 inputs. The browser report closes the remaining direct-file check for the
legacy example and disposable spike. Use **esbuild `0.21.5` as a direct renderer
development dependency** to bundle the new TypeScript player entry as a browser
IIFE. Keep MapLibre and scrollama as locally vendored classic scripts, emit no
external imports, and retain the legacy renderer until planned integration.
The renderer manifest and lockfile pin the version; the existing `tsc` build
script and published runtime are unchanged at this gate. W2-C owns the dedicated
build script, adapter tests and generated player output.
The manifest/lockfile pair passes pnpm's frozen lockfile-only check. The
pre-existing `node_modules` tree was not relinked after pnpm's add command
stalled, so W2-C must run an install before importing this direct dependency.

This approves the build approach, not the compiled player or intended capability
matrix. W2/W3 must implement and test the contract semantics; G2–G4 require
their own integration and browser evidence. No clean-install pass is claimed.
Wave 2 may begin with the ownership and input boundaries in the Stage 1 plan.

## Contract issues resolved in g1-r1

The proposal's matrix describes intended support, not implemented support.
Review found concrete producer/consumer ambiguities rather than source failures:

| Issue                                              | G1 decision                                                                                                                                                                                        | Implementation acceptance after G1                                                                                                                                            |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ResolvedScale.categories` lost primitive types    | Replaced with typed value/label/color objects; added typed and all-missing examples.                                                                                                               | W2-A/W3-A exercise >5 categories, ordering, counts and duplicate typed keys.                                                                                                  |
| Numeric-size scale omitted radius mapping          | Added ratio-only, nonnegative square-root area mapping, radius range, no-data radius and resolved legend exemplars; normal/constant/zero examples.                                                 | W3-A verifies actual output and rejects interval/negative inputs; W3-B consumes the resolved mapping.                                                                         |
| Legend text and class collapse unspecified         | Added compiler-owned labels/effective count; constant and near-equal examples.                                                                                                                     | W3-A tests palette selection and final-inclusive boundaries.                                                                                                                  |
| Independent `dataMap` could disagree with snapshot | Replaced that publication argument with `PublicationInputs.dataBytes`; hash and parse the same bytes. Media writer independently checks source hashes. Pure renderer still has no core dependency. | W3-C changes buffers/media after compile and proves rejection before writes. Entirely old but internally consistent inputs still require caller reload; no watcher guarantee. |
| Auxiliary public types undefined                   | Specified fields for loaded/validated state, capability catalog, resolved assets, import report, options, `CompiledBundle` and `CompiledWriteResult`, avoiding legacy type changes.                | W2-A/B and W3-C implement Zod/inferred types and public producer/consumer composition.                                                                                        |
| Strictness exceeded draft shape checks             | Recorded JSON-only payloads, selector rules, exclusive locations, typed scale semantics and raw narrative-key checks as mandatory semantic constraints.                                            | W2-A implements negative cases without changing legacy parser behavior. Shape parsing alone is not a pass.                                                                    |

No general capability is declared delivered. The numeric-color specimen is a
reviewed example, not a blanket freeze of category/size/choropleth/media/export.
Choropleth remains conditional on declared normalization suitability; the gauge
case does not justify implementing normalization or a new analysis engine.

## Module and ownership decisions

Keep the stage plan's existing package boundaries. These are reserved target
paths/export homes, not new exports added by this review:

| Owner           | Paths and public surface                                                                                                                                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W2-A            | `packages/schema/src/{project,design,compiled,diagnostics,project-validation}.ts`; Zod schemas, inferred types and structural/semantic contracts through `@mapbard/schema`. Shared cross-package data/asset contract types also live inward here. |
| W2-B            | `packages/core/src/project/{load,import-legacy,paths,fingerprint}.ts`; `loadProject` and `importLegacyNarrative` through `@mapbard/core`.                                                                                                         |
| W3-A            | `packages/core/src/compile/` and `packages/knowledge/src/`; pure `validateProject` composition and `compileProject` through `@mapbard/core`, rules through `@mapbard/knowledge`.                                                                  |
| W2-C, then W3-B | `packages/renderer/player/` and dedicated bundling script; compiled player consumer, separate from legacy runtime.                                                                                                                                |
| W3-C            | `packages/renderer/src/` new compiled generation/publication modules; `renderCompiled` and `writeCompiledBundle` through `@mapbard/renderer`, preserving existing `render`/`writeBundle`.                                                         |
| Coordinator     | All package barrels/manifests/lockfile/shared wiring and journals; integrate sequentially.                                                                                                                                                        |

Use direct `workspace:*` dependencies and public barrels. Never create a
renderer-to-core dependency or put filesystem/model work in schema. W2-A still
owns reference/measurement checks; W3-A composes them with compile prerequisites.

Fixtures: retain the handwritten legacy input unchanged and current synthetic
specimens in source control; generate edge mutations in tests; retain the seven
original acquired files with hashes. Derived real data, final narrative/design,
and a compiled golden remain uncreated pending the relevant gates/owners. The
real case must not borrow synthetic values or legacy placeholder media.

## Session 14 verification and closure

Session 13's baseline lint result was obtained before the final spike scripts
were included. The integrated rerun found eight `no-undef` errors. Fixed the
three scripts with explicit Node `console`/`URL` imports and
`globalThis.structuredClone`, then reran lint, spike build/VM and legacy bug checks.
No production source or global lint exclusions changed.

Commands executed in this review:

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm -r build
corepack pnpm -r test
corepack pnpm lint
node packages/renderer/scripts/render-example.mjs
node --check packages/renderer/runtime/app.js
node --check out/bundle-data.js
node node_modules/typescript/bin/tsc --noEmit --strict --target ES2020 --module NodeNext --moduleResolution NodeNext --lib ES2020,DOM docs/stage-1/runtime-spike/player.ts docs/stage-1/runtime-spike/entry.ts
node docs/stage-1/runtime-spike/build.mjs
node docs/stage-1/runtime-spike/verify.mjs
node docs/stage-1/runtime-spike/legacy-repro.mjs
node docs/stage-1/scripts/verify-g1.mjs
```

Install prompted to replace the existing dependency tree and did not establish
a clean install; the pipe had closed when cancellation was attempted. Final
output also reported `ERR_PNPM_META_FETCH_FAIL` for registry metadata, despite
process exit code 0. The existing tree remained
usable, with no lockfile change. **No clean-install pass is claimed.** Build,
53 tests, corrected lint, smoke, syntax, TypeScript and spike checks passed.
The review checker validates proposed shape examples and independent oracles;
it does not run the proposed diagnostic mutations through a nonexistent engine.
At the Session 14 review, browser, accessibility, offline relocation and
narrative/cartographic review were unavailable/not run, distinct from those
automated passes. Session 19 later supplied the bounded browser report above.

Session 15 resolves the source-selection prerequisite; it does not change the
reviewed g1-r1 contract or select a runtime dependency. Its checker verifies 15
acquired-file hashes in total (seven original plus eight metadata/cross-check
files), exact station/series joins for both dates, matching Daily/Mean units and
status, Eastern time-zone metadata and legacy observation agreement. Source
comparability remains an explicitly bounded review judgment, separate from the
automated field checks. See BUILD_LOG Session 15 for final rerun results.

Session 19's [direct-file browser report](browser-handoff.md) closed the bounded
G1 runtime check. Wave 2 may start; no Wave 2 implementation, Stage 2 planning,
commit, push or PR is recorded in this review. The earlier unavailable browser
status above describes the Session 14 review, not the final G1 disposition.
