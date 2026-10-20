---
name: mapbard
description: Author and verify a MapBard map story with the deterministic CLI.
version: 0.1.0
---

# MapBard authoring

1. Run `mapbard capabilities` to discover supported techniques and basemaps.
2. Run `mapbard init <dir>` and `mapbard add <files...> --attribution <credit>`.
3. Run `mapbard inspect [resourceId]`; review extent, missing values and attribute types.
4. Edit `mapbard.json` and `story.json` only. Never edit `mapbard.lock.json` or generated output. See [format](format.md).
5. Run `mapbard check`, then `mapbard preview`; fix every error before building.
6. Run `mapbard build --out out`. Use `--offline` only after ensuring all media is local and the story has local geographic context.

The CLI never calls a model. Do not invent observations, infer missing units, or claim a longer trend from two snapshots. Keep attribution and qualifications in authored resources. See [data honesty](data-honesty.md).
