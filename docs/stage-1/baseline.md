# S1-W1-C — Baseline and runtime spike

2026-10-18 · BUILD_LOG Session 13 · Wave 1 handoff to G1 and S1-W2-C.

This is the M0–M4 baseline and a disposable TypeScript player experiment. It
does not freeze G1 contracts or change the production renderer. The real-case
gate in [the case dossier](case-dossier.md) remains open.

**Session 14 completion audit, 2026-10-19:** full-tree lint after the spike was
added exposed eight Node-global `no-undef` errors not covered by the earlier
baseline lint run. Explicit Node imports and `globalThis.structuredClone` fix
them; lint and the spike checks now pass. Five builds, 53 tests, legacy generation,
syntax and TypeScript checks were rerun successfully. See the
[G1 review](g1-review.md) for final integration results and remaining browser gate.

## Environment and baseline run

- Windows, PowerShell, Node 22.19.0, pnpm 9.15.0, TypeScript 5.9.3, Vitest
  2.1.9, ESLint 9.39.4, Prettier 3.8.4; MapLibre GL JS 4.7.1 and scrollama
  3.2.0 are installed locally. `node_modules` was present at the start.
- `corepack pnpm install --frozen-lockfile --offline` returned an interactive
  reinstall prompt and exited without reinstalling. Subsequent checks use the
  existing local dependency tree. A clean-checkout install remains unverified.
- `corepack pnpm -r build`: pass, five packages.
- `corepack pnpm -r test`: pass, 53 tests (schema 12, core 35, renderer 6;
  empty CLI and knowledge packages report no tests).
- `corepack pnpm lint`: pass.
- `node packages/renderer/scripts/render-example.mjs`: pass, nine files in
  ignored `out/`, no warnings. `node --check packages/renderer/runtime/app.js`
  and `node --check out/bundle-data.js`: pass.
- The generated HTML references four classic local scripts in order:
  `vendor/maplibre-gl.js`, `vendor/scrollama.min.js`, `bundle-data.js`,
  `app.js`. All nine generated output files exist, including two local images.
  This is static evidence; it does not establish browser playback.

The in-app browser rejected `file:///D:/code/MapBard/out/index.html` under its
URL policy and explicitly prohibited alternate browser routes to the same page.
No browser playback, visual, accessibility, offline/network-disabled, or
responsive pass is claimed. Browser verification remains a G1/W4-C gate.

### Reproducible baseline bugs

`node docs/stage-1/runtime-spike/legacy-repro.mjs` runs the unchanged
`runtime/app.js` with a minimal MapLibre/DOM adapter and passes these assertions:

1. Two scenes reuse layer ID `shared` with different sources `old` and `new`.
   Registration only adds the first binding; entering the second scene still
   leaves `shared` attached to `old`.
2. A slider with default radius `8` is rendered on scene entry, but no paint
   property write applies that default. A subsequent scene revisit has no
   reset path for a previously changed radius.

These are deterministic adapter observations, not browser observations. The
existing handwritten example uses different layer IDs, so it does not exercise
the first case. [The Stage 1 plan](../stage-1-plan.md) also documents current
categorical/classification, basemap, filter, and asset-path gaps; they were not
retested here.

## TypeScript player experiment

The [runtime spike](runtime-spike/) contains a small typed `createPlayer()` with
a map adapter, an IIFE entry, a local classic-script HTML probe, and repeatable
Node checks. It uses the esbuild 0.21.5 copy already installed transitively by
Vitest/Vite; no manifest or lockfile was edited. Run:

```sh
node node_modules/typescript/bin/tsc --noEmit --strict --target ES2020 --module NodeNext --moduleResolution NodeNext --lib ES2020,DOM docs/stage-1/runtime-spike/player.ts docs/stage-1/runtime-spike/entry.ts
node docs/stage-1/runtime-spike/build.mjs
node docs/stage-1/runtime-spike/verify.mjs
node docs/stage-1/runtime-spike/legacy-repro.mjs
```

All four commands passed. The build's esbuild metafile has zero external
imports. `verify.mjs` reads the local `player.js` listed by `index.html`,
executes it as a classic script in Node's VM, and checks global initialization,
scene-local runtime IDs, source rebinding, marker cleanup, and radius reset on
revisit. No CDN, dynamic `import()`, or `fetch()` is used by this probe. The VM
does not emulate MapLibre, scrollama, layout, or `file://` browser policy.

### Proposed W2-C build path, subject to G1

- Use a small esbuild browser IIFE for a TypeScript player entry; write it under
  the renderer's ignored build output before export. Keep MapLibre and scrollama
  as local vendored classic scripts and consume their APIs through narrow typed
  adapters. G1 owns the direct dependency/version and package script decision.
- Key each runtime layer by scene and authored layer ID. On scene activation,
  tear down prior bindings/markers, add the next compiled bindings, apply
  authored control defaults, then attach input listeners. Preserve scene-local
  state only when an explicit future contract asks for it.
