import { createHash } from 'node:crypto';
import {
  CapabilityCatalogSchema,
  COMPILED_VERSION,
  CompiledSchema,
  FontFamilySchema,
  type CapabilityCatalog,
  type Compiled,
  type DataResource,
  type Diagnostic,
  type LayerBinding,
  type ResolvedScale,
  type Result,
  type ValidatedProject,
  validateProject,
} from '@mapbard/schema';
import {
  graduatedSizePrerequisite,
  hasCapability,
  humanizeId,
  numericColorPrerequisite,
  resolveBasemap,
  resolveLayout,
  resolveTheme,
  techniqueGeometry,
  type CapabilityId,
} from '@mapbard/knowledge';
import {
  featurePoints,
  matchesFilter,
  parseLegacyFilter,
  sourceFeatures,
  type Comparison,
  type Feature,
} from './data.js';
import {
  categoryColorScale,
  numericColorScale,
  numericSizeScale,
  type ClassificationMethod,
  type ScaleInput,
  type ScaleKey,
} from './scales.js';
import { resolveSceneMotion } from './motion.js';
import { resolveSceneCallouts } from './callouts.js';

export const COMPILER_VERSION = 's1-w3-a.1';

function issue(
  code: Diagnostic['code'],
  artifact: Diagnostic['artifact'],
  path: Diagnostic['path'],
  message: string,
  remedy: string,
  ids: Diagnostic['ids'] = {},
): Diagnostic {
  return { code, severity: 'error', artifact, path, ids, message, remedy };
}
function capability(
  catalog: CapabilityCatalog,
  id: CapabilityId,
  diagnostics: Diagnostic[],
  path: Diagnostic['path'],
  ids: Diagnostic['ids'] = {},
): boolean {
  if (hasCapability(catalog, id)) return true;
  diagnostics.push(
    issue(
      'CAPABILITY_UNSUPPORTED',
      'narrative',
      path,
      `Capability ${id} is unavailable.`,
      'Use a supported capability or a catalog that includes this one.',
      ids,
    ),
  );
  return false;
}
const CLASSIFICATION_CAPABILITY: Record<ClassificationMethod, CapabilityId> = {
  'equal-interval': 'color.equal-interval',
  quantile: 'color.quantile',
  'natural-breaks': 'color.natural-breaks',
  manual: 'color.manual-breaks',
};

function key(sceneId: string, layerId: string): string {
  return `${sceneId.length}:${sceneId}:${layerId.length}:${layerId}`;
}
function runtimeId(sceneId: string, layerId: string): string {
  return `mb:${key(sceneId, layerId)}`;
}
function localScaleId(sceneId: string, layerId: string): string {
  return `mb-scale:${key(sceneId, layerId)}`;
}
/** Legend titles never show a raw column name when the author declared a label. */
function scaleTitle(declaration: { label?: string } | undefined, attribute: string): string {
  return declaration?.label ?? humanizeId(attribute);
}

function resourceName(name: string | undefined, id: string): string {
  return name && name !== id ? name : humanizeId(id);
}

/** The GeoJSON geometry of a checked feature, for camera presets. */
function rawGeometry(
  project: ValidatedProject,
  sourceId: string,
  index: number,
): { type?: unknown; coordinates?: unknown } | undefined {
  const data = project.dataMap[sourceId];
  if (!data || Array.isArray(data) || typeof data !== 'object' || !Array.isArray(data.features))
    return undefined;
  const feature = data.features[index];
  if (!feature || Array.isArray(feature) || typeof feature !== 'object') return undefined;
  const geometry = feature.geometry;
  return geometry && !Array.isArray(geometry) && typeof geometry === 'object'
    ? (geometry as { type?: unknown; coordinates?: unknown })
    : undefined;
}

function hash(bytes: Uint8Array): string {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}
function safeResourceName(id: string): string {
  if (/^[A-Za-z0-9_-]+$/.test(id) && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(id)) return id;
  return `id-${createHash('sha256').update(id).digest('hex').slice(0, 12)}`;
}

type LayerContext = {
  sceneId: string;
  layer: LayerBinding;
  resource: DataResource;
  features: Feature[];
  filter?: Comparison;
  scaleId?: string;
};

function checkedFilter(
  context: LayerContext,
  authored: Comparison | undefined,
  designed: Comparison | undefined,
  diagnostics: Diagnostic[],
  path: Diagnostic['path'],
  catalog: CapabilityCatalog,
): Comparison | undefined {
  if (authored && designed && JSON.stringify(authored) !== JSON.stringify(designed)) {
    diagnostics.push(
      issue(
        'CAPABILITY_UNSUPPORTED',
        'design',
        path,
        'Legacy and typed filters disagree.',
        'Keep one equivalent comparison filter.',
        { sceneId: context.sceneId, layerId: context.layer.id },
      ),
    );
    return undefined;
  }
  const filter = designed ?? authored;
  if (!filter) return undefined;
  capability(catalog, 'filter.comparison', diagnostics, path, {
    sceneId: context.sceneId,
    layerId: context.layer.id,
  });
  const declaration = context.resource.attributes.find((item) => item.name === filter.attribute);
  if (!declaration)
    diagnostics.push(
      issue(
        'REFERENCE_MISSING',
        'narrative',
        path,
        `Filter column ${filter.attribute} is undeclared.`,
        'Declare a real source column or remove the filter.',
        { sceneId: context.sceneId, layerId: context.layer.id, sourceId: context.resource.id },
      ),
    );
  else if (
    context.features.length &&
    context.features.every((feature) => !(filter.attribute in feature.properties))
  )
    diagnostics.push(
      issue(
        'REFERENCE_MISSING',
        'data',
        ['features', 'properties', filter.attribute],
        `Filter column ${filter.attribute} is absent from the full source.`,
        'Use a present column or correct the source declaration.',
        { sceneId: context.sceneId, layerId: context.layer.id, sourceId: context.resource.id },
      ),
    );
  else if (
    declaration.observedType !== typeof filter.value ||
    (filter.op !== '==' && filter.op !== '!=' && typeof filter.value !== 'number')
  )
    diagnostics.push(
      issue(
        'VALUE_INVALID',
        'narrative',
        path,
        'Filter value or operator is incompatible with its declared column.',
        'Use a matching primitive value; ordering comparisons require numbers.',
        { sceneId: context.sceneId, layerId: context.layer.id, sourceId: context.resource.id },
      ),
    );
  return filter;
}

