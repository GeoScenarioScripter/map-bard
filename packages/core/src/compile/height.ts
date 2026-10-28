import { humanizeId, type CapabilityId } from '@mapbard/knowledge';
import type { Diagnostic, ResolvedScale, V2Technique } from '@mapbard/schema';
import {
  applyMorph,
  defaultColumnRadius,
  defaultMorphTrack,
  derivedData,
  derivedSourceId,
  drawnFeatures,
  featureRows,
  moduleIssue,
  requireContext,
  resolveMorph,
} from './change.js';
import { numericColorScale, type ClassificationMethod } from './scales.js';
import type { TechniqueCompiler, TechniqueInput, TechniqueOutput } from './techniques.js';

// Columns and extrusions (step 5.2, M): MapLibre `fill-extrusion` on the numeric-height scale.

export const HEIGHT_READY: readonly V2Technique[] = ['column', 'extrusion'];

const CLASSIFICATION_CAPABILITY: Record<ClassificationMethod, CapabilityId> = {
  'equal-interval': 'color.equal-interval',
  quantile: 'color.quantile',
  'natural-breaks': 'color.natural-breaks',
  manual: 'color.manual-breaks',
};

function needsHeight(input: TechniqueInput): Diagnostic | undefined {
  if (input.layer.encode?.visualVariable === 'height') return undefined;
  return moduleIssue(
    input,
    'CAPABILITY_UNSUPPORTED',
    [...input.path, 'encode'],
    `A ${input.layer.technique} needs a height encoding.`,
    'Encode a nonnegative ratio quantity as height, for example "visualVariable": "height".',
  );
}

/** A transition's derived source and morph fields, shared by columns and extrusions. */
function withMorph(input: TechniqueInput, output: TechniqueOutput): TechniqueOutput {
  if (!input.layer.transition) return output;
  const morph = resolveMorph(input);
  if (morph.diagnostics.length || !morph.from) return { diagnostics: morph.diagnostics };
  const attribute = input.layer.encode!.attribute;
  const id = derivedSourceId('morph', input.sceneId, input.layer.id);
  const rows = applyMorph(
    featureRows(input, drawnFeatures(input)),
    morph.from,
    attribute,
    morph.attribute!,
  );
  const inputs = [{ sourceId: input.resource.id, sha256: input.resource.sha256 }];
  if (morph.input!.sourceId !== input.resource.id) inputs.push(morph.input!);
  return {
    ...output,
    // The derived source holds only drawn features (and old ones fading out), so no filter.
    layer: { ...output.layer, sourceId: id, morph: morph.compiled!, filter: undefined },
    derived: [
      ...(output.derived ?? []),
      {
        id,
        kind: 'morph',
        inputs,
        parameters: { attribute, from: morph.compiled!.from, fromAttribute: morph.attribute! },
        data: derivedData(rows),
      },
    ],
    defaultTracks: [...(output.defaultTracks ?? []), defaultMorphTrack()],
  };
}

export const compileColumn: TechniqueCompiler = (input) => {
  const context = requireContext(input);
  context.capability('height.column', [...input.path, 'technique']);
  const missing = needsHeight(input);
  if (missing) return { diagnostics: [missing] };
  const radiusMeters = input.layer.column?.radiusMeters ?? defaultColumnRadius(input);
  return withMorph(input, { diagnostics: [], layer: { column: { radiusMeters } } });
};

export const compileExtrusion: TechniqueCompiler = (input) => {
  const context = requireContext(input);
  const { layer, resource, path } = input;
  context.capability('height.extrusion', [...path, 'technique']);
  const missing = needsHeight(input);
  if (missing) return { diagnostics: [missing] };
  const attribute = layer.encode!.attribute;
  const declaration = resource.attributes.find((entry) => entry.name === attribute);
  // Undeclared attributes are reported by the compiler's own encoding checks.
  if (!declaration) return { diagnostics: [] };
  // Extruding an extensive count makes big areas tall: like a choropleth, it needs a ratio
  // already normalised by a declared denominator.
  const denominator = declaration.denominator;
  if (!denominator || declaration.level !== 'ratio' || declaration.role !== 'quantity')
    return {
      diagnostics: [
        moduleIssue(
          input,
          'MEASUREMENT_REQUIRED',
          ['resources', 'data', resource.id, 'attributes'],
          `Extruded ${attribute} needs a ratio quantity with a declared denominator, so tall means dense rather than big.`,
          'Declare an already-normalised ratio (for example people per km²) and its denominator, or use columns at points.',
          {},
          'project',
        ),
      ],
    };
  const denominatorAttribute = context.project.project.resources.data
    .find((entry) => entry.id === denominator.sourceId)
    ?.attributes.find((entry) => entry.name === denominator.attribute);
  if (
    !denominatorAttribute ||
    denominatorAttribute.observedType !== 'number' ||
    denominatorAttribute.role !== 'quantity'
  )
    return {
      diagnostics: [
        moduleIssue(
          input,
          'REFERENCE_MISSING',
          ['resources', 'data', resource.id, 'attributes', attribute, 'denominator'],
          'Denominator reference has no numeric quantity declaration.',
          'Reference a declared numeric denominator source and attribute.',
          {},
          'project',
        ),
      ],
    };
  const output: TechniqueOutput = { diagnostics: [], layer: {} };
  const classification = layer.classification;
  if (classification) {
    // Colour classes of the same attribute, beside the height scale.
    context.capability(CLASSIFICATION_CAPABILITY[classification.method], [
      ...path,
      'classification',
    ]);
    const id = `mb-scale-color:${input.sceneId.length}:${input.sceneId}:${layer.id.length}:${layer.id}`;
    const result = numericColorScale({
      id,
      title: declaration.label ?? humanizeId(attribute),
      memberKeys: [{ sceneId: input.sceneId, layerId: layer.id, sourceId: resource.id }],
      unit: declaration.unit,
      values: drawnFeatures(input).map((feature) => feature.properties[attribute]),
      palette: context.theme.palette,
      classes: classification.classes,
      method: classification.method,
      ...(classification.breaks ? { breaks: classification.breaks } : {}),
      path: ['features', 'properties', attribute],
    });
    output.diagnostics.push(...result.diagnostics);
    if (result.scale) {
      output.scales = [result.scale as ResolvedScale];
      output.layer = { colorScaleId: id };
    }
  }
  return withMorph(input, output);
};
