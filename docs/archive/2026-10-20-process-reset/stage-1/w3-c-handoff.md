# S1-W3-C — Publication and assets handoff

2026-10-20, BUILD_LOG Session 28. The publication implementation is complete on
its owned renderer source paths. G3 still owns public exports and end-to-end
composition; W4-C owns direct-file browser acceptance.

## Producer output

`renderCompiled(compiled, publication, {})` creates a compiled page, inlined
GeoJSON script and browser bootstrap without I/O. It compares the entire fresh
input snapshot with `compiled.input`, hashes each supplied data buffer, parses
those same bytes for playback, checks local media membership and poster IDs, and
verifies explicit remote HTTP(S) dependencies. Stale or invalid inputs return
diagnostics and no bundle.

The page loads local MapLibre assets and the built classic player, creates a
neutral map, connects scene, control, legend and media hosts, and observes authored
scenes. It preserves escaped title, prose, credits and qualifications. The data
script escapes script-breaking characters and needs no fetch. The bootstrap
reports playback errors in the page and disposes the player/map on page exit.

`writeCompiledBundle(bundle, outDir)` preflights all copy destinations, required
browser files and local media before publishing. It rejects unsafe or colliding
paths, missing/linked/outside-root sources, changed hashes and an existing output
directory. It writes to a sibling staging directory and renames it into place;
failed exports do not leave a successful output directory. The writer returns
the exact written manifest, input snapshot and diagnostics.

The generated bundle contains `index.html`, `compiled-data.js`,
`compiled-app.js`, `style.css`, `player.js`, `vendor/maplibre-gl.js`,
`vendor/maplibre-gl.css`, and each declared local image/video. Data is inlined;
remote media are URL references listed in `requiredNetwork`. The player bundle
must exist at `@mapbard/renderer/player.js` after the normal build. The legacy
`render`/`writeBundle` path is unchanged.

## Verification and limits

- Five package builds, 115 tests (schema 22, core 65, renderer 28), lint and
  targeted strict TypeScript checks pass.
- Tests use the actual W3-A compiled fixture and full frozen GeoJSON bytes. They
  exercise direct-file wiring and script syntax, stale design/data, escaping,
  local video poster copying, remote dependency declarations, hash changes,
  output collisions, linked/outside-root sources and existing output refusal.
- The Windows test account cannot create a symlink (`EPERM`), so that one fixture
  is conditional. The writer's link rejection is implemented and its outside-root
  check runs unconditionally. W4-B should exercise a link on a capable host.
- No compiled browser interaction, offline relocation, responsive layout or
  accessibility acceptance is claimed. W4-C must check those separately.

## G3 consumer actions

Export `renderCompiled` and `writeCompiledBundle` from the public renderer barrel,
and `compileProject` from the public core barrel. Compose a fresh `loadProject` →
`validateProject` → `compileProject` → `renderCompiled` →
`writeCompiledBundle` pipeline and inspect the written manifest. Check compiled
version and every supported capability against player tests. Keep the frozen
g1-r1 specimens unchanged.
