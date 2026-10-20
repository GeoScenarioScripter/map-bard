# Stage 1 contract proposal — S1-W1-B

**Status:** G1 review revision `g1-r1`, 2026-10-19; contract decisions accepted
subject to the remaining [G1 gates](g1-review.md). No package exports or
project APIs exist yet. Wave 2 remains blocked on G1 closure. The
[case dossier](case-dossier.md) leaves the real case unverified;
all values in [specimens](specimens/README.md) are synthetic software test values.

## Why these boundaries exist

The v0.1.0 GeoNarrative remains the semantic center: story order, prose, content
dimensions, discourse role, source and media references, camera, and authored
layer intent. `mapbard.project.json` resolves physical bytes and declares their
measurement meaning. `design.json` adds only render decisions and explicit
attention/comparison references that v0.1.0 cannot express. The compiled spec is
a disposable, deterministic playback artifact, not an editable second narrative.
This retains content, discourse, and attention as distinguishable author choices
(R01/R12/R22/R23); it neither proves narrative novelty nor makes an annotation
an evidence claim. The project has no Stage 1 evidence/analysis contract.

## Versioned files and proposed Zod shapes

Exact object keys below are the proposed public shape. Implement strict objects
for known structural fields; do not let Zod's default object stripping hide input.
An explicitly named `extensions` record is preserved as opaque JSON, with keys
like `org.example.tool`, a `required` boolean and a JSON `payload`. A required
extension without a registered handler blocks compilation; an optional extension
round-trips but never executes. No executable code is carried in these files.

```ts
const Id = z.string().min(1); // no rewriting or lowercasing of authored IDs
const Digest = z.string().regex(/^sha256:[0-9a-f]{64}$/);
const RelPath = z.string().min(1); // semantic path checks occur after parse
const Extension = z.object({ required: z.boolean(), payload: z.unknown() }).strict();
const Extensions = z.record(z.string().min(1), Extension);
const Versions = {
  project: '0.1.0',
  design: '0.1.0',
  compiled: '0.1.0',
  narrative: '0.1.0',
} as const;

const SourceAttribution = z
  .object({
    label: z.string().min(1),
    url: z.string().url().optional(),
    creator: z.string().optional(),
    license: z.string().optional(),
    accessedAt: z.string().datetime().optional(),
    qualification: z.string().optional(),
  })
  .strict();
const AttributeDeclaration = z
  .object({
    name: Id,
    observedType: z.enum(['number', 'string', 'boolean', 'date']),
    inferredLevel: z.enum(['nominal', 'ordinal', 'interval', 'ratio']),
    role: z.enum(['identifier', 'category', 'quantity']),
    level: z.enum(['nominal', 'ordinal', 'interval', 'ratio']),
    unit: z.string().min(1).nullable(), // null explicitly means unknown
    denominator: z
      .object({ sourceId: Id, attribute: Id, unit: z.string().min(1) })
      .strict()
      .optional(),
    override: z
      .object({ rationale: z.string().min(1) })
      .strict()
      .optional(),
  })
  .strict();
const DataResource = z
  .object({
    id: Id,
    kind: z.enum(['geojson', 'csv']),
    path: RelPath,
    sha256: Digest,
    crs: z.literal('EPSG:4326'),
    featureId: z
      .object({
        method: z.enum(['geojson-id', 'property']),
        property: Id.optional(),
        scope: z.literal('source'),
      })
      .strict(),
    attributes: z.array(AttributeDeclaration),
    attribution: SourceAttribution,
    observationLabel: z.string().optional(),
  })
  .strict();
const MediaResource = z
  .object({
    id: Id,
    kind: z.enum(['image', 'video']),
    location: z.discriminatedUnion('type', [
      z.object({ type: z.literal('local'), path: RelPath, sha256: Digest }).strict(),
      z.object({ type: z.literal('url'), url: z.string().url() }).strict(),
    ]),
    posterId: Id.optional(),
    attribution: SourceAttribution,
  })
  .strict();
const Project = z
  .object({
    projectVersion: z.literal(Versions.project),
    id: Id,
    revision: z.number().int().nonnegative(),
    artifacts: z.object({ narrative: RelPath, design: RelPath }).strict(),
    resources: z.object({ data: z.array(DataResource), media: z.array(MediaResource) }).strict(),
    extensions: Extensions.optional(),
  })
  .strict();

const Annotation = z
  .object({
    id: Id,
    text: z.string().min(1),
    at: LngLatSchema,
    target: z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('free') }).strict(),
      z
        .object({ kind: z.literal('features'), sourceId: Id, featureIds: z.array(Id).min(1) })
        .strict(),
    ]),
  })
  .strict();
const ComparisonMember = z
  .object({
    sceneId: Id,
    layerId: Id,
    sourceId: Id,
    observationLabel: z.string().min(1),
  })
  .strict();
const SharedScale = z
  .object({
    id: Id,
    members: z.array(ComparisonMember).min(2),
    visualVariable: z.literal('color'),
    method: z.literal('equal-interval'),
    classes: z.number().int().min(2).max(9),
    palette: z.array(z.string()).min(2),
    // Omit for a full-data computed domain; supplied values are explicit bounds.
    domain: z.tuple([z.number().finite(), z.number().finite()]).optional(),
  })
  .strict();
const TypedFilter = z
  .object({
    attribute: Id,
    op: z.enum(['==', '!=', '<', '<=', '>', '>=']),
    value: z.union([z.string(), z.number().finite(), z.boolean()]),
  })
  .strict();
const LayerDesign = z
  .object({
    layerId: Id,
    filter: TypedFilter.optional(),
    constant: z
      .object({
        color: z.string().optional(),
        radius: z.number().positive().optional(),
        opacity: z.number().min(0).max(1).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
const SceneDesign = z
  .object({
    sceneId: Id,
    layers: z.array(LayerDesign),
    annotations: z.array(Annotation),
  })
  .strict();
const Design = z
  .object({
    designVersion: z.literal(Versions.design),
    scenes: z.array(SceneDesign),
    sharedScales: z.array(SharedScale),
    extensions: Extensions.optional(),
  })
  .strict();
```

