# Potomac daily discharge — Stage 1 author example

This portable project asks: **How do published USGS daily mean discharge values at
Hancock, Point of Rocks and Little Falls compare on 2024-10-01 and 2025-10-01?**
It is a short story for local readers and watershed education, using six pinned
observations and one credited context photograph. It is a descriptive comparison,
not a trend, causal analysis, reach water balance or flood assessment. Read the
[case comparability review](../../../docs/archive/2026-10-20-process-reset/stage-1/case-comparability.md) and
[source acquisition record](source/README.md) for the measurement and reuse basis.

| Scene          | Reader task                                                   | Attention and source                                                                                                        |
| -------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `context-2024` | Locate the three gauges and read the 2024 station-day values. | Same USGS feature IDs; three bound station annotations; Whites Ferry photograph is context only.                            |
| `compare-2025` | Compare each gauge with its value on the second date.         | Same camera, station IDs and color scale; bound Point of Rocks annotation.                                                  |
| `limits`       | Interpret what the two snapshots permit.                      | Retains the second date's scale and points; bound Little Falls annotation and explicit regulation/diversion qualifications. |

All three scenes use the same **offline geographic context**: generalized 2024
state outlines from the U.S. Census Bureau and named Potomac River segments from
Maryland iMAP. They are explicit local vector layers under the station points,
with source credits in the page. They locate the gauges but do not calculate
flow, depict a tiled street basemap or imply that every tributary is shown.
See the [context acquisition record](source/README.md#session-34-offline-context).

The `daily_mean_discharge` quantity is declared as a ratio measurement in
`ft^3/s`. The original API values are strings; the checked derived GeoJSON
contains numeric values and retains the original strings, observation IDs,
series IDs, approval flags, qualifiers and source hashes. The dates are
**station-local Eastern time calendar dates**, not UTC instants. All six source
records have Approved status and null qualifier. The stations drain different
areas and are influenced by regulation, hydroelectric facilities or diversions.
The values should be compared by station across dates, without subtracting
gauges to claim reach gain or loss.

## Build and inspect

From the repository root with Node 20+ and pnpm 9.15.0:

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm -r build
node docs/archive/2026-10-20-process-reset/stage-1/scripts/verify-g1.mjs
node examples/projects/first-slice/data/derive.mjs
node examples/projects/first-slice/data/derive-context.mjs
node examples/scripts/build-first-slice.mjs out/potomac-example
```

Choose a **new** output directory for each build. The script loads and validates
the editable project, compiles it without an LLM, reloads the source files to
check freshness, and publishes the compiled page. It uses public package exports.
Open `out/potomac-example/index.html` for the browser review; script success alone
does not certify browser playback. The publication is separate from the editable
project. To build a relocated copy of the project, pass its directory as the
second argument:

```sh
node examples/scripts/build-first-slice.mjs out/potomac-relocated path/to/copied/first-slice
```

`verification.json` records the project revision and input hashes, compiler and
runtime asset identity, diagnostic codes and affected IDs, compiled semantic
hash, output file hashes, and required network URLs. It omits absolute source
paths and timestamps. `verification-environment.json` keeps elapsed time and
platform details separate. The page's MapLibre assets, station data, geographic
context and image are local; the build declares **no required network URLs**.
In Session 34, a reader retested the corrected direct-file page in Edge
155.0.4283.45 and reported working wheel navigation, geographic context,
offline reload and relocated playback, with no Console or Network errors.
The [browser record](../../../docs/archive/2026-10-20-process-reset/stage-1/browser-checks.md) separates that
report from generated-output checks.

## Import and diagnostics

For a separate v0.1.0 GeoNarrative, call the public
`importLegacyNarrative(inputPath, newProjectDirectory)` API, then inspect its
`ok`, `diagnostics`, and `value.unsupportedRequests` fields before compiling.
An import preserves source bytes but does not promise that every legacy request
is supported by the compiled player. This example is already in the editable
project format and needs no import.

To inspect a failure without changing this project, copy it to a scratch
directory, edit a copied data file, and run the build script with that directory
as the second argument. The loader reports `RESOURCE_HASH_MISMATCH` and does not
publish a page. An unsupported basemap style produces
`CAPABILITY_UNSUPPORTED` during compilation. Diagnostics include a path, IDs
where available, and a remedy. Restore the copy from pinned source files,
update its resource declaration only after an intentional data review, and use
a new output directory for another build.

The image is **Cynthia L. Cunningham, U.S. Geological Survey (Public Domain)**.
It depicts the Potomac area at Whites Ferry, not a gauge or either observation
date. Data are credited to the **U.S. Geological Survey**. See the project
manifest and the acquisition record for links and source hashes.
