# S1-W3-B — Faithful playback handoff

2026-10-19, BUILD_LOG Session 27. W3-B is implemented on its owned player and
stylesheet paths. W3-C publication and G3 composition remain open.

## Consumer boundary

The classic `@mapbard/renderer/player.js` asset now exposes `createPlayer`,
`createDomView`, `createMapLibreAdapter` and `observeScenes`. The map adapter
requires the compiled story, GeoJSON keyed by compiled source ID, a loaded
MapLibre map and its Marker/Popup constructors. The DOM view requires scene
elements and media/control/legend hosts. W3-C/G3 must create a neutral map,
wait for `load`, supply the compiled payload and data, connect these entry points,
and include `runtime/style.css`. The `.mb-legend-host` host is required. See the
[player README](../../packages/renderer/player/README.md) for the invocation
shape and teardown sequence.

## Behavior matrix

| Compiled capability        | Playback and evidence                                                                                                                                                                                                         |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Point, line, polygon       | Circle, line and fill MapLibre layers use distinct scene runtime IDs; adapter tests check their paint and filter shapes.                                                                                                      |
| Numeric equal intervals    | Compiled edges drive `step`: lower edge enters the next class and the final class includes the maximum. The W3-A fixture uses one shared `[0,40,80,120]` scale in both scenes; tests compare the exact expression and labels. |
| Categories and no data     | Typed category equality preserves number/string/boolean distinctions; all-missing categories use only no-data color. Null/non-number numeric values receive compiled no-data treatment.                                       |
| Graduated area             | The specified square-root transfer uses compiled domain/radius endpoints; constant and zero-size cases preserve their compiled radii. Legends use compiled exemplars and no-data radius/color.                                |
| Filters and controls       | Six typed comparisons have a type guard. Visibility and compatible radius/opacity paint update only the active runtime layer. Scene re-entry reapplies defaults.                                                              |
| Annotations, media, popups | Explicit compiled anchors become keyboard-focusable buttons with escaped popup text/media; `auto` media opens on entry. Scene exit removes markers/popups.                                                                    |
| Camera, scroll, cleanup    | Cut/ease/fly and reduced motion follow compiled transitions. IntersectionObserver activates the most visible authored scene. Layer/source/marker/view teardown precedes next bind, and failed entry cleans partial bindings.  |

## Verification and limits

- Five packages build; 110 tests pass (schema 22, core 65, renderer 23); lint and
  strict typechecking of the new test files pass. The built IIFE syntax passes.
- Adapter tests consume the **actual W3-A compiled fixture and full g1-r1 GeoJSON**.
  They check shared scale reuse, scene-specific IDs, control reset, source/marker
  cleanup, category types, size cases and geometry/filter expressions.
- Numeric, category, area and filter expressions were separately accepted by
  the installed MapLibre style expression parser. Legacy example generation,
  three syntax checks and the G1 source/specimen verifier pass.
- The stylesheet received a static narrow-screen/keyboard-focus review. A new
  compiled browser page does not exist until W3-C. The available computer-use
  browser inventory failed to load, so no rendered layout, interaction or
  `file://` acceptance is claimed here. W4-C must perform those checks.
- The player trusts the compiled contract and supplied source map after G3's
  publication checks. It does not rehash authored inputs or choose domains,
  categories or classifications. Unsupported requests remain compiler errors.
