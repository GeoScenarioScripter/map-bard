# @mapbard/knowledge

MapBard's catalog of supported map techniques, encoding prerequisites, and
keyless basemap and terrain providers. Use it to discover capabilities or
resolve a declared basemap without making a network request.

## Install

```sh
npm install @mapbard/knowledge
```

Requires Node.js 20 or later.

## Usage

```js
import { STAGE1_CAPABILITIES, resolveBasemap } from '@mapbard/knowledge';

const basemap = resolveBasemap({ provider: 'openfreemap', style: 'positron' });
console.log(STAGE1_CAPABILITIES.ids, basemap);
```

The catalog includes OpenFreeMap and VersaTiles styles plus Mapterhorn and AWS
Terrarium terrain metadata. The package also provides the theme presets
(`resolveTheme`, `THEME_PRESET_TOKENS`), layout frames (`resolveLayout`),
display formatters for units, numbers and titles, WCAG contrast helpers, the
critic rules (`critique`) and the publication size budgets (`sizeReport`,
`budgetDiagnostics`). For an authoring CLI, see
[`mapbard`](https://www.npmjs.com/package/mapbard). [Source and examples](https://github.com/GeoScenarioScripter/map-bard).
MIT licensed.
