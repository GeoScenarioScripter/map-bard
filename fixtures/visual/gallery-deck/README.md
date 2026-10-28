# deck.gl technique gallery

The screenshot test for the deck.gl tier (m2-visual.md, step 5.2, N): one scene per
deck.gl technique, built from real public-domain data.

- **arcs**: the 30 largest state-to-state migration flows, width linear from zero
  (`maxWidth` 10 px), drawn on with a scrubbed `line-reveal`, with a callout that
  points to the largest flow's destination.
- **trips**: the best tracks of Francine, Helene and Milton (2024), with a
  48-hour trail and a scrubbed clock (September 8 to October 11, 2024, UTC).

Both scenes draw generalized state outlines as local context, so the gallery
reads offline and when the online basemap is unavailable.

```sh
mapbard check --visual                        # offline (default)
mapbard check --visual --network stub
mapbard check --visual --network unavailable
```

Goldens are not committed yet: step 5.4 makes the Linux ones in the Playwright
Docker image.

## Data and provenance

All three sources are U.S. public domain. Retrieved 2026-10-27.

| File                                        | Source                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data/acs-2024-top-state-flows.geojson`     | U.S. Census Bureau, [2024 ACS 1-year State-to-State Migration Flows, Table 1](https://www2.census.gov/programs-surveys/demo/tables/geographic-mobility/2024/state-to-state-migration/State_to_State_Migration_Table_2024_T13.xlsx); arc ends at the [2020 state centers of population](https://www2.census.gov/geo/docs/reference/cenpop2020/CenPop2020_Mean_ST.txt) |
| `data/hurdat2-2024-gulf-hurricanes.geojson` | NOAA National Hurricane Center, [HURDAT2 1851–2024](https://www.nhc.noaa.gov/data/hurdat/hurdat2-1851-2024-040425.txt)                                                                                                                                                                                                                                               |
| `data/census-2024-states-context.geojson`   | U.S. Census Bureau, [TIGERweb Generalized_ACS2024 states](https://tigerweb.geo.census.gov/arcgis/rest/services/Generalized_ACS2024/State_County/MapServer/8) (queried with `maxAllowableOffset=0.05`, `geometryPrecision=3`)                                                                                                                                         |

`scripts/make-data.mjs` rebuilds the three files from the downloaded originals
(unzip the ACS XLSX first). It only selects and reshapes:

- **Flows**: rows of Table 1 where both states are among the 50 states and DC,
  origin and destination differ and the estimate and margin are published
  numbers; the 30 largest estimates, with `movers` and the 90% margin of error
  `movers_moe`. Arcs join centers of population, not routes.
- **Tracks**: every HURDAT2 fix of AL062024 (Francine), AL092024 (Helene) and
  AL142024 (Milton), with its UTC time in `times` (one per vertex) and the
  storm's peak sustained wind in knots.
- **Outlines**: the 50 states and DC (GEOID 01–56), names only.
