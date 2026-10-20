# Potomac source acquisition — G1 review

Retrieved 2026-10-19 Asia/Shanghai (2026-10-18 UTC), BUILD_LOG Session 14.
These are original public source bytes, **not a ready-to-render project**.
Session 15 accepts source comparability for the bounded descriptive fixture;
see the [review](../../../../docs/stage-1/case-comparability.md). G1 remains open
for direct-file browser evidence, and Wave 2 is not released.

The preceding gate status describes the original G1 acquisition. G1 has since
closed, and the project now contains derived station data and the bounded context
sources documented below.

[acquisition.json](acquisition.json) records exact request URLs, retrieval times
and SHA-256 hashes for six USGS responses and the original context photograph.
Each response contains one daily point record and no next-page link. All six
have `parameter_code=00060`, `statistic_id=00003`, `unit_of_measure=ft^3/s`,
`approval_status=Approved`, and `qualifier=null`; coordinates match the three
WGS84 station locations in the [dossier](../../../../docs/stage-1/case-dossier.md).

| Station                       | 2024-10-01 value | 2025-10-01 value |
| ----------------------------- | ---------------: | ---------------: |
| USGS-01613000, Hancock        |             5580 |              580 |
| USGS-01638500, Point of Rocks |            23600 |             2020 |
| USGS-01646500, Little Falls   |            17300 |             1800 |

These are transcribed source observations, not computed trends or causal results.
Original API values are decimal **strings**. Keep the source files untouched;
future preparation must explicitly validate/convert only the selected numeric
value into derived GeoJSON, retain original record/time-series IDs, status,
qualifier and `last_modified`, and hash both original and derived files. Use
station ID as the derived feature ID while preserving the API observation ID in
properties. No derived data files have been authored yet.

Run from the repository root after building:

```sh
node docs/stage-1/scripts/verify-g1.mjs
```

This verifies all seven byte hashes, six station/date tuples, values, status,
units and exact coordinates. `.gitattributes` disables text normalization for
these original JSON responses; do not format or rewrite them. A future download
may differ because the service can revise records or timestamps. Save a new
version and review it instead of silently updating the recorded hashes.

Data credit: **U.S. Geological Survey**. USGS-produced data are U.S. public domain
under the agency's [copyright and credit policy](https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits).
The [photo's own page](https://www.usgs.gov/media/images/potomac-river) states
Public Domain and credits **Cynthia L. Cunningham, U.S. Geological Survey**.
The downloaded JPEG was visually inspected and decodes at 1704 × 2272 pixels.
Use the agency's description of a stream flowing into the Potomac at Whites
Ferry as context. It is not a gauge photograph or evidence for either date's
discharge; no capture date is inferred from its appearance or search tags.

Session 15 adds eight original metadata/cross-check responses with a separate
[acquisition inventory](metadata/acquisition.json). The review script verifies
their hashes, both-date series joins, Daily/Mean and time-zone fields, and exact
legacy-service value agreement. The seven original files above are unchanged.
Date labels represent published station-day summaries, not UTC instants; no
instantaneous-data recomputation is claimed. Differences in drainage area,
reservoir regulation, diversion and local hydroelectric effects must remain
visible. Point of Rocks' current [station remarks](https://waterdata.usgs.gov/nwis/uv?site_no=01638500)
specifically describe reservoir and hydroelectric influences. An Approved record
does not by itself make stations exchangeable or establish a basin-wide cause.

## Session 34 offline context

The reader rejected the compiled Potomac story's featureless neutral map in the
Session 32 [browser review](../../../../docs/stage-1/browser-checks.md). The user
selected a credited local offline context map. These two added public GIS
responses are source geometry for **context only**, not new discharge evidence.
Both were retrieved on 2026-10-20 and kept as original response bytes:

| Source file                  | Official layer and bounded request                                                                                                                                                                                                                     | SHA-256                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `potomac-states-raw.geojson` | [U.S. Census Bureau, 2024 States 5M](https://tigerweb.geo.census.gov/arcgis/rest/services/Generalized_ACS2024/State_County/MapServer/8), `query` with `STUSAB IN ('MD','VA','WV','PA','DC')`, fields `OBJECTID,STUSAB,NAME`, `outSR=4326`, `f=geojson` | `d17ef45f9e3940ed7d757065b5900d522450645e94fc21630960630117cb59c0` |
| `potomac-river-raw.geojson`  | [Maryland iMAP, Rivers and Streams — Generalized](https://mdgeodata.md.gov/imap/rest/services/Hydrology/MD_Waterbodies/FeatureServer/0), `query` with `PNAME LIKE '%Potomac%'`, fields `OBJECTID,PNAME,HUC,LEV`, `outSR=4326`, `f=geojson`             | `e39d981e6d0033d3c383bc2f52e557dea7930460f4d1727a76704ddd1f0f377a` |

`data/derive-context.mjs` verifies both raw hashes and writes stable-ID
FeatureCollections: five state polygons and 52 segments whose Maryland name is
exactly `POTOMAC R`. It does not create or interpolate a river course. The five
state outlines are generalized, and the river lines are a deliberately bounded
subset of Maryland's named network. They are not a navigational map, do not show
all waterways or streets, and do not assert hydraulic connections or upstream
flow calculations. The final story lists both sources and those qualifications.
