# Compiled player — S1-W3-B

`player.ts` owns scene lifetime. It removes the prior scene's map layers, sources,
media markers, popups, callouts, controls and legend before binding the next
scene. Re-entering a scene reapplies compiled defaults. The first camera change
and reduced-motion changes use `cut`.

The normal renderer build emits the classic script at
`@mapbard/renderer/player.js`. Its global `MapBardCompiledPlayer` exposes
`createPlayer`, `createDomView`, `createMapLibreAdapter` and `observeScenes`.
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
`observeScenes(player, scenes)` activates the most visible scene with an
IntersectionObserver and returns a disconnect function. Call that and
`player.dispose()` on page teardown. Native buttons open media marker
popups; checkboxes and sliders are keyboard operable. Slider arrow keys move by
one percent of the authored range, Page keys by ten percent, and Home/End to
the endpoints.

Run the build before tests. The W3-B adapter tests consume the actual W3-A
compiled fixture and full g1-r1 GeoJSON sources; built-IIFE tests consume the
frozen specimen. These tests are not browser acceptance. W3-C publication wiring
and G3 composition remain separate.
