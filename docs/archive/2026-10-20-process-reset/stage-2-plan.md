# Stage 2 — Reproducible findings and evidence

Detailed after Stage 1's [G4 closure](stage-1/g4-review.md) on 2026-10-20.
**OPEN — Wave 1 kicked off in Session 35; W1-A complete, W1-B/C pending,
G1 open. No Stage 2 production feature is implemented.** Parent:
[implementation stages](implementation-stages.md). Actual session numbers belong
in `BUILD_LOG.md` when work opens.

The [kickoff and method dossier](stage-2/kickoff.md) pins the input revision,
records the checked oracle and gives the next sessions their concrete handoffs.
The machine-readable [case fixture](stage-2/specimens/method-case.json) is a
review specimen, not a released analysis schema.

## User outcome and bounded case

An author can recompute a defensible finding from a pinned local project,
connect a qualified claim to selected observations and the operation that
produced it, inspect that trace, and see when an input edit makes the result
stale. A reader can inspect the trace in a portable published page without an
analysis service.

Use the Stage 1 Potomac project and its six published USGS daily mean values.
The first operation is **signed per-station change in `ft^3/s` from 2024-10-01
to 2025-10-01**, joining on stable station ID and keeping the two station-local
calendar dates explicit. The hand-check oracle is Hancock `580 − 5,580 = −5,000`,
Point of Rocks `2,020 − 23,600 = −21,580`, and Little Falls
`1,800 − 17,300 = −15,500 ft^3/s`. These are differences between each station's
two snapshots. They are not a trend, reach loss, basin change, causal finding,
flood assessment or calculation of unregulated flow.

The first claim fixture should say only that each selected station's published
daily mean was lower on the 2025 date than on the 2024 date, with the exact
station-local values, unit and qualifications attached. A separate requested
trend fixture must return insufficient-evidence diagnostics and available facts;
it must not invent a replacement conclusion or rewrite the story. Percentage
change, drainage-area normalization and geographic overlays remain out of this
first calculation unless G1 proves a need and records a revised oracle.

## Boundaries and contracts to freeze at G1

- Keep GeoNarrative and the Stage 1 project readable. Add independently
  versioned analysis/result/evidence artifacts; define any manifest references
  and migration before writing them. A published page gets prepared results and
  qualifications, not an analysis runtime.
- Distinguish source observation, deterministic result, authored interpretation
  and cited context. A claim links to exact source IDs/features/attributes and a
  result ID where appropriate. Source credit and approval status are provenance,
  not proof of a general or causal claim.
- Record the operation ID/version, ordered station/date selection, units,
  parameter/statistic, input fingerprints, output values and missingness. The
  trace must be readable through public APIs and the publication.
- Require one observation per station/date and compatible Daily/Mean discharge
  declarations in `ft^3/s`. Duplicate, missing, incompatible, unknown-unit and
  malformed values yield actionable diagnostics. No silent numeric coercion,
  implied timezone conversion, or automatic cross-station subtraction.
- Make dependency invalidation explicit: a changed observation, declaration,
  selected date/station or operation version makes a cached result stale. An
  unrelated design edit must not silently rewrite the computation. Stage 3 can
  build scoped editing on these stable identities.
- Compare the focused in-process operation with DuckDB Spatial only against the
  selected method. This arithmetic join has no spatial predicate; the default
  decision is a focused deterministic implementation unless G1 evidence shows a
  concrete need for the embedded engine.

## Sequential waves, owners and gates

