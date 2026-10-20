# S1-W4-B independent regression review

Session 31, 2026-10-20. The checks exercise only public package APIs against the
real-source Potomac example and the handwritten legacy narrative. They are
automated engine/publication checks, not browser observations or an assessment of
the geographic interpretation.

## Scope and evidence

| Boundary                         | Independent challenge                                                                                                                                     | Result                                                                      |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Project load and compile         | Relocate the real project, compare its input fingerprint, compile twice, and confirm the editable manifest/narrative/design bytes remain unchanged        | Pass: `pipeline.integration.test.ts`                                        |
| Versions                         | Replace each project, narrative, and design version with `99.0.0`                                                                                         | Pass: `VERSION_UNSUPPORTED` in all three cases                              |
| Source identity and availability | Duplicate a data source ID; remove one declared GeoJSON file                                                                                              | Pass: `ID_DUPLICATE` at validation; `RESOURCE_MISSING` at load              |
| Unsupported intent               | Request an unsupported basemap                                                                                                                            | Pass: `CAPABILITY_UNSUPPORTED` before publication                           |
| Legacy content                   | Import the handwritten waterfront narrative and compare all imported narrative bytes and parsed fields to the original                                    | Pass: exact byte and content equality; unsupported legacy requests reported |
| Publication separation           | Generate and write the Potomac story; compare editable artifact bytes; confirm the output contains its story/data/media but excludes the project manifest | Pass: `publication.integration.test.ts`                                     |
| Stale inputs                     | Change authored narration after compile; substitute changed data bytes at render                                                                          | Pass: `INPUT_STALE`; no output installed                                    |
| Asset safety                     | Change a media destination to `../outside.jpg`; remove the source image after render                                                                      | Pass: `ASSET_PATH_INVALID`; no output or escaped file installed             |

The two new files contain **10 tests** (7 core, 3 renderer). They reuse the
checked-in real-source project and create disposable copies for destructive
challenges. The tests make no provider or network calls. The renderer test uses
test-only direct workspace dependencies on core and knowledge; publication still
uses the renderer's public API.

## Executed checks

- Five package builds pass. Root `pnpm test` passes **130 tests**: schema 22,
  core 73, renderer 32, root public integration 3. The prior Session 30 count
  was 120; this session adds 10 without changing existing tests.
- Root lint and strict TypeScript checking of both new test files pass.
- The G1 source/specimen verifier passes. The legacy example still generates nine
  files with its documented unsupported-basemap warning. Its runtime and generated
  data scripts, plus the built player script, pass `node --check`.
- The real example builds through public APIs with eight listed output files,
  empty diagnostics, and no required network URL. This remains a generation check.
- Changed-file Prettier formatting and `git diff --check` pass.

## Boundary and handoff

No production defect was found by these cases. Passing generation does not verify
actual map playback, the browser's `file://` behavior, relocation of the generated
bundle, keyboard interaction, narrow layout, or reduced motion. S1-W4-C owns those
manual checks. G4 should combine this record with the W4-C browser record and rerun
the full repository checks before stage closure.
