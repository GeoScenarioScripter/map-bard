import type { Annotation, Callout, Compiled, JsonValue, ResolvedScale } from '@mapbard/schema';
import { matchesFilter, type Feature } from './data.js';

type CompiledLayer = Compiled['scenes'][number]['layers'][number];

/**
 * Point symbol defaults of the renderer's MapLibre style (`resolved-style.ts`): a constant
 * point radius and the halo stroke drawn around every circle. A renderer test checks both.
 */
export const POINT_SYMBOL_RADIUS = 7;
export const POINT_SYMBOL_STROKE = 1;

/** A feature of a compiled source with its point positions (none for lines and polygons). */
export type PointFeature = { feature: Feature; points: [number, number][] };
export type PointLookup = (sourceId: string, featureId: string) => PointFeature | undefined;

const round = (value: number) => Math.round(value * 100) / 100;

/** Drawn radius of one point feature in one layer, as the renderer's circle-radius paint resolves it. */
export function pointSymbolRadius(
  layer: CompiledLayer,
  scale: ResolvedScale | undefined,
  properties: Record<string, JsonValue>,
): number {
  let radius = layer.constant?.radius ?? POINT_SYMBOL_RADIUS;
  if (scale?.kind === 'numeric-size' && layer.attribute) {
    const value = properties[layer.attribute];
    const [min, max] = scale.domain;
    const [low, high] = scale.radiusRange;
    radius =
      typeof value !== 'number' || !Number.isFinite(value)
        ? scale.noDataRadius
        : min === max
          ? high
          : low + (high - low) * Math.sqrt(value / max);
  }
  return round(radius + POINT_SYMBOL_STROKE);
}

/**
 * Resolve a scene's annotations into callouts: the label text, its anchor, a placement
 * priority (authored order) and the drawn point symbols it refers to. A feature drawn by
 * several point layers keeps its largest symbol; filtered-out features draw nothing.
 */
export function resolveSceneCallouts(
  annotations: readonly Annotation[],
  layers: readonly CompiledLayer[],
  scales: readonly ResolvedScale[],
  lookup: PointLookup,
): Callout[] {
  return annotations.map((annotation, priority) => {
    const targets: Callout['targets'] = [];
    const target = annotation.target;
    if (target.kind === 'features') {
      const drawing = layers.filter(
        (layer) => layer.geometry === 'point' && layer.sourceId === target.sourceId,
      );
      for (const featureId of target.featureIds) {
        const found = lookup(target.sourceId, featureId);
        if (!found) continue;
        let radius: number | undefined;
        for (const layer of drawing) {
          if (layer.filter && !matchesFilter(found.feature, layer.filter)) continue;
          const scale = scales.find((item) => item.id === layer.scaleId);
          const drawn = pointSymbolRadius(layer, scale, found.feature.properties);
          radius = Math.max(radius ?? 0, drawn);
        }
        if (radius === undefined) continue;
        for (const at of found.points) targets.push({ at: [at[0], at[1]], radius });
      }
    }
    return {
      id: annotation.id,
      text: annotation.text,
      anchor: [annotation.at[0], annotation.at[1]],
      priority,
      targets,
    };
  });
}
