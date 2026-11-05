# Moving between states, 2024

This format 0.2 project maps the 30 largest state-to-state migration flows in the U.S. Census Bureau's 2024 American Community Survey (ACS) 1-year estimates as arcs. Each flow is an estimate with a 90% margin of error, and the story keeps those margins in its narration and callouts. It is the flows example of [M2 V2](../../../docs/m2-visual.md#p-flows-example-step-53) and the reference project for the deck.gl tier.

## Scenes

1. **The largest moves between states.** The 30 arcs draw on from origin to destination as the reader scrolls; a callout names the largest flow, California to Texas, 77,161 movers (±9,059).
2. **Largest first.** The same arcs fade in one after another in descending order of their estimates. The callouts name third and sixth place, whose estimates are closer together than their margins, so their order is not settled.
3. **East Coast neighbours.** The camera moves from the national view to the coast between New York and Florida, where many of the largest flows join neighbouring states and run both ways; the callouts appear once it arrives.
4. **Limits of the estimates.** The ten smallest flows shown (under 30,000 movers, all overlapping within their margins) stay solid while the rest fade. Callouts name the 30th flow and the widest margin shown.

## Encoding

- **Arcs** (`arc`, drawn by the deck.gl tier) join the 2020 state centers of population of each origin and destination. They are not routes.
- **Width** is linear from zero on one shared scale, `movers-width`, across every scene, with a 10 px widest line (California to Texas). The two filtered layers of the limits scene use the same scale, so a flow is equally wide in every scene.
- **Colour** runs from the newsroom theme's ramp colour at the origin to its accent at the destination, so direction reads without arrowheads. The legend names the width examples and the direction.
- **Context:** generalized Census state outlines are drawn as a local layer, so the story still reads offline and when the online basemap is unavailable.
- The theme is `newsroom`, the basemap OpenFreeMap Positron (tinted from the theme, minimal labels) with VersaTiles as the fallback, in the Mercator projection with no terrain: deck.gl layers are not draped on terrain or a globe.

## Data and provenance

Both sources are U.S. public domain. Retrieved 2026-11-04. These bytes match the ones the deck.gl gallery fixture retrieved on 2026-10-27.

| File                                      | Source                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data/acs-2024-top-state-flows.geojson`   | U.S. Census Bureau, [2024 ACS 1-year State-to-State Migration Flows, Table 1](https://www2.census.gov/programs-surveys/demo/tables/geographic-mobility/2024/state-to-state-migration/State_to_State_Migration_Table_2024_T13.xlsx); arc ends at the [2020 state centers of population](https://www2.census.gov/geo/docs/reference/cenpop2020/CenPop2020_Mean_ST.txt) |
| `data/census-2024-states-context.geojson` | U.S. Census Bureau, [TIGERweb Generalized_ACS2024 states](https://tigerweb.geo.census.gov/arcgis/rest/services/Generalized_ACS2024/State_County/MapServer/8) (queried with `maxAllowableOffset=0.05`, `geometryPrecision=3`)                                                                                                                                         |

The 2024 table is the latest release: the Census directory for geographic mobility tables had no 2025 release on the retrieval date.

`scripts/make-data.mjs` rebuilds both files from the downloaded originals (unzip the ACS XLSX first). It only selects and reshapes:

- **Flows:** rows of Table 1 where both states are among the 50 states and DC, origin and destination differ, and the estimate and margin are published numbers (not `X` or `N`). The 30 largest estimates are kept, each with `movers` (people 1 year and over who lived in the origin state one year earlier) and its 90% margin of error `movers_moe`. Moves from abroad, Puerto Rico and the U.S. Island Areas are not part of the selection. Of 2,373 published flows, the largest is 77,161 (±9,059) and the 30th 27,574 (±4,594); the 31st, 26,956 (±4,931), overlaps it within the margins, so the cut-off is itself uncertain.
- **Outlines:** the 50 states and DC (GEOID 01-56), names only.

```sh
node scripts/make-data.mjs <unzipped-xlsx-dir> CenPop2020_Mean_ST.txt <tigerweb-states.geojson> data
```

## Commands

From the repository root after `corepack pnpm -r build`:

```sh
node packages/cli/dist/bin.js --project examples/projects/migration-flows check
node packages/cli/dist/bin.js --project examples/projects/migration-flows check --visual
node packages/cli/dist/bin.js --project examples/projects/migration-flows check --visual --network stub
node packages/cli/dist/bin.js --project examples/projects/migration-flows check --visual --network unavailable
node packages/cli/dist/bin.js --project examples/projects/migration-flows build
node packages/cli/dist/bin.js --project examples/projects/migration-flows build --offline --out offline
```

Open `out/index.html` for the online story or `offline/index.html` for the self-contained version; both work from `file://`. The online build declares `tiles.openfreemap.org` and `tiles.versatiles.org` in `verification.json`; the offline build declares no network URLs and drops the basemap, keeping the state outlines. Both builds ship the deck.gl tier (`vendor/tier-deck.js`). Goldens are not committed yet: step 5.4 makes the Linux ones in the Playwright Docker image.
