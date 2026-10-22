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

Motion is optional. Without it each camera holds still and each card rests for one viewport of scroll. A scene's `motion` sets `scrollLength` (viewport heights the card rests while progress runs from 0 to 1; one more viewport carries the card in and out), `trigger` (when the scene becomes active as its card arrives: `"top"` once it is at rest, `"center"` midway, or a fraction), `reducedMotion` (`step`, `shorten` or `keep`), a `camera` move, and `layers` tracks. Short camera form: `{"preset": "fly-along", "feature": "<sourceId>/<featureId>", "pitch": 55}`. Presets are `hold`, `reveal-from-overview` (optionally framing `feature`s instead of every layer), `push-in` (one or more features), `orbit` and `fly-along` (a line feature, or line features in travel order); explicit `keyframes` (`at`, `center`, `zoom`, `pitch`, `bearing`, `easing`) replace a preset. A list of camera moves is sequenced by each move's `range` (`[start, end]` of scene progress). Layer tracks animate a scene layer's `opacity`, `line-reveal` (constant-colour lines) or `highlight` with `from`/`to` or `keyframes`; a `play` or `loop` opacity or highlight track may add `stagger: {"delayMs": 300, "order": "data"}` (or `ascending`/`descending` by the encoded attribute) so features start one after another. `callouts` tracks fade an annotation's callout by its `calloutId` (the annotation ID) with the same `from`/`to`, `keyframes`, `range`, `mode`, `durationMs` and `delayMs`; they play once by default, and a callout at 0 is hidden. Modes are `scrub` (follows scroll, the camera default), `play` (once, the data default), `loop` (`type: "ambient"`, with a reader pause control) and `step`; set `durationMs`, `delayMs` and `easing` (`linear`, `ease-in`, `ease-out`, `ease-in-out`, `expo-out`, `cubic-bezier(x1, y1, x2, y2)`, `spring(stiffness, damping)`). `mapbard.json` may set story-wide `motion` defaults (including `camera`, `data`, `ambient` and `annotation` track settings) and named `motionPresets` that a scene uses with `"preset"`; the most specific setting wins.

After any authored file or registered resource changes, run `mapbard lock` before `mapbard check`. `mapbard build` refreshes the lock automatically, then compiles and publishes. An `INPUT_STALE` diagnostic from `check` means the lock no longer matches the authored inputs; inspect the edit before refreshing it.