The narrative file uses the existing `GeoNarrativeSchema`, with dispatch on
`schemaVersion` **before** invoking that schema. New project validation adds
semantic checks without altering the old parser: project ID equals narrative ID;
every `dataSource.id`/`mediaAsset.id` has exactly one same-kind manifest resource;
legacy paths normalize to that resource; IDs and references meet the scopes below.
An absent old `profile.crs` is an _assumption_ in the old code, not acceptable
proof of WGS84 for a new project. The loader checks source coordinates and CRS
declaration; it does not reproject. New compilable `data/` must be GeoJSON. A
legacy CSV may be copied and retained with `kind: 'csv'`, but new-path
compilation diagnoses it as unsupported until an explicit authored GeoJSON
adaptation is supplied. GeoJSON `Feature.id` may be string or integer; normalize its
comparison key to a string without changing the original bytes. Property-based
IDs must be non-null, unique per source and stable under the declared basis.

The compiled contract is deliberately resolved. It retains the narrative's
display text, scene order and source attribution, but the player never chooses a
domain, category order, technique, filter grammar or control binding.

```ts
const InputSnapshot = z
  .object({
    projectId: Id,
    revision: z.number().int().nonnegative(),
    narrativeSha256: Digest,
    designSha256: Digest,
    manifestSha256: Digest,
    resources: z.array(z.object({ id: Id, sha256: Digest }).strict()),
  })
  .strict();
const ScaleBase = z
  .object({
    id: Id,
    memberKeys: z.array(z.object({ sceneId: Id, layerId: Id, sourceId: Id }).strict()),
    unit: z.string().nullable(),
    noDataLabel: z.string(),
    noDataColor: z.string(),
    counts: z
      .object({
        valid: z.number().int().nonnegative(),
        missing: z.number().int().nonnegative(),
        invalid: z.number().int().nonnegative(),
      })
      .strict(),
  })
  .strict();
const ResolvedScale = z.discriminatedUnion('kind', [
  ScaleBase.extend({
    kind: z.literal('numeric-color'),
    domain: z.tuple([z.number().finite(), z.number().finite()]),
    edges: z.array(z.number().finite()).min(1),
    colors: z.array(z.string()).min(1),
    labels: z.array(z.string()).min(1),
    effectiveClasses: z.number().int().positive(),
  }).strict(),
  ScaleBase.extend({
    kind: z.literal('category-color'),
    categories: z.array(
      z
        .object({
          value: z.union([z.boolean(), z.number().finite(), z.string()]),
          label: z.string(),
          color: z.string(),
        })
        .strict(),
    ),
  }).strict(),
  ScaleBase.extend({
    kind: z.literal('numeric-size'),
    domain: z.tuple([z.number().finite().nonnegative(), z.number().finite().nonnegative()]),
    mapping: z.literal('sqrt-area'),
    radiusRange: z.tuple([z.number().finite().nonnegative(), z.number().finite().nonnegative()]),
    noDataRadius: z.number().finite().nonnegative(),
    legend: z
      .array(
        z
          .object({
            value: z.number().finite().nonnegative(),
            radius: z.number().finite().nonnegative(),
            label: z.string(),
          })
          .strict(),
      )
      .min(1),
  }).strict(),
]);
const ResolvedLayer = z
  .object({
    sceneId: Id,
    authoredLayerId: Id,
    runtimeId: Id,
    sourceId: Id,
    geometry: z.enum(['point', 'line', 'polygon']),
    technique: z.enum(['point', 'graduated-symbol', 'line', 'fill', 'categorical', 'choropleth']),
    attribute: Id.optional(), // resolved from the authored encoding
    scaleId: Id.optional(),
    filter: TypedFilter.optional(),
    constant: z
      .object({
        color: z.string().optional(),
        radius: z.number().positive().optional(),
        opacity: z.number().min(0).max(1).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
const ResolvedAnnotation = Annotation.extend({ sceneId: Id });
const ResolvedMediaAnchor = z
  .object({
    assetId: Id,
    at: LngLatSchema,
    trigger: z.enum(['marker', 'auto']),
    label: z.string().optional(),
  })
  .strict();
const ResolvedControl = z
  .object({
    sceneId: Id,
    id: Id,
    kind: z.enum(['toggle', 'slider']),
    label: z.string(),
    runtimeLayerId: Id,
    property: z.enum(['visibility', 'opacity', 'radius']),
    default: z.union([z.boolean(), z.number().finite()]),
    range: z.tuple([z.number().finite(), z.number().finite()]).optional(),
  })
  .strict();
const CompiledScene = z
  .object({
    id: Id,
    title: z.string(),
    narration: z.string(),
    content: ContentDimensionsSchema,
    discourse: DiscourseDimensionsSchema,
    camera: CameraSchema,
    transitionIn: z.enum(['fly', 'ease', 'cut']).optional(),
    media: z.array(SceneMediaSchema),
    mediaAnchors: z.array(ResolvedMediaAnchor),
    layers: z.array(ResolvedLayer),
    annotations: z.array(ResolvedAnnotation),
    controls: z.array(ResolvedControl),
  })
  .strict();
const Compiled = z
  .object({
    compiledVersion: z.literal(Versions.compiled),
    contractVersions: z
      .object({
        project: z.literal(Versions.project),
        narrative: z.literal(Versions.narrative),
        design: z.literal(Versions.design),
      })
      .strict(),
    compilerVersion: z.string().min(1),
    input: InputSnapshot,
    id: Id,
    title: z.string(),
    intent: z.string(),
    theme: ThemeTokensSchema.optional(),
    basemap: z.literal('neutral'),
    scenes: z.array(CompiledScene),
    scales: z.array(ResolvedScale),
    resources: z.array(
      z
        .object({
          id: Id,
          kind: z.enum(['data', 'image', 'video']),
          bundlePath: RelPath.optional(),
          remoteUrl: z.string().url().optional(),
          name: z.string().optional(),
          mimeType: z.string().optional(),
          width: z.number().int().positive().optional(),
          height: z.number().int().positive().optional(),
          caption: z.string().optional(),
          credit: z.string().optional(),
          qualification: z.string().optional(),
          posterId: Id.optional(),
        })
        .strict(),
    ),
    requiredNetwork: z.array(z.string().url()),
  })
  .strict();
```

