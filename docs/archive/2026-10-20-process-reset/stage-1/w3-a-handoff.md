# S1-W3-A — Compiler and rules handoff

2026-10-19, BUILD_LOG Session 26. The Wave 3A implementation is complete on its
owned paths. G3 composition, playback, publication and browser acceptance remain
separate work.

## Producer output

`packages/core/src/compile/compile.ts` implements the pure
`compileProject(ValidatedProject, CapabilityCatalog): Result<Compiled>` boundary.
`packages/knowledge/src/index.ts` exports the checked Stage 1 catalog and narrow
geometry/measurement prerequisites. Core uses a direct `workspace:*` dependency
on knowledge; knowledge uses the public schema barrel. There is no model or
network operation in this compile path.

The compiler checks the loaded project again, hashes every supplied data buffer
against its manifest declaration, and verifies that `dataMap` agrees with those
bytes. It resolves scene-local layer IDs, complete-feature numeric/category/area
scales, typed and six-operator legacy filters, shared comparison membership,
legends, free/bound annotations, cameras, media locations and presentation
controls. Unsupported basemaps, techniques, classifications, scope controls and
paint conflicts produce blocking diagnostics. Numeric strings, negative area,
wrong geometry, missing columns, incompatible measurements, absent targets and
stale data buffers also block output. All-missing categories retain only the
no-data treatment with a warning; all-missing numeric scales block.

The committed [actual compiled fixture](../../packages/core/src/compile/fixtures/compiled.g1-r1.json)
is produced by this compiler from the unchanged [g1-r1 inputs](specimens/README.md).
Its semantic fields exactly match the frozen
[producer/consumer specimen](specimens/compiled.expected.json); only
`compilerVersion` changes from the specimen placeholder to `s1-w3-a.1`. Tests
check that equality and deterministic repeat calls. The fixture's invented
numbers are software oracles, not geographic observations.

## Verification and limits

- Five package builds pass; 104 tests pass (schema 22, core 65, renderer 17);
  lint and strict typechecking of the two new test files pass.
- Legacy nine-file generation, three JavaScript syntax checks and the G1
  specimen/source verifier pass. The legacy renderer still reports its expected
  unsupported-basemap warning.
- Compiler tests exercise exact shared-scale output, seven categories from full
  data, size/constant/near-equal scale oracles, filter scope, measurement and
  capability failures, controls, remote-media declarations, purity and no fetch.
- No new player or browser verification is claimed. The checked-in catalog is a
  compiler capability set; G3 must match each supported output to playback.
- The compiler cannot independently rehash edited in-memory manifest/design
  objects because `ValidatedProject` does not carry their original bytes. The
  loader's input snapshot identifies those bytes. G3/W3-C must compare a fresh
  snapshot and supplied resources against `compiled.input` at publication.

## G3 consumer actions

Export `compileProject` and the compiler version from the public core barrel;
compose it with the public renderer and built player. Use the actual compiled
fixture for playback and publication tests, then run the G3 capability matrix.
Keep the frozen g1-r1 specimens unchanged. W4-A can use the same fixture and
diagnostic codes for its public example and verification record.
