# Potomac comparability review — Session 15 / G1

2026-10-19. **Accept the Potomac case for the bounded Stage 1 fixture.** This
closes the source-selection/comparability prerequisite only. G1 remains blocked
on direct-file browser evidence; no Wave 2 work is released by this decision.

The selected question is the dossier's descriptive comparison of published
daily mean discharge at Hancock, Point of Rocks and Little Falls on 2024-10-01
and 2025-10-01. It does not ask for a trend, runoff yield, causal attribution,
flood risk, water balance or a reconstruction of flow moving downstream.

## Evidence and time basis

The [original acquisition](../../examples/projects/first-slice/source/README.md)
contains six Approved observations and the credited context photo. Session 15
adds eight untouched responses under
[source/metadata](../../examples/projects/first-slice/source/metadata/acquisition.json):
three monitoring-location records, the three exact time-series records referenced
by both dates, and two legacy daily-service responses covering all three stations.
Each file has its request URL, retrieval UTC time and SHA-256 in the new inventory.
The original seven acquisitions are unchanged.

All three series explicitly report `Daily`, `Mean`, `Primary`, parameter `00060`,
statistic `00003`, and `ft^3/s`. The six source observation IDs join to these series
by `time_series_id`; this is not a match based only on a station name. All sites
report `EST` and daylight-saving flag `Y`. The legacy responses independently
deliver the same six values, each qualified `A`, and include EST `-05:00`, EDT
`-04:00`, and daylight-saving enabled. Their date-time labels have **no offset**:
`YYYY-MM-DDT00:00:00` (with optional `.000`). They must not be parsed as UTC
measurement instants.

The USGS [metadata dictionary](https://api.waterdata.usgs.gov/ogcapi/v1/collections/monitoring-locations/schema?f=html)
defines the time-zone and daylight-saving fields. The agency's
[daily service documentation](https://waterservices.usgs.gov/docs/dv-service/daily-values-service-details/)
identifies the station/parameter/statistic combination and daily-value meaning.
USGS [WRIR 01-4044, sections 9.2–9.2.1, printed pages 65–66](https://water.usgs.gov/osw/pubs/WRIR01-4044.pdf)
describes daily means as time-weighted summaries over a day, normally using the
station's local zone with daylight saving where applicable. It permits other
processing zones; the general method alone would not prove a particular series.

**Review inference:** taken together, matching primary daily-mean series,
station-zone metadata, legacy date labels and matching values support comparison
of these published station-day summaries. Display the supplied calendar dates
with “USGS daily mean discharge; station-local dates (Eastern time)” rather than
manufacturing a UTC timestamp. Do not use metadata retrieval/last-modified times
as observation times. This review did not download all instantaneous measurements,
audit rating curves, prove exact integration boundaries, or reproduce USGS means.
Those are not required for this descriptive publication fixture; a future
subdaily alignment or recomputation claim needs its own evidence.

## Qualifications that must survive publication

| Station                          | Drainage area (mi²) | Source-backed constraint                                                                                                                                                                                                                                                                           |
| -------------------------------- | ------------------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hancock / `USGS-01613000`        |               4,064 | [Station remarks](https://waterdata.usgs.gov/monitoring-location/USGS-01613000/) describe upstream power-plant effects at low flow and reservoir regulation.                                                                                                                                       |
| Point of Rocks / `USGS-01638500` |               9,651 | [Station remarks](https://waterdata.usgs.gov/nwis/uv/?PARAmeter_cd=00400&site_no=01638500) describe reservoir effects and potentially substantial low-flow effects from run-of-river hydroelectric plants. These are discharge remarks; water-quality sensor remarks are not applied to discharge. |
| Little Falls / `USGS-01646500`   |              11,560 | [Station remarks](https://waterdata.usgs.gov/monitoring-location/USGS-01646500/) document water diversions and reservoir effects. These observations are not unregulated natural flow.                                                                                                             |

These distinct catchments are not interchangeable replicates. Common units and
dates allow a shared numeric color scale for the reported quantity; they do not
remove regulation, diversion, travel-time or drainage-area differences. Do not
infer a reach gain/loss by subtracting gauges or normalize by drainage area in
Stage 1. Two same-season dates do not establish a trend or comparable weather.
Approved status is a publication status, not a causal or accuracy guarantee.

The Whites Ferry photograph remains context only, with agency/photographer credit
and no assertion that it depicts a gauge or either observation date. Its rights
and byte hash are in the original acquisition record.

## Handoff and verification

W2-B may prepare two three-feature WGS84 GeoJSON resources **after G1 releases
Wave 2**. Preserve station feature IDs, source observation/series IDs, original
date strings, status, qualifiers and source hashes. Validate and explicitly
convert the decimal strings in derived files only; retain the originals. Carry
the date/unit/interpretation qualifications into the project and later export.
Do not create a new analysis operation or use the context photograph as evidence.

`node docs/stage-1/scripts/verify-g1.mjs` checks the eight new hashes, exact
station/series joins for both dates, metadata fields and legacy value agreement,
alongside existing G1 checks. This validates the documentary inputs; the bounded
suitability decision above is a human-readable review judgment. No production
validator/compiler or browser pass is implied.