`runtimeId` is a deterministic encoding of `(sceneId, layerId)` with collision
checking; it is not an authored ID. Compiled media resource locations point to
safe, ID/hash-derived bundle destinations, never inherited source paths. A
`ResolvedAnnotation` retains its source/feature binding and explicit `at`; it
renders at `at` after validating the target against complete features. The
anchor is authored, not inferred from feature geometry. Media-anchor fallback
locations from legacy asset metadata are resolved during compilation; the player
receives a required `at` and display metadata for each referenced asset.

## Diagnostic and result contract

```ts
const Diagnostic = z
  .object({
    code: z.enum([
      'VERSION_UNSUPPORTED',
      'FIELD_UNKNOWN',
      'EXTENSION_REQUIRED',
      'ID_DUPLICATE',
      'REFERENCE_MISSING',
      'REFERENCE_AMBIGUOUS',
      'RESOURCE_MISSING',
      'RESOURCE_HASH_MISMATCH',
      'ASSET_PATH_INVALID',
      'ASSET_COLLISION',
      'CAPABILITY_UNSUPPORTED',
      'MEASUREMENT_REQUIRED',
      'MEASUREMENT_INCOMPATIBLE',
      'VALUE_INVALID',
      'INPUT_STALE',
    ]),
    severity: z.enum(['error', 'warning']),
    artifact: z.enum(['project', 'narrative', 'design', 'data', 'media', 'compiled', 'export']),
    path: z.array(z.union([z.string(), z.number().int().nonnegative()])),
    ids: z
      .object({
        sceneId: Id.optional(),
        layerId: Id.optional(),
        sourceId: Id.optional(),
        featureId: Id.optional(),
        assetId: Id.optional(),
        scaleId: Id.optional(),
      })
      .strict(),
    message: z.string().min(1),
    remedy: z.string().min(1),
    counts: z
      .object({
        missing: z.number().int().nonnegative().optional(),
        invalid: z.number().int().nonnegative().optional(),
        total: z.number().int().nonnegative().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
type Result<T> =
  | { ok: true; value: T; diagnostics: Diagnostic[] }
  | { ok: false; diagnostics: Diagnostic[] }; // at least one error, no value
```

