import { z } from 'zod';
import { AuthoredMotionSchema } from './authored-motion.js';
import { BasemapV2Schema } from './format-v2.js';
import { GeoNarrativeSchema, SCHEMA_VERSION, type GeoNarrative } from './geo-narrative.js';
import { CompiledSchema, ResolvedAssetsSchema, type Compiled } from './compiled.js';
import { DesignSchema, type Design } from './design.js';
import { FontFamilySchema } from './theme.js';
import { DiagnosticSchema, type Diagnostic, type Result } from './diagnostics.js';
import {
  COMPILED_VERSION,
  DESIGN_VERSION,
  IdSchema,
  InputSnapshotSchema,
  JsonValueSchema,
  PROJECT_VERSION,
  ProjectSchema,
  type JsonValue,
  type Project,
} from './project.js';

type Artifact = Diagnostic['artifact'];
type Path = Diagnostic['path'];
type Ids = Diagnostic['ids'];
export type ParsedProjectArtifacts = { project: Project; narrative: GeoNarrative; design: Design };

// Node Buffers may use ArrayBufferLike backing; the runtime contract accepts
// every Uint8Array, matching instanceof rather than narrowing its generic.
const ByteArraySchema: z.ZodType<Uint8Array> = z.instanceof(Uint8Array);
const DataBytesSchema = z.array(z.object({ id: IdSchema, bytes: ByteArraySchema }).strict());
export const LoadedProjectSchema = z
  .object({
    root: z.string(),
    project: ProjectSchema,
    narrative: GeoNarrativeSchema,
    design: DesignSchema,
    dataMap: z.record(JsonValueSchema),
    input: InputSnapshotSchema,
    dataBytes: DataBytesSchema,
    resolvedAssets: ResolvedAssetsSchema,
    authoredFormat: z.literal('0.2.0').optional(),
    authoredBasemap: BasemapV2Schema.optional(),
    authoredMotion: AuthoredMotionSchema.optional(),
  })
  .strict();
export const ValidatedProjectSchema = LoadedProjectSchema;
export const PublicationInputsSchema = z
  .object({
    currentInput: InputSnapshotSchema,
    dataBytes: DataBytesSchema,
    assets: ResolvedAssetsSchema,
  })
  .strict();
export const RenderCompiledOptionsSchema = z.object({}).strict();
export const CompiledBundleSchema = z
  .object({
    files: z.record(z.string()),
    mediaCopies: ResolvedAssetsSchema,
    /** Font families the writer copies into fonts/ with their licences. */
    fonts: z.array(FontFamilySchema),
    input: InputSnapshotSchema,
    diagnostics: z.array(DiagnosticSchema),
    requiredNetwork: z.array(z.string().url()),
  })
  .strict();
export const CompiledWriteResultSchema = z
  .object({
    written: z.array(z.string()),
    input: InputSnapshotSchema,
  })
  .strict();

export type LoadedProject = z.infer<typeof LoadedProjectSchema>;
export type ValidatedProject = z.infer<typeof ValidatedProjectSchema>;
export type PublicationInputs = z.infer<typeof PublicationInputsSchema>;
export type RenderCompiledOptions = z.infer<typeof RenderCompiledOptionsSchema>;
export type CompiledBundle = z.infer<typeof CompiledBundleSchema>;
export type CompiledWriteResult = z.infer<typeof CompiledWriteResultSchema>;

function issue(
  code: Diagnostic['code'],
  artifact: Artifact,
  path: Path,
  message: string,
  remedy: string,
  ids: Ids = {},
): Diagnostic {
  return { code, severity: 'error', artifact, path, ids, message, remedy };
}

function version(input: unknown, key: string, expected: string, artifact: Artifact): Diagnostic[] {
  const value =
    input && typeof input === 'object' && !Array.isArray(input)
      ? (input as Record<string, unknown>)[key]
      : undefined;
  return value === expected
    ? []
    : [
        issue(
          'VERSION_UNSUPPORTED',
          artifact,
          [key],
          `${artifact} version ${String(value)} is unsupported.`,
          'Open with a compatible MapBard version or use an explicit migration.',
        ),
      ];
}

function parseShape<T>(input: unknown, schema: z.ZodType<T>, artifact: Artifact): Result<T> {
  const parsed = schema.safeParse(input);
  if (parsed.success) return { ok: true, value: parsed.data, diagnostics: [] };
  const diagnostics = parsed.error.issues.map((entry) => {
    const unknown = entry.code === 'unrecognized_keys';
    const key = unknown ? entry.keys[0] : undefined;
    return issue(
      unknown ? 'FIELD_UNKNOWN' : 'VALUE_INVALID',
      artifact,
      key === undefined ? entry.path : [...entry.path, key],
      unknown ? `Unknown ${artifact} field ${key}.` : entry.message,
      unknown
        ? 'Remove the field or use a namespaced optional extension.'
        : 'Correct the field to match the versioned contract.',
    );
  });
  return { ok: false, diagnostics };
}

