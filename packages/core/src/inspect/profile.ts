/**
 * Pure profiling helpers shared by the GeoJSON and CSV ingest paths: geometry
 * classification, extent, and attribute profiling (dataType, measurement level,
 * samples, temporal extent). No I/O.
 */
import type { Attribute, DataProfile, Extent, TemporalExtent } from '@mapbard/schema';
import type { GeoJsonFeature, GeoJsonFeatureCollection, GeoJsonGeometry } from './geojson-types.js';

type GeometryClass = NonNullable<DataProfile['geometryType']>;

const GEOMETRY_CLASS: Record<string, Exclude<GeometryClass, 'mixed' | 'none'>> = {
  Point: 'point',
  MultiPoint: 'point',
  LineString: 'line',
  MultiLineString: 'line',
  Polygon: 'polygon',
  MultiPolygon: 'polygon',
};

/** Classify the collection's geometry: a single class, else `mixed`, else `none`. */
export function detectGeometryType(features: GeoJsonFeature[]): GeometryClass {
  const classes = new Set<Exclude<GeometryClass, 'mixed' | 'none'>>();
  const visit = (g: GeoJsonGeometry | null): void => {
    if (!g) return;
    if (g.type === 'GeometryCollection') {
      (g.geometries ?? []).forEach(visit);
      return;
    }
    const cls = GEOMETRY_CLASS[g.type];
    if (cls) classes.add(cls);
  };
  for (const f of features) visit(f.geometry);
  if (classes.size === 0) return 'none';
  if (classes.size === 1) return [...classes][0]!;
  return 'mixed';
}

/** Walk every `[x, y]` position in an arbitrarily nested coordinates value. */
function walkPositions(coords: unknown, cb: (x: number, y: number) => void): void {
  if (!Array.isArray(coords)) return;
  if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
    cb(coords[0], coords[1]);
    return;
  }
  for (const c of coords) walkPositions(c, cb);
}

/** Bounding box `[minX, minY, maxX, maxY]` over all features, or undefined if none. */
export function computeExtent(features: GeoJsonFeature[]): Extent | undefined {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const each = (g: GeoJsonGeometry | null): void => {
    if (!g) return;
    if (g.type === 'GeometryCollection') {
      (g.geometries ?? []).forEach(each);
      return;
    }
    walkPositions(g.coordinates, (x, y) => {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    });
  };
  for (const f of features) each(f.geometry);
  if (minX === Infinity) return undefined;
  return [minX, minY, maxX, maxY];
}

const DATE_LIKE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?)?/;

export function isDateLike(value: unknown): value is string {
  return typeof value === 'string' && DATE_LIKE.test(value) && !Number.isNaN(Date.parse(value));
}

function inferDataType(values: unknown[]): Attribute['dataType'] {
  if (values.every((v) => typeof v === 'boolean')) return 'boolean';
  if (values.every((v) => typeof v === 'number' && Number.isFinite(v))) return 'number';
  if (values.every(isDateLike)) return 'date';
  return 'string';
}

function inferMeasurement(dataType: Attribute['dataType']): Attribute['measurement'] {
  switch (dataType) {
    case 'number':
      return 'ratio';
    case 'date':
      return 'interval';
    default:
      // boolean and string are unordered categories
      return 'nominal';
  }
}

function sampleValues(values: unknown[], dataType: Attribute['dataType']): (string | number)[] {
  const out: (string | number)[] = [];
  const seen = new Set<string>();
  for (const v of values) {
    const key = String(v);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(dataType === 'number' ? (v as number) : key);
    if (out.length >= 5) break;
  }
  return out;
}

/** Profile every attribute across a set of property records, with temporal extent. */
export function profileAttributes(records: Array<Record<string, unknown> | null>): {
  attributes: Attribute[];
  temporalExtent?: TemporalExtent;
} {
  // Preserve first-seen key order.
  const keys: string[] = [];
  const seenKey = new Set<string>();
  for (const rec of records) {
    if (!rec) continue;
    for (const k of Object.keys(rec)) {
      if (!seenKey.has(k)) {
        seenKey.add(k);
        keys.push(k);
      }
    }
  }

  const attributes: Attribute[] = [];
  let tMin: { t: number; s: string } | undefined;
  let tMax: { t: number; s: string } | undefined;

  for (const key of keys) {
    const present = records
      .map((r) => (r ? r[key] : undefined))
      .filter((v) => v !== undefined && v !== null && v !== '');
    if (present.length === 0) {
      attributes.push({ name: key, dataType: 'string', measurement: 'nominal', sample: [] });
      continue;
    }
    const dataType = inferDataType(present);
    attributes.push({
      name: key,
      dataType,
      measurement: inferMeasurement(dataType),
      sample: sampleValues(present, dataType),
    });

    if (dataType === 'date') {
      for (const v of present) {
        if (!isDateLike(v)) continue;
        const t = Date.parse(v);
        if (!tMin || t < tMin.t) tMin = { t, s: v };
        if (!tMax || t > tMax.t) tMax = { t, s: v };
      }
    }
  }

  const temporalExtent: TemporalExtent | undefined =
    tMin && tMax ? [tMin.s, tMax.s] : undefined;
  return temporalExtent ? { attributes, temporalExtent } : { attributes };
}

/** Read an optional GeoJSON `crs` member (2008-style), defaulting to EPSG:4326. */
function readCrs(fc: GeoJsonFeatureCollection): string {
  const name = (fc as { crs?: { properties?: { name?: unknown } } }).crs?.properties?.name;
  return typeof name === 'string' && name.length > 0 ? name : 'EPSG:4326';
}

/** Profile a whole FeatureCollection into a `DataProfile`. Pure. */
export function profileFeatureCollection(fc: GeoJsonFeatureCollection): DataProfile {
  const features = fc.features ?? [];
  const { attributes, temporalExtent } = profileAttributes(features.map((f) => f.properties));
  const profile: DataProfile = {
    geometryType: detectGeometryType(features),
    featureCount: features.length,
    attributes,
    crs: readCrs(fc),
  };
  const extent = computeExtent(features);
  if (extent) profile.extent = extent;
  if (temporalExtent) profile.temporalExtent = temporalExtent;
  return profile;
}
