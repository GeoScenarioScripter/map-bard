# Stage 2 — Reproducible findings and evidence

Detailed after Stage 1's [G4 closure](stage-1/g4-review.md) on 2026-10-20.
**PLANNED; no Stage 2 feature is implemented by this plan.** Parent:
[implementation stages](implementation-stages.md). Actual session numbers belong
in `BUILD_LOG.md` when work opens.

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

## Out of scope and research handoff

No general query language, raster/temporal GIS platform, unrestricted generated
code, causality inference, automatic narrative rewriting, mandatory cloud
service, built-in agent or workbench is authorized here. R11–R18 and R25 are
the primary refinement IDs; R09/R17 govern prepared local playback and engine
choice, R16 supplies the insufficient-evidence case, and R32/R36 require
separate reproducibility and browser evidence. Stage 3 will test whether an
external coding agent can use these operations to redirect an unsupported story
angle without overwriting author content; Stage 5 evaluates reader outcomes.