The code identifies the stable failure class; `path` identifies the field;
`ids` remain usable after array reorder. Diagnostics explain why, what input is
missing and a supported remedy where one exists (R20/R33). Aggregate value
counts are safe to share; raw rows, secrets and absolute private paths are not.
Warnings cannot disguise blocking errors. Import has its own report with
`retainedFields`, `normalizedPaths`, `unsupportedRequests`, `featureIdAssignments`
and diagnostics; successful import does not imply successful compilation.

## Identity, validation and dispatch

| Scope      | Rule                                                                                                                   | Negative oracle                                       |
| ---------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Project    | `id` stable; `revision` increments on edited authored artifacts.                                                       | Mismatched narrative/project ID: `REFERENCE_MISSING`. |
| Story wide | scene IDs unique; data and media resource IDs unique across both kinds.                                                | Duplicate ID: `ID_DUPLICATE` at second occurrence.    |
| Scene      | Layer IDs unique per scene; control and annotation IDs unique per scene. Same layer ID in another scene is legal.      | Duplicate within scene: `ID_DUPLICATE`.               |
| Feature    | Feature ID unique within one source. Same feature ID in another source is legal and does not establish correspondence. | Duplicate targeted ID: `REFERENCE_AMBIGUOUS`.         |
| Design     | Every scene/layer/member is a narrative reference; a member's source must equal that layer's source.                   | Mismatch: `REFERENCE_MISSING`.                        |
| Extension  | Namespaced key and explicit required flag.                                                                             | Unhandled required key: `EXTENSION_REQUIRED`.         |

Read only the discriminator (`projectVersion`, `designVersion`,
`compiledVersion`, or `schemaVersion`) before full parsing. Missing, malformed or
unknown versions produce `VERSION_UNSUPPORTED` and no coercion. The only admitted
versions in Stage 1 are `0.1.0` for each independently versioned artifact. Strict
unknown ordinary fields produce `FIELD_UNKNOWN` with the original bytes retained
in a non-destructive import source; they are never silently stripped. New-schema
extension payloads round-trip exactly as JSON. No implicit upgrade/downgrade.