function checkMeasurement(
  context: LayerContext,
  mode: 'color' | 'size',
  diagnostics: Diagnostic[],
  scaleId: string,
): boolean {
  const attribute = context.layer.encode?.attribute;
  const index = context.resource.attributes.findIndex((entry) => entry.name === attribute);
  if (index < 0) {
    diagnostics.push(
      issue(
        'REFERENCE_MISSING',
        'project',
        ['resources', 'data', context.resource.id, 'attributes'],
        `Encoded column ${attribute ?? '(missing)'} is undeclared.`,
        'Declare a source column present in full data.',
        {
          sceneId: context.sceneId,
          layerId: context.layer.id,
          sourceId: context.resource.id,
          scaleId,
        },
      ),
    );
    return false;
  }
  const declaration = context.resource.attributes[index]!;
  const result =
    mode === 'color'
      ? numericColorPrerequisite(declaration)
      : graduatedSizePrerequisite(declaration);
  if (!result.ok) {
    diagnostics.push(
      issue(
        mode === 'size' && result.field === 'level'
          ? 'MEASUREMENT_INCOMPATIBLE'
          : 'MEASUREMENT_REQUIRED',
        'project',
        ['resources', 'data', context.resource.id, 'attributes', index, result.field],
        result.reason,
        mode === 'size'
          ? 'Declare a nonnegative ratio quantity with a unit or use a constant point symbol.'
          : 'Declare a defensible quantity and unit, or use categorical color.',
        {
          sceneId: context.sceneId,
          layerId: context.layer.id,
          sourceId: context.resource.id,
          scaleId,
        },
      ),
    );
    return false;
  }
  return true;
}

function valuesFor(context: LayerContext, diagnostics: Diagnostic[], numeric: boolean): unknown[] {
  const attribute = context.layer.encode?.attribute;
  if (!attribute) return [];
  const selected = context.features.filter((feature) => matchesFilter(feature, context.filter));
  const missingColumn = selected.filter((feature) => !(attribute in feature.properties));
  if (missingColumn.length === selected.length && selected.length)
    diagnostics.push(
      issue(
        'REFERENCE_MISSING',
        'data',
        ['features', 'properties', attribute],
        `Column ${attribute} is absent from the full source.`,
        'Use a present column or correct the resource declaration.',
        { sceneId: context.sceneId, layerId: context.layer.id, sourceId: context.resource.id },
      ),
    );
  if (numeric) {
    const invalid = selected.filter((feature) => {
      const value = feature.properties[attribute];
      return (
        value !== null &&
        value !== undefined &&
        value !== '' &&
        (typeof value !== 'number' || !Number.isFinite(value))
      );
    });
    const first = invalid[0];
    if (first) {
      const diagnostic = issue(
        'VALUE_INVALID',
        'data',
        ['features', first.index, 'properties', attribute],
        'Numeric scale contains a nonnumeric value.',
        'Correct the source data or use a categorical encoding.',
        {
          sceneId: context.sceneId,
          layerId: context.layer.id,
          sourceId: context.resource.id,
          featureId: first.id,
        },
      );
      diagnostic.counts = { invalid: invalid.length, total: selected.length };
      diagnostics.push(diagnostic);
    }
  } else {
    const declared = context.resource.attributes.find((entry) => entry.name === attribute);
    const wrong = selected.filter((feature) => {
      const value = feature.properties[attribute];
      return (
        value !== null &&
        value !== undefined &&
        value !== '' &&
        (declared?.observedType === 'date' || typeof value !== declared?.observedType)
      );
    });
    const first = wrong[0];
    if (first) {
      const diagnostic = issue(
        'VALUE_INVALID',
        'data',
        ['features', first.index, 'properties', attribute],
        'Category value differs from its declared primitive type.',
        'Correct the source value or declaration; temporal categories are outside Stage 1.',
        {
          sceneId: context.sceneId,
          layerId: context.layer.id,
          sourceId: context.resource.id,
          featureId: first.id,
        },
      );
      diagnostic.counts = { invalid: wrong.length, total: selected.length };
      diagnostics.push(diagnostic);
    }
  }
  return selected.map((feature) => feature.properties[attribute]);
}

function resolveScale(
  input: ScaleInput,
  kind: 'numeric-color' | 'category-color' | 'numeric-size',
  diagnostics: Diagnostic[],
): ResolvedScale | undefined {
  const result =
    kind === 'numeric-color'
      ? numericColorScale(input)
      : kind === 'numeric-size'
        ? numericSizeScale(input)
        : categoryColorScale(input);
  diagnostics.push(...result.diagnostics);
  return result.scale;
}

