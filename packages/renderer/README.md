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
[`@mapbard/schema`](https://www.npmjs.com/package/@mapbard/schema). Most authors
should use [`mapbard build`](https://www.npmjs.com/package/mapbard), which handles
validation, source files, and offline mode for them. [Source and examples](https://github.com/GeoScenarioScripter/map-bard).
MIT licensed.
