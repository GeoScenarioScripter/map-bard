# Project I/O — G2 handoff to W3-A

`loadProject(root)` reads `mapbard.project.json`, narrative and design bytes, then all declared local resources. It checks real-path containment, case-insensitive path collisions and declared resource SHA-256 values before returning data parsed from those same bytes. Its input snapshot contains exact authored-file digests and sorted resource IDs; roots and paths stay process-local. `importLegacyNarrative(inputPath, destinationRoot)` stages a new directory, retains the original narrative bytes, copies local source bytes, creates an empty design, and reports path mapping, all 112 leaf fields of the handwritten example, unsupported requests and feature ID basis. An existing destination is never replaced.

The G1 synthetic specimen at `docs/stage-1/specimens/` loads with project ID `synthetic-two-periods`, revision 1, data IDs `period-a` and `period-b`, and no media assets. Its snapshot digests are:

| Input     | SHA-256                                                            |
| --------- | ------------------------------------------------------------------ |
| Narrative | `49f6b273ff8bcaec5a87945cbbb8b188fe89e64f4b3b18ce67b9d33f55a310cd` |
| Design    | `5eb821a663ccd02395a895a06c5987e65b2c4e989182a069100d4c8e34f4b8cc` |
| Manifest  | `24b8d1d09b2b287473a3fe55f1144d0db1d1960c5ae5d7b738561db24b5ca8b6` |

An import of `examples/sf-waterfront.geonarrative.json` reports three unchanged path mappings (`landmarks`, `img-skyline`, `img-ferry`), three feature keys from the unique `name` property, and warnings at `basemap` and scene 2's quantile classification. Its original narrative and local resource bytes match the imported copies. Import does not claim those unsupported requests compile.

G2 replaces the local boundary shapes with public Zod/inferred types from
`@mapbard/schema`. `@mapbard/core` now exports `loadProject`,
`importLegacyNarrative`, and `validateProject`. Load uses the strict public
`parseProject` / `parseProjectArtifacts` boundary before returning typed values;
unknown narrative keys are diagnosed before the legacy parser can strip them.
The original bytes still determine fingerprints and remain untouched.

Compose `loadProject(root)`, check `ok`, then call `validateProject(loaded.value)`.
Validation checks references, declarations, required extensions and loaded snapshot
membership. It is currently the schema validator re-exported by core, not a
capability compiler or a verifier of arbitrary caller-supplied byte hashes.
Use the loader to establish byte identity. W3-A adds compiler prerequisites and
pure compilation using those same public contracts.

`g2.integration.test.ts` uses built package barrels (build before tests) and the
frozen specimen. It checks load/validation/compiled-input identity, relocation,
override and extension retention, reference/measurement negatives, strict fields,
and the shared legacy import report. Unsupported legacy requests remain in
`ImportReport.unsupportedRequests`; import success does not imply compilation.
