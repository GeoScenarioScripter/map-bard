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
source inspection, lock refresh, migration, and `compileProject`. Most authors
should use the [`mapbard` CLI](https://www.npmjs.com/package/mapbard), which
connects these steps. [Source and examples](https://github.com/GeoScenarioScripter/map-bard).
MIT licensed.
