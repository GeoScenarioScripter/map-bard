# G1 proposal specimens

These files are **synthetic contract specimens**, not a verified story or actual
compiler output. `compiled.expected.json` is a proposed producer/consumer target
with `compilerVersion: g1-proposal-only`; G1 must freeze or revise it before code
consumes it. The two GeoJSON files intentionally use stable `p1`–`p7` IDs and
invented values. No Potomac observations or media are present. The repository's
`.gitattributes` pins this directory to LF so its byte-level SHA-256 examples
remain valid after a Windows checkout.

| File | Producer → consumer expectation |
| --- | --- |
| `mapbard.project.json` + `narrative.geonarrative.json` + `design.json` | W2-B loader → W2-A validation → W3-A compiler; same project ID and two scene-local `sites` layers. |
| `data/period-a.geojson`, `data/period-b.geojson` | Complete feature inputs, 7 per source, same feature IDs but distinct source scopes. SHA-256 values in the manifest identify exact current bytes. |
| `compiled.expected.json` | W3-A compiler → W2-C/W3-B player → W3-C publication; two distinct runtime layer IDs, one shared scale, bound/free annotations and a resettable opacity control. |
| `diagnostics.expected.json` | Mutations to the base specimen; each yields at least the specified blocking code/path/IDs and no publishable compiled result. Exact prose is illustrative; G1 should freeze stable code/path/ID semantics. |

The positive scale oracle is hand-derived from all 14 features: 13 valid numbers,
one null, zero invalid; domain `[0,120]`, three equal intervals with edges
`[0,40,80,120]`. Values `0` and `40` enter the first and second classes
respectively; `80` and `120` enter the third. The null receives the no-data
style and a legend entry. Both scenes use the same camera and legend. Activating
scene `b`, returning to `a`, and changing the opacity control must never reuse
`b`'s layer binding or leave `a` at a changed value after re-entry.

## Additional generated edge oracles

These are test transformations, not committed source observations. Start from a
fresh base specimen for each case and recompute resource hashes when changing
data so the intended semantic check is reached before hash validation.

| Transformation | Expected result |
| --- | --- |
| Set all 14 `value`s to null | `MEASUREMENT_REQUIRED` or `VALUE_INVALID` blocking numeric scale, count missing 14; no invented `[0,1]` domain. |
| Set all 14 values to `7` | One constant class labeled `7 index points`; no fabricated range. |
| Use six or more distinct categories on point and polygon copies | Stable lexical category order and matching legend colors from complete data; five-item profile samples cannot truncate categories. |
| Add empty string, null, `"NaN"`, or an unparseable numeric string | Empty string/null are missing; nonempty nonnumeric strings are invalid. JSON cannot contain literal `NaN`/Infinity; reject them before serialization. |
| Request edges from a tiny near-constant range | Ordered, nonduplicate effective edges; G1 must freeze the exact precision rule and displayed effective class count. |
| Change bound annotation to `p9`, duplicate `p1`, or make a comparison member point at the wrong source | `REFERENCE_MISSING`, `REFERENCE_AMBIGUOUS`, or `REFERENCE_MISSING` respectively; annotation text is not silently detached. |
| Make `value` a numeric identifier or change one member unit | `MEASUREMENT_REQUIRED` / `MEASUREMENT_INCOMPATIBLE`; no false magnitude legend. The base specimen's interval override is valid and its rationale round-trips. |
| Change declaration override, target, design, source bytes or media bytes after compiling | `INPUT_STALE` before export; recomputation required. |
| Set basemap to `protomaps-light`, classification to `quantile`, or use a radius slider over data-driven size | Blocking `CAPABILITY_UNSUPPORTED` or binding incompatibility; imported author intent remains intact. |
| Add traversal, drive, UNC, symlink escape, reserved runtime name, case-insensitive collision, missing media or poster | `ASSET_PATH_INVALID`, `ASSET_COLLISION`, `RESOURCE_MISSING` or `REFERENCE_MISSING` before writes; no claimed successful bundle. |
| Include URL media | URL remains a declared network dependency and credit is retained; the bundle is not labeled offline. |
| Include `</script>` and hostile HTML in narration, caption and annotation | Escaped text and syntactically valid generated scripts; no executable HTML injection. |

The [contract proposal](../contracts.md) gives the exact draft shapes and legacy
field trace. The [case dossier](../case-dossier.md) remains the only source for
conditional Potomac station identities; these specimens do not select the case.
