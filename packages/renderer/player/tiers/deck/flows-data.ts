import type { ResolvedScale, Stagger, TripClock } from '@mapbard/schema';
import { matchesLayerFilter } from '../../resolved-style.js';
import type { CompiledLayer } from '../../types.js';

/**
 * Pure data preparation for the deck.gl tier: compiled layers and their GeoJSON become the rows
 * deck.gl's accessors read. Colours, widths and labels come from the compiled spec; this module
 * only evaluates them per feature.
 */

export type Rgba = [number, number, number, number];
type Position = [number, number];
type Properties = Record<string, unknown>;

/** A hex colour (#rgb, #rgba, #rrggbb or #rrggbbaa) as deck.gl's 0–255 RGBA. */
export function hexRgba(hex: string, opacity = 1): Rgba {
  const match = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(hex);
  if (!match) return [0, 0, 0, Math.round(255 * opacity)];
  let digits = match[1]!;
  if (digits.length <= 4) digits = [...digits].map((digit) => digit + digit).join('');
  const channel = (index: number) => parseInt(digits.slice(index * 2, index * 2 + 2), 16);
  const alpha = digits.length === 8 ? channel(3) / 255 : 1;
  return [channel(0), channel(1), channel(2), Math.round(255 * alpha * opacity)];
}

/** The compiled colour of one feature on a colour scale, as the MapLibre paint evaluates it. */
export function scaleColor(scale: ResolvedScale, value: unknown): string | undefined {
  if (scale.kind === 'category-color')
    return (
      scale.categories.find((category) => category.value === value)?.color ?? scale.noDataColor
    );
  if (scale.kind === 'numeric-color') {
    if (typeof value !== 'number' || !Number.isFinite(value)) return scale.noDataColor;
    let color = scale.colors[0]!;
    for (let index = 1; index < scale.colors.length; index++)
      if (value >= scale.edges[index]!) color = scale.colors[index]!;
    return color;
  }
  return undefined;
}

/** A feature's width on a numeric-width scale: linear from zero, clamped to the widest. */
export function widthPixels(
  scale: Extract<ResolvedScale, { kind: 'numeric-width' }>,
  value: unknown,
): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return scale.noDataWidth;
  const top = scale.domain[1];
  return top <= 0 ? 0 : (Math.min(value, top) / top) * scale.maxWidth;
}

type Collection = { features?: unknown[] } | undefined;
type RawFeature = {
  geometry?: { type?: string; coordinates?: unknown };
  properties?: Properties | null;
};

function positions(value: unknown): Position[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: Position[] = [];
  for (const item of value) {
    if (!Array.isArray(item) || typeof item[0] !== 'number' || typeof item[1] !== 'number')
      return undefined;
    out.push([item[0], item[1]]);
  }
  return out;
}

/** Drawn features of a layer: those its filter keeps, with their source index. */
function drawnFeatures(layer: CompiledLayer, data: Collection) {
  return (data?.features ?? []).flatMap((feature, index) => {
    const raw = (feature ?? {}) as RawFeature;
    const properties = raw.properties ?? {};
    if (!matchesLayerFilter(layer.filter, properties)) return [];
    if (raw.geometry?.type !== 'LineString') return [];
    const path = positions(raw.geometry.coordinates);
    return path ? [{ index, properties, path }] : [];
  });
}

export type ArcRow = {
  index: number;
  properties: Properties;
  from: Position;
  to: Position;
  width: number;
  origin: Rgba;
  destination: Rgba;
};

/** One row per drawn arc: origin and destination, width and end colours, widest last. */
export function arcRows(
  layer: CompiledLayer,
  scale: ResolvedScale | undefined,
  data: Collection,
): ArcRow[] {
  const arc = layer.arc;
  if (!arc) throw new Error(`Layer ${layer.runtimeId} has no compiled arc fields`);
  const rows = drawnFeatures(layer, data).flatMap(({ index, properties, path }) => {
    if (path.length !== 2) return [];
    const value = layer.attribute ? properties[layer.attribute] : undefined;
    const encoded = scale ? scaleColor(scale, value) : undefined;
    return [
      {
        index,
        properties,
        from: path[0]!,
        to: path[1]!,
        width: scale?.kind === 'numeric-width' ? widthPixels(scale, value) : arc.width,
        origin: hexRgba(encoded ?? arc.origin),
        destination: hexRgba(encoded ?? arc.destination),
      },
    ];
  });
  // Without depth testing the last arc drawn is on top, so the largest flows stay visible.
  return rows.sort((a, b) => a.width - b.width || a.index - b.index);
}

export type TripRow = {
  index: number;
  properties: Properties;
  path: Position[];
  /** Seconds after the trip's start, one per vertex. */
  timestamps: number[];
  color: Rgba;
};

/** One row per drawn track, with vertex times relative to the trip's start. */
export function tripRows(
  layer: CompiledLayer,
  scale: ResolvedScale | undefined,
  data: Collection,
  fallbackColor: string,
): TripRow[] {
  const trip = layer.trip;
  if (!trip) throw new Error(`Layer ${layer.runtimeId} has no compiled trip fields`);
  const start = Date.parse(trip.start);
  return drawnFeatures(layer, data).flatMap(({ index, properties, path }) => {
    const times = properties[trip.timeProperty];
    if (!Array.isArray(times) || times.length !== path.length) return [];
    // Seconds from the start keep float32 precision on the GPU, unlike epoch times.
    const timestamps = times.map((time) => (Date.parse(String(time)) - start) / 1000);
    if (timestamps.some((time) => !Number.isFinite(time))) return [];
    const value = layer.attribute ? properties[layer.attribute] : undefined;
    const color = (scale && scaleColor(scale, value)) ?? layer.constant?.color ?? fallbackColor;
    return [{ index, properties, path, timestamps, color: hexRgba(color) }];
  });
}

/** The clock label for a time in seconds after the start: the last label at or before it. */
export function clockLabel(clock: readonly TripClock[], seconds: number): string {
  let low = 0;
  let high = clock.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (clock[middle]!.at <= seconds) low = middle;
    else high = middle - 1;
  }
  return clock[low]!.label;
}

/** Row positions in stagger order: source order, or by the encoded attribute with missing values last. */
export function staggerOrder(
  rows: readonly { properties: Properties }[],
  stagger: Stagger,
): number[] {
  const order = rows.map((_, position) => position);
  if (stagger.order === 'data' || !stagger.attribute) return order;
  const sign = stagger.order === 'ascending' ? 1 : -1;
  const value = (position: number) => {
    const raw = rows[position]!.properties[stagger.attribute!];
    return typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined;
  };
  return order.sort((a, b) => {
    const left = value(a);
    const right = value(b);
    if (left === undefined || right === undefined)
      return left === right ? a - b : left === undefined ? 1 : -1;
    return sign * (left - right) || a - b;
  });
}