Semantic validation joins declarations to actual fields in full data, checks
coordinates are finite WGS84 lon/lat, all reference scopes, source/media paths,
poster image IDs, qualifications and observed data types. Missing required local
bytes or hash disagreement blocks load/build. The source file's own coordinates
do not become WGS84 merely because metadata says `EPSG:4326`.

Measurement compatibility is intentionally narrow: `identifier` and `category`
roles may use nominal/ordinal levels, while a numeric color or size magnitude
requires `quantity`, a numeric observed type, an interval/ratio level and a
declared non-null unit. A changed role/level requires `override.rationale` when
it differs from the inferred profile; compatible edits still do not transform
values. A shared numeric scale requires equal units and compatible levels across
all members. Unit conversion and inferred denominator computation are absent.
`denominator` is a documented source/attribute prerequisite for a proposed
choropleth, not permission to divide values in Stage 1. Category color can show
unknown units because it does not imply a numeric magnitude.

## Proposed public operation signatures

```ts
loadProject(root: string): Promise<Result<LoadedProject>>;
// LoadedProject = { root, project, narrative, design, dataMap,
//   input: InputSnapshot, resolvedAssets }; root is process-local, not serialized.
importLegacyNarrative(inputPath: string, destinationRoot: string,
  options?: { onExisting?: 'error' }): Promise<Result<ImportReport>>;
validateProject(loaded: LoadedProject): Result<ValidatedProject>;
compileProject(project: ValidatedProject,
  capabilities: CapabilityCatalog): Result<Compiled>;
renderCompiled(compiled: Compiled,
  publication: PublicationInputs,
  options?: RenderCompiledOptions): Result<CompiledBundle>;
writeCompiledBundle(bundle: CompiledBundle,
  outDir: string): Promise<Result<CompiledWriteResult>>;
```

`loadProject` is I/O and computes a canonical input snapshot. `validateProject`
performs model-free structural/reference/data checks; `compileProject` is pure,
including deterministic semantic hashes and ordered diagnostics. The public
example refreshes a snapshot immediately before export. `renderCompiled`
compares the full snapshot, including declaration/override and design bytes,
against `compiled.input`; mismatch yields `INPUT_STALE` and no bundle. It also
hashes the supplied data bytes, compares them to the snapshot and parses those
same bytes to generate the data script. A separately mutable `dataMap` is no
longer a publication argument. The writer
also preflights asset source/destination containment, hashes, case-insensitive
collisions, symlinks and required files before any successful publication. Neither
renderer operation imports core or reparses a project. Existing `render()` remains
the legacy path without Stage 1 capability guarantees.

Fingerprint canonicalization accepted at G1 review: hash the exact UTF-8 authored file
bytes and local resource bytes with SHA-256; the snapshot lists resources sorted
by ID and contains no wall-clock time or absolute path. Manifest self-hash is
computed from its bytes (the manifest does not embed its own digest). A changed
override, feature target, media file or design order changes the snapshot.

## Capability matrix for G1

The statuses below are the intended implementation envelope, not delivered
capabilities. `g1-r1` resolves the contract decisions below; browser/runtime
approval and the real-case gate remain open. No production capability is passed
by the review-only shape/oracle checks.

