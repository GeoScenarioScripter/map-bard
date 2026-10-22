import type { ResolvedScale } from '@mapbard/schema';
import type { CompiledLayer } from './types.js';

export type Expression = unknown[];

function numericValue(attribute: string): Expression {
  return ['get', attribute];
}

function validNumber(attribute: string): Expression {
  return ['==', ['typeof', numericValue(attribute)], 'number'];
}

/** Compiled edges and categories are authoritative; this module never scans data. */
export function scalePaint(scale: ResolvedScale, attribute: string): Expression | string {
  const value = numericValue(attribute);
  if (scale.kind === 'category-color') {
    if (scale.categories.length === 0) return scale.noDataColor;
    const cases: unknown[] = [];
    for (const category of scale.categories) {
      cases.push(['==', value, ['literal', category.value]], category.color);
    }
    return ['case', ...cases, scale.noDataColor];
  }
  if (scale.kind === 'numeric-color') {
    const stops: unknown[] = [];
    for (let index = 1; index < scale.colors.length; index++) {
      stops.push(scale.edges[index], scale.colors[index]);
    }
    const color: unknown =
      stops.length === 0 ? scale.colors[0] : ['step', value, scale.colors[0], ...stops];
    return ['case', validNumber(attribute), color, scale.noDataColor];
  }
  const [min, max] = scale.domain;
  const [lowRadius, highRadius] = scale.radiusRange;
  const radius: unknown =
    min === max
      ? highRadius
      : ['+', lowRadius, ['*', highRadius - lowRadius, ['sqrt', ['/', value, max]]]];
  return ['case', validNumber(attribute), radius, scale.noDataRadius];
}

/** Constant point radius and the halo stroke around every circle, in CSS pixels. */
export const POINT_RADIUS = 7;
export const POINT_STROKE = 1;

type Properties = Record<string, unknown>;

/** The typed comparison filter, evaluated as the MapLibre filter expression evaluates it. */
export function matchesLayerFilter(
  filter: CompiledLayer['filter'],
  properties: Properties,
): boolean {
  if (!filter) return true;
  const actual = properties[filter.attribute];
  if (typeof actual !== typeof filter.value) return false;
  const value = filter.value;
  switch (filter.op) {
    case '==':
      return actual === value;
    case '!=':
      return actual !== value;
    case '<':
      return (actual as number) < (value as number);
    case '<=':
      return (actual as number) <= (value as number);
    case '>':
      return (actual as number) > (value as number);
    case '>=':
      return (actual as number) >= (value as number);
  }
}

/**
 * Outer radius (fill plus stroke) of one drawn point, matching the circle-radius paint below.
 * Callout placement uses it to keep labels off symbols; `radius` overrides a constant radius
 * the way a radius control does.
 */
export function pointRadius(
  layer: CompiledLayer,
  scale: ResolvedScale | undefined,
  properties: Properties,
  radius = layer.constant?.radius ?? POINT_RADIUS,
): number {
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
  return radius + POINT_STROKE;
}

export function layerStyle(
  layer: CompiledLayer,
  scale?: ResolvedScale,
  accent = '#0b3d91',
  halo = '#ffffff',
) {
  const type: 'circle' | 'line' | 'fill' =
    layer.geometry === 'point' ? 'circle' : layer.geometry === 'line' ? 'line' : 'fill';
  const color =
    scale && scale.kind !== 'numeric-size' && layer.attribute
      ? scalePaint(scale, layer.attribute)
      : (layer.constant?.color ?? accent);
  const opacity = layer.constant?.opacity ?? 0.85;
  const paint: Record<string, unknown> =
    type === 'circle'
      ? {
          'circle-color':
            scale?.kind === 'numeric-size' && layer.attribute
              ? [
                  'case',
                  validNumber(layer.attribute),
                  layer.constant?.color ?? accent,
                  scale.noDataColor,
                ]
              : color,
          'circle-radius':
            scale?.kind === 'numeric-size' && layer.attribute
              ? scalePaint(scale, layer.attribute)
              : (layer.constant?.radius ?? POINT_RADIUS),
          'circle-opacity': opacity,
          'circle-stroke-color': halo,
          'circle-stroke-width': POINT_STROKE,
        }
      : type === 'line'
        ? { 'line-color': color, 'line-width': 2.5, 'line-opacity': opacity }
        : {
            'fill-color': color,
            'fill-opacity': opacity,
            'fill-outline-color': layer.outline ?? halo,
          };
  // Every bound filter is compiler-resolved to one of six typed operators.
  const filter = layer.filter
    ? [
        'all',
        ['==', ['typeof', ['get', layer.filter.attribute]], typeof layer.filter.value],
        [layer.filter.op, ['get', layer.filter.attribute], layer.filter.value],
      ]
    : undefined;
  // Graduated circles draw largest first, so overlapping small symbols stay visible.
  const sortKey =
    type === 'circle' && scale?.kind === 'numeric-size' && layer.attribute
      ? {
          'circle-sort-key': [
            'case',
            validNumber(layer.attribute),
            ['-', 0, numericValue(layer.attribute)],
            1,
          ],
        }
      : {};
  return {
    id: layer.runtimeId,
    type,
    source: layer.sourceId,
    paint,
    layout: { visibility: 'visible', ...sortKey },
    ...(filter ? { filter } : {}),
  };
}
