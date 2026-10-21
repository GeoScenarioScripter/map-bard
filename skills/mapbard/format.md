# Format 0.2

`mapbard.json` holds the title, intent, basemap, and resource declarations. `story.json` holds ordered scenes and shared scales. `mapbard.lock.json` stores CLI-derived hashes and profiles. Run `mapbard schema mapbard.json` or `mapbard schema story.json` for the exact strict contracts. Unknown fields and format versions fail validation.

`mapbard init` supplies valid starter files. Project directory names, data and media file names, and `--id` values must use English (ASCII) characters; rename files before adding them. `mapbard add` copies each local source into the project and drafts a resource declaration. Each data feature needs a unique ID: `add` uses GeoJSON feature IDs or an `id` property, and otherwise reports the unique properties you can pass with `--feature-id <property>`. In `mapbard.json`, review its `id`, project-relative `path`, `crs`, `featureId`, `attributes`, and `attribution`. For a numeric binding, confirm the declared `role`, measurement `level`, and `unit` from source documentation. `add` leaves units as `null`. Record the date or period in `observationLabel` when it matters. A placeholder credit must be replaced before publishing.

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

After any authored file or registered resource changes, run `mapbard lock` before `mapbard check`. `mapbard build` refreshes the lock automatically, then compiles and publishes. An `INPUT_STALE` diagnostic from `check` means the lock no longer matches the authored inputs; inspect the edit before refreshing it.
