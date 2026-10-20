# Online basemap providers

Verified 2026-10-20. The provider catalog lives in `@mapbard/knowledge`; the
compiler resolves these URLs without a network request. Public services offer
no uptime guarantee. The published player tries declared styles in order and
shows a notice when none load. `build --offline` removes online styles and
terrain.

| Provider      | Style or tile endpoint                                                      | Credit and terms                                                                                                                                                                                                                                                                           |
| ------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| OpenFreeMap   | `https://tiles.openfreemap.org/styles/{positron,dark,liberty,bright,fiord}` | OpenFreeMap, OpenMapTiles and OpenStreetMap contributors. [Quick start](https://openfreemap.org/quick_start/), [service and attribution](https://openfreemap.org/).                                                                                                                        |
| VersaTiles    | `https://tiles.versatiles.org/assets/styles/{style}/style.json`             | Prebuilt styles include attribution; MapLibre displays it. Styles include `colorful`, `natural`, `muted`, `gray`, `toner` and dark variants. [Service guide](https://docs.versatiles.org/guides/use_tiles_versatiles_org), [style list](https://docs.versatiles.org/basics/frontend.html). |
| Mapterhorn    | `https://tiles.mapterhorn.com/{z}/{x}/{y}.webp`                             | Terrarium-encoded 512 px WebP. Credit Mapterhorn and its source data providers. [Tile endpoint](https://mapterhorn.com/data-access/), [source attribution](https://mapterhorn.com/attribution/).                                                                                           |
| AWS Terrarium | `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`   | Terrarium-encoded 256 px PNG. Mapzen's source providers require detailed credit, recorded in the knowledge catalog. [AWS dataset](https://registry.opendata.aws/terrain-tiles/), [required source attribution](https://github.com/tilezen/joerd/blob/master/docs/attribution.md).          |

MapLibre GL JS 6.1.0 is bundled locally as classic scripts with its worker and
CSS, preserving `file://` playback. It is BSD-3-Clause licensed. Commander
14.0.3 (MIT) powers the CLI. No built-in provider requires an API key.