| Work unit                                    | Exclusive scope and output                                                                                                                                                       | Handoff / gate evidence                                                                                                                                                    |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S2-W1-A — Method and claim case**          | `docs/stage-2/` source/method dossier, hand-check oracle, selection rules, two-date qualifications and insufficient-trend specimen. No production schema edits.                  | Trace each oracle input to the pinned USGS response and explain why station-by-station change is valid while reach, trend and cause are unsupported.                       |
| **S2-W1-B — Artifact contracts**             | Proposed Zod analysis/result/evidence schemas, IDs, version/migration rules, claim references and diagnostic examples in `docs/stage-2/`. No dependent implementation before G1. | Valid/invalid specimens for exact observations, results, claims and stale dependencies; preserve Stage 1 loading.                                                          |
| **S2-W1-C — Method/runtime spike**           | A bounded operation spike and comparison note in `docs/stage-2/`; temporary code stays outside package APIs.                                                                     | Reproduce the three arithmetic oracles, test missing/duplicate/incompatible cases, and justify focused code or an embedded engine without adding one speculatively.        |
| **G1 — contract and method gate**            | Coordinator freezes one method, specimen revision, package ownership, public signatures and migration choice.                                                                    | Approved fixture and source IDs, hand-check values, diagnostic vocabulary and browser presentation requirement. No W2 consumer starts from a proposal.                     |
| **S2-W2-A — Analysis and staleness**         | `@mapbard/core` deterministic operation, dependency/fingerprint checks and focused tests using public `@mapbard/schema` contracts.                                               | Exact values/units, stable IDs, missing/duplicate/incompatible diagnostics, deterministic reruns and stale-result rejection.                                               |
| **S2-W2-B — Evidence references**            | `@mapbard/schema` implementation, reference validation and tests; project load/import changes only as frozen at G1.                                                              | Observation/result/claim distinctions, source/result links, version rejection, old-project compatibility and qualified trace.                                              |
| **S2-W2-C — Publication presentation**       | `@mapbard/renderer` prepared evidence display, source/qualification markup and tests. No browser-side analysis.                                                                  | Published trace is accessible and escaped, source links resolve, qualifiers survive and offline output declares no new network dependency.                                 |
| **G2 — engine integration**                  | Coordinator integrates A/B/C and reruns the Stage 1 regression path.                                                                                                             | Fresh pinned project computes the oracle through public exports and rejects stale inputs; older projects still load and publish.                                           |
| **S2-W3-A — Author example**                 | Update the Potomac project and documented public-package script with one result and qualified claim.                                                                             | Rebuild twice with identical shareable records; read the same result in source, analysis artifact and compiled publication.                                                |
| **S2-W3-B — Independent challenges**         | Separate public-API tests and verification record for changed source, changed declarations, bad unit, duplicate date, missing station, unsupported trend and migration.          | A failed premise never publishes a computed claim; edit invalidation and trace identity are explicit.                                                                      |
| **S2-W3-C — Browser and explanation review** | Direct-file/offline reader check and inspection of result, evidence and qualifications; record browser/version, Console/Network, keyboard and narrow-window observations.        | Distinguish reader report, static review, automation and manual interpretation. Report any failed evidence path to G3.                                                     |
| **G3 — Stage 2 closure**                     | Coordinator resolves defects, runs root build/tests/lint/smoke and records limits; then details Stage 3.                                                                         | One real finding reproduced from pinned inputs; inspectable claim-to-source/result trace; stale dependents diagnosed; qualified offline publication observed in a browser. |

The coordinator owns shared plans, `BUILD_LOG.md`, package barrels, manifests,
lockfile and integrated public wiring. W1 proposals may run in parallel against
frozen Stage 1 inputs; W2 starts only after G1, and W3 starts only after G2.
Exclusive source ownership is frozen at each gate before work is dispatched.
Unrelated edits are preserved, and a gate records any contract deviation before
dependent work resumes.

### Execution order and actual status

Work units may be serialized; no extra task or agent is required. Budget nine
work-unit sessions plus three gate reviews, with correction sessions as needed;
these are scope estimates, not elapsed-time promises.

