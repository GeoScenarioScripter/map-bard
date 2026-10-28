import { formatNumber, formatUnit, humanizeId } from '@mapbard/knowledge';
import {
  CHANGE_SIGNS,
  type Callout,
  type ChangeSign,
  type CompiledChange,
  type CompiledMorph,
  type DataResource,
  type DerivedSource,
  type Diagnostic,
  type JsonValue,
  type LayerBinding,
  type LayerTrack,
  type ResolvedScale,
  type V2Technique,
} from '@mapbard/schema';
import { featurePoints, matchesFilter, parseLegacyFilter, type Feature } from './data.js';
import { POINT_SYMBOL_RADIUS, POINT_SYMBOL_STROKE } from './callouts.js';
import type {
  TechniqueCompiler,
  TechniqueContext,
  TechniqueInput,
  TechniqueOutput,
} from './techniques.js';

// Change symbols and morph values (step 5.2, M). Signed and percent change are computed here at
// compile time, from two declared observations matched by feature ID, until M3 moves the
// operation into lockfile results with the same definition.

export const CHANGE_READY: readonly V2Technique[] = ['change'];

/** Properties the compiler adds to a derived source; authored columns keep their own names. */
export const DERIVED_PROPERTIES = {
  before: 'mb:before',
  change: 'mb:change',
  percent: 'mb:percent',
  sign: 'mb:sign',
  from: 'mb:from',
  fade: 'mb:fade',
} as const;

const keyOf = (sceneId: string, layerId: string) =>
  `${sceneId.length}:${sceneId}:${layerId.length}:${layerId}`;

/** A derived source's ID; the prefix keeps it apart from every data resource ID. */
export function derivedSourceId(kind: DerivedSource['kind'], sceneId: string, layerId: string) {
  return `mb-derived:${kind}:${keyOf(sceneId, layerId)}`;
}

export function moduleIssue(
  input: Pick<TechniqueInput, 'ids'>,
  code: Diagnostic['code'],
  path: Diagnostic['path'],
  message: string,
  remedy: string,
  extra: Diagnostic['ids'] = {},
  artifact: Diagnostic['artifact'] = 'narrative',
): Diagnostic {
  return {
    code,
    severity: 'error',
    artifact,
    path,
    ids: { ...input.ids, ...extra },
    message,
    remedy,
  };
}

export function requireContext(input: TechniqueInput): TechniqueContext {
  if (!input.context) throw new Error(`Layer ${input.layer.id} was compiled without its context`);
  return input.context;
}

export const finiteNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

/** The raw GeoJSON geometry of a checked feature, copied into a derived source. */
export function rawGeometry(context: TechniqueContext, sourceId: string, index: number): unknown {
  const data = context.project.dataMap[sourceId];
  if (!data || Array.isArray(data) || typeof data !== 'object' || !Array.isArray(data.features))
    return null;
  const feature = data.features[index];
  if (!feature || Array.isArray(feature) || typeof feature !== 'object') return null;
  return feature.geometry ?? null;
}

/** One feature of a derived source before it is written: its key, geometry and properties. */
export type DerivedRow = {
  key: string;
  geometry: unknown;
  properties: Record<string, JsonValue>;
};

export function derivedData(rows: readonly DerivedRow[]): DerivedSource['data'] {
  return {
    type: 'FeatureCollection',
    features: rows.map((row) => ({
      type: 'Feature',
      id: row.key,
      geometry: row.geometry,
      properties: row.properties,
    })),
  };
}

/** The drawn features of the layer's own source: those its checked filter keeps. */
export function drawnFeatures(input: TechniqueInput): Feature[] {
  const filter = input.context?.filter;
  return input.features.filter((feature) => matchesFilter(feature, filter));
}

export function featureRows(input: TechniqueInput, features: readonly Feature[]): DerivedRow[] {
  const context = requireContext(input);
  return features.map((feature) => ({
    key: feature.id,
    geometry: rawGeometry(context, input.resource.id, feature.index),
    properties: { ...feature.properties },
  }));
}

