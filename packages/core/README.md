# @mapbard/core

The deterministic project engine behind the MapBard CLI. It loads and validates
plain-file projects, profiles geographic sources, checks lockfile freshness, and
compiles scenes into a resolved publication spec. It does not call an LLM.

## Install

```sh
npm install @mapbard/core
```

Requires Node.js 20 or later.

## Usage

```js
import { loadProjectV2 } from '@mapbard/core';

const result = await loadProjectV2('./my-story');
if (!result.ok) console.error(result.diagnostics);
```

`loadProjectV2` reads `mapbard.json`, `story.json`, and `mapbard.lock.json`; a
missing or stale lockfile produces diagnostics. The public API also includes
source inspection, lock refresh, migration, `compileProject` and
`critiqueProject`. The compiler resolves the theme, layout, colour and size
scales, legends, callouts and scroll-driven motion tracks into compiled spec
0.4.0. In the 0.3.0 package release it also resolves height/width scales,
columns, normalized extrusions, change symbols, hexbins, arcs and trips.
Change and morph joins and hexbin aggregates carry source hashes and operation
parameters in compiled derived sources. Generated change labels carry their
inputs; authored narration is still literal text, not an evidence binding.
`critiqueProject` returns warnings for reader-facing problems such as
raw identifiers, unformatted units, comparisons hidden in one colour class,
low mark contrast, unseen height, unequal hexbin ground areas and narration too
long for a phone. Most authors
should use the [`mapbard` CLI](https://www.npmjs.com/package/mapbard), which
connects these steps. [Source and examples](https://github.com/GeoScenarioScripter/map-bard).
MIT licensed.
