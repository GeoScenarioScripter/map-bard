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

`npx mapbard capabilities` lists the techniques, themes (`editorial-light`,
`night`, `atlas`, `newsroom`), layouts (`sidecar`, `overlay-cards`,
`full-bleed`), camera presets, motion modes and easings that the project format
accepts, and whether visual checks can run on this machine.

## Check the page visually

```sh
npx mapbard --project my-story check --visual
```

`check --visual` runs `check`, builds the story into
`my-story/.mapbard-visual/build/` and opens it in headless Chromium at desktop
and phone sizes. It reports panels or controls covering map targets, symbols or
callouts, callouts that overlap or leave the screen, console errors, and
requests from an offline build as `VISUAL_*` diagnostics. Each camera move is
also sampled along its path. A `contact-sheet.png` and `report.json` are written to
`.mapbard-visual/captures/`; the project and its lockfile are never changed.

| Option                                                       | Effect                                                                                                                                    |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `--network offline` (default), `stub`, `live`, `unavailable` | Offline build; online build with stubbed tiles; real tile hosts; or every tile host failing, to check the basemap notice and local layers |
| `--update`                                                   | Write the captures to `goldens/` (with a measured noise tolerance); later offline runs compare against them                               |
| `--frames`                                                   | Report p95 and p99 frame intervals while the story scrolls                                                                                |
| `--fail-on-warnings`                                         | Treat warnings as errors                                                                                                                  |

It needs Google Chrome, Playwright's Chromium (`npx playwright install
chromium`), or `MAPBARD_CHROME_PATH` pointing to a Chrome or Chromium
executable; without one it reports `VISUAL_BROWSER_MISSING`. `build` and
`check --visual` also report the page's JavaScript size against its budgets
(core 450 KB gzip, all tiers 1.2 MB) as `BUDGET_EXCEEDED` warnings.

## Use with a coding agent

The npm package includes the versioned MapBard authoring skill. Install it into
your project before asking your agent to edit the story:

```sh
npx mapbard --project my-story skill install --codex
# Or, for Claude Code:
npx mapbard --project my-story skill install --claude
```

`--codex` writes `my-story/skills/mapbard/` and adds a reference to
`my-story/AGENTS.md`. `--claude` writes `my-story/.claude/skills/mapbard/`.
Then give your agent the source data, attribution, and story intent; ask it to
follow the installed skill and run `inspect`, `lock`, `check`, `check --visual`,
`preview`, and `build`. The CLI does not call an AI model.

## What is included

- Commands to initialize projects, register and inspect sources, validate,
  check the rendered page, preview, build, and migrate older projects.
- Themes, layouts with a phone bottom sheet, terrain with hillshade and sky,
  scroll-driven camera and layer motion, and collision-aware callouts.
- JSON output with diagnostics for scripts and coding agents (`--json`).
- A versioned authoring guide for coding agents.

The current project format is 0.2.0. Programmatic integrations can use the
separate [`@mapbard/schema`](https://www.npmjs.com/package/@mapbard/schema),
[`@mapbard/core`](https://www.npmjs.com/package/@mapbard/core),
[`@mapbard/knowledge`](https://www.npmjs.com/package/@mapbard/knowledge), and
[`@mapbard/renderer`](https://www.npmjs.com/package/@mapbard/renderer) packages.
See the [project quickstart](https://github.com/GeoScenarioScripter/map-bard#five-minute-quickstart)
for a complete example. MIT licensed.
