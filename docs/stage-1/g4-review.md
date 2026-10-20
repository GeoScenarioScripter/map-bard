# G4 — Stage 1 integration and closure review

2026-10-20, BUILD_LOG Session 34. **CLOSED / PASS for the bounded Stage 1
publication target.** This decision combines automated checks with the reader's
direct-file Edge report. It does not certify a general basemap, a full GIS
analysis engine, or every media type in a browser.

## Integrated candidate

The editable Potomac project is revision 2. Its three scenes compare published
USGS daily mean discharge at Hancock, Point of Rocks and Little Falls on
2024-10-01 and 2025-10-01. All scenes show credited, local generalized state
outlines and Potomac River segments. The river geometry is context, not a
calculation or a complete hydrographic network. The page retains the explicit
station, date, regulation and diversion qualifications in the
[case review](case-comparability.md). The frozen g1-r1 neutral basemap contract
is unchanged; context is supplied as authored vector layers.

The final real-example build is `out/w4c-session34-release/index.html`. Its
eight published files are byte-identical to `out/w4c-session33-review/` (the
reader-tested page). Two fresh release builds have identical shareable
`verification.json` records, each declaring eight publication files, no
diagnostics and no required network URLs. The release record's generic browser
limitation wording differs from the earlier review build's record; no published
page asset differs. The synthetic control
specimen is `out/g4-control-review/index.html`, also built with no diagnostics
or required network URLs. Output directories are local review artifacts, not
checked-in source.

## Gate evidence

| Requirement                                                  | Evidence and result                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Case and author question                                     | [G1 source/comparability review](case-comparability.md) accepts only a descriptive station-by-station comparison. The [author example](../../examples/projects/first-slice/README.md) documents scene purpose, media role and limits. Pass within that scope.                                                                                                                                                                                                                        |
| Contracts, references, measurements and unsupported requests | [G2](g2-review.md), [G3](g3-review.md), and [W4-B](verification.md) cover version rejection, IDs, feature targets, shared scale prerequisites, source hashes, unsupported basemaps and stale inputs. Pass by executable tests and reviewed fixtures.                                                                                                                                                                                                                                 |
| Full-data compilation and faithful playback                  | Compiler/player tests cover full-data domain, exact class edges, categorical/area/control variants, scene IDs and revisits. Session 34 adds integer-readable legend labels without changing class edges. The reader reported the corrected real-page scene navigation and the separate opacity slider's keyboard update and revisit reset in Edge. Pass for the supported Stage 1 subset.                                                                                            |
| Safe, reproducible publication                               | [W4-B](verification.md) covers asset preflight, editable-state separation, repeat builds and stale-publication rejection. Two fresh release builds have identical shareable verification records, and their eight published files match the reader-tested page. Pass.                                                                                                                                                                                                                |
| Direct-file, offline and relocated playback                  | The reader reported that the corrected real page worked in Edge 155.0.4283.45 after hard refresh, network-disabled cache-disabled reload and opening a relocated offline copy. Console/Network had no reported errors or remote failures. The synthetic slider page also passed its offline browser retest. Pass as reader-reported evidence; no automated browser trace was available.                                                                                              |
| Presentation and basic accessibility                         | Reader screenshots exposed wheel capture, missing context, raw decimal legend bounds and cramped photo credit; Session 34 corrected these. The reader reported sufficient geographic context, wheel scrolling, Tab annotation, narrow-window and reduced-motion behavior, plus keyboard operation of the synthetic slider. Source review confirms title, headings, alt text, focus styles and reduced-motion path. Pass for a basic manual review, not a formal accessibility audit. |
| Integrated repository checks                                 | Five package builds, 131 root tests (schema 22, core 74, renderer 32, root integration 3), lint, G1 verifier, legacy nine-file smoke, real and synthetic publication builds, generated-script syntax and diff/format checks pass. The legacy renderer retains its documented unsupported-basemap warning.                                                                                                                                                                            |

The [browser record](browser-checks.md) keeps the failed Session 32 candidate,
repair and reader retests distinct. The reader supplied browser version and
pass/fail notes, but no DevTools export, exact viewport dimensions or OS build.
The real project has no video poster or anchored-media popup. Those paths have
compiler/player/publication test coverage, while visual browser behavior for
them remains unobserved. This limit does not block the bounded Potomac story or
the synthetic control gate; it must not be recast as broad browser certification.

## Outcome and handoff

Stage 1's bounded target is delivered: a model-free editable project can be
loaded, validated, compiled, published and opened from a local file without
networking, with credited source context and observable scene/control behavior.
The published page is separate from the project. No workbench, agent toolkit,
analysis/evidence computation, general PMTiles support, hosted serving or
commercial system is implied.

Stage 2 takes the pinned two-date station case forward as a reproducible
**per-station change** calculation, explicitly avoiding upstream-to-downstream
subtraction, causal attribution and trend claims. It must type and link the
result, observation sources, operation, units and qualifications; changed input
hashes must invalidate the result. See the [Stage 2 plan](../stage-2-plan.md).
