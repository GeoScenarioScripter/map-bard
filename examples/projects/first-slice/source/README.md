# Potomac source acquisition — G1 review

Retrieved 2026-10-19 Asia/Shanghai (2026-10-18 UTC), BUILD_LOG Session 14.
These are original public source bytes, **not a ready-to-render project**.
Session 15 accepts source comparability for the bounded descriptive fixture;
see the [review](../../../../docs/stage-1/case-comparability.md). G1 remains open
for direct-file browser evidence, and Wave 2 is not released.

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
