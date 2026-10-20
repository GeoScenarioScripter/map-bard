# Format 0.2

`mapbard.json` holds the title, intent, basemap and resource declarations. `story.json` holds ordered scenes and shared scales. `mapbard.lock.json` is CLI-managed derived state with hashes and profiles. Run `mapbard schema mapbard.json` or `mapbard schema story.json` for exact contracts.

Each data resource needs an ID, project-relative path, feature ID rule, declared attributes, CRS `EPSG:4326`, and attribution. `mapbard add` drafts these fields; confirm roles, levels and units against the source. Each scene has an ID, title, narration, camera, layers and annotations. A layer references a registered data `sourceId` and a supported technique.

When an authored file changes, `mapbard check` reports lock drift. `mapbard lock` refreshes derived state; `mapbard build` refreshes it automatically before compiling.
