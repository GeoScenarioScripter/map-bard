# Motion

Motion is optional. Without it each camera holds still and each card rests for one viewport of scroll. Add motion when movement carries part of the claim: where a place sits in its region, the course of a river, or which feature a comparison is about. Decoration that the narration does not need slows the reader and costs frame time.

## Scene motion

A scene's `motion` sets `scrollLength` (viewport heights the card rests while progress runs from 0 to 1; one more viewport carries the card in and out), `trigger` (when the scene becomes active as its card arrives: `"top"` once it is at rest, `"center"` midway, or a fraction), `reducedMotion` (`step`, `shorten` or `keep`), a `camera` move, and `layers` and `callouts` tracks.

Short camera form: `{"preset": "fly-along", "feature": "<sourceId>/<featureId>", "pitch": 55}`. Explicit `keyframes` (`at`, `center`, `zoom`, `pitch`, `bearing`, `easing`) replace a preset. A list of camera moves is sequenced by each move's `range` (`[start, end]` of scene progress).

| Camera preset          | Use when                                                                                | Avoid when                                                                        |
| ---------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `hold`                 | The scene's point is in its data, not in moving to it                                   | Never wrong; it is the default                                                    |
| `reveal-from-overview` | The opening scene, or a reader needs to see where the study area sits before closing in | Every scene repeats it; readers lose the thread. Frame named `feature`s to aim it |
| `push-in`              | One or a few features carry the scene (a limit, an outlier, a named place)              | The features are already large on screen                                          |
| `orbit`                | Terrain shape or a 3D form is the subject                                               | The map is flat; orbiting a flat map only rotates the labels                      |
| `fly-along`            | The route itself matters: a river, a road, a migration path, given in travel order      | The line is short, or point symbols along it would slide under the story panels   |

`fly-along` follows every part of its line features as one network and takes the shortest route from the first feature's free end to the last's far end. Raise `zoom` or `pitch`, or shorten the path, when `check --visual` reports symbols passing under panels in flight.

## Layer and callout tracks

Layer tracks animate a scene layer's `opacity`, `line-reveal` (constant-colour lines only) or `highlight`, with `from`/`to` or `keyframes`. A `play` or `loop` opacity or highlight track may add `stagger: {"delayMs": 300, "order": "data"}` (or `ascending`/`descending` by the encoded attribute) so features start one after another. `stagger` cannot apply to `line-reveal` or to `scrub` and `step` tracks; `check` says so.

`callouts` tracks fade an annotation's callout by its `calloutId` (the annotation ID) with the same `from`/`to`, `keyframes`, `range`, `mode`, `durationMs` and `delayMs`. They play once by default, and a callout at 0 is hidden. Fade callouts out during a long camera flight and back in at rest, so labels don't sweep across the map.

## Modes, easing and defaults

Modes are `scrub` (follows scroll, the camera default), `play` (once, the data default), `loop` (`type: "ambient"`, with a reader pause control) and `step`. Set `durationMs`, `delayMs` and `easing`: `linear`, `ease-in`, `ease-out`, `ease-in-out`, `expo-out`, `cubic-bezier(x1, y1, x2, y2)` or `spring(stiffness, damping)`.

`mapbard.json` may set story-wide `motion` defaults (including `camera`, `data`, `ambient` and `annotation` track settings) and named `motionPresets` that a scene uses with `"preset"`; the most specific setting wins.

## Reduced motion and checks

Readers who ask for reduced motion get each scene's final view (`step`, the default), a shortened move (`shorten`) or the full move (`keep`). Keep `step` unless the move itself is the evidence; the narration must still make sense from the final view alone.

Run `mapbard check --visual` after adding or changing camera moves. It samples every 0.05 of scene progress along each moving `scrub` camera track and tags each finding `rest` or `flight`; see [diagnostics](diagnostics.md).