- Start W2-C with adapter tests for reused IDs, different sources/encodings,
  visit/revisit, marker cleanup, controls, media escaping, and reduced motion.
  Retain separate browser acceptance for camera/scroll behavior and `file://`.
- Do not replace `runtime/app.js` or alter the current writer at W2-C; those
  integration steps belong to later owners/gates. The spike's ID encoding and
  adapter signatures are illustrative, not frozen public contracts.

Esbuild is a **candidate**, not selected: this session could demonstrate local
classic-script loading only in a Node VM. G1 should select the build setup after
an authorized browser confirms direct `file://` playback without remote/module
requests. If that remains blocked, record the gate as unresolved; localhost
playback can supplement but cannot substitute for portable-file acceptance.

### Browser procedure for an authorized reviewer

1. Build and generate the existing example with the commands above; open
   `out/index.html` directly as a local file in an authorized browser. Disable
   network access or use an offline profile and inspect requests for remote
   URLs/module fetches and console errors.
2. Scroll from overview to Ferry Building and back. Check camera transitions,
   visible source/layer, panel image, map marker/popup, and size control.
3. Open the spike's `index.html` beside its generated `out/runtime-spike/player.js`
   (copy the HTML into that output directory first). Confirm the script loads
   locally without network requests. The spike has no visible MapLibre map;
   `verify.mjs` is its interaction oracle.
4. Later, use W2-C's compiled specimen with reused authored layer IDs to check
   distinct sources, default reset, revisits, reduced motion, and small-screen
   layout. Record browser/version, method, observed failures, and reviewer.

## Verification record template

Store automated records beside ignored output and a sanitized summary here.
Keep elapsed time and environment outside the deterministic input/output hash
set. A reviewer appends browser/manual findings separately.

```yaml
recordVersion: 0.1.0-local
fixture: <relative fixture ID and revision>
inputs: { path: <relative path>, sha256: <hex> }
operation: <build | test | render | browser | manual>
versions: { engine: <version/ref>, compiler: <version/ref>, runtime: <version/ref> }
result: <pass | fail | skipped | unavailable>
diagnostics: [{ code: <code>, affectedIds: [<ID>] }]
outputs: [{ path: <relative path>, sha256: <hex> }]
limitations: [<unresolved fact or check>]
execution: { environment: <OS/tool/browser>, elapsedMs: <wall time if measured> }
review: { method: <automated | browser | manual>, reviewer: <name/role if applicable> }
modelPromptBudget: not-applicable
```

Actual sanitized examples from this session:

| Operation and revision                                   | Result                                                                                                                        | Input/output identity                                                                                                                                                                                                                                                                                                                                                                                     | Limits                                                                 |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Model-free `render-example.mjs`, current `main` checkout | Pass, 9 files, no warnings                                                                                                    | `examples/sf-waterfront.geonarrative.json` SHA-256 `a68f944cc6c3ef7317d1e20ec7ab81e01b7de52a76e5bb5612bc75083e307369`; `examples/data/landmarks.geojson` `2baa36059e78cb1812446baf1738b32b2aec09ddc53cc2082f18ded00edcaf5d`; `out/index.html` `0fb8f795c279d36647f4db9f328eab1ba15a0029035ea1d472431d7fb06c62da`; `out/bundle-data.js` `8e793d45bd1f2d3f83326385455bddb6d3195e2efb7e7b12faabbd9cb2b8d3cf` | Output remains legacy runtime; no interactive judgment.                |
| Model-free `legacy-repro.mjs`, current `runtime/app.js`  | Pass: reproduced two failures (`LEGACY_SCENE_LAYER_REUSE`, `LEGACY_CONTROL_DEFAULT_NOT_APPLIED`), affected ID `shared`/`size` | `out/app.js` SHA-256 `a03abe5fa2495c69977a390d7172807906a77273166e2bbeb9cbb6eff765ead7`                                                                                                                                                                                                                                                                                                                   | Codes are local report labels, not public diagnostics; mocked runtime. |
| Model-free `verify.mjs`, disposable spike                | Pass: local classic script in Node VM, scoped IDs/default reset                                                               | `out/runtime-spike/player.js` SHA-256 `902f22a35542f8a810421a2b6ab2823c053a1a5020a71f68d087ff0ef86651d4`                                                                                                                                                                                                                                                                                                  | No browser/layout/MapLibre assertion.                                  |
| Browser playback, existing example                       | Unavailable                                                                                                                   | No artifact hash or browser version                                                                                                                                                                                                                                                                                                                                                                       | Browser URL policy rejected local file; no attempted alternate route.  |
| Manual narrative/cartographic review                     | Skipped                                                                                                                       | No reviewer artifact                                                                                                                                                                                                                                                                                                                                                                                      | Requires actual browser playback and audited real case.                |

No Stage 1 model or prompt is involved; those fields are not applicable. This
record does not claim the legacy prose or design is geographically verified.
