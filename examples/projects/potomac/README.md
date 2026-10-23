# Two October days on the Potomac

This format 0.2 project compares published USGS daily mean discharge at Hancock, Point of Rocks, and Little Falls on 2024-10-01 and 2025-10-01. The gauges are graduated symbols on one shared size scale: circle area is proportional to discharge, from zero to the largest value of every scene, with a 26 px largest radius, so each 2025 circle is about a tenth of its 2024 area. The state and river layers are local context and take their colours from the theme; the USGS photograph is context, not evidence of either observation date. The story makes a two-date comparison, not a trend or reach water balance.

## Two variants

The story comes in two looks that share every data file, the photograph and the story text:

- `examples/projects/potomac` (this project) is the **atlas** variant: warm paper colours over OpenFreeMap Positron, tinted from the theme.
- [`examples/projects/potomac-night`](../potomac-night/) is the **night** variant over OpenFreeMap Dark.

Both use Mapterhorn terrain (1.5× exaggeration) with hillshade and a sky, and fall back to VersaTiles. Their `story.json` files are identical, and their `mapbard.json` files differ only in `theme` and `basemap.style`; a root test checks both.

## Motion

Scene motion uses only the project's own geometry. The 2024 scene opens on the Chesapeake region and closes in on the river while the gauges and their callouts appear downstream one after another. It then flies along the generalized Potomac line from Hancock to Little Falls (the listed river segments, in downstream order), pitched so the horizon shows, with the callouts faded out, and returns to the full view with the callouts back. The 2025 scene briefly highlights the gauges, the limits scene pushes in on Little Falls, and the closing scene pulls back to all three gauges. Readers who prefer reduced motion get each scene's final view.

The project was converted with `mapbard migrate` from the [0.1 Potomac source](../first-slice/README.md), which remains for migration regression tests and retains the [acquisition record](../first-slice/source/README.md). The CLI owns `mapbard.lock.json`.

## Commands

From the repository root after `corepack pnpm -r build` (use `--project examples/projects/potomac-night` for the night variant):

```sh
node packages/cli/dist/bin.js --project examples/projects/potomac check
node packages/cli/dist/bin.js --project examples/projects/potomac check --visual
node packages/cli/dist/bin.js --project examples/projects/potomac preview --open
node packages/cli/dist/bin.js --project examples/projects/potomac build
node packages/cli/dist/bin.js --project examples/projects/potomac build --offline --out offline
```

`check --visual` builds into `.mapbard-visual/build/` (offline by default), captures every scene at desktop and phone sizes, sweeps each camera flight, and writes `report.json` and `contact-sheet.png` to `.mapbard-visual/captures/`. Add `--network stub` to load the online build with an empty basemap style, `--network unavailable` to check the fallback when every tile host fails, or `--network live` to use the real tile hosts. It needs Chrome or `MAPBARD_CHROME_PATH`, and never edits the project.

Stop `preview` with Ctrl+C before building. Open `examples/projects/potomac/out/index.html` for the online story or `examples/projects/potomac/offline/index.html` for the self-contained version. The online build declares `tiles.openfreemap.org`, `tiles.versatiles.org` and `tiles.mapterhorn.com` in `verification.json`; the offline build declares no network URLs and drops the basemap and terrain, keeping the local context layers.
