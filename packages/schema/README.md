# @mapbard/schema

Versioned Zod contracts for MapBard project files, stories, lockfiles, compiled
publications, and diagnostics. Use this package to validate MapBard data or
generate JSON Schema for editors and authoring tools.

## Install

```sh
npm install @mapbard/schema
```

Requires Node.js 20 or later.

## Usage

```js
import { readFile } from 'node:fs/promises';
import { ProjectV2Schema, projectJsonSchema } from '@mapbard/schema';

const project = JSON.parse(await readFile('mapbard.json', 'utf8'));
const result = ProjectV2Schema.safeParse(project);
if (!result.success) console.error(result.error.issues);

const editorSchema = projectJsonSchema(); // JSON Schema for mapbard.json
```

`StoryV2Schema` and `storyJsonSchema()` provide the corresponding contracts for
`story.json`. The current authored format is 0.2.0. For a ready-to-use CLI, see
[`mapbard`](https://www.npmjs.com/package/mapbard). [Source and examples](https://github.com/GeoScenarioScripter/map-bard).
MIT licensed.