// The legacy GeoNarrative parser intentionally strips unknown keys. Comparing
// raw JSON with the parsed result catches them at every nested object boundary.
function unknownFields(raw: unknown, parsed: unknown, path: Path, output: Diagnostic[]): void {
  if (Array.isArray(raw) && Array.isArray(parsed)) {
    raw.forEach((entry, index) => unknownFields(entry, parsed[index], [...path, index], output));
  } else if (
    raw !== null &&
    parsed !== null &&
    typeof raw === 'object' &&
    typeof parsed === 'object' &&
    !Array.isArray(raw) &&
    !Array.isArray(parsed)
  ) {
    const source = raw as Record<string, unknown>;
    const accepted = parsed as Record<string, unknown>;
    for (const [key, value] of Object.entries(source)) {
      if (!(key in accepted)) {
        output.push(
          issue(
            'FIELD_UNKNOWN',
            'narrative',
            [...path, key],
            `Unknown narrative field ${key}.`,
            'Remove this field or retain it in the untouched import source.',
          ),
        );
      } else {
        unknownFields(value, accepted[key], [...path, key], output);
      }
    }
  }
}

export function parseProject(input: unknown): Result<Project> {
  const diagnostics = version(input, 'projectVersion', PROJECT_VERSION, 'project');
  if (diagnostics.length) return { ok: false, diagnostics };
  return parseShape(input, ProjectSchema, 'project');
}

export function parseProjectArtifacts(input: {
  project: unknown;
  narrative: unknown;
  design: unknown;
}): Result<ParsedProjectArtifacts> {
  const diagnostics = [
    ...version(input.project, 'projectVersion', PROJECT_VERSION, 'project'),
    ...version(input.narrative, 'schemaVersion', SCHEMA_VERSION, 'narrative'),
    ...version(input.design, 'designVersion', DESIGN_VERSION, 'design'),
  ];
  if (diagnostics.length) return { ok: false, diagnostics };
  const project = parseShape(input.project, ProjectSchema, 'project');
  const narrative = parseShape(input.narrative, GeoNarrativeSchema, 'narrative');
  const design = parseShape(input.design, DesignSchema, 'design');
  diagnostics.push(...project.diagnostics, ...narrative.diagnostics, ...design.diagnostics);
  if (narrative.ok) unknownFields(input.narrative, narrative.value, [], diagnostics);
  if (!project.ok || !narrative.ok || !design.ok || diagnostics.length)
    return { ok: false, diagnostics };
  return {
    ok: true,
    value: { project: project.value, narrative: narrative.value, design: design.value },
    diagnostics: [],
  };
}