function checkBytes(project: ValidatedProject, diagnostics: Diagnostic[]): void {
  for (const resource of project.project.resources.data) {
    const loaded = project.dataBytes.find((entry) => entry.id === resource.id);
    if (!loaded) continue;
    if (hash(loaded.bytes) !== resource.sha256)
      diagnostics.push(
        issue(
          'INPUT_STALE',
          'data',
          ['dataBytes', resource.id],
          'Loaded data bytes differ from the declared fingerprint.',
          'Reload and validate the changed resource.',
          { sourceId: resource.id },
        ),
      );
    else {
      try {
        const parsed =
          resource.kind === 'geojson'
            ? JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(loaded.bytes))
            : new TextDecoder('utf-8', { fatal: true }).decode(loaded.bytes);
        if (JSON.stringify(parsed) !== JSON.stringify(project.dataMap[resource.id]))
          diagnostics.push(
            issue(
              'INPUT_STALE',
              'data',
              ['dataMap', resource.id],
              'Loaded data map differs from its fingerprinted bytes.',
              'Reload the project before compiling.',
              { sourceId: resource.id },
            ),
          );
      } catch {
        diagnostics.push(
          issue(
            'VALUE_INVALID',
            'data',
            ['dataBytes', resource.id],
            'Data bytes cannot be decoded.',
            'Repair and reload the resource.',
            { sourceId: resource.id },
          ),
        );
      }
    }
  }
}

