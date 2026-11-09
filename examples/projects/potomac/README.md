# Two October days on the Potomac

This format 0.2 project compares published USGS daily mean discharge at Hancock, Point of Rocks, and Little Falls on 2024-10-01 and 2025-10-01. The state and river layers are local context and take their colours from the theme; the USGS photograph is context, not evidence of either observation date. The story makes a two-date comparison, not a trend or reach water balance.

## Encoding

- **2024: columns.** Each gauge is a 3D column (2.6 km footprint radius) whose height is linear from zero on one shared height scale. The scale spans every value it holds, 2024 and 2025 alike, and its tallest value (Point of Rocks, 23,600 ft³/s) stands 60 km above its base. The heights are a data scale, not a depth: they are deliberately far taller than the terrain relief so that they read at regional zoom. Callouts sit on the column tops.
- **2025: change columns.** The same gauges become change symbols in height form, compared with the 2024 source by feature ID. The solid columns shrink from their 2024 heights to their 2025 heights (a morph from the 2024 scene, on the same shared scale), while translucent 2024 ghosts stay, so the roughly 90% drop no longer depends on memory. Column colour follows the sign of the change (every gauge fell). The compiler writes one label per gauge from the two published values, for example "−21,580 ft³/s (−91%)", and lists both inputs in the compiled spec; nobody typed those numbers.
- **Limits:** the 2025 columns on the same height scale, where the camera pitches in on Little Falls.
- **Scope:** the pull-back ends top-down, where height cannot be seen, so the change symbols take their size form: a ring for 2024-10-01 and a disc for 2025-10-01, with area proportional to discharge from zero (26 px largest radius).

The columns stand on the Mapterhorn terrain in online builds. Offline builds drop the terrain, so the columns stand on the flat map.

## Two variants

The story comes in two looks that share every data file, the photograph and the story text:

- `examples/projects/potomac` (this project) is the **atlas** variant: warm paper colours over OpenFreeMap Positron, tinted from the theme.
- [`examples/projects/potomac-night`](../potomac-night/) is the **night** variant over OpenFreeMap Dark.

Both use Mapterhorn terrain (1.5× exaggeration) with hillshade and a sky, and fall back to VersaTiles. Their `story.json` files are identical, and their `mapbard.json` files differ only in `theme` and `basemap.style`; a root test checks both.

## Motion

Scene motion uses only the project's own geometry. The 2024 scene opens on the Chesapeake region and closes in on the river, pitched, while the columns rise downstream one after another and their callouts appear. It then flies along the generalized Potomac line from Hancock to Little Falls (the listed river segments, in downstream order), at a moderate pitch, with the callouts faded out, and returns to the full view with the callouts back. In the 2025 scene the columns shrink from their 2024 heights while the camera makes a slow, low 20° orbit; the limits scene pushes in on Little Falls, turning 45° as it closes in, and the closing scene pulls back to all three gauges, turning back to north and ending top-down. Readers who prefer reduced motion get each scene's final view, with the columns at full height and the 2025 values in place.

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

### V2 review fixes (2026-11-08)

The shared height scale now maps 23,600 ft³/s to 60,000 m in all three
height scenes, with constant 2.6 km column footprints. This display height
is not water depth; values and proportions are unchanged. The comparison
view is closer (zoom 8.7). Before ghosts use the theme foreground at 45%
opacity. The river flight keeps a wider view (zoom 7.7, pitch 50°), then
returns to a wide north-up overview before closing in, keeping gauges clear
of the story panels at desktop and phone sizes. The closing pull-back starts
with all three gauges in view, including when the fallback notice is shown.