| Authored request                                                              | Stage 1 status                   | Prerequisite / outcome                                                                                                |
| ----------------------------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Neutral basemap; cut/ease/fly camera                                          | Supported                        | WGS84 coordinates; transition reset respects reduced motion.                                                          |
| Constant point/line/fill; categorical color on point/line/polygon             | Supported                        | Geometry matches; category order/colors resolved from full values.                                                    |
| Numeric color, equal intervals and shared comparison scale                    | Supported                        | Quantity, compatible level/unit, full finite values and explicit members; compiled edges/legend.                      |
| Graduated point size                                                          | Supported                        | Numeric quantity and compatible units; resolved numeric-size scale.                                                   |
| Null/blank/invalid values                                                     | Supported with no-data treatment | No-data style/legend and counts; all-missing blocks numeric scale.                                                    |
| Typed simple comparison filter                                                | Supported                        | `==`, `!=`, `<`, `<=`, `>`, `>=`; type compatible with declared attribute.                                            |
| Panel/anchored image/video, poster and credits                                | Supported                        | Registered resource; local bytes preflighted; URL listed as network dependency.                                       |
| Feature-bound or free text annotation                                         | Supported                        | Bound IDs unique and present; explicit anchor; no inferred region or evidence meaning.                                |
| Visibility toggle, constant opacity, constant point radius slider             | Supported                        | Scene-local layer; valid defaults/range; cannot overwrite data-driven binding.                                        |
| PMTiles/other basemap, quantile/natural-breaks, heatmap, data-driven opacity  | Unsupported                      | `CAPABILITY_UNSUPPORTED`; preserve authored request.                                                                  |
| Arbitrary filter/paint, semantic data-scope control, raster/temporal playback | Unsupported                      | `CAPABILITY_UNSUPPORTED`; no silent fallback.                                                                         |
| Choropleth                                                                    | Conditional                      | Requires polygon quantity and documented denominator/normalization suitability; no Stage 1 normalization computation. |

For numeric equal intervals, derive min/max from valid finite **number** values
in all members, ignoring only explicit null/blank as missing. Strings that look
numeric are invalid, not coerced. Explicit domain must contain every valid value;
otherwise `VALUE_INVALID`. For `k` classes, preserve min/max endpoints and compute
interior edges with `(1-i/k)*min+(i/k)*max`; intervals are
`[edge_i, edge_(i+1))`, final interval includes
max. A constant domain uses one class with the constant label, without invented
spread. Duplicate floating edges collapse to distinct ordered boundaries and
their effective class count is shown. All-missing blocks a numeric scale. An
invalid non-null value blocks compilation with count; a supported constant or
categorical depiction may be offered as a remedy. Categorical values preserve
type and the G1 type-specific order, with a distinct no-data swatch. No legend
implies a measured magnitude when role is identifier/category. The
[edge oracles](specimens/README.md) give hand-calculated cases.

The conditional Potomac handoff uses only the three station IDs from the dossier
as possible cross-scene feature IDs. A future manifest would declare `value` as
quantity/ratio with `ft^3/s`, retain `approval_status`, `qualifier`, source URL,
collection date and explicit source qualifications. Session 14 acquired and
checked six source records and the photo; the dossier still leaves comparability
open. These real records are separate from synthetic specimens. Two dates
describe snapshots, not a trend or cause (R13/R16).

## Legacy v0.1.0 import trace

The [handwritten example](../../examples/sf-waterfront.geonarrative.json) is not
edited. Import copies the complete narrative unchanged to the new project;
project resource paths may be normalized only with an explicit mapping/report.
`design.json` begins empty unless an author explicitly adds a supported design.