// ---- change ----

export type ChangeValue = {
  before: number;
  after: number;
  /** after − before, in the attribute's unit. */
  change: number;
  /** (after − before) / before × 100; null when before is 0. */
  percent: number | null;
  sign: -1 | 0 | 1;
};

/** The change operation: signed and percent change of one feature between two observations. */
export function changeValue(before: number, after: number): ChangeValue {
  const change = after - before;
  return {
    before,
    after,
    change,
    percent: before === 0 ? null : (change / Math.abs(before)) * 100,
    sign: change < 0 ? -1 : change > 0 ? 1 : 0,
  };
}

const MINUS = '−';

function signed(value: number, text: string): string {
  return value < 0 ? `${MINUS}${text}` : value > 0 ? `+${text}` : text;
}

/** Compiled change label, for example "−21,580 ft³/s (−91%)"; a zero before drops the percentage. */
export function changeLabel(value: ChangeValue, unit: string | null): string {
  if (value.sign === 0) return 'No change';
  const amount = signed(value.change, formatNumber(Math.abs(value.change)));
  const withUnit = unit ? `${amount} ${formatUnit(unit)}` : amount;
  if (value.percent === null) return withUnit;
  const magnitude = Math.abs(value.percent);
  const percent = magnitude < 1 ? '<1' : formatNumber(Math.round(magnitude));
  return `${withUnit} (${signed(value.percent, percent)}%)`;
}

const SIGN_NAME: Record<ChangeValue['sign'], ChangeSign> = {
  [-1]: 'decrease',
  1: 'increase',
  0: 'unchanged',
};

/** The legend name of an observation: its observation label, else its source name. */
export function observationLabel(
  context: TechniqueContext,
  resource: DataResource,
  sceneId: string,
): string {
  for (const scale of context.project.design.sharedScales)
    for (const member of scale.members)
      if (member.sourceId === resource.id && member.sceneId === sceneId)
        return member.observationLabel;
  if (resource.observationLabel) return resource.observationLabel;
  for (const scale of context.project.design.sharedScales)
    for (const member of scale.members)
      if (member.sourceId === resource.id) return member.observationLabel;
  const source = context.project.narrative.dataSources.find((item) => item.id === resource.id);
  return source?.name && source.name !== resource.id ? source.name : humanizeId(resource.id);
}

/** The scale a layer is drawn on: the one listing it among its members. */
export function layerScale(
  scales: readonly ResolvedScale[],
  sceneId: string,
  layerId: string,
  kinds: readonly ResolvedScale['kind'][],
): ResolvedScale | undefined {
  return scales.find(
    (scale) =>
      kinds.includes(scale.kind) &&
      scale.memberKeys.some((member) => member.sceneId === sceneId && member.layerId === layerId),
  );
}

/** Outer radius of a circle on a size scale, as the player draws it (fill plus stroke). */
function sizeRadius(scale: Extract<ResolvedScale, { kind: 'numeric-size' }>, value: number) {
  const [min, max] = scale.domain;
  const [low, high] = scale.radiusRange;
  const radius = min === max ? high : low + (high - low) * Math.sqrt(Math.max(0, value) / max);
  return Math.round((radius + POINT_SYMBOL_STROKE) * 100) / 100;
}

