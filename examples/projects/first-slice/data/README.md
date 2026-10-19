# Derived Potomac resources — S1-W2-B

Run `node examples/projects/first-slice/data/derive.mjs` from the repository root. It verifies the pinned acquisition hashes before deriving two three-feature WGS84 GeoJSON files and copying the credited context photograph. A repeat run verifies existing outputs byte for byte and refuses to overwrite a changed file. The original responses under `../source/` remain untouched.

| Resource                       | SHA-256                                                            |
| ------------------------------ | ------------------------------------------------------------------ |
| `potomac-2024-10-01.geojson`   | `517eb654caa03bc030882b50053afdf1644d1eb1166b072e92aa91c5a3daf30e` |
| `potomac-2025-10-01.geojson`   | `92ddb1b06bd1920bae501c5fc14a8f3cf625828766a469232719d832e036fd51` |
| `../media/potomac-context.jpg` | `25b420ffa5e22ab882cbfc42c7145b2697da9e9352b70afcaa0cc75e59f36ba7` |

The station ID is each feature's stable `id`. Properties retain the source observation ID, time-series ID, original decimal string, status, qualifier, source URL/hash, last-modified time, and station-local date. `daily_mean_discharge` is the explicitly checked numeric conversion in `ft^3/s`. The source qualification and time basis are copied into each derived feature for later authoring. These three distinct catchments are comparable only as published daily mean discharge at the stated stations and dates; no trend, causal inference, reach subtraction, or unregulated flow claim is derived.

The image is credited to Cynthia L. Cunningham, U.S. Geological Survey, Public Domain. It shows a Potomac context scene, not a gauge or either observation date. The final narrative, design, project manifest, and publication claims belong to S1-W4-A.
