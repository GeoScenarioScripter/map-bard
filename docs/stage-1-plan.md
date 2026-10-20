# Stage 1 — Trustworthy Project and Publication

Updated 2026-10-20, Session 31 S1-W4-B verification.
**IN PROGRESS — Wave 1 handoffs complete and G1 CLOSED; S1-W1-A closed with a no-go
real-case gate in BUILD_LOG Session 11, S1-W1-B contract proposal closed in
Session 12, and S1-W1-C baseline/runtime spike closed in Session 13, with its
final lint fix verified in Session 14. Wave 2 handoffs are complete: S1-W2-A in Session 21, S1-W2-B in Session 22, and S1-W2-C in Session 23. G2 CLOSED in Session 24; Wave 3A/B/C closed in Sessions 26–28; G3 CLOSED in Session 29. Wave 4 S1-W4-A/B closed in Sessions 30–31; S1-W4-C and G4 remain open.**
Parent: [implementation stages](implementation-stages.md). Stage 1 here is a new
delivery stage, unrelated to the existing `core/src/stage1/plan.ts` LLM operation.
The prior planning/review sessions implemented no features. The
[G1 review](stage-1/g1-review.md) records frozen g1-r1 contract decisions,
reviewed specimens, acquired source bytes and the selected runtime build approach.
Session 15 accepts Potomac source comparability only for the bounded descriptive
fixture. The [browser handoff](stage-1/browser-handoff.md) records the direct-file
reader report. No Stage 1 product capability has
been delivered or full capability matrix certified.
Sessions 16–17 reader screenshots revealed legacy wheel capture and blank
geographic context. The reader confirmed the bounded local context after a
direct-file hard refresh. Session 19 accepted their Edge/Chrome interaction,
Console/Network, spike, offline and relocation report for G1. This does not
implement the requested PMTiles basemap or the compiled player.
The [R01–R40 disposition](implementation-stages.md#r01r40-planning-disposition)
maps the completed [idea register](refinement-ideas.md) to stages and deferrals.
This revision keeps four waves and twelve sessions; the added obligations below
belong to those existing owners and gates.

## Outcome and scope

An author can take a versioned local project containing a small, audited vector
comparison and supplied media, compile it without a model, inspect actionable
diagnostics, and open an exported story whose layers, legends, annotations,
cameras and presentation controls agree with the source intent. A relocated copy
works from `file://` with networking disabled when every dependency is local.

This is the foundation of the first product, not its full acceptance envelope.
Stage 1 proves representation-to-playback fidelity and resource portability.
Computing a geographic finding and binding qualified claims is Stage 2; general
agent operations and precise editing are Stage 3; the workbench is Stage 4.

## Evidence from the current source

Reviewed in Session 09; these are observations, not newly executed test results.

| Source                                        | Observed behavior                                                                                                                                        | Stage 1 consequence                                                                                               |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `packages/schema/src/geo-narrative.ts`        | Zod contract has `schemaVersion: z.string()`; IDs are referenced but duplicate IDs and supported versions are not comprehensively checked.               | Validate version dispatch and scoped uniqueness at project/compile boundaries; retain the legacy schema API.      |
| `packages/core/src/stage0/profile.ts`         | Five distinct sample values; numeric measurement is heuristically ratio; CRS recorded/defaulted, no reprojection.                                        | Use actual features for domains/categories; require explicit measurement/CRS/comparability metadata for the case. |
| `packages/renderer/runtime/app.js`            | Categorical falls through to circles, classification is ignored, per-source numeric domains are resolved in the browser; reused layer IDs register once. | Resolve design before playback; key runtime bindings by scene and layer and test revisits.                        |
| Same runtime                                  | Controls write paint/visibility; neutral basemap ignores requested configuration; filters use a small parser with silent failure.                        | Publish a small capability set; reject unsupported intent, filters and basemaps explicitly.                       |
| `packages/renderer/src/render.ts`, `write.ts` | Pure generation and I/O are separated, but media source/destination paths are conflated and writer joins unchecked destinations.                         | Preserve the split, resolve assets explicitly, preflight containment/collisions before writes.                    |
| `packages/renderer/src/render.test.ts`        | Six generation tests, no actual playback checks.                                                                                                         | Keep regressions and add compiler/player/bundle/browser evidence; generated HTML alone is insufficient.           |

Session 05 remains the last executed baseline: five packages build, 53 tests pass,
lint passes, nine-file example generation has no warnings. Live provider and
interactive browser behavior are unverified. Re-establish the baseline in Wave 1;
do not assume that those counts cover new requirements.

## Planning decisions and contract direction

These are implementation targets. Freeze their exact Zod fields and public
signatures at Gate G1 before dependent work starts. Deviations need a recorded
reason and revised ownership/tests, not silent expansion.

### Project and versions

Use an unpacked project directory with `mapbard.project.json`,
`narrative.geonarrative.json`, `design.json`, and project-relative `data/` and
`media/`. The manifest is the entry point and owns project ID/version, revision,
resource identity/paths/fingerprints/attribution, and artifact references. Narrative
IDs link resources and scene design; they are not regenerated on each load.
The manifest owns physical resource resolution; legacy narrative paths are retained
for compatibility and must agree with the manifest's normalized mapping. The loader
diagnoses disagreement instead of choosing one silently. Narrative profiles remain
descriptive metadata, not a substitute for the bytes identified by the manifest.
`design.json` contains only typed rendering intent absent from v0.1.0, keyed by
scene/layer IDs (shared scale groups and geographic text annotations initially).
It must not duplicate prose, source definitions or a second scene ordering.

For R12/R23, make each feature-bound annotation identify its source and stable
feature ID(s), alongside an explicit authored anchor position. A free geographic
text anchor remains allowed but must not imply a feature/evidence binding. Record
comparison members (scene/layer/source IDs and observation labels) with the shared
scale group; a camera and an unlabeled scale ID alone do not express the comparison.
Validate missing/ambiguous targets against complete data, retain references in the
compiled spec and show the text at the resolved anchor. No automatic label layout,
region-selection language, spatial matching between periods, or new highlight
renderer is required. Stage 2 can link evidence to these same identities.

Keep `GeoNarrative` at 0.1.0 in Stage 1; use independently versioned project,
design and compiled-spec contracts starting at 0.1.0. A new project manifest is
not a claim that an old standalone narrative was already a portable project.
Evidence/analysis files are reserved logical boundaries, not empty required
schemas implemented speculatively in this stage.

Import of an existing 0.1.0 narrative is explicit and non-destructive: write a new
project destination, preserve story/scene/resource IDs, text and supported design,
copy resources through a checked mapping, and report path normalization and any
unsupported fields. Keep the handwritten example unchanged. Unknown versions are
errors before parsing/coercion. Unknown ordinary fields are diagnosed rather than
silently stripped on import; preserve original input and namespaced extension
payloads. Missing required extensions block compilation; opaque optional metadata
may round-trip without execution. No reverse export into an older schema is implied.

The handwritten fixture requests `protomaps-light`/PMTiles, quantile classes, and
a slider that replaces its data-driven radius. Those requests are not faithfully
realized by the current runtime. Preserve them on import and expect explicit
compile diagnostics; do not claim the original spec compiles under Stage 1's
smaller capability set. Keep the original legacy render regression, and create a
separate derived fixture with an explicit neutral basemap, supported classification
and compatible control binding for the new compiled path. Record each authored
adaptation in its import/build report; successful import is distinct from successful
compilation. No implicit downgrade or change to the handwritten source is allowed.

Require unique story-wide scene/resource/media IDs, layer IDs unique within each
scene, and control IDs unique within each scene. Reuse of a layer ID in different
scenes is legal and maps to distinct compiled runtime IDs. Feature IDs should be
stable in the selected case; the import report must state how any missing ones are
assigned and invalidate them when their identity basis changes.

### Measurement declarations and prerequisite checks

R15 needs a narrow contract, not a general profiling rewrite. At G1 define
per-source/attribute declarations in the manifest: identifier/category/quantity
role, measurement level, units (including explicitly unknown), and any declared
denominator reference needed by the selected encoding. Retain the observed type
and inferred profile separately from the author's override and its rationale;
an override does not change values or certify comparability. Validate referenced
attributes and override compatibility. Record source-method/coverage qualifications
in the case dossier and carry required display qualifications into the project.

The compiler must reject an unmet declared prerequisite: for example, numeric
identifiers treated as magnitudes, incompatible units in a shared scale, or a
choropleth whose normalization requirements are not established. Return a reason,
the missing input and a supported alternative where one exists (R20/R33). Do not
invent units, denominators or a replacement technique. Constant/category encodings
may still be valid without numerical measurement knowledge. Null/type/distribution
checks use complete features; more sophisticated inference and normalization
execution remain Stage 2 work.

### Package and operation boundaries

| Owner               | Stage 1 responsibility                                                                                                                                |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schema`            | Zod/inferred project, design, compiled spec and diagnostic contracts; semantic reference/version validation.                                          |
| `core/src/project/` | Manifest/resource loading, explicit legacy import, fingerprints and project validation; I/O outside pure compilation.                                 |
| `core/src/compile/` | Pure compilation from validated loaded artifacts + complete features + capabilities to resolved spec or diagnostics.                                  |
| `knowledge`         | Small typed capability/prerequisite catalog for the supported slice; geometry/measurement requirements and remedies, not an automatic story designer. |
| `renderer`          | Pure generation from compiled spec, asset publication writer and tested browser playback. No imports from core private source.                        |
| `cli`               | Remains scaffold in Stage 1; a repository example script composes public package APIs. Public command design belongs to Stage 3.                      |

Dependency direction: core → schema/knowledge; knowledge → schema if needed;
renderer → schema; the example script composes core + renderer. Add only direct
`workspace:*` edges actually used. No new engine package is necessary in Stage 1.
The built-in planner stays optional and unchanged; compilation never invokes it.

G2 exported `loadProject`, `importLegacyNarrative` and `validateProject` through
`@mapbard/core`; validation composes schema/reference checks. G3 now exports
`compileProject` and `renderCompiled` through their public package barrels.
G1 fixed signatures and input/output specimens.
Keep existing `render(narrative, dataMap, options)` usable for the legacy example.
Avoid a renderer→core cycle: the new example explicitly calls compilation, then
`renderCompiled`. Legacy generation is a compatibility path; it does not acquire
new capability guarantees merely by remaining available.

Diagnostics carry stable code, severity, artifact/path, relevant IDs, explanation
and remedy. Results distinguish failure from success with warnings; no publishable
compiled spec on blocking errors. Start with version, reference, missing-resource,
unsupported-capability, invalid-value and asset-path codes. Report categories and
actual invalid/missing counts without dumping full private datasets. Freeze exact
codes in G1. The compiled spec records input fingerprints, contract/compiler
versions, resolved layers/scales/legends/annotations/cameras/controls and required
network resources. Runtime consumes these decisions; it must not recompute breaks
or choose another technique. Stable inputs produce stable semantic output; exclude
timestamps/absolute machine paths from deterministic comparisons.

Use fingerprints to bind the loaded source bytes, declarations and design to the
compiled result (R18). Editing an override, focus target or input invalidates reuse
of an older result: rebuild or return a stale-input diagnostic before export. This
is bounded project/build identity checking; analysis dependency graphs and live
file-watching are not Stage 1 requirements.
Core's project I/O produces the current input fingerprint snapshot; the composing
caller supplies it alongside the compiled result for publication preflight. The
renderer compares identity and checks its asset copy manifest, without importing
core, reparsing the project or calling an LLM. G1 fixes this handoff and its
failure behavior; the public example refreshes inputs before build/export.

### Supported rendering envelope

- Preserve point/graduated-symbol encodings needed by the handwritten example;
  support constant line/fill and categorical color for point/line/polygon geometry.
- Support numeric color with explicit/shared domain and equal-interval classes.
  Compute domains from full valid values across the declared comparison group;
  never from profile samples. Define null/invalid/constant-domain and class-edge
  behavior, units, labels and no-data legend entries in G1 specimens.
- Use sequential comparison scenes sharing view/scale/category assignments, plus
  a static context scene. Side-by-side maps, swipe UI and temporal playback are
  deferred. A neutral basemap is supported explicitly; other styles/PMTiles are
  diagnosed until implemented.
- Provide legends generated from compiled scales and simple geographic text
  annotations. An annotation is author-supplied context, not verified evidence.
  Keep panel/anchored media, captions and credits.
- Permit typed presentation controls for visibility and constant opacity, plus
  a size slider on a constant-radius point layer where compatible. Validate property, value,
  default and range against layer type. Reset to authored defaults on scene entry;
  revisits must be deterministic. Do not allow a control to silently overwrite an
  encoding whose legend would then become false.
- Diagnose quantile/natural-breaks, data-driven opacity, heatmap, unsupported size
  encodings, unrecognized filter expressions, arbitrary paint properties, and
  semantic data-scope controls. For legacy simple comparison filters, G1 defines a
  typed equivalent for supported operators; reject anything outside that grammar.
  Do not add filter UI or use `eval`. Geometry/measurement mismatches are errors.

Prefer a deliberately small correct matrix over supporting every existing enum.
If the real case cannot fit this envelope, select the simpler case or revise the
stage explicitly at G1; do not quietly add a general analysis engine.

### Resource and publication policy

Inputs for the new portable project must resolve within its root after real-path
checks; reject escapes including symlinks. An explicit legacy import may read
the author-selected source paths and copy them into a new project, with a manifest
of origin and normalized destination. Never overwrite source data.

Use resource IDs and hashes to create safe bundle paths independently of source
filenames. Detect case-insensitive collisions, drive/absolute/UNC paths, traversal,
reserved runtime/vendor names, and missing media or posters before writing.
Resolve poster IDs to registered image resources; diagnose ambiguous legacy poster
paths during import. Required local assets block export when absent. URL media
remain remote, are declared in the dependency report, and are not silently fetched
or labeled offline. Preflight destination containment including symlinks and keep
partial output from being reported as success. Preserve escaping and source credits.

## Case selection and fixtures

The real dataset is **not selected or verified yet**. Wave 1 has a bounded discovery
session, not a prerequisite request to the user before any work can proceed.
Prefer two compatible riverbank observations with reusable supplied media. Check
source authority/URL, access date, reuse terms, original file hashes, observation
dates, geography, CRS, method, resolution/coverage and comparability qualifications.
Do not infer physical change simply from different outlines.

Begin the dossier with the creator's task, intended reader, geographic question,
available evidence and what a useful story would explain (R02/R22/R37). Mark a
repository-authored brief as an assumption, not user-research evidence. Map the
planned context/comparison/synthesis scenes to that question, visible targets and
the role of supplied media. Record unsupported requests and missing evidence as a
Stage 2/3 handoff (R16); Stage 1 may document a narrower descriptive angle but does
not implement automatic story redirection or declare a trend proved.

If the preferred case needs reprojection, new measurement methods or unavailable
media, choose a smaller documented vector comparison using common feature IDs and
units in EPSG:4326. Existing example fixtures and PNGs are regression fixtures,
not real geographic evidence. Synthetic adversarial data may test software only
and must be labeled as such. Stage 1 narration describes documented observations;
new computed/causal findings wait for Stage 2.

Discovery budget: one session, at most two candidates. Deliver a go/no-go dossier.
If neither qualifies, record the missing data/rights/method requirement and keep
G1's real-case gate open. Contract/regression work can continue independently;
Stage 1 cannot close as a real slice using invented or unlabeled substitute data.
Pin a small redistributable subset with extraction steps and credits; otherwise
document acquisition separately and do not commit restricted resources.

| Fixture family     | Purpose and expected oracle                                                                                                                                                                     |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Legacy waterfront  | Exact existing IDs/text/media/control retained after import; unsupported requests diagnosed on compile. Original unchanged and old API usable; explicitly adapted copy exercises compiled path. |
| Real comparison    | Two audited compatible views, supplied media, shared camera/scale, source credits and qualifications; reviewer can trace each displayed attribute.                                              |
| Encoding edges     | Categories on polygon and point; >5 distinct numbers; null/blank/nonfinite, all-missing, constant, duplicate class boundaries; hand-calculated domain/classes and no-data behavior.             |
| Scene isolation    | Same layer ID in two scenes with different source/encoding; controls initialized, changed, left and revisited without leaked state.                                                             |
| Invalid contracts  | Unsupported versions/extensions, duplicate IDs, dangling references, unavailable columns, invalid coordinates/CRS and unsupported techniques produce specific blocking diagnostics.             |
| Asset/export edges | Traversal/absolute/case collision/symlink/reserved name, missing image/video poster, URL dependency, hostile text escaping, relocation with local assets and network disabled.                  |

Store fixtures close to owning package tests unless shared; put the real project
under `examples/projects/first-slice/` and its source dossier there. G1 specifies
whether each fixture is committed, reproducibly acquired, or generated in tests.

Add focused fixtures for R12/R15/R18: an annotation targeting a missing/ambiguous
feature, mismatched comparison members, a numeric identifier wrongly encoded as
quantity, incompatible comparison units, an explicit valid override, and a changed
override/source fingerprint presented with an old compiled result. Keep these as
small software fixtures with explicit expected diagnostics, not invented case facts.

## Required handoffs from the idea review

These obligations supplement the session rows below and use the same exclusive
paths. They do not authorize parallel sessions to write another owner's files.

| Owner     | Added handoff                                                                                                                                                                                                       | Gate and acceptance                                                                                                                                                                 |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1-W1-A   | Author/audience/question brief, scene-purpose sketch, source measurement facts and limits in the case dossier (R02/R13/R16/R22/R37).                                                                                | G1 checks case usefulness as well as availability; no trend asserted from mere timestamps.                                                                                          |
| S1-W1-B   | Target/comparison references, measurement/override semantics, stale-input checks and categorized diagnostic specimens; short representation rationale in `contracts.md` (R01/R12/R15/R18/R20/R32).                  | G1 traces each new contract element to a reader/author need and a test. Explain content/discourse/attention boundaries without claiming novelty or implementing evidence contracts. |
| S1-W1-C   | A small verification-record template in `baseline.md`, with actual baseline examples (R32/R34/R36).                                                                                                                 | G1 distinguishes model-free, browser and manual judgments and records skipped/unavailable checks honestly.                                                                          |
| S1-W2-A/B | A implements the declaration/reference validation contract; B retains overrides, source facts and fingerprint inputs during load/import (R12/R15/R18).                                                              | G2 uses shared specimens to prove valid overrides round-trip and missing targets/invalid declarations diagnose. No cross-owner source edits.                                        |
| S1-W3-A/B | A compiles target identities/shared comparisons and prerequisite explanations; B renders anchors/labels without reinterpreting their meaning (R12/R20/R23).                                                         | G3 inspects a target through source → compiled spec → playback; identical source IDs in different scenes do not lose membership.                                                    |
| S1-W3-C   | Preflight verifies compiled input identity and preserves the publication's qualification/credit text (R13/R18/R26).                                                                                                 | G3 rejects reuse after changed source/design/override rather than exporting stale bindings.                                                                                         |
| S1-W4-A   | The public example script writes a bounded verification record next to generated artifacts; README relates scenes/media to the brief (R02/R22/R36).                                                                 | G4 can reproduce the build and compare semantic artifact hashes; no new CLI/telemetry system.                                                                                       |
| S1-W4-B/C | B checks reference/measurement/staleness negatives and record reproducibility; C separately reviews attention, legibility, comparison clarity, pacing and purposeful media against the brief (R12/R15/R32/R35/R36). | G4 records pass/fail/skipped/manual judgment separately. A functioning map alone does not establish a coherent story or research efficacy.                                          |

The verification record identifies fixture/project revision and input hashes,
engine/compiler/runtime versions, invoked operation/check, diagnostic codes and
affected IDs, output hashes/artifact references, result and unresolved limitations.
Record elapsed time and environment separately from deterministic semantic hashes;
model/prompt/budget fields are **not applicable** for Stage 1's model-free path.
Keep raw private data, credentials and absolute private paths out of shareable
records. The example script captures automated results; reviewers append separate
browser/manual reports with reviewer/method information, not fabricated automated
passes. These are local files under ignored build output with sanitized summaries
in verification docs, not a telemetry service or a new public reporting API.

## Waves and integration gates

Four waves, three parallel sessions per wave. S1-W1-A **CLOSED with a no-go
real-case gate** in BUILD_LOG Session 11; S1-W1-B **CLOSED with a G1 contract
proposal** in Session 12; S1-W1-C **CLOSED with a baseline/runtime spike** in
Session 13. The
[case dossier](stage-1/case-dossier.md) gives the conditional fallback, and the
[contract proposal](stage-1/contracts.md) gives the G1 review specimens. Each
row defines exclusive write ownership;
listed inputs are read-only.
Session outputs include a short handoff with changes, exported contracts,
verification, unresolved issues and next consumer. No session depends on another
session finishing inside its wave. Use frozen specimens or test doubles where a
parallel producer is not integrated yet; test the real composition at the gate.

### Wave 1 — Establish facts and freeze contracts

Inputs: active docs, untouched M0–M4 source/examples, existing test commands.
This wave contains discovery/design spikes, not implementation of all proposals.

| Session                                  | Goal, owned scope and outputs                                                                                                                                                                                                                                                                              | Verification and handoff                                                                                                                                                                                                                                                                          |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S1-W1-A — Case audit**                 | Own `docs/stage-1/case-dossier.md` and proposed `examples/projects/first-slice/source/` only. Audit at most two cases, source/media rights and comparability; list exact fields, IDs and minimal rendering needs. Do not edit schemas or invent findings.                                                  | A reproducible source manifest, hashes, CRS/units/time/coverage and rights records; fit/no-fit against the envelope. Hand off selected resource inventory and limitations to G1 and W2-B.                                                                                                         |
| **S1-W1-B — Contract design**            | Own `docs/stage-1/contracts.md` and `docs/stage-1/specimens/` only. Specify project/design/compiled/diagnostic Zod shapes, version dispatch, legacy import mapping, identity scopes, operation signatures, capability matrix and edge-case oracles. Use synthetic specimens independent of case discovery. | Trace every old example field through import; reject unknown versions and silent field loss in design review. Hand off frozen producer/consumer specimens to G1 and all Wave 2/3 sessions.                                                                                                        |
| **S1-W1-C — Baseline and runtime spike** | Own `docs/stage-1/baseline.md`, `docs/stage-1/runtime-spike/` and disposable ignored output only. Re-run baseline, exercise existing story in browser if available, and prototype TypeScript browser bundling/scene isolation outside production source.                                                   | Record actual commands, environment, outcomes and existing failures. Select a minimal bundler/test setup only after demonstrating local script loading without CDN/module fetches; preserve MapLibre/scrollama. Hand off build proposal, reproducible bug cases and browser procedure to G1/W2-C. |

**G1 — coordinator:** review all three outputs, select the real case or leave its
gate blocked, resolve any envelope mismatch, freeze contract/specimen version and
supported capability matrix, and approve the minimal runtime build approach.
Confirm the idea-review handoffs above: author question, target/measurement
specimens, representation rationale and baseline verification-record template.
Own shared package-manifest/lockfile/root config edits; install only dependencies
justified by the spike. Capture agreed module paths and public barrels. If local
`file://` browser access is blocked, establish another available browser/manual
verification route; localhost alone does not prove portable file playback.
Do not start dependent feature work against an unresolved contract. A real-case
block may permit only explicitly identified fixture-independent work.

### Wave 2 — Implement foundations against G1 specimens

Inputs: frozen G1 contracts, source dossier, baseline and tooling decision.

| Session                                | Goal, owned scope and outputs                                                                                                                                                                                                                                                                                                                 | Verification and handoff                                                                                                                                                                                                                           |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S1-W2-A — Schemas and validation**   | Own new `packages/schema/src/{project,design,compiled,diagnostics,project-validation}*` modules/tests. Implement G1 contracts, supported-version dispatch, uniqueness/references, extension handling. Keep legacy narrative schema behavior stable.                                                                                           | Positive/negative specimen tests, unknown-version and duplicate/dangling reference checks; no silent stripping in new import boundary. Hand off exports and diagnostics to G2/W3.                                                                  |
| **S1-W2-B — Project and resource I/O** | Own `packages/core/src/project/` modules/tests and real-case resource materialization in `examples/projects/first-slice/{data,media}/`. Implement load/import/path mapping/hash/attribution and non-destructive writes against G1 interfaces. Use local boundary doubles until schema integration. Do not write final narrative/design files. | Relocate project, verify deterministic resource IDs/fingerprints, detect missing/escaping inputs, preserve import source, round-trip unknown extension payloads. Hand off loaded-project specimen and import report to G2/W3-A.                    |
| **S1-W2-C — Runtime foundations**      | Own new `packages/renderer/player/` modules/tests and dedicated browser build script. Extract scene activation, media/control handling into TypeScript with a testable map adapter; consume frozen compiled specimens. Do not edit legacy `runtime/app.js`, writer or HTML generator yet.                                                     | Unit/adapter tests for scene activation, binding isolation, default reset, marker cleanup, reduced motion and media escaping; generate a browser bundle in ignored build output. Hand off stable player entry and asset requirements to G2/W3-B/C. |

**G2 — coordinator:** wire public barrels/direct dependencies/build scripts, run
build and affected tests, and replace temporary boundary doubles in composition
tests with real schema/resource modules. Confirm a loaded project validates and
the built player consumes the same frozen compiled specimen. Reconcile errors
before Wave 3. The legacy example remains runnable throughout.

**Disposition — Session 24: G2 CLOSED / PASS.** The [G2 review](stage-1/g2-review.md)
records public exports, existing direct dependencies, strict loaded-project
composition and the `@mapbard/renderer/player.js` classic-script asset contract.
Build, 89 tests, lint and legacy/frozen-specimen smoke checks pass. The built IIFE
consumes the same frozen compiled specimen in Node VM; this is not browser
acceptance. Wave 3 may begin with S1-W3-A in a new session. No Wave 3 work started
at this gate.

### Wave 3 — Compile, play and export the supported slice

Inputs: integrated G2 modules, real resource inventory, frozen capabilities and
expected compiled specimens. Producer and consumer work independently from these
specimens; no session imports another session's private work-in-progress.

| Session                              | Goal, owned scope and outputs                                                                                                                                                                                                                                          | Verification and handoff                                                                                                                                                                                                                                        |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S1-W3-A — Compiler and rules**     | Own `packages/core/src/compile/` and `packages/knowledge/src/` implementation/tests. Validate complete data and measurement prerequisites; compile categories, shared domains/equal intervals, filters, scene-local bindings, legends, annotations and typed controls. | Golden semantic specimens plus hand-derived edge oracles; reject unsupported requests, wrong geometry, missing columns/values and scope controls. Test purity/determinism and no model/network call. Hand off real compiled fixture and diagnostics to G3/W4-A. |
| **S1-W3-B — Faithful playback**      | Own `packages/renderer/player/` plus `packages/renderer/runtime/style.css` and their tests. Implement resolved layers/scales/legends/annotations, keyboard-operable controls/popups and scene cleanup. No data-driven domain/classification decisions in the player.   | Map-adapter tests show category/geometry fidelity, exact class edges, per-scene IDs, shared comparison scales and reset behavior; inspect layout on compiled specimen. Hand off playback behavior matrix to G3/W4-C.                                            |
| **S1-W3-C — Publication and assets** | Own `packages/renderer/src/` except package barrel, plus writer tests. Add `renderCompiled`, compiled payload/HTML wiring and safe asset preflight/copying; retain legacy `render` signature and example. Consume G2 player build contract.                            | Escaping, required-file errors, poster mapping, collision/containment checks (including filesystem links), remote dependency declaration, and failed export behavior. Hand off generated bundle manifest and regression report to G3/W4.                        |

**G3 — coordinator:** connect compiler → renderer → built player using public
APIs, update barrels and shared configuration, and run build/tests/lint plus old
example smoke. Check the compiled output against its runtime-supported version.
Every capability marked supported must have both a compiler and playback check;
every unsupported request must diagnose before export. Assign bounded corrections
to their owners; do not run Wave 4 while the composed slice is broken.
Include the new target/override/stale-input negatives and categorized prerequisite
diagnostics in this gate; do not leave them as commentary-only documentation.

**S1-W3-A disposition — Session 26: CLOSED.** Compiler/rules and an actual compiled
g1-r1 fixture are handed off in [the W3-A record](stage-1/w3-a-handoff.md).
**S1-W3-B disposition — Session 27: CLOSED.** The MapLibre adapter, compiled
styling/legends/annotations, keyboard interactions and scene lifecycle are handed
off in [the W3-B record](stage-1/w3-b-handoff.md). W3-C and G3 composition were
pending at that handoff; no compiled browser story was claimed.
**S1-W3-C disposition — Session 28: CLOSED.** Compiled HTML/data/bootstrap and
strict staged asset publication are handed off in [the W3-C record](stage-1/w3-c-handoff.md).
G3 public composition followed this handoff; no compiled browser acceptance was
claimed by W3-C.

**G3 disposition — Session 29: CLOSED / PASS.** Public compiler/renderer exports,
fresh-input example composition, built-player publication and the bounded
capability matrix are recorded in the [G3 review](stage-1/g3-review.md). Wave 4
is released for case, adversarial and browser review; compiled browser acceptance
has not yet been claimed.

### Wave 4 — Demonstrate, challenge and close

Inputs: integrated G3 system; frozen real-case resources and adversarial fixtures.
Three independent tracks. Browser checks initially use the G3 fixture; after the
final demonstration project lands, the coordinator repeats its acceptance path.

| Session                                        | Goal, owned scope and outputs                                                                                                                                                                                                                                                                                                                    | Verification and handoff                                                                                                                                                                                                                     |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S1-W4-A — Author-facing example**            | Own final `examples/projects/first-slice/{mapbard.project.json,narrative.geonarrative.json,design.json,README.md}` and `examples/scripts/build-first-slice.mjs`. Compose public APIs for context/comparison/synthesis scenes with supplied media and explicit qualifications.                                                                    | Rebuild from documented steps without credentials, private imports or manual dist edits. Include import/build/diagnostic examples and network requirements. Hand off reproducible author path to G4.                                         |
| **S1-W4-B — Independent regression checks**    | Own new `packages/core/src/project/pipeline.integration.test.ts`, `packages/renderer/src/publication.integration.test.ts` and `docs/stage-1/verification.md`. Challenge migration/versions, determinism, source identity, asset safety, missing data and unsupported intent using public APIs. No production edits during parallel verification. | Record actual pass/fail coverage and legacy content comparison. Prove publication is separate from editable state and invalid input does not publish a misleading result. Hand off failures to owners through G4.                            |
| **S1-W4-C — Browser and accessibility checks** | Own `docs/stage-1/browser-checks.md` and review artifacts only. Exercise G3 story from local files, scene transitions/revisits, media/posters/popups, comparison, legends and presentation controls. Check keyboard, narrow viewport and reduced motion.                                                                                         | Capture browser/version/OS, file URL vs localhost, network-disabled results, console failures, viewport and interaction steps. Verify relocation. Mark unavailable checks blocked/skipped, never passed. Hand off issues and evidence to G4. |

**S1-W4-A disposition — Session 30: CLOSED.** The [portable Potomac example](../examples/projects/first-slice/README.md) now has three bounded scenes, pinned data/media declarations, a shared discharge scale and public-package build script. Two fresh builds produced identical shareable verification records, eight local output files each, and no required network URL or diagnostics. The generated semantic scale uses full-data domain 580–23,600 `ft^3/s` with the same edges in all three scenes. This is generation and semantic inspection, not browser acceptance. S1-W4-B/C and G4 remain open.

**S1-W4-B disposition — Session 31: CLOSED.** The [independent regression record](stage-1/verification.md) adds ten real-project/publication tests for version rejection, deterministic relocation, legacy byte/content preservation, source identity, missing resources, unsupported intent, stale edits and safe publication. The integrated build, 130 tests, lint and smoke checks pass. Browser behavior remains S1-W4-C work; G4 remains open.

**G4 — coordinator:** merge example and independent checks, route defects back to
the owning session, then rerun affected checks and the final example browser path.
Run required root build/tests/lint and smoke on the integrated result. Close the
stage only when the checklist below passes. Update BUILD_LOG, stage status and
agent guidance; then create the detailed Stage 2 plan from the actual case/method
constraints. A defect loop is bounded by the original scope; new feature requests
go into a later-stage thread rather than inflating closure.
Review the author brief and verification records alongside functional results.
Carry unmet evidence requests and the rationale for the chosen angle into Stage 2;
do not mark R16 delivered merely because Stage 1 identified missing support.

## Shared ownership and handoff rules

The coordinator exclusively owns `docs/BUILD_LOG.md`, this plan, the stage roadmap,
root guidance, all package `src/index.ts` barrels, manifests/lockfile, root lint/TS
configuration and shared build wiring. A session proposes changes to those files
in its handoff; it does not race another writer. Existing unrelated uncommitted
work is preserved. Session 08's idea audit is complete; Session 10's R-ID mapping
and handoffs above incorporate its findings without changing historical entries.

Each worker owns only its row's paths during that wave. Ownership of player code
transfers from W2-C to W3-B after G2. Tests of another package use public exports.
Session-local doubles do not become public APIs. If a contract must change, stop
affected consumers, issue a new specimen revision, update the plan, and integrate
before restarting them. Worktrees are optional isolation aids; no commits/pushes
are implied by this plan or required merely to author the plan.

Only the coordinator opens numbered journal entries for concurrently dispatched
sessions to avoid duplicate numbers; workers return handoffs for those entries.
Each entry records its plan ID, Goal / Did / Decisions / Files touched /
Verification / Next. An interrupted session remains open with explicit blockers.

## Verification and definition of done

During implementation run the repository-prescribed commands from the root:

```sh
pnpm install --frozen-lockfile
pnpm -r build
pnpm -r test
pnpm lint
node packages/renderer/scripts/render-example.mjs
node --check packages/renderer/runtime/app.js
node --check out/bundle-data.js
```

After the new bundle exists, also syntax-check its generated scripts and run the
new public-API example script. The coordinator records the actual new runtime build
commands at G1; the old smoke is retained for compatibility, not used to claim the
new path was verified. Routine tests require no model/provider credentials. Browser
testing is a separate gate from generation and map-adapter tests.

- [ ] Real-case dossier verifies origins, reuse, media, CRS and comparability;
      no fabricated findings or mislabeled placeholders.
- [ ] Case brief names the author task, audience and geographic question; scene
      purposes, attention and media receive a documented review against that brief.
- [ ] Feature-bound annotations and comparison memberships resolve through load,
      compilation and playback; missing/ambiguous targets return diagnostics.
- [ ] Declared measurement and author overrides remain distinct from inferred
      profiles; invalid units/identifier encodings/prerequisites diagnose; edits to
      inputs/declarations/design prevent reuse of stale compiled output.
- [ ] Explicit versioned load/import validates references/IDs and preserves the
      handwritten example's content and supported behavior; unsupported versions
      and unknown required extensions fail without silent data loss.
- [ ] Full data drives resolved categories/domains/classes, shared scales,
      legends and annotations; each supported capability has executable evidence.
- [ ] Unsupported design/filter/basemap/control requests give a stable diagnostic
      and remedy rather than a silent visual fallback.
- [ ] Scene bindings and controls reset correctly across forward/back/repeated
      navigation; media, captions, credits and posters resolve.
- [ ] Compilation is deterministic and model-independent; pure generation and
      I/O remain separate, and cross-package imports use public barrels.
- [ ] Asset preflight prevents output escape/collisions and catches missing
      required resources; URL dependencies are reported explicitly.
- [ ] Both legacy and real examples build; real local export works after
      relocation from `file://` with network disabled, with actual browser evidence.
- [ ] Basic keyboard, text-alternative, narrow-screen, contrast and reduced-motion
      review recorded; known limitations are explicit and no blocking issue hidden.
- [ ] Integrated build/test/lint passes; record counts and intentional legacy-test
      changes. No blanket claim that 53 old tests establish new functionality.
- [ ] Stage closure lists remaining exclusions and provides Stage 2 planning inputs.
- [ ] Reproducible records link inputs/versions, diagnostics and output artifacts;
      browser/manual/not-run results stay distinct. Closure updates R-ID coverage
      with evidence or deferral and hands off unsupported narrative requests.

## Risks, unresolved choices and stop conditions

| Risk/choice                                            | Owner and deadline     | Resolution/stop rule                                                                                                           |
| ------------------------------------------------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| No usable riverbank pair or supplied media             | W1-A / G1              | Fall back to an audited simpler vector comparison; if neither qualifies, keep real-case gate blocked and state required input. |
| Case needs geographic computation/reprojection         | W1-A/B / G1            | Keep Stage 1 descriptive; defer method to Stage 2 or choose a compatible dataset. Never measure degrees as meters.             |
| Runtime bundler/testing dependency                     | W1-C / G1              | Choose only after a small local-file prototype; record dependency and build outputs. No framework rewrite.                     |
| Additive design file becomes competing narrative       | W1-B / G1              | Restrict it to referenced design intent; scene order/prose/resources remain canonical elsewhere.                               |
| Legacy import loses fields or changes IDs              | W2-A/B / G2            | Fail/report unsupported content; preserve input; compare explicit before/after mapping.                                        |
| Controls or bad missing-value handling mislead legends | W3-A/B / G3            | Require compatible compiled bindings/no-data rules; reject unsupported overrides.                                              |
| Browser sandbox blocks file access                     | W1-C and W4-C          | Record block and use an available browser/manual route; HTTP checks may supplement, never replace file acceptance.             |
| Concurrent changes collide                             | Every gate coordinator | Freeze ownership/specimens, reread files before edits and integrate serially; preserve unrelated work.                         |

Excluded throughout Stage 1: computed geographic claims/evidence graph, general
analysis/profiling overhaul, automatic Design generation, public CLI/toolkit,
locks/undo/patch protocol, workbench, built-in agent harness, semantic reader
filters, linked charts, broad temporal/raster support, PMTiles, hosted publishing,
accounts, commercial work and live-provider evaluation. Record future needs in
the parent roadmap; do not implement them to make this stage appear complete.
