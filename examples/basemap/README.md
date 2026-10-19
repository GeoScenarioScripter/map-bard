# Local context for the legacy San Francisco example

The handwritten `sf-waterfront.geonarrative.json` requests a
`protomaps-light`/PMTiles basemap, but no PMTiles archive is bundled and the
legacy player does not implement that format. `render-example.mjs` explicitly
supplies this bounded local context map instead. The handwritten narrative is
unchanged. This is a demo fallback, not PMTiles support or a Stage 1 compiled
basemap capability.

The two files in `source/` are untouched GeoJSON responses retrieved on
2026-10-19 from City and County of San Francisco open data. Both datasets use
the [Public Domain Dedication and License](https://opendatacommons.org/licenses/pddl/1.0/).
The generated bundle inlines their geometry, so rendering requires no network.
The player visibly credits the city.

| File                                    | Official dataset                                                          | Query and exact source hash                                                                                                                                                                                                                                                                     | Contents                         |
| --------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `source/shoreline-block-groups.geojson` | [2020 block groups clipped to shoreline](https://data.sf.gov/d/6rf8-dnst) | [`within_box` GeoJSON extract](<https://data.sfgov.org/resource/6rf8-dnst.geojson?$where=within_box(multipolygon,37.70,-122.53,37.84,-122.32)&$select=geoid,multipolygon&$limit=1000>) · SHA-256 `CE4E68453F6C2641027C4ED9D8FB9B13C4FEFE51FD27C36D403743F5EA390235`                             | 677 land polygons, 757,376 bytes |
| `source/waterfront-streets.geojson`     | [Streets — Active and Retired](https://data.sf.gov/d/3psu-pn9h)           | [active waterfront street extract](<https://data.sfgov.org/resource/3psu-pn9h.geojson?$where=within_box(line,37.775,-122.45,37.825,-122.36)%20AND%20active%3Dtrue&$select=streetname,classcode,line&$limit=10000>) · SHA-256 `0A2A3600BB9B74C0F9C72DF9A24A675C2907625AA17DCEA77E85FD865E60B055` | 3,710 centerlines, 789,733 bytes |

The land layer uses the shoreline-clipped block-group geometry only as a land
mask; it does not depict census variables. Street class codes control line
weight/visibility. The coverage is local: East Bay streets, place labels,
terrain, buildings and map tiles are not provided. All three example landmarks
fall within the land mask. This context map must not be reused for another area
without acquiring relevant source geometry.