export function compileProject(
  project: ValidatedProject,
  capabilities: CapabilityCatalog,
  options: { offline?: boolean } = {},
): Result<Compiled> {
  const diagnostics: Diagnostic[] = [];
  const parsedCatalog = CapabilityCatalogSchema.safeParse(capabilities);
  if (!parsedCatalog.success) {
    const badVersion = !capabilities || capabilities.version !== '0.1.0';
    return {
      ok: false,
      diagnostics: [
        issue(
          badVersion ? 'VERSION_UNSUPPORTED' : 'CAPABILITY_UNSUPPORTED',
          'project',
          badVersion ? ['capabilities', 'version'] : ['capabilities', 'ids'],
          badVersion
            ? 'Capability catalog version is unsupported.'
            : 'Capability catalog contains unknown or duplicate IDs.',
          'Use the checked-in Stage 1 capability catalog.',
        ),
      ],
    };
  }
  const validated = validateProject(project);
  if (!validated.ok) return validated;
  checkBytes(project, diagnostics);
  const { narrative, design } = project;
  if (options.offline)
    for (const resource of project.project.resources.media)
      if (resource.location.type === 'url')
        diagnostics.push(
          issue(
            'CAPABILITY_UNSUPPORTED',
            'media',
            ['resources', 'media', resource.id],
            'Offline publication cannot include remote media.',
            'Download and register the media locally before building offline.',
            { assetId: resource.id },
          ),
        );
  if (narrative.basemap.style !== 'neutral' || narrative.basemap.pmtilesUrl)
    diagnostics.push(
      issue(
        'CAPABILITY_UNSUPPORTED',
        'narrative',
        ['basemap'],
        'Only the neutral basemap is supported.',
        'Author a neutral basemap for this compiled path; retain the original request in the source.',
      ),
    );
  else capability(capabilities, 'basemap.neutral', diagnostics, ['basemap']);

  const authoredTheme = narrative.theme ?? {};
  for (const field of ['displayFont', 'bodyFont'] as const) {
    const family = authoredTheme[field];
    if (family !== undefined && !FontFamilySchema.safeParse(family).success)
      diagnostics.push(
        issue(
          'VALUE_INVALID',
          'project',
          ['theme', field],
          `Font family ${JSON.stringify(family)} cannot be written to the page stylesheet.`,
          'Use a plain family name of letters, digits, spaces, dots, underscores or hyphens.',
        ),
      );
  }
  const theme = resolveTheme(authoredTheme);
  const layout = resolveLayout(narrative.layout);

  const featureMap = new Map<string, Feature[]>();
  for (const resource of project.project.resources.data) {
    if (resource.kind !== 'geojson')
      diagnostics.push(
        issue(
          'CAPABILITY_UNSUPPORTED',
          'project',
          ['resources', 'data', resource.id, 'kind'],
          'CSV compilation is unavailable.',
          'Adapt source data into a checked GeoJSON resource.',
          { sourceId: resource.id },
        ),
      );
    else featureMap.set(resource.id, sourceFeatures(project, resource, diagnostics));
  }
  const shared = new Map<string, { id: string; index: number }>();
  design.sharedScales.forEach((scale, index) =>
    scale.members.forEach((member) => {
      const memberKey = key(member.sceneId, member.layerId);
      if (shared.has(memberKey))
        diagnostics.push(
          issue(
            'REFERENCE_AMBIGUOUS',
            'design',
            ['sharedScales', index, 'members'],
            'Layer belongs to multiple shared scales.',
            'Keep one shared scale per layer.',
            { ...member, scaleId: scale.id },
          ),
        );
      else shared.set(memberKey, { id: scale.id, index });
    }),
  );
  const contexts = new Map<string, LayerContext>();
  const runtimeIds = new Set<string>();
  const compiledScenes: Compiled['scenes'] = [];
  for (const [sceneIndex, scene] of narrative.scenes.entries()) {
    const sceneDesign = design.scenes.find((entry) => entry.sceneId === scene.id);
    const transition = scene.transitionIn ?? 'cut';
    capability(
      capabilities,
      `camera.${transition}`,
      diagnostics,
      ['scenes', sceneIndex, 'transitionIn'],
      { sceneId: scene.id },
    );
    const layers: Compiled['scenes'][number]['layers'] = [];
    for (const [layerIndex, layer] of scene.layers.entries()) {
      const at = ['scenes', sceneIndex, 'layers', layerIndex];
      const ids = { sceneId: scene.id, layerId: layer.id, sourceId: layer.dataSourceId };
      const resource = project.project.resources.data.find(
        (entry) => entry.id === layer.dataSourceId,
      );
      if (!resource) continue;
      const features = featureMap.get(resource.id) ?? [];
      const expected = techniqueGeometry(layer.technique);
      if (layer.technique === 'heatmap')
        diagnostics.push(
          issue(
            'CAPABILITY_UNSUPPORTED',
            'narrative',
            [...at, 'technique'],
            'Heatmap is outside Stage 1.',
            'Use a supported point, line or fill depiction.',
            ids,
          ),
        );
      if (expected && features.some((feature) => feature.geometry !== expected))
        diagnostics.push(
          issue(
            'VALUE_INVALID',
            'data',
            ['features', 'geometry'],
            `Technique ${layer.technique} needs ${expected} geometry.`,
            'Use matching geometry or a supported technique.',
            ids,
          ),
        );
      const actualGeometry = features[0]?.geometry;
      if (!actualGeometry)
        diagnostics.push(
          issue(
            'VALUE_INVALID',
            'data',
            ['features'],
            'Layer has no supported features.',
            'Provide a nonempty supported GeoJSON source.',
            ids,
          ),
        );
      else if (features.some((feature) => feature.geometry !== actualGeometry))
        diagnostics.push(
          issue(
            'VALUE_INVALID',
            'data',
            ['features', 'geometry'],
            'Mixed feature geometry cannot form one Stage 1 layer.',
            'Separate geometry types into different resources.',
            ids,
          ),
        );
      const id = runtimeId(scene.id, layer.id);
      if (runtimeIds.has(id))
        diagnostics.push(
          issue(
            'ID_DUPLICATE',
            'compiled',
            [...at, 'id'],
            'Runtime layer ID collides.',
            'Use unique scene-local authored IDs.',
            ids,
          ),
        );
      runtimeIds.add(id);
      const designed = sceneDesign?.layers.find((entry) => entry.layerId === layer.id);
      if (
        (layer.encode?.visualVariable === 'color' && designed?.constant?.color) ||
        (layer.encode?.visualVariable === 'size' && designed?.constant?.radius)
      )
        diagnostics.push(
          issue(
            'CAPABILITY_UNSUPPORTED',
            'design',
            ['scenes', scene.id, 'layers', layer.id, 'constant'],
            'Constant paint would replace a data-driven binding.',
            'Remove the conflicting constant or the data-driven encoding.',
            ids,
          ),
        );
      const authoredFilter = layer.filter ? parseLegacyFilter(layer.filter) : undefined;
      if (layer.filter && !authoredFilter)
        diagnostics.push(
          issue(
            'CAPABILITY_UNSUPPORTED',
            'narrative',
            [...at, 'filter'],
            'Legacy filter is outside the six comparison operators.',
            'Use a typed simple comparison filter.',
            ids,
          ),
        );
      const context: LayerContext = { sceneId: scene.id, layer, resource, features };
      const filter = checkedFilter(
        context,
        authoredFilter,
        designed?.filter,
        diagnostics,
        [...at, 'filter'],
        capabilities,
      );
      context.filter = filter;
      const scaleId = layer.encode
        ? (shared.get(key(scene.id, layer.id))?.id ?? localScaleId(scene.id, layer.id))
        : undefined;
      context.scaleId = scaleId;
      contexts.set(key(scene.id, layer.id), context);
      if (layer.encode?.visualVariable === 'opacity')
        diagnostics.push(
          issue(
            'CAPABILITY_UNSUPPORTED',
            'narrative',
            [...at, 'encode', 'visualVariable'],
            'Data-driven opacity is unavailable.',
            'Use a constant opacity control or a supported color/size encoding.',
            ids,
          ),
        );
      if (
        layer.encode?.visualVariable === 'size' &&
        layer.technique !== 'graduated-symbol' &&
        layer.technique !== 'point'
      )
        diagnostics.push(
          issue(
            'CAPABILITY_UNSUPPORTED',
            'narrative',
            [...at, 'encode'],
            'Graduated size is supported only for points.',
            'Use a point layer.',
            ids,
          ),
        );
      if (layer.technique === 'graduated-symbol' && layer.encode?.visualVariable !== 'size')
        diagnostics.push(
          issue(
            'CAPABILITY_UNSUPPORTED',
            'narrative',
            [...at, 'encode'],
            'Graduated symbol needs a size encoding.',
            'Bind a measured size attribute.',
            ids,
          ),
        );
      const encodedDeclaration = resource.attributes.find(
        (entry) => entry.name === layer.encode?.attribute,
      );
      if (
        layer.technique === 'choropleth' ||
        (actualGeometry === 'polygon' &&
          layer.encode?.visualVariable === 'color' &&
          encodedDeclaration?.role === 'quantity')
      ) {
        const denominator = encodedDeclaration?.denominator;
        const denominatorResource = project.project.resources.data.find(
          (entry) => entry.id === denominator?.sourceId,
        );
        const denominatorAttribute = denominatorResource?.attributes.find(
          (entry) => entry.name === denominator?.attribute,
        );
        if (!denominator || encodedDeclaration?.level !== 'ratio')
          diagnostics.push(
            issue(
              'MEASUREMENT_REQUIRED',
              'project',
              ['resources', 'data', resource.id, 'attributes'],
              'Numeric polygon color needs a ratio quantity and declared denominator prerequisite.',
              'Declare a defensible denominator and already-normalized ratio, or use categorical fill.',
              ids,
            ),
          );
        else if (
          !denominatorAttribute ||
          denominatorAttribute.observedType !== 'number' ||
          denominatorAttribute.role !== 'quantity'
        )
          diagnostics.push(
            issue(
              'REFERENCE_MISSING',
              'project',
              [
                'resources',
                'data',
                resource.id,
                'attributes',
                encodedDeclaration.name,
                'denominator',
              ],
              'Denominator reference has no numeric quantity declaration.',
              'Reference a declared numeric denominator source and attribute.',
              ids,
            ),
          );
      }
      if (layer.technique === 'choropleth' && layer.encode?.visualVariable !== 'color')
        diagnostics.push(
          issue(
            'CAPABILITY_UNSUPPORTED',
            'narrative',
            [...at, 'encode'],
            'Choropleth needs a numeric color encoding.',
            'Bind a supported ratio quantity to color or use a constant fill.',
            ids,
          ),
        );
      if (layer.technique === 'categorical' && layer.encode?.visualVariable !== 'color')
        diagnostics.push(
          issue(
            'CAPABILITY_UNSUPPORTED',
            'narrative',
            [...at, 'encode'],
            'Categorical technique needs a color encoding.',
            'Bind a nominal or ordinal attribute to color.',
            ids,
          ),
        );
      if (!layer.encode || designed?.constant)
        capability(capabilities, 'layer.constant', diagnostics, at, ids);
      if (actualGeometry)
        layers.push({
          sceneId: scene.id,
          authoredLayerId: layer.id,
          runtimeId: id,
          sourceId: resource.id,
          geometry: actualGeometry,
          technique: layer.technique === 'heatmap' ? 'point' : layer.technique,
          ...(layer.encode ? { attribute: layer.encode.attribute, scaleId } : {}),
          ...(filter ? { filter } : {}),
          ...(designed?.constant ? { constant: designed.constant } : {}),
        });
    }
    const annotations = (sceneDesign?.annotations ?? []).map((item) => ({
      ...item,
      sceneId: scene.id,
    }));
    for (const [annotationIndex, annotation] of annotations.entries()) {
      const target = annotation.target;
      if (
        target.kind === 'features' &&
        !scene.layers.some((layer) => layer.dataSourceId === target.sourceId)
      )
        diagnostics.push(
          issue(
            'REFERENCE_MISSING',
            'design',
            ['scenes', sceneIndex, 'annotations', annotationIndex, 'target', 'sourceId'],
            'Bound annotation source is not present in this scene.',
            'Bind a feature from a layer in this scene or use a free anchor.',
            { sceneId: scene.id, sourceId: target.sourceId },
          ),
        );
    }
    if (annotations.length)
      capability(
        capabilities,
        'annotation.text',
        diagnostics,
        ['scenes', sceneIndex, 'annotations'],
        { sceneId: scene.id },
      );
    const media = scene.media ?? [];
    if (media.length)
      capability(capabilities, 'media.panel', diagnostics, ['scenes', sceneIndex, 'media'], {
        sceneId: scene.id,
      });
    const mediaAnchors: Compiled['scenes'][number]['mediaAnchors'] = [];
    for (const [anchorIndex, anchor] of (scene.mediaAnchors ?? []).entries()) {
      capability(
        capabilities,
        'media.anchor',
        diagnostics,
        ['scenes', sceneIndex, 'mediaAnchors', anchorIndex],
        { sceneId: scene.id, assetId: anchor.assetId },
      );
      const asset = narrative.mediaAssets.find((entry) => entry.id === anchor.assetId);
      const at = anchor.at ?? asset?.location;
      if (!at)
        diagnostics.push(
          issue(
            'REFERENCE_MISSING',
            'narrative',
            ['scenes', sceneIndex, 'mediaAnchors', anchorIndex, 'at'],
            'Media anchor has no location.',
            'Provide an explicit anchor or asset location.',
            { sceneId: scene.id, assetId: anchor.assetId },
          ),
        );
      else
        mediaAnchors.push({
          assetId: anchor.assetId,
          at,
          trigger: anchor.trigger ?? 'marker',
          ...(anchor.label ? { label: anchor.label } : {}),
        });
    }
    const controls: Compiled['scenes'][number]['controls'] = [];
    for (const [controlIndex, control] of (scene.controls ?? []).entries()) {
      const at = ['scenes', sceneIndex, 'controls', controlIndex];
      const layer = layers.find((entry) => entry.authoredLayerId === control.bindsTo.layerId);
      if (!layer) continue;
      const property = control.bindsTo.property;
      const resolvedProperty =
        property === 'visibility'
          ? 'visibility'
          : property ===
              (layer.geometry === 'point'
                ? 'circle-opacity'
                : layer.geometry === 'line'
                  ? 'line-opacity'
                  : 'fill-opacity')
            ? 'opacity'
            : property === 'circle-radius'
              ? 'radius'
              : undefined;
      const kind = control.kind;
      if (
        (kind !== 'toggle' && kind !== 'slider') ||
        !resolvedProperty ||
        (kind === 'toggle' && resolvedProperty !== 'visibility') ||
        (kind === 'slider' && resolvedProperty === 'visibility')
      )
        diagnostics.push(
          issue(
            'CAPABILITY_UNSUPPORTED',
            'narrative',
            at,
            'Control kind or binding is unsupported.',
            'Use visibility toggle, opacity slider or constant point radius slider.',
            { sceneId: scene.id, layerId: layer.authoredLayerId },
          ),
        );
      else {
        const required = `control.${resolvedProperty}` as CapabilityId;
        capability(capabilities, required, diagnostics, at, {
          sceneId: scene.id,
          layerId: layer.authoredLayerId,
        });
        const defaultValue =
          control.default ??
          (resolvedProperty === 'visibility'
            ? true
            : resolvedProperty === 'opacity'
              ? (layer.constant?.opacity ?? 1)
              : (layer.constant?.radius ?? 5));
        if (
          (resolvedProperty === 'visibility' && typeof defaultValue !== 'boolean') ||
          (resolvedProperty !== 'visibility' &&
            (typeof defaultValue !== 'number' || !Number.isFinite(defaultValue))) ||
          (kind === 'slider' &&
            (!control.range ||
              control.range[0] > control.range[1] ||
              typeof defaultValue !== 'number' ||
              defaultValue < control.range[0] ||
              defaultValue > control.range[1])) ||
          (resolvedProperty === 'opacity' &&
            typeof defaultValue === 'number' &&
            (defaultValue < 0 ||
              defaultValue > 1 ||
              (control.range !== undefined && (control.range[0] < 0 || control.range[1] > 1)))) ||
          (resolvedProperty === 'radius' &&
            typeof defaultValue === 'number' &&
            (defaultValue < 0 || (control.range !== undefined && control.range[0] < 0))) ||
          (resolvedProperty === 'radius' &&
            (layer.geometry !== 'point' ||
              contexts.get(key(scene.id, layer.authoredLayerId))?.layer.encode?.visualVariable ===
                'size'))
        )
          diagnostics.push(
            issue(
              'MEASUREMENT_INCOMPATIBLE',
              'narrative',
              at,
              'Control default, range or data-driven binding is incompatible.',
              'Use a valid in-range default and do not replace a data-driven radius.',
              { sceneId: scene.id, layerId: layer.authoredLayerId },
            ),
          );
        else
          controls.push({
            sceneId: scene.id,
            id: control.id,
            kind,
            label: control.label,
            runtimeLayerId: layer.runtimeId,
            property: resolvedProperty,
            default: defaultValue as boolean | number,
            ...(kind === 'slider' && control.range ? { range: control.range } : {}),
          });
      }
    }
    compiledScenes.push({
      id: scene.id,
      title: scene.title,
      narration: scene.narration,
      content: scene.content,
      discourse: scene.discourse,
      camera: scene.camera,
      ...(scene.transitionIn ? { transitionIn: scene.transitionIn } : {}),
      media,
      mediaAnchors,
      layers,
      annotations,
      controls,
      motion: resolveSceneMotion({
        scene,
        sceneIndex,
        ...(project.authoredMotion ? { authored: project.authoredMotion } : {}),
        layers,
        controls,
        sourceIds: project.project.resources.data.map((resource) => resource.id),
        feature: (sourceId, featureId) => {
          const match = featureMap.get(sourceId)?.find((entry) => entry.id === featureId);
          return match ? rawGeometry(project, sourceId, match.index) : undefined;
        },
        sourceGeometries: (sourceId) =>
          (featureMap.get(sourceId) ?? []).flatMap((entry) => {
            const geometry = rawGeometry(project, sourceId, entry.index);
            return geometry ? [geometry] : [];
          }),
        layout,
        capability: (id, path, ids) => capability(capabilities, id, diagnostics, path, ids),
        diagnostics,
      }),
      // Resolved below, once the scales that size the annotated symbols exist.
      callouts: [],
    });
  }

  const scales: ResolvedScale[] = [];
  const handled = new Set<string>();
  for (const scale of design.sharedScales) {
    const members: LayerContext[] = scale.members
      .map((member) => contexts.get(key(member.sceneId, member.layerId)))
      .filter((item): item is LayerContext => !!item);
    if (members.length !== scale.members.length) continue;
    const first = members[0]!;
    const color = scale.visualVariable === 'color' ? scale : undefined;
    const sameBreaks = (breaks: number[] | undefined) =>
      JSON.stringify(breaks ?? null) === JSON.stringify(color?.breaks ?? null);
    if (
      members.some((item) =>
        color
          ? item.layer.encode?.visualVariable !== 'color' ||
            item.layer.classification?.method !== color.method ||
            item.layer.classification.classes !== color.classes ||
            !sameBreaks(item.layer.classification.breaks)
          : item.layer.encode?.visualVariable !== 'size' || item.layer.classification !== undefined,
      )
    )
      diagnostics.push(
        issue(
          'MEASUREMENT_INCOMPATIBLE',
          'design',
          ['sharedScales', scale.id],
          color
            ? `Shared scale members must use the same ${color.method} color classification.`
            : 'Shared size scale members must encode size without classification.',
          color
            ? 'Align the encoding, method, classes and breaks of every member with the shared scale.'
            : 'Encode size on every member and remove member classifications.',
          { scaleId: scale.id },
        ),
      );
    members.forEach((member) => {
      handled.add(key(member.sceneId, member.layer.id));
      checkMeasurement(member, color ? 'color' : 'size', diagnostics, scale.id);
    });
    capability(
      capabilities,
      color ? CLASSIFICATION_CAPABILITY[color.method] : 'size.graduated-area',
      diagnostics,
      ['sharedScales', scale.id],
      { scaleId: scale.id },
    );
    const values = members.flatMap((member) => valuesFor(member, diagnostics, true));
    const firstDeclaration = first.resource.attributes.find(
      (entry) => entry.name === first.layer.encode?.attribute,
    );
    const input: ScaleInput = {
      id: scale.id,
      title: scale.title ?? scaleTitle(firstDeclaration, first.layer.encode?.attribute ?? scale.id),
      memberKeys: scale.members.map(
        ({ sceneId, layerId, sourceId }): ScaleKey => ({ sceneId, layerId, sourceId }),
      ),
      unit: firstDeclaration?.unit ?? null,
      values,
      palette: color?.palette ?? [],
      classes: color?.classes ?? 0,
      ...(color ? { method: color.method } : {}),
      ...(color?.breaks ? { breaks: color.breaks } : {}),
      ...(color?.domain ? { domain: color.domain } : {}),
      path: ['sharedScales', scale.id],
    };
    const resolved = resolveScale(input, color ? 'numeric-color' : 'numeric-size', diagnostics);
    if (resolved) scales.push(resolved);
  }
  for (const context of contexts.values()) {
    const { layer, resource } = context;
    if (!layer.encode || handled.has(key(context.sceneId, layer.id))) continue;
    const scaleId = context.scaleId!;
    const declaration = resource.attributes.find((entry) => entry.name === layer.encode!.attribute);
    if (!declaration) {
      diagnostics.push(
        issue(
          'REFERENCE_MISSING',
          'project',
          ['resources', 'data', resource.id, 'attributes'],
          `Encoded column ${layer.encode.attribute} is undeclared.`,
          'Declare a present source column.',
          { sceneId: context.sceneId, layerId: layer.id, sourceId: resource.id },
        ),
      );
      continue;
    }
    const kind =
      layer.encode.visualVariable === 'size'
        ? 'numeric-size'
        : layer.technique === 'categorical' || declaration.role !== 'quantity'
          ? 'category-color'
          : 'numeric-color';
    if (kind === 'numeric-color' && !layer.classification)
      diagnostics.push(
        issue(
          'CAPABILITY_UNSUPPORTED',
          'narrative',
          ['scenes', context.sceneId, 'layers', layer.id, 'classification'],
          'Numeric color needs a classification.',
          'Specify equal-interval, quantile, natural-breaks or manual classes.',
          { sceneId: context.sceneId, layerId: layer.id },
        ),
      );
    if (kind === 'numeric-size' && layer.classification)
      diagnostics.push(
        issue(
          'CAPABILITY_UNSUPPORTED',
          'narrative',
          ['scenes', context.sceneId, 'layers', layer.id, 'classification'],
          'Graduated size is continuous and cannot be classified.',
          'Remove the classification from this size encoding.',
          { sceneId: context.sceneId, layerId: layer.id },
        ),
      );
    if (kind === 'category-color' && layer.classification)
      diagnostics.push(
        issue(
          'CAPABILITY_UNSUPPORTED',
          'narrative',
          ['scenes', context.sceneId, 'layers', layer.id, 'classification'],
          'Classification is incompatible with categorical color.',
          'Remove classification and use typed categories.',
          { sceneId: context.sceneId, layerId: layer.id },
        ),
      );
    if (
      kind === 'category-color' &&
      declaration.role !== 'quantity' &&
      declaration.level !== 'nominal' &&
      declaration.level !== 'ordinal'
    )
      diagnostics.push(
        issue(
          'MEASUREMENT_INCOMPATIBLE',
          'project',
          ['resources', 'data', resource.id, 'attributes', layer.encode.attribute, 'level'],
          'Category and identifier roles require nominal or ordinal levels.',
          'Declare a compatible level or use a quantity encoding.',
          { sceneId: context.sceneId, layerId: layer.id, sourceId: resource.id },
        ),
      );
    if (kind === 'numeric-color') checkMeasurement(context, 'color', diagnostics, scaleId);
    if (kind === 'numeric-size') checkMeasurement(context, 'size', diagnostics, scaleId);
    capability(
      capabilities,
      kind === 'numeric-color'
        ? CLASSIFICATION_CAPABILITY[layer.classification?.method ?? 'equal-interval']
        : kind === 'numeric-size'
          ? 'size.graduated-area'
          : 'color.categorical',
      diagnostics,
      ['scenes', context.sceneId, 'layers', layer.id],
      { sceneId: context.sceneId, layerId: layer.id },
    );
    const input: ScaleInput = {
      id: scaleId,
      title: scaleTitle(declaration, layer.encode.attribute),
      memberKeys: [{ sceneId: context.sceneId, layerId: layer.id, sourceId: resource.id }],
      unit: declaration.unit,
      values: valuesFor(context, diagnostics, kind !== 'category-color'),
      palette: theme.palette,
      classes: layer.classification?.classes ?? 3,
      ...(layer.classification ? { method: layer.classification.method } : {}),
      ...(layer.classification?.breaks ? { breaks: layer.classification.breaks } : {}),
      path: ['features', 'properties', layer.encode.attribute],
    };
    const resolved = resolveScale(input, kind, diagnostics);
    if (resolved) scales.push(resolved);
  }

  for (const scene of compiledScenes) {
    scene.callouts = resolveSceneCallouts(
      scene.annotations,
      scene.layers,
      scales,
      (sourceId, id) => {
        const feature = featureMap.get(sourceId)?.find((entry) => entry.id === id);
        return feature && { feature, points: featurePoints(project, sourceId, feature) };
      },
    );
  }

  const resources: Compiled['resources'] = [];
  const requiredNetwork = new Set<string>();
  let basemap: Compiled['basemap'] =
    project.authoredFormat === '0.2.0' ? { provider: 'none', projection: 'mercator' } : 'neutral';
  if (project.authoredFormat === '0.2.0' && project.authoredBasemap) {
    try {
      basemap = resolveBasemap(project.authoredBasemap, options.offline, theme.colors);
      if (options.offline && project.authoredBasemap.provider !== 'none')
        diagnostics.push({
          ...issue(
            'CAPABILITY_UNSUPPORTED',
            'project',
            ['basemap'],
            'Online basemap and terrain were removed for this offline build.',
            'Keep local context layers to show geographic context offline.',
          ),
          severity: 'warning',
        });
      if (typeof basemap !== 'string' && basemap.provider !== 'none') {
        basemap.styles.forEach((entry) => requiredNetwork.add(entry.url));
        if (basemap.terrain) requiredNetwork.add(basemap.terrain.tiles);
      }
    } catch (error) {
      diagnostics.push(
        issue(
          'VALUE_INVALID',
          'project',
          ['basemap', 'style'],
          String(error),
          'Choose a style listed by mapbard capabilities.',
        ),
      );
    }
  }
  for (const resource of project.project.resources.data)
    resources.push({
      id: resource.id,
      kind: 'data',
      bundlePath: `data/${safeResourceName(resource.id)}-${resource.sha256.slice(7, 15)}.geojson`,
      // Credits list resources by name; an unnamed resource gets words, not its ID.
      name: resourceName(
        narrative.dataSources.find((source) => source.id === resource.id)?.name,
        resource.id,
      ),
      credit: resource.attribution.label,
      ...(resource.attribution.qualification
        ? { qualification: resource.attribution.qualification }
        : {}),
    });
  for (const resource of project.project.resources.media) {
    const asset = narrative.mediaAssets.find((entry) => entry.id === resource.id);
    const location =
      resource.location.type === 'url'
        ? { remoteUrl: resource.location.url }
        : {
            bundlePath: project.resolvedAssets.find((entry) => entry.id === resource.id)
              ?.bundlePath,
          };
    if (resource.location.type === 'url') requiredNetwork.add(resource.location.url);
    if (resource.location.type === 'local' && !location.bundlePath)
      diagnostics.push(
        issue(
          'RESOURCE_MISSING',
          'media',
          ['resources', 'media', resource.id],
          'Local media has no resolved bundle asset.',
          'Reload the project with this file present.',
          { assetId: resource.id },
        ),
      );
    resources.push({
      id: resource.id,
      kind: resource.kind,
      ...location,
      name: asset?.name,
      mimeType: asset?.mimeType,
      width: asset?.width,
      height: asset?.height,
      caption: asset?.caption,
      credit: asset?.credit ?? resource.attribution.label,
      qualification: resource.attribution.qualification,
      posterId: resource.posterId,
    });
  }
  const paths = new Set<string>();
  for (const resource of resources) {
    if (!resource.bundlePath) continue;
    const path = resource.bundlePath.toLowerCase();
    if (paths.has(path))
      diagnostics.push(
        issue(
          'ASSET_COLLISION',
          'compiled',
          ['resources', resource.id, 'bundlePath'],
          'Compiled resource destinations collide.',
          'Use distinct resource IDs and asset destinations.',
          resource.kind === 'data' ? { sourceId: resource.id } : { assetId: resource.id },
        ),
      );
    paths.add(path);
  }
  if (diagnostics.some((entry) => entry.severity === 'error')) return { ok: false, diagnostics };
  const candidate: Compiled = {
    compiledVersion: COMPILED_VERSION,
    contractVersions: {
      project: project.authoredFormat === '0.2.0' ? '0.2.0' : '0.1.0',
      narrative: project.authoredFormat === '0.2.0' ? '0.2.0' : '0.1.0',
      design: project.authoredFormat === '0.2.0' ? '0.2.0' : '0.1.0',
    },
    compilerVersion: COMPILER_VERSION,
    input: project.input,
    id: narrative.id,
    title: narrative.title,
    intent: narrative.intent,
    theme,
    layout,
    basemap,
    scenes: compiledScenes,
    scales,
    resources,
    requiredNetwork: [...requiredNetwork].sort(),
  };
  const parsed = CompiledSchema.safeParse(candidate);
  if (!parsed.success)
    return {
      ok: false,
      diagnostics: [
        issue(
          'VALUE_INVALID',
          'compiled',
          [],
          'Compiler output does not satisfy the compiled contract.',
          'Review the authored values and compiler mapping.',
        ),
      ],
    };
  return { ok: true, value: parsed.data, diagnostics };
}