export function parseCompiled(input: unknown): Result<Compiled> {
  const rawVersion =
    input && typeof input === 'object' && 'compiledVersion' in input
      ? input.compiledVersion
      : undefined;
  const diagnostics =
    rawVersion === COMPILED_VERSION
      ? []
      : version(input, 'compiledVersion', COMPILED_VERSION, 'compiled');
  if (diagnostics.length) return { ok: false, diagnostics };
  const parsed = parseShape(input, CompiledSchema, 'compiled');
  if (!parsed.ok) return parsed;
  const compiled = parsed.value;
  const seen = new Set<string>();
  compiled.scenes.forEach((scene, si) => {
    if (seen.has(scene.id))
      diagnostics.push(
        issue(
          'ID_DUPLICATE',
          'compiled',
          ['scenes', si, 'id'],
          'Compiled scene ID is duplicated.',
          'Recompile from unique authored scene IDs.',
          { sceneId: scene.id },
        ),
      );
    seen.add(scene.id);
    const layerIds = new Set<string>();
    scene.layers.forEach((layer, li) => {
      const expected = `mb:${scene.id.length}:${scene.id}:${layer.authoredLayerId.length}:${layer.authoredLayerId}`;
      if (
        layer.sceneId !== scene.id ||
        layer.runtimeId !== expected ||
        layerIds.has(layer.runtimeId)
      )
        diagnostics.push(
          issue(
            'VALUE_INVALID',
            'compiled',
            ['scenes', si, 'layers', li, 'runtimeId'],
            'Compiled layer runtime identity is inconsistent.',
            'Recompile with the g1-r1 runtime ID encoding.',
            { sceneId: scene.id, layerId: layer.authoredLayerId },
          ),
        );
      layerIds.add(layer.runtimeId);
    });
    scene.controls.forEach((control, ci) => {
      if (control.sceneId !== scene.id || !layerIds.has(control.runtimeLayerId))
        diagnostics.push(
          issue(
            'REFERENCE_MISSING',
            'compiled',
            ['scenes', si, 'controls', ci, 'runtimeLayerId'],
            'Control does not bind a layer in its scene.',
            'Bind the control to a compiled layer in this scene.',
            { sceneId: scene.id },
          ),
        );
    });
    scene.annotations.forEach((annotation, ai) => {
      if (annotation.sceneId !== scene.id)
        diagnostics.push(
          issue(
            'REFERENCE_MISSING',
            'compiled',
            ['scenes', si, 'annotations', ai, 'sceneId'],
            'Annotation belongs to a different scene.',
            'Recompile the annotation under its authored scene.',
            { sceneId: scene.id },
          ),
        );
    });
  });
  const scaleIds = new Set<string>();
  compiled.scales.forEach((scale, index) => {
    if (scaleIds.has(scale.id))
      diagnostics.push(
        issue(
          'ID_DUPLICATE',
          'compiled',
          ['scales', index, 'id'],
          'Scale ID is duplicated.',
          'Compile unique scale identities.',
          { scaleId: scale.id },
        ),
      );
    scaleIds.add(scale.id);
    if (scale.kind === 'numeric-color') {
      const [min, max] = scale.domain;
      const validEdges =
        min === max
          ? scale.edges.length === 1 && scale.edges[0] === min && scale.effectiveClasses === 1
          : scale.edges.length === scale.effectiveClasses + 1 &&
            scale.edges[0] === min &&
            scale.edges.at(-1) === max &&
            scale.edges.every((edge, i) => i === 0 || edge > scale.edges[i - 1]!);
      if (
        !validEdges ||
        scale.colors.length !== scale.effectiveClasses ||
        scale.labels.length !== scale.effectiveClasses
      )
        diagnostics.push(
          issue(
            'VALUE_INVALID',
            'compiled',
            ['scales', index],
            'Numeric color scale edges, colors, labels and effective class count disagree.',
            'Recompile the resolved scale from finite source values.',
            { scaleId: scale.id },
          ),
        );
    }
    if (scale.kind === 'category-color') {
      const categories = new Set<string>();
      scale.categories.forEach((category, ci) => {
        const key = `${typeof category.value}:${String(category.value)}`;
        if (categories.has(key))
          diagnostics.push(
            issue(
              'ID_DUPLICATE',
              'compiled',
              ['scales', index, 'categories', ci, 'value'],
              'Typed category is duplicated.',
              'Emit each typed category once.',
              { scaleId: scale.id },
            ),
          );
        categories.add(key);
      });
    }
  });
  const remote = new Set<string>();
  const resourceIds = new Set<string>();
  compiled.resources.forEach((resource, index) => {
    if (resourceIds.has(resource.id))
      diagnostics.push(
        issue(
          'ID_DUPLICATE',
          'compiled',
          ['resources', index, 'id'],
          'Compiled resource ID is duplicated.',
          'Emit each resource once.',
        ),
      );
    resourceIds.add(resource.id);
    if (
      (resource.bundlePath === undefined) === (resource.remoteUrl === undefined) ||
      (resource.kind === 'data' && resource.bundlePath === undefined)
    )
      diagnostics.push(
        issue(
          'VALUE_INVALID',
          'compiled',
          ['resources', index],
          'Compiled resource must have exactly one allowed location.',
          'Use a bundle path for data and one location for media.',
        ),
      );
    if (resource.remoteUrl) remote.add(resource.remoteUrl);
  });
  compiled.scenes.forEach((scene, si) =>
    scene.layers.forEach((layer, li) => {
      if (!resourceIds.has(layer.sourceId))
        diagnostics.push(
          issue(
            'REFERENCE_MISSING',
            'compiled',
            ['scenes', si, 'layers', li, 'sourceId'],
            'Layer source is absent from compiled resources.',
            'Include the data resource in the compiled specification.',
            { sceneId: scene.id, layerId: layer.authoredLayerId, sourceId: layer.sourceId },
          ),
        );
      if (layer.scaleId && !scaleIds.has(layer.scaleId))
        diagnostics.push(
          issue(
            'REFERENCE_MISSING',
            'compiled',
            ['scenes', si, 'layers', li, 'scaleId'],
            'Layer scale is absent from compiled scales.',
            'Emit the resolved scale for this layer.',
            { sceneId: scene.id, layerId: layer.authoredLayerId, scaleId: layer.scaleId },
          ),
        );
    }),
  );
  const required = [...remote].sort();
  if (JSON.stringify(compiled.requiredNetwork) !== JSON.stringify(required))
    diagnostics.push(
      issue(
        'VALUE_INVALID',
        'compiled',
        ['requiredNetwork'],
        'Network requirements disagree with remote resources.',
        'Emit sorted, deduplicated remote URLs.',
      ),
    );
  return diagnostics.length
    ? { ok: false, diagnostics }
    : { ok: true, value: compiled, diagnostics: [] };
}

