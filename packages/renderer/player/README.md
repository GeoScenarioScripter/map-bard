# Compiled player — S1-W3-B

`player.ts` owns scene lifetime. It removes the prior scene's map layers, sources,
media markers, popups, callouts, controls and legend before binding the next
scene. Re-entering a scene reapplies compiled defaults.

Motion (compiled 0.3.0): `player.update(sceneId, p, armed)` receives scroll
progress and evaluates the scene's compiled tracks every frame (`motion.ts`):
`scrub` follows `p`, `play` runs once after the scene reaches its trigger line,
`loop` repeats until paused, `step` jumps to the final state. The camera goes
through `setCamera(state, 'cut')`, so the adapter's layout padding and zoom
offset apply to every frame; layer tracks go through `setLayerProperty`.
Between scenes the camera blends from what the reader saw, using the later
scene's `transitionIn` in either scroll direction; the first entry cuts. Under
`prefers-reduced-motion` each scene's `reducedMotion` policy applies: `step`
(final states), `shorten` (only short data fades) or `keep`. `onMotionChange`
reports when a scene has a loop so the page can show its pause control, and
`setPaused` freezes loops. `seek(sceneId, p)` settles timed tracks for
deterministic captures. Easing math comes from the Zod-free
`@mapbard/schema/easing` entry.

The normal renderer build emits the classic script at
`@mapbard/renderer/player.js`. Its global `MapBardCompiledPlayer` exposes
`createPlayer`, `createDomView`, `createMapLibreAdapter` and `trackScenes`.
Schema and MapLibre imports are type-only in the player bundle; G3/W3-C must load
MapLibre, create the map, supply GeoJSON by compiled resource ID and wire the page.

`createMapLibreAdapter(story, data, map, maplibregl)` owns MapLibre source and
layer registration. Data must contain every compiled source ID. The adapter uses
compiled `scaleId`, exact edges, colors, labels and size transfer functions;
it never infers a domain or category from a sample. It renders only neutral
basemap stories. The caller creates a neutral MapLibre map and waits for its
`load` event before entering a scene.

Annotations render as compiled callouts in a DOM overlay inside the map
container: a list of labels that screen readers read, with decorative SVG
leader lines and target halos. `callout-placement.ts` re-places them on every
map frame against the screen edge, other callouts, every drawn point symbol and
the screen rects returned by the adapter's `obstacles` option (the compiled page
passes the layout's reserved card area, the rail and the map controls).

`createDomView({ scenes, media, controls, legends })` expects authored scene
elements with `data-scene-id` and distinct media, control and legend hosts. Give
the legend host class `mb-legend-host`; the included runtime stylesheet styles it.
`trackScenes(player, elements, story.scenes)` reports the active scene and its
progress on every scroll or resize frame (wheel, touch and keyboard all scroll
the page). Each section is `scrollLength` + 1 viewports tall and holds its card
in a one-viewport sticky frame: p runs 0 to 1 while the card rests, and the
scene becomes active when its top crosses its `trigger` line during the
one-viewport transit from the previous card. It returns `measure`, `pin` and
`release` (capture only) and `dispose`. Call `dispose()` and
`player.dispose()` on page teardown. Native buttons open media marker
popups; checkboxes and sliders are keyboard operable. Slider arrow keys move by
one percent of the authored range, Page keys by ten percent, and Home/End to
the endpoints.

Run the build before tests. The W3-B adapter tests consume the actual W3-A
compiled fixture and full g1-r1 GeoJSON sources; built-IIFE tests consume the
frozen specimen. These tests are not browser acceptance. W3-C publication wiring
and G3 composition remain separate.
