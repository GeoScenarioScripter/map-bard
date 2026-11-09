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
  if (scale.kind === 'numeric-height' || scale.kind === 'numeric-width')
    throw new Error(`No paint for a ${scale.kind} scale yet (${scale.id})`);
  const [min, max] = scale.domain;
  const [lowRadius, highRadius] = scale.radiusRange;
  const radius: unknown =
    min === max
      ? highRadius
      : ['+', lowRadius, ['*', highRadius - lowRadius, ['sqrt', ['/', value, max]]]];
  return ['case', validNumber(attribute), radius, scale.noDataRadius];
}

/**
 * A feature's height in metres above its base on a numeric-height scale: linear from zero, so
 * the domain's top value stands `maxHeightMeters` tall. Missing values stand 0 (not drawn tall).
 */
export function heightMeters(
  scale: Extract<ResolvedScale, { kind: 'numeric-height' }>,
  value: unknown,
): number {
  const top = scale.domain[1];
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || top <= 0) return 0;
  return (Math.min(value, top) / top) * scale.maxHeightMeters;
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
    (scale?.kind === 'numeric-color' || scale?.kind === 'category-color') && layer.attribute
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

// ---- V2 MapLibre techniques (step 5.2, M) ----

type HeightScale = Extract<ResolvedScale, { kind: 'numeric-height' }>;
type SizeScale = Extract<ResolvedScale, { kind: 'numeric-size' }>;

/** Feature-state key of a layer's per-feature track value (stagger, grow, morph). */
export const stateKey = (runtimeLayerId: string, property: string) =>
  `mb:${runtimeLayerId}:${property}`;

/** A style layer of a compiled layer; V2 techniques can draw several. */
export type StyleSpec = {
  id: string;
  type: 'circle' | 'line' | 'fill' | 'fill-extrusion';
  source: string;
  paint: Record<string, unknown>;
  layout: Record<string, unknown>;
  filter?: unknown;
};

/** A source the player derives for a layer: a column footprint around each point. */
export type FootprintSource = { id: string; radiusMeters: number };

/** The ghost column sits slightly wider, so the solid column inside it never z-fights. */
export const GHOST_WIDTH = 1.25;
export const COLUMN_OPACITY = 0.9;
export const GHOST_OPACITY = 0.45;

const toNumber = (expression: Expression | string): Expression => ['to-number', expression, 0];

/** Height in metres of a value expression: linear from zero, as `heightMeters` computes it. */
export function heightPaint(scale: HeightScale, value: Expression): Expression | number {
  const top = scale.domain[1];
  if (!(top > 0)) return 0;
  return ['*', scale.maxHeightMeters / top, ['min', top, ['max', 0, value]]];
}

/** Circle radius of a value expression on a size scale (sqrt-area), as `pointRadius` computes it. */
export function sizePaint(scale: SizeScale, value: Expression): Expression | number {
  const [, max] = scale.domain;
  const [low, high] = scale.radiusRange;
  if (!(max > 0) || scale.domain[0] === max) return high;
  return ['+', low, ['*', high - low, ['sqrt', ['/', ['max', 0, value], max]]]];
}

/** Per-feature track factor in feature state; 1 (drawn in full) until a track sets it. */
const stateFactor = (layer: CompiledLayer, property: 'grow' | 'morph'): Expression => [
  'coalesce',
  ['feature-state', stateKey(layer.runtimeId, property)],
  1,
];

/** The value a layer draws now: its own, or blended from its transition's by the morph state. */
export function drawnValue(layer: CompiledLayer, attribute: string): Expression {
  const own = toNumber(['get', attribute]);
  if (!layer.morph) return own;
  const from = toNumber(['get', layer.morph.fromAttribute]);
  return ['+', from, ['*', ['-', own, from], stateFactor(layer, 'morph')]];
}

function signColor(layer: CompiledLayer): Expression | string {
  const change = layer.change!;
  return [
    'match',
    ['get', change.signAttribute],
    -1,
    change.colors.decrease,
    1,
    change.colors.increase,
    change.colors.unchanged,
  ];
}

export const footprintSourceId = (runtimeLayerId: string, ghost = false) =>
  `${runtimeLayerId}::footprint${ghost ? '-ghost' : ''}`;
export const ghostLayerId = (runtimeLayerId: string) => `${runtimeLayerId}::before`;

/**
 * The style layers (main first, in draw order) and derived footprint sources of a compiled
 * layer. V1 techniques are one layer from `layerStyle`; columns, extrusions, change symbols and
 * hexbins draw `fill-extrusion`, `fill` or a pair of circles, with heights from the height
 * scale times the `grow` state and values blended by the `morph` state.
 */
export function layerStyles(
  layer: CompiledLayer,
  scales: readonly ResolvedScale[],
  colors: { accent: string; labelHalo: string; ink: string; muted: string },
): { specs: StyleSpec[]; footprints: FootprintSource[] } {
  const styles = layerStylesUnfiltered(layer, scales, colors);
  // Footprints keep their point's properties, so the typed filter applies to every layer.
  const filter = layerStyle(layer).filter;
  if (filter) for (const spec of styles.specs) spec.filter ??= filter;
  return styles;
}

