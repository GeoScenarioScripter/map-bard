# Stage 2 kickoff and method dossier

2026-10-20, Session 35, S2-W1-A. **Wave 1 OPEN; method dossier complete;
contracts, runtime spike and G1 remain pending.**

## Entry and frozen inputs

Stage 1 [G4](../stage-1/g4-review.md) is closed. The checkout was clean at
`f32ad03cd2eb583f6d6b8c61b90bb3decfb7b4d3`. The separately open Session 33
serving plan remains untouched. This kickoff implements no production schema,
analysis operation or reader feature.

Use project `potomac-daily-discharge`, revision 2, in
[first-slice](../../examples/projects/first-slice/README.md). The
[method specimen](specimens/method-case.json), revision `s2-w1-a-r1`, pins SHA-256
hashes for the manifest, narrative, design, acquisition inventories, derivation
script and both observation GeoJSON files. It identifies each of the six raw
responses by path, hash, observation ID, series ID and acquisition URL. Original
files remain unchanged. A future source refresh is a new reviewed input revision.

The [Stage 1 comparability review](../stage-1/case-comparability.md) supplies
the station-day interpretation and station-specific qualifications. This session
rechecks pinned local evidence, not current remote service availability. Context
geometry and the Whites Ferry photo are presentation resources, not observations
in this calculation. Existing acquisition/metadata inventories retain source
credits and retrieval times.

## Author task and method

For readers comparing these three gauges, answer: “How much did each station's
published daily mean discharge differ between the two selected dates?” Join
`potomac-2024` and `potomac-2025` by exact stable feature/station ID. Select exactly
one observation per station/date; compute **after minus before**, in `ft^3/s`.
Do not join by array position, station label or geographic proximity.

| Station                         | 2024-10-01 | 2025-10-01 | Signed difference (`ft^3/s`) |
| ------------------------------- | ---------: | ---------: | ---------------------------: |
| Hancock, `USGS-01613000`        |       5580 |        580 |                        -5000 |
| Point of Rocks, `USGS-01638500` |      23600 |       2020 |                       -21580 |
| Little Falls, `USGS-01646500`   |      17300 |       1800 |                       -15500 |

The dates are published station-local calendar days (Eastern time), not UTC
instants. Each pair has the same primary Daily/Mean series, parameter `00060`,
statistic `00003` and unit. Derived values must be finite numbers; the original
USGS decimal strings are preserved and explicitly converted only in preparation.
No unit conversion, date inference, interpolation, annualization, percentage
change or cross-station subtraction belongs to this method. Differences inherit
the reported observations' precision; no uncertainty estimate is invented.

Require both selected dates at every requested station, unique feature IDs and
observation references, compatible declarations and matching source metadata.
Unknown/null units, changed series, null/missing/non-finite/string values,
duplicates and mismatched station/date references must fail the selected
operation with paths and remedies. W1-C will exercise these mutations; this
kickoff's positive oracle is not evidence that rejection is implemented.

## Claim, trace and unsupported request

The authored claim specimen says only: “At each of the three selected stations,
the published daily mean discharge was lower on 2025-10-01 than on 2024-10-01.”
Its support is all three paired results and all six exact observations. A
station-specific statement binds only that pair. Claim IDs and scene bindings
are W1-B contracts, not fields added to GeoNarrative during kickoff.

The reader must be able to inspect statement → result row → before/after
observation → pinned source identity, alongside unit, dates, operation version
and qualifications. Preserve regulation/hydroelectric effects at Hancock and
Point of Rocks and regulation/diversion at Little Falls. Catchments differ;
these values do not establish reach balance, basin change, cause, flood risk
or unregulated flow. Approval status records provenance, not general truth.

The same specimen includes a typed **trend** request with expected outcome
`insufficient-evidence`. Two selected days do not supply the reviewed time-series
coverage or trend method. Return available observations and a remedy requesting
an appropriate time series/method or an explicit change to the bounded comparison.
Do not silently execute the difference operation as a successful trend, fabricate
an alternate conclusion, or rewrite author prose. This is a future executable
negative fixture; the verifier checks its recorded expectation only.

## Handoffs and release conditions

**W1-B next:** write proposed strict Zod shapes, representative valid/invalid
artifacts and public signatures in `contracts.md`; decide manifest migration,
scene bindings, diagnostic vocabulary, hashes and prepared evidence layout.
Inspect the existing strict project schema, diagnostic enums, loader snapshots
and compiler/publication checks first. Use the [plan's decision list](../stage-2-plan.md#decisions-w1-b-must-make-concrete-at-g1).
Never represent unsupported optional fields as already accepted by 0.1.0.

**W1-C next:** build an isolated method spike against this selection and test
missing/duplicate/unit/statistic/date/series/value failures, reordered features,
deterministic reruns and the typed trend request. Compare a focused operation
with the actual need for an embedded spatial engine. Record measured checks
separately from a requirements comparison; adding DuckDB is not a prerequisite.
Keep code under `docs/stage-2/scripts/` until G1 freezes package APIs.

**G1 coordinator:** review A/B/C, freeze `s2-g1-r1`, package/file ownership,
migration and exact public interfaces, then release W2-B first. W2-A/C wait for
built schema exports and the loader bridge. Do not mark G1 closed merely because
this arithmetic matches. Later gates require public composition and an observed
offline reader trace, as specified in the [Stage 2 plan](../stage-2-plan.md).

## Verification

From the repository root, with Node 20+ and no provider/network:

```sh
node docs/stage-2/scripts/verify-kickoff.mjs
node docs/stage-1/scripts/verify-g1.mjs
```

The first script verifies pinned hashes, raw/derived observations, series
metadata, manifest units, exact identities and the three hand-written oracles.
The second retains the previous source/specimen checks and needs built workspace
packages. Results belong in Session 35. No production analysis, rejection test
suite or browser acceptance is claimed here.
