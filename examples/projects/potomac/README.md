# Two October days on the Potomac

This format 0.2 project compares published USGS daily mean discharge at Hancock, Point of Rocks, and Little Falls on 2024-10-01 and 2025-10-01. Its three scenes share one equal-interval color scale. The state and river layers are local context; the USGS photograph is context, not evidence of either observation date. The story makes a two-date comparison, not a trend or reach water balance.

Scene motion uses only the project's own geometry: the 2024 scene reveals the gauges from an overview of the context layers, flies along the generalized Potomac line from Hancock to Little Falls (the listed river segments, in downstream order) and returns to the full view; the 2025 scene briefly highlights the gauges; the limits scene pushes in on Little Falls. Readers who prefer reduced motion get each scene's final view.

The project was converted with `mapbard migrate` from the [0.1 Potomac source](../first-slice/README.md), which remains for migration regression tests and retains the [acquisition record](../first-slice/source/README.md). The authored `mapbard.json` selects OpenFreeMap Positron with a VersaTiles fallback. The CLI owns `mapbard.lock.json`.

From the repository root after `corepack pnpm -r build`:

```sh
node packages/cli/dist/bin.js --project examples/projects/potomac check
node packages/cli/dist/bin.js --project examples/projects/potomac preview --open
node packages/cli/dist/bin.js --project examples/projects/potomac build
node packages/cli/dist/bin.js --project examples/projects/potomac build --offline --out offline
```

Stop `preview` with Ctrl+C before building. Open `examples/projects/potomac/out/index.html` for the online story or `examples/projects/potomac/offline/index.html` for the self-contained version. The online build declares `tiles.openfreemap.org` and `tiles.versatiles.org` in `verification.json`; the offline build declares no network URLs. The automated headless Chrome smoke test checks browser playback and scroll navigation with a stubbed online style. Public tile availability still needs a browser check with network access.
