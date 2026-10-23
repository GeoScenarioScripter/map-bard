---
name: mapbard
description: Author and verify a MapBard 0.2 map story from local geographic data with the mapbard CLI.
version: 0.2.0
---

# MapBard authoring

Use the CLI to register sources, validate the authored files, and publish the story. It does not call a model. The project root contains `mapbard.json` and `story.json`; the CLI owns `mapbard.lock.json` and generated output.

1. Run `mapbard capabilities` to see current techniques, themes, layouts, motion presets, basemaps, the format version, and whether visual checks can run here.
2. Run `mapbard init <project-dir>`. For later commands, work inside that directory or put the global `--project <project-dir>` before the command. For example, `mapbard --project <project-dir> add <file.geojson> --attribution "Source name"`.
3. Register each data or media file with `add`, then run `inspect [resourceId]`. Check geometry, extent, unique feature IDs, missing values, and attribute distributions before choosing a depiction. `add` drafts attribute declarations; confirm roles, levels, units, observation dates, and source credit against the source material.
4. Edit `mapbard.json` and `story.json` for the intent, sources, scenes, and visual bindings. Keep IDs and references consistent. Read [format](format.md) for a minimal scene and field names, [techniques](techniques.md) when choosing a layer, [layout](layout.md) for theme, layout, colour, size and callouts, [motion](motion.md) before adding camera moves or tracks, and [data honesty](data-honesty.md) before writing claims.
5. After editing authored files, run `mapbard lock`, then `mapbard check`. Fix every error by its code and remedy; see [diagnostics](diagnostics.md). `check` intentionally reports lock drift, while `build` refreshes the lock itself. Use `--json` for machine-readable diagnostics and `--limit <n>` for bounded output.
6. Run `mapbard check --visual` when the story has motion, callouts or several scenes (it needs a headless Chromium; see `capabilities`). Fix every error; in-flight symbol warnings can stay when the scene still reads, but say so. Look at `.mapbard-visual/captures/contact-sheet.png` as advisory evidence of crowding and framing. If the project keeps `goldens/`, an intended visual change needs `check --visual --update` and the new goldens committed.
7. Run `mapbard preview` and inspect the actual page, scene changes, legends, labels, and attribution. If the project has errors, the preview page shows them and reloads once a saved fix builds. Use [cartography](cartography.md) for visual review. Then run `mapbard build --out out`. Inspect `out/verification.json` for required network hosts. Use `--offline` when the story must make no network requests; verify that local geographic context and local media still communicate the claim.

Do not hand-edit the lockfile, hashes, or published files. Do not invent observations, units, denominators, credits, or geographic context. If source evidence is insufficient, narrow the claim or report the gap.
