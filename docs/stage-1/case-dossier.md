# Stage 1 case dossier — S1-W1-A

**Latest state, 2026-10-19 / Session 15:** the Potomac case is selected for the
bounded descriptive Stage 1 fixture after the [comparability review](case-comparability.md).
Six original observations, the context JPEG and eight metadata/cross-check
responses are acquired and hashed. See the
[source acquisition record](../../examples/projects/first-slice/source/README.md)
and [G1 review](g1-review.md). All six records have Approved status and null
qualifiers, matching station coordinates and `ft^3/s` units. Rights were checked
against the agency policy and the photo's own page. **Source comparability is
accepted for published station-day summaries; G1 remains blocked on direct-file
browser evidence.** Wave 2 is not released.
No derived project, trend, causal result or completed real-story acceptance is
claimed. The original Session 11 no-go audit below is retained as history;
its acquisition-failure statements describe that earlier run.

Audited 2026-10-18 in BUILD_LOG Session 11. This is a repository-authored
creator brief and source audit, **not** a user study, a finished project, or a
verified geographic finding. Two candidates were considered. No source data or
media bytes were copied into `examples/projects/first-slice/source/` because the
required source responses could not be retrieved and hashed in this environment.

## Decision for G1

**No-go for a real project fixture yet.** The preferred Matanuska River bankline
case has strong scientific context and explicitly public-domain USGS photography,
but the GIS bytes, their file CRS and their feature identities were not inspected.
The narrower Potomac River gauge case fits the planned point-rendering and WGS84
envelope in principle, but its six daily observations, statuses and qualifiers
could not be retrieved. G1 may continue contract and baseline integration work
independently; it cannot call either case verified or close the real-case gate.

The next acquisition pass should first try the Potomac candidate because it
requires no bankline conversion or new analysis method. If its daily values are
complete and approved or properly qualified, pin a small GeoJSON subset and a
permitted image with hashes. If it fails, record the missing data/date/media
condition and select a different case explicitly; do not substitute fabricated
values or the existing synthetic waterfront example.

## Creator task and reader question

Assumed creator: a watershed educator making a short, source-linked map story for
interested local readers. Assumed task: show how observed river conditions at
stable, named places differ between two dates, explain where the observations
were made, and state what the data do not establish. These are design assumptions,
not evidence about actual users (R02/R22/R37).

Provisional geographic question for the simpler candidate: **How do USGS daily
mean discharge observations at three Potomac River gauges compare on two same-
season dates?** A useful Stage 1 story would orient the reader to the gauges,
present the two dates with identical camera and scale, and end with measurement
and interpretation limits. It would not infer a long-term trend, erosion, flood
risk, or a cause from two daily snapshots (R13/R16).

Provisional scene purposes, subject to verified data:

| Scene              | Reader's job                                                                | Visual target and media                                                                                                  |
| ------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Context            | Locate Hancock, Point of Rocks and Little Falls along the Potomac.          | Three stable station IDs; one historical USGS river photo, captioned as context rather than as a measurement-date image. |
| First observation  | Read the selected day's daily mean discharge at all three gauges.           | Same point IDs, constant point geometry, labeled units and data status.                                                  |
| Second observation | Compare the same gauges using the same map extent and numeric color domain. | Same IDs and scale; no automatic claim that upstream-to-downstream differences measure a single process.                 |
| Synthesis          | Review what the two snapshots do and do not show.                           | Explicit source credit, date, regulation/diversion and approval/qualifier notes.                                         |

## Candidate 1 — Matanuska River braid-plain margins

