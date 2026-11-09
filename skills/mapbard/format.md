# Format 0.2

`mapbard.json` holds the title, intent, basemap, and resource declarations. `story.json` holds ordered scenes and shared scales. `mapbard.lock.json` stores CLI-derived hashes and profiles. Run `mapbard schema mapbard.json` or `mapbard schema story.json` for the exact strict contracts. Unknown fields and format versions fail validation.

`mapbard init` supplies valid starter files. Project directory names, data and media file names, and `--id` values must use English (ASCII) characters; rename files before adding them. `mapbard add` copies each local source into the project and drafts a resource declaration. Each data feature needs a unique ID: `add` uses GeoJSON feature IDs or an `id` property, and otherwise reports the unique properties you can pass with `--feature-id <property>`. In `mapbard.json`, review its `id`, project-relative `path`, `crs`, `featureId`, `attributes`, and `attribution`. For a numeric binding, confirm the declared `role`, measurement `level`, and `unit` from source documentation. `add` leaves units as `null`. Give an encoded attribute a reader-facing `label` (for example `"Daily mean discharge"`); legends show the label and the unit, with caret exponents written as superscripts (`ft^3/s` displays as ft³/s). A shared scale's optional `title` overrides the label. Write units the same way in narration and annotations. Record the date or period in `observationLabel` when it matters. A placeholder credit must be replaced before publishing.

In `story.json`, each scene needs an `id`, `title`, `narration`, `layers`, `camera`, and `annotations`. Layer `sourceId` must match a registered data resource ID; `encode.attribute` must match a declared attribute. Camera `center` is `[longitude, latitude]`. A minimal point scene is:

```json
{
  "id": "stations",
  "title": "Survey stations",
  "narration": "These markers show the surveyed locations.",
  "layers": [{ "id": "locations", "sourceId": "stations", "technique": "point" }],
  "camera": { "center": [-77.5, 39.2], "zoom": 7 },
  "annotations": []
}
```

Add the scene to `scenes`; keep `formatVersion: "0.2.0"` and `sharedScales: []` at the story root. The example is a location depiction, so it makes no claim about an attribute value. For values, bind a supported encoding and declare the attribute's real unit. Use a shared equal-interval color scale when comparing that quantity across scenes.

Design fields are optional; omitted ones come from the theme. In `mapbard.json`, `theme` (`preset` plus single-token overrides), `layout` (`sidecar`, `overlay-cards` or `full-bleed`) and the basemap appearance (`tint`, `labels`, `terrain` with `exaggeration` and `hillshade`, `sky`, `projection`) shape the page; see [layout](layout.md). Layers without a data-driven or authored colour take context colours from the theme. On a size encoding or shared size scale, `maxRadius` (4–48 px, default 16) sets the largest symbol. Each scene annotation (`id`, `text`, `at`, and a `free` or `features` target) becomes a callout; earlier annotations win when space runs out. A scene's optional `motion` adds camera moves and layer and callout tracks; see [motion](motion.md). Run `mapbard capabilities` for the accepted themes, layouts, presets, modes and easings.

After any authored file or registered resource changes, run `mapbard lock` before `mapbard check`. `mapbard build` refreshes the lock automatically, then compiles and publishes. An `INPUT_STALE` diagnostic from `check` means the lock no longer matches the authored inputs; inspect the edit before refreshing it.

## 3D, comparison and flow fields (CLI 0.3.0)

The authored `formatVersion` remains `0.2.0`; builds emit compiled `0.4.0`. Do not author compiled backends, derived sources or generated callouts.

| Field                                                              | Meaning                                                                                                      |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `encode.visualVariable: "height"`, `encode.maxHeightMeters`        | Linear height from zero for a nonnegative ratio quantity; positive maximum up to 1,000,000 metres            |
| `encode.visualVariable: "width"`, `encode.maxWidth`                | Linear arc width from zero; 1–32 CSS pixels, default 8                                                       |
| `column: {"radiusMeters": 2600}`                                   | Constant column footprint, positive and at most 100,000 m; not a second quantity encoding                    |
| `compare: {"sourceId": "before", "labels": true}`                  | Match before values by feature ID using the same encoded attribute; labels are optional                      |
| `transition: {"from": {"sceneId": "before", "layerId": "gauges"}}` | Morph from another scene's compatible layer on the same shared scale; omitted `layerId` uses this layer's ID |
| `aggregate: {"cellKm": 10, "op": "count"}`                         | Point hexbin aggregation, cell width in ground km at the data centre; positive up to 1,000 km                |
| `aggregate: {"cellKm": 10, "op": "sum", "attribute": "value"}`     | `sum` or `mean` requires an attribute; `count` forbids one                                                   |
| `extrude: {"maxHeightMeters": 5000}`                               | Optional height of the tallest hexbin; heights and colour use the same aggregate                             |
| `arc: {"greatCircle": true}`                                       | Great-circle OD path instead of an elevated arc                                                              |
| `trip: {"timeProperty": "times", "trailHours": 6}`                 | One ISO UTC time per LineString vertex; positive trail up to 8,760 hours                                     |

Shared height and width scales use `visualVariable: "height"` with optional `maxHeightMeters`, or `"width"` with optional `maxWidth`. They need at least two members, each with `sceneId`, `layerId`, `sourceId` and `observationLabel`. Keep every compared period on one zero-based scale. Include the layer drawing the before source in the shared change scale so both periods set its range; the compiler rejects before values outside that scale.

`theme.light` may override `azimuth`, `altitude`, `intensity` and `color`. Use `mapbard schema mapbard.json` for allowed ranges. Lighting changes presentation, not the encoded height.