export const compileChange: TechniqueCompiler = (input) => {
  const context = requireContext(input);
  const { layer, resource, path } = input;
  const diagnostics: Diagnostic[] = [];
  const fail = (
    code: Diagnostic['code'],
    where: Diagnostic['path'],
    message: string,
    remedy: string,
    extra: Diagnostic['ids'] = {},
    artifact: Diagnostic['artifact'] = 'narrative',
  ) => diagnostics.push(moduleIssue(input, code, where, message, remedy, extra, artifact));
  context.capability('change.symbol', [...path, 'technique']);
  const form = layer.encode?.visualVariable;
  if (form !== 'size' && form !== 'height') {
    fail(
      'CAPABILITY_UNSUPPORTED',
      [...path, 'encode'],
      'A change layer needs a size or height encoding.',
      'Encode the compared quantity as size (ring and disc) or height (ghost and solid column).',
    );
    return { diagnostics };
  }
  const attribute = layer.encode!.attribute;
  const compare = layer.compare;
  if (!compare) {
    fail(
      'VALUE_INVALID',
      [...path, 'compare'],
      'A change layer needs compare.sourceId, the observation it compares with.',
      'Add "compare": { "sourceId": "<earlier source>" } to the layer.',
    );
    return { diagnostics };
  }
  const compared = context.project.project.resources.data.find(
    (entry) => entry.id === compare.sourceId,
  );
  if (!compared || compared.id === resource.id) {
    fail(
      compared ? 'VALUE_INVALID' : 'REFERENCE_MISSING',
      [...path, 'compare', 'sourceId'],
      compared
        ? `Change layer ${layer.id} compares source ${resource.id} with itself.`
        : `Compared source ${compare.sourceId} is not a registered data resource.`,
      'Compare with another registered observation of the same attribute.',
      { sourceId: compare.sourceId },
    );
    return { diagnostics };
  }
  const own = resource.attributes.find((entry) => entry.name === attribute);
  const theirs = compared.attributes.find((entry) => entry.name === attribute);
  if (own && (!theirs || theirs.unit !== own.unit)) {
    fail(
      'MEASUREMENT_INCOMPATIBLE',
      [...path, 'compare', 'sourceId'],
      theirs
        ? `${attribute} is in ${theirs.unit ?? 'no unit'} in ${compared.id} but ${own.unit ?? 'no unit'} in ${resource.id}.`
        : `Compared source ${compared.id} does not declare ${attribute}.`,
      'Declare the attribute with the same unit in both sources.',
      { sourceId: compared.id },
    );
    return { diagnostics };
  }
  // Undeclared attributes are reported by the compiler's own encoding checks.
  if (!own) return { diagnostics };
  const drawn = drawnFeatures(input);
  const before = new Map(context.featuresOf(compared.id).map((feature) => [feature.id, feature]));
  const missing = drawn.filter((feature) => !before.has(feature.id)).map((feature) => feature.id);
  if (missing.length) {
    const shown = missing.slice(0, 10).join(', ') + (missing.length > 10 ? ', …' : '');
    fail(
      'REFERENCE_MISSING',
      [...path, 'compare', 'sourceId'],
      `${missing.length} drawn feature${missing.length === 1 ? ' has' : 's have'} no match in ${compared.id}: ${shown}.`,
      'Compare sources that share feature IDs, or filter the layer to the matched features.',
      { sourceId: compared.id, featureId: missing[0]! },
    );
    return { diagnostics };
  }
  const values = new Map<string, ChangeValue>();
  for (const feature of drawn) {
    const after = finiteNumber(feature.properties[attribute]);
    const earlier = finiteNumber(before.get(feature.id)!.properties[attribute]);
    if (after === undefined || earlier === undefined) {
      fail(
        'VALUE_INVALID',
        ['features', feature.index, 'properties', attribute],
        `Feature ${feature.id} needs a number for ${attribute} in both ${compared.id} and ${resource.id}.`,
        'Supply both observations, or filter the feature out of the change layer.',
        { featureId: feature.id, sourceId: after === undefined ? resource.id : compared.id },
        'data',
      );
      continue;
    }
    values.set(feature.id, changeValue(earlier, after));
  }
  if (diagnostics.length) return { diagnostics };

  let rows: DerivedRow[] = featureRows(input, drawn).map((row) => {
    const value = values.get(row.key)!;
    return {
      ...row,
      properties: {
        ...row.properties,
        [DERIVED_PROPERTIES.before]: value.before,
        [DERIVED_PROPERTIES.change]: value.change,
        [DERIVED_PROPERTIES.percent]: value.percent,
        [DERIVED_PROPERTIES.sign]: value.sign,
      },
    };
  });
  const morph = layer.transition ? resolveMorph(input) : undefined;
  if (morph?.diagnostics.length) return { diagnostics: morph.diagnostics };
  if (morph?.from) rows = applyMorph(rows, morph.from, attribute, morph.attribute!, true);

  const { diverging } = context.theme.ramps;
  const occurring = new Set([...values.values()].map((value) => SIGN_NAME[value.sign]));
  const change: CompiledChange = {
    form,
    beforeAttribute: DERIVED_PROPERTIES.before,
    signAttribute: DERIVED_PROPERTIES.sign,
    before: { sourceId: compared.id, label: observationLabel(context, compared, input.sceneId) },
    after: { sourceId: resource.id, label: observationLabel(context, resource, input.sceneId) },
    colors: {
      decrease: diverging[0]!,
      increase: diverging[diverging.length - 1]!,
      unchanged: context.theme.colors.muted,
    },
    signs: CHANGE_SIGNS.filter((sign) => occurring.has(sign)),
  };
  const id = derivedSourceId('change', input.sceneId, layer.id);
  const callouts: Callout[] = layer.compare?.labels
    ? drawn.map((feature) => {
        const value = values.get(feature.id)!;
        const points = featurePoints(context.project, resource.id, feature);
        return {
          id: `mb-change:${layer.id}:${feature.id}`,
          text: changeLabel(value, own.unit),
          anchor: points[0]!,
          // Placed after the author's callouts; compile.ts renumbers the priority.
          priority: 0,
          targets: points.map((at) => ({ at, radius: POINT_SYMBOL_RADIUS + POINT_SYMBOL_STROKE })),
          generated: {
            operation: 'change',
            inputs: [
              { sourceId: compared.id, featureId: feature.id, attribute, value: value.before },
              { sourceId: resource.id, featureId: feature.id, attribute, value: value.after },
            ],
          },
        };
      })
    : [];
  const output: TechniqueOutput = {
    diagnostics,
    layer: {
      sourceId: id,
      // The derived source holds only the drawn features, so the filter is already applied.
      filter: undefined,
      change,
      ...(form === 'height'
        ? { column: { radiusMeters: layer.column?.radiusMeters ?? defaultColumnRadius(input) } }
        : {}),
      ...(morph?.compiled ? { morph: morph.compiled } : {}),
    },
    derived: [
      {
        id,
        kind: 'change',
        inputs: [
          { sourceId: compared.id, sha256: compared.sha256 },
          { sourceId: resource.id, sha256: resource.sha256 },
          ...(morph?.input && morph.input.sourceId !== compared.id ? [morph.input] : []),
        ],
        parameters: {
          attribute,
          before: compared.id,
          after: resource.id,
          change: 'after - before',
          percent: '(after - before) / |before| * 100; null when before is 0',
          ...(morph?.compiled ? { morphFrom: morph.compiled.from } : {}),
        },
        data: derivedData(rows),
      },
    ],
    callouts,
    // The layer draws its before-values too, so its own scale spans them.
    scaleValues: [...values.values()].map((value) => value.before),
    ...(morph?.compiled ? { defaultTracks: [defaultMorphTrack()] } : {}),
    afterScales: (scales) => {
      const scale = layerScale(scales, input.sceneId, layer.id, ['numeric-size', 'numeric-height']);
      if (!scale || (scale.kind !== 'numeric-size' && scale.kind !== 'numeric-height')) return [];
      // Ring sizes can only be known once the size scale exists.
      if (scale.kind === 'numeric-size')
        for (const callout of callouts) {
          const value = values.get(callout.generated!.inputs[0]!.featureId)!;
          const radius = Math.max(sizeRadius(scale, value.before), sizeRadius(scale, value.after));
          callout.targets = callout.targets.map((target) => ({ ...target, radius }));
        }
      const top = scale.domain[1];
      const outside = [...values].filter(([, value]) => value.before > top).map(([key]) => key);
      if (!outside.length) return [];
      return [
        moduleIssue(
          input,
          'SCALE_INCONSISTENT',
          [...path, 'compare'],
          `${outside.length} before-value${outside.length === 1 ? '' : 's'} from ${compared.id} exceed${outside.length === 1 ? 's' : ''} the top of scale ${scale.id} (${formatNumber(top)}), so the ${form === 'size' ? 'rings' : 'ghost columns'} would be clipped.`,
          `Add the layer that draws ${compared.id} to the same shared ${form} scale as ${layer.id}, so before and after use one mapping.`,
          { scaleId: scale.id, featureId: outside[0]! },
        ),
      ];
    },
  };
  return output;
};

