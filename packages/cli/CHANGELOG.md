# mapbard

## 0.1.2

### Patch Changes

- Harden `mapbard preview`: it survives malformed URLs, serves media with real content types, serializes rebuilds, exits cleanly on Ctrl+C, and keeps serving with an in-page diagnostics panel when the project has errors. `add` removes its copy when registration fails, accepts `--feature-id <property>`, rejects non-ASCII file names and IDs, and reports `RESOURCE_MISSING` outside a project; `init` rejects non-ASCII directory names. `--limit` now bounds only diagnostics and result lists, and JSON envelopes report `truncated`. `check` reports placeholder credits together with compile diagnostics and every missing reference. The npm README documents skill installation.
- Updated dependencies
  - @mapbard/core@0.1.2
  - @mapbard/renderer@0.1.1

## 0.1.1

### Patch Changes

- Add clear package descriptions, discovery metadata, and standalone npm README guides for all published packages.
- Updated dependencies
  - @mapbard/schema@0.1.1
  - @mapbard/core@0.1.1
  - @mapbard/knowledge@0.1.1
  - @mapbard/renderer@0.1.1