| Existing field(s)                                                                             | Destination and treatment                                                                                                                                                                                                                                                              |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`, `title`, `intent`, `schemaVersion`                                                      | Same narrative fields; manifest `id` mirrors story ID, independent `projectVersion`.                                                                                                                                                                                                   |
| `basemap.style`, `basemap.pmtilesUrl`                                                         | Same narrative fields; `protomaps-light`/PMTiles preserved, compilation diagnoses unsupported basemap.                                                                                                                                                                                 |
| `theme.palette`, `displayFont`, `bodyFont`                                                    | Same narrative fields; compiled display tokens if supported; never substituted silently.                                                                                                                                                                                               |
| `dataSources[].id/name/kind/path/profile`                                                     | Same narrative fields, including `geometryType`, `featureCount`, `crs`, `extent`, `temporalExtent` if present, and `attributes[].name/dataType/measurement/sample`; manifest mirrors ID and normalized physical path, hashes copied bytes. Profile samples never supply scale domains. |
| `mediaAssets[].id/name/kind/source/path/mimeType/width/height/poster/caption/credit/location` | Same narrative fields; manifest mirrors ID, physical location, hash/URL and attribution. `poster` is resolved to an image asset ID or diagnosed if ambiguous/missing.                                                                                                                  |
| `scenes[]` order and `id/title/narration/content/discourse`                                   | Preserved exactly in narrative; no second scene order or prose in design. Optional content dimensions remain optional.                                                                                                                                                                 |
| `scenes[].media[].assetId/placement/caption` and `mediaAnchors[].assetId/at/trigger/label`    | Preserved; resource, fallback location and placement checked before compilation.                                                                                                                                                                                                       |
| `scenes[].layers[].id/dataSourceId/technique/encode/classification/filter`                    | Preserved; compiled only when supported. The overview `point` size binding may compile after measurement declaration; second `quantile` request reports `CAPABILITY_UNSUPPORTED`. Legacy filter strings are parsed only into the typed six-operator grammar or diagnosed.              |
| `scenes[].camera.center/zoom/bearing/pitch`, `transitionIn`                                   | Preserved; numeric/range validation precedes playback.                                                                                                                                                                                                                                 |
| `scenes[].controls[].id/kind/label/bindsTo/range/options/default`                             | Preserved; second-scene radius slider conflicts with data-driven size and reports `MEASUREMENT_INCOMPATIBLE` or `CAPABILITY_UNSUPPORTED` with a precise remedy.                                                                                                                        |

The source's narration contains historical/visitor assertions with no verified
supporting evidence. Importing it preserves those words but does not certify
them. Its checked-in images are placeholders, not real source media. The
explicitly adapted compiled-path fixture must record every change: neutral
basemap, equal-interval or constant supported symbol design, and a compatible
control. A standalone v0.1.0 import can succeed while compilation fails. Tests
must compare all JSON leaf paths and values before/after import, plus byte-for-byte
preservation of the original input and an explicit list of normalization changes.

## Handoff and unresolved G1 choices

- W2-A consumes the file shapes and negative oracles; W2-B consumes path,
  fingerprint, override and import rules; W2-C consumes the compiled specimen.
  W3-A/B/C use the same scale/scene/asset and stale-input expectations.
- The [G1 review](g1-review.md) records module/barrel homes, floating-edge and
  all-missing behavior, byte identity and publication binding decisions.
- G1 must reconcile the contract with W1-C's browser/runtime spike and keep the
  real-case gate open until source bytes, values, statuses and media are verified.
  This document alone does not authorize Wave 2 or close G1.

## G1-r1 semantic refinements and process-local types

This section supersedes the draft's permissive scale shape and unspecified
auxiliary types. Frozen review decisions are listed in [G1](g1-review.md).
These are specifications for future Zod/inferred types, not hand-written public
TypeScript interfaces to bypass validation.

- Numeric-color scales require aligned `colors`/`labels` lengths equal to
  `effectiveClasses`. Nonconstant domains have strictly increasing edges with
  exact domain endpoints and one more edge than classes. A constant domain has
  a single edge, color and label. Compiler emits labels; the player displays them.
- Category entries retain primitive values and their type; `1` and `"1"` are
  different keys. Reject duplicate typed values. Sorting and missing-value rules
  are defined in G1; all-missing permits an empty category array with the explicit
  no-data swatch. Do not treat `noDataColor` as a numeric value/category.
- Graduated area requires nonnegative ratio quantities and compatible units;
  interval, negative and identifier values return `MEASUREMENT_INCOMPATIBLE`.
  Nonconstant size domain is `[0,max]`, with `radiusRange=[0,16]` CSS pixels.
  Radius is `16*sqrt(value/max)`. Constant positive values use `[c,c]`,
  `radiusRange=[8,8]`, and one resolved legend exemplar. All-zero values use
  `[0,0]`, `[0,0]`, and a textual zero legend; do not fabricate a positive size.
  `noDataRadius=3` and `noDataColor` distinguish missing data. No size control may
  overwrite this binding. The compiler resolves exemplar values/radii/labels;
  the player only applies this specified transfer function.
- Require JSON-only extension payloads (recursive null/boolean/finite number/
  string/array/object), including a required `payload` key, and namespaced
  extension keys. Reject unsupported required extensions, never execute them.
- Require `featureId.property` exactly for method `property`. Key values are
  nonempty strings or safe integers normalized to strings; a collision such as
  integer `1` and string `"1"` is ambiguous. No float/boolean/null feature keys.
- Resource locations are exclusive: each compiled resource has exactly one of
  `bundlePath` or `remoteUrl`, data only uses bundle paths, and every URL is
  reflected in sorted/deduplicated `requiredNetwork`. Validate finite WGS84
  coordinate ranges and resource/scene/reference joins outside shape parsing.
- New validation rejects raw unknown narrative keys recursively before the old
  parser can strip them. Bounds, references and variant consistency use semantic
  diagnostics; shape-only parsing is not a validation pass.

Process-local contracts (do not serialize roots, byte buffers or source paths):

| Name                                     | Required fields / behavior                                                                                                                                                                                                                                                                                                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LoadedProject`                          | `root: string`, parsed `project`, `narrative`, `design`, `dataMap: Record<string, JsonValue>`, `input: InputSnapshot`, `dataBytes: {id: string, bytes: Uint8Array}[]`, `resolvedAssets: ResolvedAssets`. Loader derives map and snapshot from the same bytes.                                                                                                                   |
| `ValidatedProject`                       | Same payload, copied/validated and treated as immutable by compile; compiler rechecks snapshot/data consistency rather than trusting a nominal TypeScript brand. No filesystem read.                                                                                                                                                                                            |
| `CapabilityCatalog`                      | Strict `{version: '0.1.0', ids: string[]}` with unique recognized IDs for the bounded matrix; unknown IDs diagnose. Callers can restrict but cannot enable unimplemented capabilities. Renderer and compiler use the same checked-in catalog version.                                                                                                                           |
| `ResolvedAssets`                         | Array of strict `{id, sourcePath, projectRoot, bundlePath, sha256}` for local image/video resources (including posters). Paths are process-local; hashes use `Digest`; writer validates real-path containment in root and output, collisions and bytes before writes. Remote media stay in compiled resources.                                                                  |
| `PublicationInputs`                      | Strict `{currentInput: InputSnapshot, dataBytes: {id, bytes: Uint8Array}[], assets: ResolvedAssets}`. Require exact resource membership and unique IDs. Hash data buffers against `currentInput` and `compiled.input`; any altered buffer gives `INPUT_STALE`. Writer similarly checks current media bytes against their expected hash before copying.                          |
| `ImportReport`                           | `{projectRoot: string, retainedFields: string[], normalizedPaths: {resourceId, from, to}[], unsupportedRequests: Diagnostic[], featureIdAssignments: {sourceId, featureIndex, assignedId, basis}[]}` within `Result`; reject existing destination and never overwrite source. Process-local report may contain author-selected paths; sanitized verification records omit them. |
| `RenderCompiledOptions`                  | Strict empty object for Stage 1; no unchecked options that change meaning or asset paths.                                                                                                                                                                                                                                                                                       |
| `CompiledBundle` / `CompiledWriteResult` | `{files: Record<string, string>, mediaCopies: ResolvedAssets, input: InputSnapshot, diagnostics: Diagnostic[], requiredNetwork: string[]}` and `{written: string[], input: InputSnapshot}` respectively. Use these distinct names; preserve legacy `RenderedBundle` and `WriteResult`.                                                                                          |

`CapabilityCatalog.ids` names the requests admitted by compiler implementation:
`basemap.neutral`, `camera.cut`, `camera.ease`, `camera.fly`, `layer.constant`,
`color.categorical`, `color.equal-interval`, `size.graduated-area`,
`filter.comparison`, `media.panel`, `media.anchor`, `annotation.text`,
`control.visibility`, `control.opacity`, `control.radius`. Conditional choropleth
requires the numeric-color capability plus its geometry/measurement prerequisites;
catalog membership never waives prerequisites. No plugin handler API is introduced.

Publication freshness means equivalence to the caller's freshly reloaded
snapshot. Without project filesystem access a pure renderer cannot detect a caller
deliberately supplying an entirely old snapshot and matching old bytes. The public
example must reload immediately before export; watching concurrent author edits
or an atomic filesystem transaction belongs to later revision work. This explicit
trust limit does not permit a changed supplied buffer or media file to go unchecked.