// ---- morph ----

/** Technique families a transition may morph between. */
const FAMILY: Partial<Record<LayerBinding['technique'], string>> = {
  column: 'column',
  change: 'column',
  extrusion: 'extrusion',
  hexbin: 'hexbin',
};

type MorphFrom = Map<string, { value: number | null; row: DerivedRow }>;

/** The layer a transition morphs from, checked, with its values by feature ID. */
export function resolveMorph(input: TechniqueInput): {
  diagnostics: Diagnostic[];
  from?: MorphFrom;
  attribute?: string;
  compiled?: CompiledMorph;
  input?: { sourceId: string; sha256: string };
} {
  const context = requireContext(input);
  const { layer, path } = input;
  const transition = layer.transition!;
  const at = [...path, 'transition', 'from'];
  const problem = (
    code: Diagnostic['code'],
    where: string,
    message: string,
    remedy: string,
    extra: Diagnostic['ids'] = {},
  ) => ({ diagnostics: [moduleIssue(input, code, [...at, where], message, remedy, extra)] });
  if (!context.capability('motion.morph', [...path, 'transition'])) return { diagnostics: [] };
  if (layer.technique === 'hexbin')
    return problem(
      'CAPABILITY_UNSUPPORTED',
      'sceneId',
      'Hexbin transitions are not compiled in this version.',
      'Show the two periods as separate hexbin scenes on one manual classification.',
    );
  const fromSceneId = transition.from.sceneId;
  const fromLayerId = transition.from.layerId ?? layer.id;
  const scene = context.project.narrative.scenes.find((item) => item.id === fromSceneId);
  if (!scene)
    return problem(
      'REFERENCE_MISSING',
      'sceneId',
      `Transition source scene ${fromSceneId} does not exist.`,
      'Name an earlier scene of this story.',
    );
  if (fromSceneId === input.sceneId)
    return problem(
      'VALUE_INVALID',
      'sceneId',
      `Layer ${layer.id} cannot transition from its own scene.`,
      'Name the earlier scene whose values this layer morphs from.',
    );
  const fromLayer = scene.layers.find((item) => item.id === fromLayerId);
  if (!fromLayer)
    return problem(
      'REFERENCE_MISSING',
      'layerId',
      `Scene ${fromSceneId} has no layer ${fromLayerId}.`,
      'Set transition.from.layerId to a layer of that scene.',
    );
  if (FAMILY[fromLayer.technique] !== FAMILY[layer.technique])
    return problem(
      'SCALE_INCONSISTENT',
      'layerId',
      `Layer ${layer.id} (${layer.technique}) cannot morph from ${fromLayerId} (${fromLayer.technique}).`,
      'Morph between layers of one family: columns and change columns, or extrusions.',
    );
  const scale = context.sharedScaleOf(input.sceneId, layer.id);
  if (!scale || scale !== context.sharedScaleOf(fromSceneId, fromLayerId))
    return problem(
      'SCALE_INCONSISTENT',
      'sceneId',
      `Layer ${layer.id} and ${fromSceneId}/${fromLayerId} are not on one shared scale, so a morph would change the mapping mid-move.`,
      'Add both layers to one shared height (or size) scale.',
      scale ? { scaleId: scale } : {},
    );
  const fromResource = context.project.project.resources.data.find(
    (item) => item.id === fromLayer.dataSourceId,
  );
  const fromAttribute = fromLayer.encode?.attribute;
  if (!fromResource || !fromAttribute) return { diagnostics: [] };
  // Format 0.2 typed filters live in the design; format 0.1 kept a legacy string.
  const filter =
    context.project.design.scenes
      .find((item) => item.sceneId === fromSceneId)
      ?.layers.find((item) => item.layerId === fromLayerId)?.filter ??
    (fromLayer.filter ? parseLegacyFilter(fromLayer.filter) : undefined);
  const from: MorphFrom = new Map();
  for (const feature of context.featuresOf(fromResource.id)) {
    if (!matchesFilter(feature, filter)) continue;
    from.set(feature.id, {
      value: finiteNumber(feature.properties[fromAttribute]) ?? null,
      row: {
        key: feature.id,
        geometry: rawGeometry(context, fromResource.id, feature.index),
        properties: { ...feature.properties },
      },
    });
  }
  return {
    diagnostics: [],
    from,
    attribute: fromAttribute,
    compiled: {
      from: { sceneId: fromSceneId, layerId: fromLayerId },
      fromAttribute: DERIVED_PROPERTIES.from,
      fadeAttribute: DERIVED_PROPERTIES.fade,
    },
    input: { sourceId: fromResource.id, sha256: fromResource.sha256 },
  };
}

