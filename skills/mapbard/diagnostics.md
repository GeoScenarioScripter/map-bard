# Diagnostics

`mapbard --json check` returns `{ok, command, cliVersion, diagnostics, result, truncated}`. `truncated` is true when `--limit` cut the diagnostics or a result list; raise the limit to see the rest. Each diagnostic includes a code, artifact, path, IDs when relevant, message, severity, and remedy. Errors give exit code 1; invalid CLI usage gives 2; internal failures give 3. Warnings never change the exit code unless `--fail-on-warnings` is set. Read the specific remedy before changing authored content.

## Project and compiler errors

| Code                                               | What to inspect                                                                                         |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `INPUT_STALE`                                      | Which authored file or resource changed; then run `mapbard lock` and retry `check`                      |
| `REFERENCE_MISSING`                                | Resource, attribute, scene, layer, or feature ID spelling and registration                              |
| `REFERENCE_AMBIGUOUS`                              | A layer listed in more than one shared scale; keep one scale per layer                                  |
| `ID_DUPLICATE`                                     | Two resources, scenes or layers with the same ID; `add --id` sets a unique one                          |
| `MEASUREMENT_REQUIRED`, `MEASUREMENT_INCOMPATIBLE` | Source documentation for role, unit, level, and denominator; never guess these to satisfy the compiler  |
| `CAPABILITY_UNSUPPORTED`                           | `mapbard capabilities` and the requested technique, classification, encoding, motion, filter or control |
| `FIELD_UNKNOWN`, `VERSION_UNSUPPORTED`             | The field name or `formatVersion` against `mapbard schema`; unknown fields and versions always fail     |
| `RESOURCE_MISSING`, `ASSET_PATH_INVALID`           | Whether the referenced local file exists inside the project at its declared path                        |
| `RESOURCE_HASH_MISMATCH`, `ASSET_COLLISION`        | A source file changed after it was registered, or an output path already holds other files              |
| `VALUE_INVALID`                                    | The reported field and its schema or source values; a missing attribution placeholder also blocks build |

## Critic warnings (`check` and `build`)

The critic reads the compiled story the way a reader would. Its findings are warnings: fix them unless you can say why the reader is not misled.

| Code                       | Meaning and remedy                                                                                                                                          |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TEXT_RAW_IDENTIFIER`      | Reader-facing text shows an internal ID such as `daily_mean_discharge`. Write it as words, or give the resource, attribute or scale a `label` or `name`     |
| `TEXT_UNIT_UNFORMATTED`    | Text shows a caret unit such as `ft^3/s`. Write the formatted unit the remedy gives (ft³/s)                                                                 |
| `ENCODING_CONTRAST_HIDDEN` | Features the narration compares, or values that change between compared scenes, share one colour class. Use breaks that separate them, or graduated symbols |
| `SCALE_INCONSISTENT`       | One attribute is drawn on different scales in different scenes. Add a shared scale with those layers as members                                             |
| `PALETTE_CONTRAST_LOW`     | A mark colour is below 3:1 against the basemap land or water colour. Use darker (or, on a dark theme, lighter) colours                                      |
| `TEXT_OVERFLOW_LIKELY`     | Narration would scroll inside the phone sheet. Tighten it or split the scene, keeping every value, date and qualification                                   |

## Visual checks (`check --visual`)

`mapbard check --visual [--network offline|stub|live|unavailable] [--update] [--frames] [--fail-on-warnings]` runs `check`, builds into `.mapbard-visual/build/` (offline by default) and opens the story in headless Chromium. It captures each scene at p = 0, 0.5 and 1 at desktop (1440 × 900) and phone (390 × 844) sizes and samples every 0.05 along each moving camera track. The result counts captures, sweep samples, findings by phase, errors and warnings; `report.json` and `contact-sheet.png` land in `.mapbard-visual/captures/`. It never edits the project or its lockfile.

| Code                     | Meaning and remedy                                                                                                                                                                                                                                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VISUAL_OCCLUSION`       | A target, symbol or callout is under a panel or control, off screen, or overlapping another callout. At rest it is an error: move the scene camera or pick a layout that reserves less. In flight, symbols and targets passing under panels warn: raise the flight's zoom or pitch, shorten it, or fade the layer |
| `VISUAL_RUNTIME`         | A console or page error, an offline request, a missing basemap notice, a blank map with every tile host down, or a map that never went idle. Open the build in a browser and fix the reported cause; a blank map needs local context layers                                                                       |
| `VISUAL_GOLDEN_MISMATCH` | Offline captures differ from the project's `goldens/` beyond the tolerance. Open the diff image; if the change is intended, run `check --visual --update` and commit `goldens/`. Goldens from another OS give one warning that never gates                                                                        |
| `VISUAL_BROWSER_MISSING` | No headless Chromium. Install Google Chrome, run `npx playwright install chromium`, or set `MAPBARD_CHROME_PATH`. `mapbard capabilities` reports whether visual checks can run                                                                                                                                    |
| `BUDGET_EXCEEDED`        | The page's JavaScript is over its gzip budget (core 450 KB, all tiers 1.2 MB). A warning; `build` and `check --visual` both report sizes                                                                                                                                                                          |

The contact sheet is advisory: look at it for crowded scenes, unreadable legends and weak framing that geometry checks cannot see, but act on diagnostics, not on taste. Run one `check --visual` at a time; parallel runs can make the map miss its idle timeout.

After fixing an authored file, refresh the lock and check again. A successful `check` validates the project and compiler inputs; `check --visual` confirms the layout; inspect a preview to confirm the page actually communicates the intended claim.
