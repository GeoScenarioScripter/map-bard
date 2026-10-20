# G3 — Public composition review

2026-10-20, BUILD_LOG Session 29. **CLOSED / PASS for model-free public
composition.** Wave 4 browser, case and adversarial acceptance remain open.
The frozen g1-r1 inputs and compiled semantic specimen were not changed.

## Public path and generated specimen

`@mapbard/core` now exports `compileProject` and `COMPILER_VERSION`;
`@mapbard/renderer` exports `renderCompiled` and `writeCompiledBundle`.
`scripts/build-compiled-example.mjs` uses these public package exports and the
public `@mapbard/knowledge` catalog. Run after `corepack pnpm -r build`:

```sh
node scripts/build-compiled-example.mjs docs/stage-1/specimens out/g3-example
```

The script loads and validates the project, compiles it without a model,
reloads current files, then renders and publishes to a new directory. It
prints the written paths, input snapshot, versions, diagnostics and required
network URLs. A changed snapshot blocks publication. The checked run wrote
`index.html`, `compiled-data.js`, `compiled-app.js`, `style.css`, `player.js`
and two local MapLibre files. `requiredNetwork` was empty. The compiled
payload equals the actual W3-A fixture, including the shared `[0,40,80,120]`
edges and distinct scene runtime IDs. Copying the generated directory keeps
its relative file references; browser behavior after relocation is Wave 4 work.

## Capability gate

The Stage 1 catalog lists the following supported IDs. This gate compared
compiler handling to player behavior and the tests named below. The g1-r1
fixture is synthetic and exercises a subset; focused variants cover the rest.
These are code and test checks, not visual browser acceptance.

| Catalog IDs                                               | Compiler check                                                                                               | Playback check                                                                                                                                                    |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `basemap.neutral`                                         | Compiler checks requested basemap; unsupported style fails in `compile.test.ts` and G3 integration.          | Compiled bootstrap creates a neutral MapLibre style; generated page and built asset checked in `compiled.test.ts` and G3 integration.                             |
| `camera.cut`, `camera.ease`, `camera.fly`                 | Compiler preserves/validates transition in `compile.test.ts`, including a fly variant.                       | `player.test.ts` checks cut/ease/fly routing and reduced-motion cut; adapter chooses `jumpTo`/`easeTo`/`flyTo`.                                                   |
| `layer.constant`                                          | Compiler constant point variant in `compile.test.ts`; geometry checks in compiler.                           | `maplibre-adapter.test.ts` checks circle/line/fill paint and scene-owned layer binding.                                                                           |
| `color.categorical`                                       | `compile.test.ts` and `scales.test.ts` check all seven typed categories and missing values from full data.   | `maplibre-adapter.test.ts` checks typed equality and no-data color.                                                                                               |
| `color.equal-interval`                                    | Frozen shared-scale oracle, missing/constant/near-equal cases in compiler/scale tests.                       | Adapter test checks exact class edges, labels and shared reuse in both scenes.                                                                                    |
| `size.graduated-area`                                     | Compiler checks geometry/ratio/units and exact area/zero/constant oracles.                                   | Adapter test checks square-root/zero/constant radius expressions and legend exemplars.                                                                            |
| `filter.comparison`                                       | Compiler test checks a typed filter over complete values and rejects unsupported legacy expressions.         | Adapter test checks typed MapLibre filter expression; player uses only compiled filter.                                                                           |
| `media.panel`, `media.anchor`                             | Compiler test retains media locations and remote declarations; missing anchors diagnose.                     | Player media tests check escaped panel/anchor content, popup and marker lifecycle; publication tests check posters and copying.                                   |
| `annotation.text`                                         | Frozen compiled fixture retains source/feature targets; compiler/validation tests reject absent feature IDs. | Adapter/player tests check annotation markers, escaped popup and cleanup on revisit.                                                                              |
| `control.visibility`, `control.opacity`, `control.radius` | Compiler checks kind, paint binding and default/range; added constant point visibility/radius variant.       | Player tests check defaults, updates and resets; adapter applies visibility layout and geometry-specific paint. DOM keyboard range test covers slider increments. |

Unsupported basemap, quantile classification and semantic scope control requests
block compilation with `CAPABILITY_UNSUPPORTED`; G3 public integration checks
the basemap case. Invalid numeric measurement gives `MEASUREMENT_REQUIRED`;
incompatible shared units give `MEASUREMENT_INCOMPATIBLE`. Missing feature
targets give `REFERENCE_MISSING`. Changed source bytes fail loading with
`RESOURCE_HASH_MISMATCH`; changed declaration/design snapshots or data bytes
fail publication with `INPUT_STALE`. These are blocking diagnostics, not
substituted visual techniques.

## Verification and limits

- `corepack pnpm -r build`: five packages, including the classic player IIFE.
- `corepack pnpm test`: 120 tests pass — schema 22, core 66, renderer 29,
  public G3 integration 3. `corepack pnpm -r test` still runs package suites;
  the root `test` script includes G3 integration.
- `corepack pnpm lint`, targeted strict typechecks, frozen G1 verifier,
  legacy nine-file generation and three JavaScript syntax checks pass. The
  legacy renderer retains its expected unsupported-basemap warning.
- The composed script's actual output manifest and copied player were inspected.
  G3 integration verifies a relocated copy has the required relative files.
- Browser interaction, visual layout, `file://` offline/relocation behavior,
  keyboard accessibility in a browser, and the real-case story remain unverified.
  W4-C owns browser checks; W4-A/B own case and adversarial work.

## Next

Begin Wave 4 against this public fixture and the frozen real-case resources.
Do not treat this synthetic page as a verified geographic finding or claim
full Stage 1 publication acceptance before the Wave 4 reviews.