| Step          | Release dependency                            | Status / required artifact                                                                                                     |
| ------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| W1-A          | Stage 1 G4                                    | Complete, Session 35: `stage-2/kickoff.md`, `specimens/method-case.json`, `scripts/verify-kickoff.mjs`                         |
| W1-B          | W1-A case revision                            | Next: `stage-2/contracts.md`, executable proposed Zod blocks and valid/invalid JSON specimens                                  |
| W1-C          | W1-A method; coordinate proposed types with B | Pending: isolated `stage-2/scripts/` spike and `stage-2/runtime-choice.md` with challenge results                              |
| G1            | A, B and C reviewed together                  | Pending: `stage-2/g1-review.md`, frozen `s2-g1-r1`, exact exports and file ownership                                           |
| W2-B          | G1                                            | First W2 slice: implement schemas; coordinator exports/builds them and integrates the loader bridge before releasing consumers |
| W2-A and W2-C | Built W2-B public contracts and loader bridge | Then independent engine and presentation work; no private imports or placeholder public types                                  |
| G2            | W2 A/B/C                                      | Public compute → validate → compile → render → write composition and Stage 1 regressions                                       |
| W3-A and W3-B | G2                                            | Real example and independent adversarial checks; browser baseline freezes after example integration                            |
| W3-C          | Integrated W3-A output                        | Direct-file browser evidence tied to exact output hashes                                                                       |
| G3            | W3 A/B/C and corrections                      | Stage closure and Stage 3 detail                                                                                               |

This dependency order refines the wave table: W2 is not three consumers starting
simultaneously from documentation. The coordinator owns loader/import/compiler
bridges in `core/src/project/` and `core/src/compile/`; W2-A owns new analysis
modules, W2-B schema modules, and W2-C renderer modules. Shared schema diagnostic
enums, barrels and manifests integrate serially. Every work-unit handoff records
files, commands/results, specimen revision, deviations and remaining limits.

### Decisions W1-B must make concrete at G1

1. **Persistence and versions:** propose independently versioned analysis,
   result and evidence files. The current strict 0.1.0 manifest accepts only
   narrative/design paths: do not silently append fields. Compare an explicit
   new manifest version with a required namespaced extension; select one at G1.
   Specify old-project loading, opt-in non-destructive migration to a new
   destination, unknown-version rejection, and behavior in older readers.
   GeoNarrative 0.1.0 and the handwritten example remain readable. Evidence
   bindings reference existing scene IDs without creating a second scene order.
2. **Public interfaces:** freeze typed parse/validate, execute, freshness and
   trace-inspection signatures, their `Result<T>` diagnostics, filesystem versus
   pure boundaries, and compile/render arguments. Document proposed names as
   proposals until exported. Trace inspection must work without an LLM.
3. **Identity:** authored operation/claim IDs persist across recomputation;
   result identity includes method version, selection and input fingerprint.
   References include source ID, feature ID, attribute, original observation ID
   and series ID. Reject duplicate IDs, dangling links and cycles if the selected
   representation permits them; no general evidence graph is required.
4. **Freshness:** specify canonical serialization, ordered selections, missing
   versus null, hash algorithm and all included fields. Start conservatively with
   hashes of selected source files plus measurement declarations, method/version
   and parameters. An edit anywhere in a selected source file may invalidate it;
   row-granular caching is deferred. Design-only edits preserve the analysis
   result but still invalidate the Stage 1 compiled snapshot. Qualifier/credit
   or claim edits invalidate prepared evidence/publication, even if arithmetic
   stays identical. A claim/result mismatch or forged cached value must not pass
   merely because its input hash matches: recompute/compare before publication.
5. **Failure policy:** fail the entire selected calculation on a missing or
   invalid required pair; retain diagnostic facts separately, never a partial
   successful claim. Unsupported trend is a typed request/prerequisite case,
   not natural-language fact checking. Stale linked computed claims block
   publication until recomputed and revalidated; no silent stripping or prose
   rewrite. An old exported page is a static snapshot, not a live monitor.
6. **Prepared evidence:** freeze a minimal compiled evidence payload and version
   dispatch. Reader inspection shows claim, exact before/after values, signed
   difference, dates, unit, method/version, provenance IDs and qualifications.
   Embed enough trace to inspect offline; external source links are optional
   navigation, never required fetches. Keep local/private paths out of output.

### Verification matrix and gate checklist

