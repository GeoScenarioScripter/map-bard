# Compiled player foundation (S1-W2-C)

`player.ts` owns scene lifetime. A `MapAdapter` binds and unbinds **runtime** layer
IDs, sets the camera, places/removes markers, and applies scene-local controls.
`SceneView` presents panel media and controls. This separation lets tests use a
fake map without MapLibre or a browser. Re-entering a scene rebuilds its bindings
and reapplies authored control defaults. The first camera change and all changes
under reduced motion use `cut`.

`entry.ts` builds to the classic-script IIFE at
`packages/renderer/dist/player/player.js`. The normal workspace build includes
the dedicated player typecheck and esbuild bundle; to rebuild just the player
after schema has been built:

```sh
pnpm --filter @mapbard/renderer build:player
```

It exposes `globalThis.MapBardCompiledPlayer.createPlayer` and
`createDomView`. The bundle has no external module imports. This is an
**injection surface**, not yet a complete browser player: W3-B supplies the
MapLibre adapter, resolved scale/layer styling, annotations and scroll wiring;
W3-C wires the compiled payload and page assets. G2 derives all consumer types
from public `@mapbard/schema` types. Type-only imports keep schema/Zod execution
out of the browser IIFE. The legacy `runtime/app.js` stays separate.

The public asset subpath is `@mapbard/renderer/player.js`. A Node publication
writer resolves it using `import.meta.resolve('@mapbard/renderer/player.js')`
(or `createRequire(import.meta.url).resolve(...)`) and copies the resulting
bytes into its bundle. This is a **classic-script asset**, not an ESM API:
do not import it for side effects or load it with `type="module"`. The build
fails if esbuild reports any external module imports. Missing build output must
be diagnosed by the future writer; never silently use the legacy runtime.

Run build before tests. `built-player.test.ts` resolves that public asset and
executes the actual IIFE in Node VM with injected map/view adapters, consuming
the same schema-validated frozen `compiled.expected.json` used at the G2 gate.
It checks scene isolation, control reset, cleanup, reduced motion and version
rejection. This is model-free bundle evidence, not DOM/MapLibre/browser acceptance.

The compiled page will need the locally bundled MapLibre and scrollama classic
scripts, the IIFE, an inline or bundled compiled payload, and GeoJSON data keyed
by compiled resource ID. Local media use `bundlePath`; remote media require
their declared network URL. `createDomView` expects scene elements with
`data-scene-id`, plus media and control hosts. The existing CSS class names
`mb-media` (with placement modifier), `mb-credit`, `mb-qualification`,
`mb-control`, `mb-control-input`, and `mb-popup-title` are emitted for later
styling. The browser layer must pass current
`prefers-reduced-motion` state through the `reducedMotion` option.
