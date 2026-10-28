# gallery-maplibre

The screenshot test for the V2 MapLibre techniques (step 5.2, M): one scene each for
columns, a morph, change symbols in height and size form, an extrusion, and flat and
extruded hexbins. Core compile tests also load it and break copies of it in memory.

It builds offline (local context layers only) and online (OpenFreeMap positron, no terrain).

```sh
node packages/cli/dist/bin.js check --visual --network offline   # from this directory
```

## Data and provenance

All data are U.S. public domain. Retrieved 2026-10-26 unless noted.

| File                                       | Source                                                                                                                                                                                                                                                                                                  | Notes                                                                                                                                                                                                                             |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data/potomac-2024-10-01.geojson`, `-2025` | USGS daily values, [api.waterdata.usgs.gov](https://api.waterdata.usgs.gov/docs/ogcapi/)                                                                                                                                                                                                                | Copied unchanged from `examples/projects/potomac` (its README has the retrieval record).                                                                                                                                          |
| `data/potomac-states-context.geojson`      | Census Bureau generalized ACS 2024 states                                                                                                                                                                                                                                                               | Copied unchanged from `examples/projects/potomac`.                                                                                                                                                                                |
| `data/potomac-river-context.geojson`       | Maryland iMAP Rivers and Streams (generalized)                                                                                                                                                                                                                                                          | Copied unchanged from `examples/projects/potomac`.                                                                                                                                                                                |
| `data/census-2020-states.geojson`          | Census Bureau TIGERweb, Census 2020 WMS, States layer 80: [query](https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2020/MapServer/80/query) with `outFields=GEOID,NAME,STUSAB,AREALAND,POP100`, `outSR=4326`, `maxAllowableOffset=0.05`, `geometryPrecision=4`, `f=geojson` | Contiguous 48 states (AK, HI, DC and territories dropped). `land_area_km2` = AREALAND / 10⁶, rounded to 0.01; `density_per_km2` = POP100 / (AREALAND / 10⁶), rounded to 0.1. Both are computed here; the inputs are as published. |
| `data/usgs-earthquakes-2024-socal.geojson` | USGS ComCat: [fdsnws event query](https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=2024-01-01&endtime=2025-01-01&minmagnitude=2.5&minlatitude=32.5&maxlatitude=36.5&minlongitude=-121&maxlongitude=-114.5&orderby=time-asc)                                                    | 457 events. Kept: event ID, magnitude, magnitude type, place, UTC time, depth; coordinates reduced to longitude and latitude. The box spans 4° of latitude, so 25 km Mercator cells vary in ground area by under 10%.             |