| Acceptance case                                                                     | Owner / gate            | Required evidence                                                                          |
| ----------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------ |
| Six original records → derived selections → three signed differences                | W1-A/C, W2-A / G1–G2    | Exact oracle, no feature-order join, stable station/date identities                        |
| Null, missing, duplicate, string/non-finite value, wrong unit/statistic/series/date | W1-C, W2-A/B / G1–G2    | Stable codes, artifact path/IDs and remedy; no successful result                           |
| Two snapshots requested as trend                                                    | W1-A/C, W2-A / G2       | Insufficient-evidence diagnostic and available observations; no generated conclusion       |
| Source bytes/declarations/selection/method change                                   | W2-A, W3-B / G2–G3      | Stale result and blocked dependent publication, including updated manifest hash            |
| Design edit; qualifier edit; tampered result; removed scene                         | W2 A/B/C, W3-B / G2–G3  | Correct dependency boundary; recompile, revalidate evidence, or reject as appropriate      |
| Old project, migrated project, unsupported artifact version                         | W2-B + coordinator / G2 | No content loss, explicit version dispatch, old and new public build paths                 |
| Deterministic rerun and relocation                                                  | W3-A/B / G3             | Two fresh runs with identical shareable records; no timestamps/private paths in identity   |
| Escaping, unsafe URLs, missing evidence, unknown required extension                 | W2-C + coordinator / G2 | Safe or rejected publication with actionable diagnostics                                   |
| Trace access on direct-file/offline page                                            | W3-C / G3               | Browser/version, hashes, Console/Network, keyboard focus, narrow layout and qualifications |

G1 closes only with runnable proposed-schema specimens, the method spike's
negative cases, a justified engine choice, selected migration, signed-off public
signatures and a frozen presentation specimen. A requirements comparison may
reject DuckDB Spatial without installation; do not call that a benchmark.

G2 runs frozen install, recursive build/tests, root `pnpm test` (including public
integration tests), lint and both legacy and compiled example smoke checks.
G3 repeats these after final changes, verifies two fresh publications and records
actual browser evidence separately. Use `corepack pnpm` if the Windows shim
requires it. Documentation-only sessions need formatting, links and diff review;
review scripts run against pinned inputs. Failures keep the gate open with a
specific correction owner. Browser restrictions require an authorized/manual
reader check; serving work from Session 33 cannot replace direct-file acceptance.

### Refinement coverage and explicit deferrals

| Ideas   | Stage 2 disposition                                                                                                                                          |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R11–R13 | W1-B/W2-B observation, result, authored interpretation and context contracts; W2-C inspectable scene evidence                                                |
| R14–R15 | W1-A/C and W2-A only the selected compatible snapshot operation and necessary measurement declarations; general aggregation/normalization/profiling deferred |
| R16     | W1-A/C insufficient-trend specimen; author-led redirection goes to Stage 3                                                                                   |
| R17–R18 | W1-C method choice; W2-A fingerprints/freshness; no general spatial engine or dependency graph                                                               |
| R09/R25 | Prepared offline result for a compatible vector comparison, no browser analysis                                                                              |
| R20/R33 | Explicit method prerequisites and actionable failures; no expanded cartographic technique catalog                                                            |
| R32/R36 | Separate structural, arithmetic, provenance, determinism and browser evidence through G1–G3                                                                  |

Stage 2 closure requires all matrix rows to pass or an explicitly narrowed scope
accepted in the gate record; a generated page cannot substitute for the reader
trace check. No research efficacy claim follows from this case alone.

## Out of scope and research handoff

No general query language, raster/temporal GIS platform, unrestricted generated
code, causality inference, automatic narrative rewriting, mandatory cloud
service, built-in agent or workbench is authorized here. R11–R18 and R25 are
the primary refinement IDs; R09/R17 govern prepared local playback and engine
choice, R16 supplies the insufficient-evidence case, and R32/R36 require
separate reproducibility and browser evidence. Stage 3 will test whether an
external coding agent can use these operations to redirect an unsupported story
angle without overwriting author content; Stage 5 evaluates reader outcomes.
