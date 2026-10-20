# MapBard

MapBard turns plain project files into a static, scrollable map story. A coding agent or a human writes the story; the deterministic CLI validates it, resolves sources, and publishes the page. The current format is 0.2.0. The npm release is still planned, so these commands run the CLI from this repository.

## Five-minute quickstart

Use Node 20+ and pnpm 9.15.0. From the repository root:

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm -r build
node packages/cli/dist/bin.js capabilities
node packages/cli/dist/bin.js init my-story
node packages/cli/dist/bin.js --project my-story add examples/projects/potomac/data/potomac-2024-10-01.geojson --id gauges --attribution "U.S. Geological Survey daily values"
node packages/cli/dist/bin.js --project my-story inspect gauges
```

The CLI copies the GeoJSON into `my-story/data/` and registers it in `mapbard.json`. The source has three point features with stable IDs. Edit `my-story/mapbard.json` to give the project an accurate title and intent. Replace `my-story/story.json` with this location-only story:

```json
{
  "formatVersion": "0.2.0",
  "scenes": [
    {
      "id": "gauges",
      "title": "Three Potomac gauges",
      "narration": "These points locate three U.S. Geological Survey gauges on the Potomac River.",
      "layers": [{ "id": "locations", "sourceId": "gauges", "technique": "point" }],
      "camera": { "center": [-77.65, 39.3], "zoom": 7 },
      "annotations": []
    }
  ],
  "sharedScales": []
}
```

Then validate, preview, and publish:

```sh
node packages/cli/dist/bin.js --project my-story lock
node packages/cli/dist/bin.js --project my-story check
node packages/cli/dist/bin.js --project my-story preview --open
node packages/cli/dist/bin.js --project my-story build
```

`preview` stays running and reloads when authored files change. Stop it with Ctrl+C before the final `build`. The publication is `my-story/out/index.html`; `my-story/out/verification.json` lists its input hashes and online hosts. Add `--offline` to `build` for a publication with no network requests. A richer [three-scene Potomac example](examples/projects/potomac/README.md) uses a shared data scale, credited photo, local context layers, and an online basemap.

## With a coding agent

Install the versioned authoring pack in a project, then give the agent the data files, their source credits, and the story intent:

```sh
node packages/cli/dist/bin.js --project my-story skill install --claude
# Or: node packages/cli/dist/bin.js --project my-story skill install --codex
```

Ask the agent to follow the installed MapBard skill, inspect the registered sources, edit `mapbard.json` and `story.json`, and run `lock`, `check`, `preview`, and `build`. The agent should never edit `mapbard.lock.json` or published output by hand. The [skill pack](skills/mapbard/SKILL.md) explains the current format and supported techniques.

## Development

```sh
corepack pnpm -r build
corepack pnpm test
corepack pnpm lint
```

The test suite includes a headless Chrome smoke test. Set `MAPBARD_CHROME_PATH` if Chrome is not discoverable through Playwright's `chrome` channel. The test stubs the online basemap style, so it checks the host request and player behavior without depending on public tile availability. `playwright-core` 1.64.1 is an Apache-2.0 development dependency.

Current work and known limitations are in [STATUS.md](docs/STATUS.md); the [roadmap](docs/ROADMAP.md) and [M1 plan](docs/m1-cli.md) describe the next steps.