The [USGS Scientific Investigations Report 2011-5214](https://www.usgs.gov/publications/geomorphology-and-bank-erosion-matanuska-river-southcentral-alaska)
describes a 65-mile southcentral Alaska study and delineated braid-plain margins
from 1949, 1962 and 2006 orthophotographs. It names GIS shapefiles among the
publication outputs. The report distinguishes mapped braid-plain change from
particular erosion processes; its abstract says streamflow statistics were not
clearly linked to the erosion. This is a stronger geographic story than an
unqualified outline overlay, but its original methods and uncertainties must
travel with any derived story.

| Audit item              | Finding / limit                                                                                                                                                                                                                                                                                                                                     |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authority and identity  | Janet H. Curran and Monica L. McTeague, USGS Scientific Investigations Report 2011-5214, DOI `10.3133/sir20115214`; [USGS publication page](https://www.usgs.gov/publications/geomorphology-and-bank-erosion-matanuska-river-southcentral-alaska).                                                                                                  |
| Observations and method | Braid-plain margins interpreted from 1949, 1962 and 2006 orthophotographs over the reported 65-mile study area. The precise source image dates, mapping tolerances and comparable subset require source-file/report inspection.                                                                                                                     |
| Proposed resource IDs   | `matanuska-margin-1949`, `matanuska-margin-2006`, with a shared reach ID only after checking original fields and geometry. These are proposed MapBard IDs, not claimed source IDs.                                                                                                                                                                  |
| Geometry and CRS        | Reported output is GIS shapefiles; a report figure is labeled NAD83 / UTM Zone 6. The actual `.prj` files were **not** inspected, so source CRS and any conversion to EPSG:4326 are unverified.                                                                                                                                                     |
| Measurement semantics   | Displaying two line positions is possible in principle; asserting area of expansion or a bank-erosion class requires the report's method, tolerances and feature mapping. Stage 1 must not recompute or independently claim the report's 861-acre result.                                                                                           |
| Media                   | [USGS bridge photo](https://www.usgs.gov/media/images/a-bridge-over-matanuska-river), dated 2008-08-06, credits Christian E. Zimmerman, explicitly marked Public Domain. Its date is contextual, not a 1949/2006 observation.                                                                                                                       |
| Reuse                   | [USGS reuse guidance](https://www.usgs.gov/faqs/are-usgs-reportspublications-copyrighted) treats USGS-authored data as U.S. public domain and asks for credit, while warning that some photos and other embedded material have third-party rights. Derived line data and any source orthophotos must be checked individually before redistribution. |
| Stage 1 fit             | Constant line overlays and a two-scene comparison are in the supported envelope. A source-to-WGS84 preparation step, stable corresponding feature IDs and uncertainty-aware annotations remain unverified. No projected input should be silently treated as WGS84.                                                                                  |

**Decision:** defer this candidate at G1 unless original vector bytes, `.prj`,
attribute table, extraction rights and a small comparable reach are inspected.
It should not force a reprojection or geomorphology-analysis feature into Stage 1.
The publication page was readable, but the `pubs.usgs.gov` report/GIS host returned
HTTP 403 through the research tool on 2026-10-18; no original bytes or hashes
were available to pin.

## Candidate 2 — Potomac River daily discharge at three gauges

USGS station pages verify the three persistent site IDs and WGS84 decimal
coordinates below. Their daily-record coverage includes both proposed dates,
2024-10-01 and 2025-10-01, but **coverage is not proof that the six requested
discharge values exist or have an acceptable approval status**. The USGS
[daily-values API documentation](https://api.waterdata.usgs.gov/docs/ogcapi/)
describes a GeoJSON point collection with `monitoring_location_id`, `time`,
`parameter_code`, `statistic_id`, `value`, `unit_of_measure`, `approvals_status`
and `qualifier`. The USGS [parameter guidance](https://nwis.waterservices.usgs.gov/docs/dv-service/daily-values-service-details/)
identifies `00060` as discharge in cubic feet per second and `00003` as mean.

| Proposed feature ID | Verified station and coordinates (WGS84, lon/lat)                                                                                                          | Source qualification                                                                                                                       |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `USGS-01613000`     | [Potomac River at Hancock, MD](https://waterdata.usgs.gov/monitoring-location/USGS-01613000/): `-78.17788888888889, 39.69755555555555`                     | Map-interpolated location, ±1 second. Site notes slight low-flow regulation; drainage area 4,064 square miles.                             |
| `USGS-01638500`     | [Potomac River at Point of Rocks, MD](https://waterdata.usgs.gov/monitoring-location/USGS-01638500/): `-77.5431111111111, 39.273583333333335`              | Map-interpolated location, ±1 second; drainage area 9,651 square miles. Station-specific method/flow notes need a refreshed source record. |
| `USGS-01646500`     | [Potomac River near Washington, DC, Little Falls](https://waterdata.usgs.gov/monitoring-location/USGS-01646500/): `-77.12763888888888, 38.949777777777776` | Mapping-grade GPS, ±1 second; drainage area 11,560 square miles. Site describes diversions and reservoir effects.                          |

The USGS [Potomac River photograph](https://www.usgs.gov/media/images/potomac-river)
is explicitly marked Public Domain and credits USGS photographer Cynthia L.
Cunningham. Its description locates it at Whites Ferry; it is **context media**,
not an image of any gauge on either proposed observation date. Credit both the
agency and photographer. No gauge-page image is assumed redistributable merely
because it appears on a USGS page.

Proposed data slice: for each date and each station, retain exactly one daily mean
discharge record with the fields above and the original point coordinates. Check
the response has six records, no duplicate station/date/parameter/statistic tuple,
finite numeric values, the same `ft^3/s` unit, explicit status/qualifier, and no
undocumented missing values. Keep the original response files and their SHA-256
hashes, then derive small scene-specific GeoJSON with stable station feature IDs.
If a date is unavailable, choose another same-season pair and document the change
before publishing; do not fill a gap by interpolation.

This is a descriptive comparison of **flow at gauges**, not a uniform riverbank
change measurement. Drainage area increases downstream; upstream/downstream values
are not interchangeable replicates. Regulation and water diversions are documented
for these locations. A same-date comparison requires the station-local daily
aggregation definitions and any provisional/approved flags from the actual API
records. Exact numbers, value ranges, categories, and a shared scale cannot be
specified until those records are obtained. Units are supplied by USGS, not
inferred from value type (R15).

**Decision:** preferred conditional fallback. The WGS84 points, common station
IDs, declared discharge unit and model-free point/color rendering appear to fit
Stage 1. It is **not selected as the verified real fixture** until the response
bytes, six actual values, statuses, qualifiers and photo bytes are inspected.

## Source acquisition and fingerprint handoff

The [modern USGS Water Data OGC API](https://api.waterdata.usgs.gov/docs/ogcapi/)
is the acquisition authority for the fallback. Use the `daily/items` GeoJSON
endpoint with `monitoring_location_id` for each of the three sites,
`parameter_code=00060`, `statistic_id=00003`, and a narrow date interval. Save
the exact request URL, retrieval UTC time and untouched response bytes before
filtering. Confirm `numberMatched`/pagination and the six unique tuples; avoid
an API key in URLs or committed records. The documented collection CRS is CRS84
(WGS84 longitude/latitude). Preserve returned coordinate, source ID, status,
qualifier, unit and `last_modified` fields in the source inventory. Record the
original response hashes and derived subset hash separately.

| Intended input                         | Source                                                                                                              | Retrieval / SHA-256 state                                           |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 2024-10-01 daily point records         | USGS `daily/items` query for the three station IDs, parameter `00060`, statistic `00003`                            | Not acquired; no hash.                                              |
| 2025-10-01 daily point records         | Same service and IDs, second date                                                                                   | Not acquired; no hash.                                              |
| Potomac context photo                  | [USGS media page](https://www.usgs.gov/media/images/potomac-river), use its original image link and preserve credit | Rights verified on page; bytes not acquired, no hash.               |
| Matanuska report vectors, if revisited | GIS shapefiles linked from [SIR 2011-5214](https://pubs.usgs.gov/sir/2011/5214/)                                    | Not acquired; source-file names, `.prj`, fields and hashes pending. |

Direct shell HTTPS access to `waterservices.usgs.gov:443` failed with a socket
permission error. The research tool could read official documentation and station
pages but could not fetch query responses from either the legacy daily-values
service or the new `daily/items` endpoint. The in-app browser reported
`ERR_BLOCKED_BY_CLIENT` for the legacy endpoint. These are access observations,
not evidence of missing source data. No code, values, hashes or images were
invented to work around them.

## Handoff

Session 14 correction for future preparation: the actual API field is
`approval_status` (singular), and `value` is a decimal string. Preserve the
untouched responses. Explicitly validate/convert the numeric value only in a
derived GeoJSON file, retaining source observation IDs and source hashes. The
new project/compiler should still reject numeric strings in authored quantitative
data rather than silently coerce them. Reacquisition is no longer the immediate
blocker; finish comparability review using the pinned responses and official
station/time-series metadata before selecting the case.

- **G1:** keep the real-case selection gate open. The supported capability set
  can be frozen for WGS84 point comparison without claiming the case verified.
  Choose a different case if acquisition or quality checks fail.
- **S1-W1-B:** include station IDs as cross-scene feature identities; encode
  discharge as an explicitly declared quantity with `ft^3/s`, retaining API
  status/qualifiers, source URL and collection date. Do not mistake two daily
  observations for a trend or geographic causal finding. The case does not
  require a Stage 1 analysis or reprojection operation.
- **S1-W2-B:** after access is available, pin untouched source responses and
  photo, compute SHA-256 hashes, extract a small redistributable subset with
  stable station IDs, and record exact source-to-project paths and credits.
  Materialize nothing from the proposed inventory until the values are checked.
- **Stage 2/3:** the author may later ask for a trend, a cause of differing
  flow, or flood implications. These requests need additional observations,
  methods and evidence checks; Stage 1 should surface their absence rather
  than write unsupported narration.

No unverified river measurements or images were committed as project resources.
