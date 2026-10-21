# mapbard

Build static, scrollable map stories from plain project files. MapBard profiles
geographic sources, checks the story against them, previews changes, and
publishes a site that can use free online basemaps or run fully offline.

## Install

Requires Node.js 20 or later. Use `npx mapbard` without installing globally, or
run `npm install --global mapbard` to get the `mapbard` command.

## Quick start

```sh
npx mapbard init my-story
npx mapbard --project my-story add ./data.geojson --id places --attribution "Data source"
npx mapbard --project my-story inspect places
```

Edit the generated `my-story/mapbard.json` and `my-story/story.json` to describe
your data and scenes. Then validate and build:

```sh
npx mapbard --project my-story lock
npx mapbard --project my-story check
npx mapbard --project my-story preview --open
npx mapbard --project my-story build
```

`preview` runs until you stop it. The build writes `my-story/out/index.html` and
`verification.json`. Add `--offline` to `build` to remove online sources and
make a publication with no network requests.

## What is included

- Commands to initialize projects, register and inspect sources, validate,
  preview, build, and migrate older projects.
- JSON output with diagnostics for scripts and coding agents (`--json`).
- A versioned authoring guide installed with `mapbard skill install --codex` or
  `mapbard skill install --claude`.

The current project format is 0.2.0. Programmatic integrations can use the
separate [`@mapbard/schema`](https://www.npmjs.com/package/@mapbard/schema),
[`@mapbard/core`](https://www.npmjs.com/package/@mapbard/core),
[`@mapbard/knowledge`](https://www.npmjs.com/package/@mapbard/knowledge), and
[`@mapbard/renderer`](https://www.npmjs.com/package/@mapbard/renderer) packages.
See the [project quickstart](https://github.com/GeoScenarioScripter/map-bard#five-minute-quickstart)
for a complete example. MIT licensed.
