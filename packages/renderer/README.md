# @mapbard/renderer

Generate a static MapBard publication from a validated, compiled story. This
package includes the browser player and bundled MapLibre assets used by the
generated site; the output can open from `file://` without an application
server.

## Install

```sh
npm install @mapbard/renderer
```

Requires Node.js 20 or later.

## Usage

```js
import { renderCompiled, writeCompiledBundle } from '@mapbard/renderer';

const result = renderCompiled(compiled, publication);
if (result.ok) await writeCompiledBundle(result.value, './out');
else console.error(result.diagnostics);
```

`compiled` and `publication` must satisfy the contracts in
[`@mapbard/schema`](https://www.npmjs.com/package/@mapbard/schema) (compiled
spec 0.3.0). The player draws the resolved theme and layout (with a phone
bottom sheet), theme-tinted basemaps with terrain, hillshade and sky, legends,
scale bars, and callouts placed clear of panels and controls every frame.
Scroll progress drives camera, layer and callout tracks, and readers who ask
for reduced motion get each scene's final view. The page exposes
`data-mb-state` and a read-only `window.MapBardStory` hook for testing. Most authors
should use [`mapbard build`](https://www.npmjs.com/package/mapbard), which handles
validation, source files, and offline mode for them. [Source and examples](https://github.com/GeoScenarioScripter/map-bard).
MIT licensed.

## Bundled third-party assets

Each publication copies these files next to the page, so it works offline:

| Asset                                     | Version | Licence                        |
| ----------------------------------------- | ------- | ------------------------------ |
| MapLibre GL JS (`vendor/`)                | 6.1.0   | BSD-3-Clause                   |
| Inter, Latin variable (`fonts/`)          | 5.3.0   | OFL-1.1, licence file included |
| Source Serif 4, Latin variable (`fonts/`) | 5.3.0   | OFL-1.1, licence file included |

Fonts come from the `@fontsource-variable` packages; a build copies only the
families its theme uses.