function layerStylesUnfiltered(
  layer: CompiledLayer,
  scales: readonly ResolvedScale[],
  colors: { accent: string; labelHalo: string; ink: string; muted: string },
): { specs: StyleSpec[]; footprints: FootprintSource[] } {
  const scaleOf = (id: string | undefined) => scales.find((item) => item.id === id);
  const scale = scaleOf(layer.scaleId);
  const attribute = layer.attribute;
  const visible = { visibility: 'visible' };
  const grow = stateFactor(layer, 'grow');
  const height = (heightScale: ResolvedScale | undefined, value: Expression) =>
    heightScale?.kind === 'numeric-height' ? ['*', heightPaint(heightScale, value), grow] : 0;
  const extrusion = (
    id: string,
    source: string,
    color: unknown,
    paintHeight: unknown,
    opacity: number,
  ): StyleSpec => ({
    id,
    type: 'fill-extrusion',
    source,
    paint: {
      'fill-extrusion-color': color,
      'fill-extrusion-height': paintHeight,
      'fill-extrusion-base': 0,
      'fill-extrusion-opacity': opacity,
      'fill-extrusion-vertical-gradient': true,
    },
    layout: visible,
  });
  const colorPaint = (colorScale: ResolvedScale | undefined, fallback: string) =>
    (colorScale?.kind === 'numeric-color' || colorScale?.kind === 'category-color') && attribute
      ? scalePaint(colorScale, attribute)
      : fallback;
  const value = attribute ? drawnValue(layer, attribute) : (['literal', 0] as Expression);
  switch (layer.technique) {
    case 'column': {
      const source = footprintSourceId(layer.runtimeId);
      return {
        specs: [
          extrusion(
            layer.runtimeId,
            source,
            layer.constant?.color ?? colors.accent,
            height(scale, value),
            layer.constant?.opacity ?? COLUMN_OPACITY,
          ),
        ],
        footprints: [{ id: source, radiusMeters: layer.column!.radiusMeters }],
      };
    }
    case 'extrusion':
      return {
        specs: [
          extrusion(
            layer.runtimeId,
            layer.sourceId,
            // The theme's context fill is for flat outlines; extruded data takes the accent.
            colorPaint(scaleOf(layer.colorScaleId), colors.accent),
            height(scale, value),
            COLUMN_OPACITY,
          ),
        ],
        footprints: [],
      };
    case 'hexbin': {
      const color = colorPaint(scale, colors.accent);
      if (layer.heightScaleId)
        return {
          specs: [
            extrusion(
              layer.runtimeId,
              layer.sourceId,
              color,
              height(scaleOf(layer.heightScaleId), value),
              COLUMN_OPACITY,
            ),
          ],
          footprints: [],
        };
      return {
        specs: [
          {
            id: layer.runtimeId,
            type: 'fill',
            source: layer.sourceId,
            paint: {
              'fill-color': color,
              'fill-opacity': 0.8,
              'fill-outline-color': colors.labelHalo,
            },
            layout: visible,
          },
        ],
        footprints: [],
      };
    }
    case 'change': {
      const change = layer.change!;
      const before = toNumber(['get', change.beforeAttribute]);
      if (change.form === 'height') {
        const solid = footprintSourceId(layer.runtimeId);
        const ghost = footprintSourceId(layer.runtimeId, true);
        const radius = layer.column!.radiusMeters;
        return {
          specs: [
            extrusion(
              layer.runtimeId,
              solid,
              signColor(layer),
              height(scale, value),
              COLUMN_OPACITY,
            ),
            extrusion(
              ghostLayerId(layer.runtimeId),
              ghost,
              colors.ink,
              height(scale, before),
              GHOST_OPACITY,
            ),
          ],
          footprints: [
            { id: solid, radiusMeters: radius },
            { id: ghost, radiusMeters: radius * GHOST_WIDTH },
          ],
        };
      }
      const size = scale?.kind === 'numeric-size' ? scale : undefined;
      const radius = (input: Expression) => (size ? sizePaint(size, input) : POINT_RADIUS);
      return {
        specs: [
          {
            id: layer.runtimeId,
            type: 'circle',
            source: layer.sourceId,
            paint: {
              'circle-color': signColor(layer),
              'circle-radius': radius(value),
              'circle-opacity': layer.constant?.opacity ?? 0.85,
              'circle-stroke-color': colors.labelHalo,
              'circle-stroke-width': POINT_STROKE,
            },
            // Smaller discs draw on top, so a big one never hides a small one.
            layout: { ...visible, 'circle-sort-key': ['-', 0, toNumber(['get', attribute ?? ''])] },
          },
          {
            id: ghostLayerId(layer.runtimeId),
            type: 'circle',
            source: layer.sourceId,
            paint: {
              'circle-color': colors.ink,
              'circle-radius': radius(before),
              'circle-opacity': 0,
              'circle-stroke-color': colors.ink,
              'circle-stroke-width': 1.5,
              'circle-stroke-opacity': 0.9,
            },
            layout: visible,
          },
        ],
        footprints: [],
      };
    }
    default: {
      const single = layerStyle(layer, scale, colors.accent, colors.labelHalo);
      return { specs: [single as StyleSpec], footprints: [] };
    }
  }
}

/** Whether a compiled layer draws heights (columns, extrusions, change columns, extruded hexbins). */
export function drawsHeight(layer: CompiledLayer): boolean {
  return (
    layer.technique === 'column' ||
    layer.technique === 'extrusion' ||
    (layer.technique === 'change' && layer.change?.form === 'height') ||
    (layer.technique === 'hexbin' && layer.heightScaleId !== undefined)
  );
}