/**
 * Join the from-values onto the layer's rows: matched features morph from their old value,
 * new ones grow from 0, and features only in the old layer shrink to 0 and fade out.
 */
export function applyMorph(
  rows: readonly DerivedRow[],
  from: MorphFrom,
  attribute: string,
  fromAttribute: string,
  change = false,
): DerivedRow[] {
  const seen = new Set(rows.map((row) => row.key));
  const joined = rows.map((row) => ({
    ...row,
    properties: {
      ...row.properties,
      [DERIVED_PROPERTIES.from]: from.get(row.key)?.value ?? 0,
      [DERIVED_PROPERTIES.fade]: 0,
    },
  }));
  for (const [key, old] of from) {
    if (seen.has(key)) continue;
    joined.push({
      key,
      geometry: old.row.geometry,
      properties: {
        ...old.row.properties,
        [attribute]: 0,
        ...(attribute !== fromAttribute ? { [fromAttribute]: old.value } : {}),
        [DERIVED_PROPERTIES.from]: old.value ?? 0,
        [DERIVED_PROPERTIES.fade]: 1,
        ...(change
          ? {
              [DERIVED_PROPERTIES.before]: null,
              [DERIVED_PROPERTIES.change]: null,
              [DERIVED_PROPERTIES.percent]: null,
              [DERIVED_PROPERTIES.sign]: 0,
            }
          : {}),
      },
    });
  }
  return joined;
}

/** A transition's morph: played once from the trigger, 1,200 ms, ease-in-out. */
export function defaultMorphTrack(): Omit<LayerTrack, 'runtimeLayerId'> {
  return {
    mode: 'play',
    range: [0, 1],
    durationMs: 1200,
    property: 'morph',
    keyframes: [
      { at: 0, value: 0, easing: 'linear' },
      { at: 1, value: 1, easing: 'ease-in-out' },
    ],
    final: 1,
  };
}

/** Ground metres per CSS pixel of a MapLibre camera (512-pixel tiles) at a latitude. */
export function groundMetresPerPixel(zoom: number, latitude: number): number {
  return (40075016.686 * Math.cos((latitude * Math.PI) / 180)) / (512 * 2 ** zoom);
}

/** Default column radius: 6 px at the scene's camera, to two significant figures. */
export function defaultColumnRadius(input: TechniqueInput): number {
  const camera = requireContext(input).project.narrative.scenes.find(
    (scene) => scene.id === input.sceneId,
  )!.camera;
  const metres = groundMetresPerPixel(camera.zoom, camera.center[1]) * 6;
  const step = 10 ** (Math.floor(Math.log10(metres)) - 1);
  return Math.max(1, Math.round(metres / step) * step);
}