function duplicates(
  values: readonly { id: string }[],
  artifact: Artifact,
  base: Path,
  diagnostics: Diagnostic[],
  ids: (id: string) => Ids,
): void {
  const seen = new Set<string>();
  values.forEach((item, index) => {
    if (seen.has(item.id))
      diagnostics.push(
        issue(
          'ID_DUPLICATE',
          artifact,
          [...base, index, 'id'],
          `ID ${item.id} is duplicated.`,
          'Assign a unique stable ID and update its references.',
          ids(item.id),
        ),
      );
    seen.add(item.id);
  });
}

function featureIds(
  data: JsonValue | undefined,
  method: Project['resources']['data'][number]['featureId'],
): Map<string, number> {
  const counts = new Map<string, number>();
  if (
    !data ||
    Array.isArray(data) ||
    typeof data !== 'object' ||
    !('features' in data) ||
    !Array.isArray(data.features)
  )
    return counts;
  for (const feature of data.features) {
    if (!feature || Array.isArray(feature) || typeof feature !== 'object') continue;
    const raw =
      method.method === 'geojson-id'
        ? feature.id
        : feature.properties &&
            typeof feature.properties === 'object' &&
            !Array.isArray(feature.properties)
          ? feature.properties[method.property]
          : undefined;
    if (typeof raw !== 'string' && !(typeof raw === 'number' && Number.isSafeInteger(raw)))
      continue;
    const key = String(raw);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function normalizedPath(path: string): string | undefined {
  const slash = path.replaceAll('\\', '/');
  if (/^(?:[a-zA-Z]:|\/|\/\/)/.test(slash)) return undefined;
  const parts = slash.split('/');
  if (parts.some((part) => part === '..' || part === '' || part === '.')) return undefined;
  return slash;
}

function checkPath(path: string, artifact: Artifact, at: Path, diagnostics: Diagnostic[]): void {
  if (!normalizedPath(path))
    diagnostics.push(
      issue(
        'ASSET_PATH_INVALID',
        artifact,
        at,
        `Path ${path} is not a contained project-relative path.`,
        'Use a path inside the project without traversal or absolute prefixes.',
      ),
    );
}

function checkLngLat(
  value: readonly number[],
  artifact: Artifact,
  at: Path,
  diagnostics: Diagnostic[],
  ids: Ids,
): void {
  const [lon, lat] = value;
  if (
    lon === undefined ||
    lat === undefined ||
    !Number.isFinite(lon) ||
    !Number.isFinite(lat) ||
    lon < -180 ||
    lon > 180 ||
    lat < -90 ||
    lat > 90
  ) {
    diagnostics.push(
      issue(
        'VALUE_INVALID',
        artifact,
        at,
        'Position is outside finite WGS84 longitude/latitude bounds.',
        'Supply a finite WGS84 position.',
        ids,
      ),
    );
  }
}

function checkCoordinates(
  value: JsonValue,
  at: Path,
  sourceId: string,
  diagnostics: Diagnostic[],
): void {
  if (!Array.isArray(value)) return;
  if (value.length >= 2 && value.every((entry) => typeof entry === 'number')) {
    const [lon, lat] = value as number[];
    if (
      lon === undefined ||
      lat === undefined ||
      !Number.isFinite(lon) ||
      !Number.isFinite(lat) ||
      lon < -180 ||
      lon > 180 ||
      lat < -90 ||
      lat > 90
    ) {
      diagnostics.push(
        issue(
          'VALUE_INVALID',
          'data',
          at,
          'Coordinate is outside finite WGS84 longitude/latitude bounds.',
          'Correct the source coordinates or explicitly adapt its CRS.',
          { sourceId },
        ),
      );
    }
    return;
  }
  value.forEach((entry, index) => checkCoordinates(entry, [...at, index], sourceId, diagnostics));
}

function checkData(
  data: JsonValue | undefined,
  resource: Project['resources']['data'][number],
  diagnostics: Diagnostic[],
): void {
  if (resource.kind !== 'geojson' || data === undefined) return;
  if (
    !data ||
    Array.isArray(data) ||
    typeof data !== 'object' ||
    data.type !== 'FeatureCollection' ||
    !Array.isArray(data.features)
  ) {
    diagnostics.push(
      issue(
        'VALUE_INVALID',
        'data',
        [],
        'A compilable data resource must be a GeoJSON FeatureCollection.',
        'Provide a GeoJSON FeatureCollection.',
        { sourceId: resource.id },
      ),
    );
    return;
  }
  const seen = new Set<string>();
  data.features.forEach((feature, index) => {
    if (!feature || Array.isArray(feature) || typeof feature !== 'object') return;
    const raw =
      resource.featureId.method === 'geojson-id'
        ? feature.id
        : feature.properties &&
            typeof feature.properties === 'object' &&
            !Array.isArray(feature.properties)
          ? feature.properties[resource.featureId.property]
          : undefined;
    if (
      (typeof raw !== 'string' && !(typeof raw === 'number' && Number.isSafeInteger(raw))) ||
      raw === ''
    ) {
      diagnostics.push(
        issue(
          'VALUE_INVALID',
          'data',
          [
            'features',
            index,
            resource.featureId.method === 'geojson-id' ? 'id' : 'properties',
            ...(resource.featureId.method === 'property' ? [resource.featureId.property] : []),
          ],
          'Feature key must be a nonempty string or safe integer.',
          'Supply stable keys for every feature.',
          { sourceId: resource.id },
        ),
      );
    } else {
      const key = String(raw);
      if (seen.has(key))
        diagnostics.push(
          issue(
            'REFERENCE_AMBIGUOUS',
            'data',
            [
              'features',
              index,
              resource.featureId.method === 'geojson-id' ? 'id' : 'properties',
              ...(resource.featureId.method === 'property' ? [resource.featureId.property] : []),
            ],
            `Feature ID ${key} is duplicated in ${resource.id}.`,
            'Provide unique stable feature IDs within the source.',
            { sourceId: resource.id, featureId: key },
          ),
        );
      seen.add(key);
    }
    const geometry = feature.geometry;
    if (
      geometry &&
      !Array.isArray(geometry) &&
      typeof geometry === 'object' &&
      'coordinates' in geometry
    )
      checkCoordinates(
        geometry.coordinates,
        ['features', index, 'geometry', 'coordinates'],
        resource.id,
        diagnostics,
      );
  });
}

export function validateProjectReferences(
  artifacts: ParsedProjectArtifacts,
  dataMap: Record<string, JsonValue> = {},
): Result<ParsedProjectArtifacts> {
  const { project, narrative, design } = artifacts;
  const diagnostics: Diagnostic[] = [];
  if (project.id !== narrative.id)
    diagnostics.push(
      issue(
        'REFERENCE_MISSING',
        'project',
        ['id'],
        'Project and narrative IDs differ.',
        'Use the narrative story ID in the project manifest.',
      ),
    );
  checkPath(project.artifacts.narrative, 'project', ['artifacts', 'narrative'], diagnostics);
  checkPath(project.artifacts.design, 'project', ['artifacts', 'design'], diagnostics);
  duplicates(narrative.scenes, 'narrative', ['scenes'], diagnostics, (sceneId) => ({ sceneId }));
  duplicates(narrative.dataSources, 'narrative', ['dataSources'], diagnostics, (sourceId) => ({
    sourceId,
  }));
  duplicates(narrative.mediaAssets, 'narrative', ['mediaAssets'], diagnostics, (assetId) => ({
    assetId,
  }));
  duplicates(project.resources.data, 'project', ['resources', 'data'], diagnostics, (sourceId) => ({
    sourceId,
  }));
  duplicates(
    project.resources.media,
    'project',
    ['resources', 'media'],
    diagnostics,
    (assetId) => ({ assetId }),
  );
  const resourceIds = new Set(project.resources.data.map((entry) => entry.id));
  const narrativeDataIds = new Set(narrative.dataSources.map((entry) => entry.id));
  narrative.mediaAssets.forEach((entry, index) => {
    if (narrativeDataIds.has(entry.id))
      diagnostics.push(
        issue(
          'ID_DUPLICATE',
          'narrative',
          ['mediaAssets', index, 'id'],
          `Resource ID ${entry.id} is duplicated across data and media.`,
          'Use distinct resource IDs.',
          { assetId: entry.id },
        ),
      );
  });
  project.resources.media.forEach((entry, index) => {
    if (resourceIds.has(entry.id))
      diagnostics.push(
        issue(
          'ID_DUPLICATE',
          'project',
          ['resources', 'media', index, 'id'],
          `Resource ID ${entry.id} is duplicated across data and media.`,
          'Use distinct resource IDs.',
          { assetId: entry.id },
        ),
      );
  });
  project.resources.data.forEach((entry, index) => {
    checkPath(entry.path, 'project', ['resources', 'data', index, 'path'], diagnostics);
    checkData(dataMap[entry.id], entry, diagnostics);
    if (!narrative.dataSources.some((source) => source.id === entry.id))
      diagnostics.push(
        issue(
          'REFERENCE_MISSING',
          'project',
          ['resources', 'data', index, 'id'],
          `Manifest data ${entry.id} has no narrative source.`,
          'Link it to one narrative data source.',
          { sourceId: entry.id },
        ),
      );
  });
  project.resources.media.forEach((entry, index) => {
    if (entry.location.type === 'local')
      checkPath(
        entry.location.path,
        'project',
        ['resources', 'media', index, 'location', 'path'],
        diagnostics,
      );
    if (!narrative.mediaAssets.some((asset) => asset.id === entry.id))
      diagnostics.push(
        issue(
          'REFERENCE_MISSING',
          'project',
          ['resources', 'media', index, 'id'],
          `Manifest media ${entry.id} has no narrative asset.`,
          'Link it to one narrative media asset.',
          { assetId: entry.id },
        ),
      );
  });
  duplicates(design.sharedScales, 'design', ['sharedScales'], diagnostics, (scaleId) => ({
    scaleId,
  }));
  duplicates(
    design.scenes.map((entry) => ({ id: entry.sceneId })),
    'design',
    ['scenes'],
    diagnostics,
    (sceneId) => ({ sceneId }),
  );
  for (const [si, scene] of narrative.scenes.entries()) {
    checkLngLat(scene.camera.center, 'narrative', ['scenes', si, 'camera', 'center'], diagnostics, {
      sceneId: scene.id,
    });
    scene.mediaAnchors?.forEach((anchor, ai) => {
      if (anchor.at)
        checkLngLat(anchor.at, 'narrative', ['scenes', si, 'mediaAnchors', ai, 'at'], diagnostics, {
          sceneId: scene.id,
          assetId: anchor.assetId,
        });
    });
    duplicates(scene.layers, 'narrative', ['scenes', si, 'layers'], diagnostics, (layerId) => ({
      sceneId: scene.id,
      layerId,
    }));
    duplicates(scene.controls ?? [], 'narrative', ['scenes', si, 'controls'], diagnostics, () => ({
      sceneId: scene.id,
    }));
  }
  for (const [di, data] of narrative.dataSources.entries()) {
    const resource = project.resources.data.find((entry) => entry.id === data.id);
    if (!resource || resource.kind !== data.kind)
      diagnostics.push(
        issue(
          'REFERENCE_MISSING',
          'narrative',
          ['dataSources', di, 'id'],
          `Data source ${data.id} has no matching manifest resource.`,
          'Register one same-kind data resource.',
          { sourceId: data.id },
        ),
      );
    else if (normalizedPath(data.path) !== normalizedPath(resource.path))
      diagnostics.push(
        issue(
          'REFERENCE_MISSING',
          'narrative',
          ['dataSources', di, 'path'],
          `Data source ${data.id} path disagrees with the manifest.`,
          'Use the same normalized project-relative resource path.',
          { sourceId: data.id },
        ),
      );
  }
  for (const [mi, media] of narrative.mediaAssets.entries()) {
    if (media.location)
      checkLngLat(media.location, 'narrative', ['mediaAssets', mi, 'location'], diagnostics, {
        assetId: media.id,
      });
    const resource = project.resources.media.find((entry) => entry.id === media.id);
    if (!resource || resource.kind !== media.kind)
      diagnostics.push(
        issue(
          'REFERENCE_MISSING',
          'narrative',
          ['mediaAssets', mi, 'id'],
          `Media ${media.id} has no matching manifest resource.`,
          'Register one same-kind media resource.',
          { assetId: media.id },
        ),
      );
    else if (
      media.source !== resource.location.type ||
      (resource.location.type === 'local' &&
        normalizedPath(media.path) !== normalizedPath(resource.location.path)) ||
      (resource.location.type === 'url' && media.path !== resource.location.url)
    )
      diagnostics.push(
        issue(
          'REFERENCE_MISSING',
          'narrative',
          ['mediaAssets', mi, 'path'],
          `Media ${media.id} location disagrees with the manifest.`,
          'Use the same normalized resource location.',
          { assetId: media.id },
        ),
      );
  }
  for (const [si, scene] of design.scenes.entries()) {
    const authored = narrative.scenes.find((entry) => entry.id === scene.sceneId);
    if (!authored)
      diagnostics.push(
        issue(
          'REFERENCE_MISSING',
          'design',
          ['scenes', si, 'sceneId'],
          `Scene ${scene.sceneId} is absent from the narrative.`,
          'Use an authored scene ID.',
          { sceneId: scene.sceneId },
        ),
      );
    duplicates(
      scene.layers.map((entry) => ({ id: entry.layerId })),
      'design',
      ['scenes', si, 'layers'],
      diagnostics,
      (layerId) => ({ sceneId: scene.sceneId, layerId }),
    );
    duplicates(scene.annotations, 'design', ['scenes', si, 'annotations'], diagnostics, () => ({
      sceneId: scene.sceneId,
    }));
    scene.layers.forEach((layer, li) => {
      if (!authored?.layers.some((entry) => entry.id === layer.layerId))
        diagnostics.push(
          issue(
            'REFERENCE_MISSING',
            'design',
            ['scenes', si, 'layers', li, 'layerId'],
            `Layer ${layer.layerId} is absent from scene ${scene.sceneId}.`,
            'Use a layer ID in that scene.',
            { sceneId: scene.sceneId, layerId: layer.layerId },
          ),
        );
    });
    scene.annotations.forEach((annotation, ai) => {
      checkLngLat(annotation.at, 'design', ['scenes', si, 'annotations', ai, 'at'], diagnostics, {
        sceneId: scene.sceneId,
      });
      if (annotation.target.kind !== 'features') return;
      const target = annotation.target;
      const source = project.resources.data.find((entry) => entry.id === target.sourceId);
      const ids = source
        ? featureIds(dataMap[source.id], source.featureId)
        : new Map<string, number>();
      target.featureIds.forEach((featureId, fi) => {
        const count = ids.get(featureId) ?? 0;
        if (count !== 1)
          diagnostics.push(
            issue(
              count > 1 ? 'REFERENCE_AMBIGUOUS' : 'REFERENCE_MISSING',
              'design',
              ['scenes', si, 'annotations', ai, 'target', 'featureIds', fi],
              count > 1
                ? `Target feature ${featureId} is ambiguous.`
                : `Target feature ${featureId} is absent from ${target.sourceId}.`,
              'Use a unique stable feature ID in the full source or make the annotation a free anchor.',
              { sceneId: scene.sceneId, sourceId: target.sourceId, featureId },
            ),
          );
      });
    });
  }
  for (const [sci, scale] of design.sharedScales.entries()) {
    let firstUnit: string | undefined;
    let firstLevel: string | undefined;
    for (const [mi, member] of scale.members.entries()) {
      const scene = narrative.scenes.find((entry) => entry.id === member.sceneId);
      const layer = scene?.layers.find((entry) => entry.id === member.layerId);
      if (!layer || layer.dataSourceId !== member.sourceId) {
        diagnostics.push(
          issue(
            'REFERENCE_MISSING',
            'design',
            ['sharedScales', sci, 'members', mi, 'sourceId'],
            'Comparison member source differs from scene layer source.',
            'Use the source bound to that scene layer.',
            member,
          ),
        );
        continue;
      }
      const attribute = layer.encode?.attribute;
      const ri = project.resources.data.findIndex((entry) => entry.id === member.sourceId);
      const resource = project.resources.data[ri];
      const ai = resource?.attributes.findIndex((entry) => entry.name === attribute) ?? -1;
      const declaration = resource?.attributes[ai];
      if (!declaration) {
        diagnostics.push(
          issue(
            'REFERENCE_MISSING',
            'design',
            ['sharedScales', sci, 'members', mi, 'sourceId'],
            'Comparison member has no declared source attribute.',
            'Declare the layer attribute in its manifest resource.',
            {
              sceneId: member.sceneId,
              layerId: member.layerId,
              sourceId: member.sourceId,
              scaleId: scale.id,
            },
          ),
        );
        continue;
      }
      const invalidField =
        declaration.role !== 'quantity'
          ? 'role'
          : declaration.observedType !== 'number'
            ? 'observedType'
            : !['interval', 'ratio'].includes(declaration.level)
              ? 'level'
              : declaration.unit === null
                ? 'unit'
                : undefined;
      if (invalidField) {
        diagnostics.push(
          issue(
            'MEASUREMENT_REQUIRED',
            'project',
            ['resources', 'data', ri, 'attributes', ai, invalidField],
            'Shared numeric scale requires a numeric quantity and declared unit.',
            'Declare a defensible quantity or use categorical color.',
            { sourceId: member.sourceId, scaleId: scale.id },
          ),
        );
      } else if (firstUnit !== undefined && declaration.unit !== firstUnit) {
        diagnostics.push(
          issue(
            'MEASUREMENT_INCOMPATIBLE',
            'project',
            ['resources', 'data', ri, 'attributes', ai, 'unit'],
            'Shared scale members use incompatible units.',
            'Supply comparable units or separate the scales.',
            { sourceId: member.sourceId, scaleId: scale.id },
          ),
        );
      } else if (firstLevel !== undefined && declaration.level !== firstLevel) {
        diagnostics.push(
          issue(
            'MEASUREMENT_INCOMPATIBLE',
            'project',
            ['resources', 'data', ri, 'attributes', ai, 'level'],
            'Shared scale members use incompatible measurement levels.',
            'Use a compatible declared measurement level or separate the scales.',
            { sourceId: member.sourceId, scaleId: scale.id },
          ),
        );
      } else {
        firstUnit = declaration.unit!;
        firstLevel = declaration.level;
      }
    }
  }
  for (const [ri, resource] of project.resources.data.entries()) {
    duplicates(
      resource.attributes.map((entry) => ({ id: entry.name })),
      'project',
      ['resources', 'data', ri, 'attributes'],
      diagnostics,
      () => ({ sourceId: resource.id }),
    );
    resource.attributes.forEach((attribute, ai) => {
      if (attribute.level !== attribute.inferredLevel && !attribute.override)
        diagnostics.push(
          issue(
            'MEASUREMENT_REQUIRED',
            'project',
            ['resources', 'data', ri, 'attributes', ai, 'override'],
            'Changed measurement level requires an override rationale.',
            'Add an explicit rationale for the authored measurement.',
            { sourceId: resource.id },
          ),
        );
    });
  }
  for (const [mi, media] of project.resources.media.entries()) {
    if (
      media.posterId &&
      !project.resources.media.some(
        (entry) => entry.id === media.posterId && entry.kind === 'image',
      )
    )
      diagnostics.push(
        issue(
          'REFERENCE_MISSING',
          'project',
          ['resources', 'media', mi, 'posterId'],
          `Poster ${media.posterId} is not a registered image.`,
          'Reference a registered image resource.',
          { assetId: media.id },
        ),
      );
  }
  for (const artifact of ['project', 'design'] as const) {
    const extensions = artifacts[artifact].extensions;
    for (const [key, value] of Object.entries(extensions ?? {}))
      if (value.required)
        diagnostics.push(
          issue(
            'EXTENSION_REQUIRED',
            artifact,
            ['extensions', key],
            `Required extension ${key} has no handler.`,
            'Install a compatible handler before compilation.',
          ),
        );
  }
  return diagnostics.length
    ? { ok: false, diagnostics }
    : { ok: true, value: artifacts, diagnostics };
}

export function validateProject(input: unknown): Result<ValidatedProject> {
  const raw =
    input && typeof input === 'object' && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
  const artifacts = parseProjectArtifacts({
    project: raw.project,
    narrative: raw.narrative,
    design: raw.design,
  });
  if (!artifacts.ok) return artifacts;
  const loaded = parseShape(input, LoadedProjectSchema, 'project');
  if (!loaded.ok) return loaded;
  const references = validateProjectReferences(artifacts.value, loaded.value.dataMap);
  if (!references.ok) return references;
  const diagnostics: Diagnostic[] = [];
  const { project, input: snapshot } = loaded.value;
  if (snapshot.projectId !== project.id || snapshot.revision !== project.revision)
    diagnostics.push(
      issue(
        'INPUT_STALE',
        'project',
        ['input'],
        'Snapshot identity or revision differs from the loaded project.',
        'Reload the project and recompute its input snapshot.',
      ),
    );
  const expected = [
    ...project.resources.data.map((entry) => ({ id: entry.id, sha256: entry.sha256 })),
    ...project.resources.media.flatMap((entry) =>
      entry.location.type === 'local' ? [{ id: entry.id, sha256: entry.location.sha256 }] : [],
    ),
  ].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  if (JSON.stringify(snapshot.resources) !== JSON.stringify(expected))
    diagnostics.push(
      issue(
        'INPUT_STALE',
        'project',
        ['input', 'resources'],
        'Snapshot resource membership or fingerprints differ from the manifest.',
        'Reload the project and recompute its input snapshot.',
      ),
    );
  const dataIds = new Set(project.resources.data.map((entry) => entry.id));
  if (
    loaded.value.dataBytes.length !== dataIds.size ||
    new Set(loaded.value.dataBytes.map((entry) => entry.id)).size !== dataIds.size ||
    loaded.value.dataBytes.some((entry) => !dataIds.has(entry.id))
  )
    diagnostics.push(
      issue(
        'RESOURCE_MISSING',
        'project',
        ['dataBytes'],
        'Loaded data bytes do not match the manifest data resource IDs.',
        'Load exactly one byte buffer for each data resource.',
      ),
    );
  return diagnostics.length
    ? { ok: false, diagnostics }
    : { ok: true, value: loaded.value, diagnostics: [] };
}
