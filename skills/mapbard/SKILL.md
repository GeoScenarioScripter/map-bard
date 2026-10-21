---
name: mapbard
description: Author and verify a MapBard 0.2 map story from local geographic data with the mapbard CLI.
version: 0.1.0
---

# MapBard authoring

Use the CLI to register sources, validate the authored files, and publish the story. It does not call a model. The project root contains `mapbard.json` and `story.json`; the CLI owns `mapbard.lock.json` and generated output.

1. Run `mapbard capabilities` to see current techniques, basemaps, and format version.
2. Run `mapbard init <project-dir>`. For later commands, work inside that directory or put the global `--project <project-dir>` before the command. For example, `mapbard --project <project-dir> add <file.geojson> --attribution "Source name"`.
3. Register each data or media file with `add`, then run `inspect [resourceId]`. Check geometry, extent, unique feature IDs, missing values, and attribute distributions before choosing a depiction. `add` drafts attribute declarations; confirm roles, levels, units, observation dates, and source credit against the source material.
4. Edit `mapbard.json` and `story.json` for the intent, sources, scenes, and visual bindings. Keep IDs and references consistent. Read [format](format.md) for a minimal scene and field names, [techniques](techniques.md) when choosing a layer, and [data honesty](data-honesty.md) before writing claims.
5. After editing authored files, run `mapbard lock`, then `mapbard check`. Fix every error by its code and remedy; see [diagnostics](diagnostics.md). `check` intentionally reports lock drift, while `build` refreshes the lock itself. Use `--json` for machine-readable diagnostics and `--limit <n>` for bounded output.
6. Run `mapbard preview` and inspect the actual page, scene changes, legends, labels, and attribution. If the project has errors, the preview page shows them and reloads once a saved fix builds. Use [cartography](cartography.md) for visual review. Then run `mapbard build --out out`. Inspect `out/verification.json` for required network hosts. Use `--offline` when the story must make no network requests; verify that local geographic context and local media still communicate the claim.

Do not hand-edit the lockfile, hashes, or published files. Do not invent observations, units, denominators, credits, or geographic context. If source evidence is insufficient, narrow the claim or report the gap.
