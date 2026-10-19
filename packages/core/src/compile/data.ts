import type { DataResource, Diagnostic, JsonValue, ValidatedProject } from '@mapbard/schema';

export type Feature = {
  id: string;
  index: number;
  geometry: 'point' | 'line' | 'polygon';
  properties: Record<string, JsonValue>;
};

function geometryKind(type: unknown): Feature['geometry'] | undefined {
  if (type === 'Point' || type === 'MultiPoint') return 'point';
  if (type === 'LineString' || type === 'MultiLineString') return 'line';
  if (type === 'Polygon' || type === 'MultiPolygon') return 'polygon';
  return undefined;
}

function position(value: JsonValue | undefined): boolean {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number'
  );
}
function line(value: JsonValue | undefined): boolean {
  return Array.isArray(value) && value.length >= 2 && value.every(position);
}
function polygon(value: JsonValue | undefined): boolean {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((ring) => {
      if (!Array.isArray(ring) || ring.length < 4 || !ring.every(position)) return false;
      const first = ring[0];
      const last = ring[ring.length - 1];
      return (
        Array.isArray(first) && Array.isArray(last) && first[0] === last[0] && first[1] === last[1]
      );
    })
  );
}
function coordinatesMatch(type: unknown, coordinates: JsonValue | undefined): boolean {
  switch (type) {
    case 'Point':
      return position(coordinates);
    case 'MultiPoint':
      return Array.isArray(coordinates) && coordinates.length > 0 && coordinates.every(position);
    case 'LineString':
      return line(coordinates);
    case 'MultiLineString':
      return Array.isArray(coordinates) && coordinates.length > 0 && coordinates.every(line);
    case 'Polygon':
      return polygon(coordinates);
    case 'MultiPolygon':
      return Array.isArray(coordinates) && coordinates.length > 0 && coordinates.every(polygon);
    default:
      return false;
  }
}

export function sourceFeatures(
  project: ValidatedProject,
  resource: DataResource,
  diagnostics: Diagnostic[],
): Feature[] {
  const data = project.dataMap[resource.id];
  if (!data || Array.isArray(data) || typeof data !== 'object' || !Array.isArray(data.features))
    return [];
  const features: Feature[] = [];
  data.features.forEach((raw, index) => {
    if (!raw || Array.isArray(raw) || typeof raw !== 'object') {
      diagnostics.push({
        code: 'VALUE_INVALID',
        severity: 'error',
        artifact: 'data',
        path: ['features', index],
        ids: { sourceId: resource.id },
        message: 'Feature must be an object.',
        remedy: 'Provide a valid GeoJSON Feature.',
      });
      return;
    }
    const props = raw.properties;
    const geometry = raw.geometry;
    const type =
      geometry && !Array.isArray(geometry) && typeof geometry === 'object'
        ? geometryKind(geometry.type)
        : undefined;
    const coordinatesValid =
      geometry && !Array.isArray(geometry) && typeof geometry === 'object'
        ? coordinatesMatch(geometry.type, geometry.coordinates)
        : false;
    if (
      raw.type !== 'Feature' ||
      !props ||
      Array.isArray(props) ||
      typeof props !== 'object' ||
      !type ||
      !coordinatesValid
    ) {
      diagnostics.push({
        code: 'VALUE_INVALID',
        severity: 'error',
        artifact: 'data',
        path: ['features', index],
        ids: { sourceId: resource.id },
        message: 'Feature needs properties and a supported geometry.',
        remedy: 'Supply point, line or polygon GeoJSON with properties.',
      });
      return;
    }
    const rawId =
      resource.featureId.method === 'geojson-id' ? raw.id : props[resource.featureId.property];
    if (typeof rawId !== 'string' && !(typeof rawId === 'number' && Number.isSafeInteger(rawId)))
      return;
    features.push({ id: String(rawId), index, geometry: type, properties: props });
  });
  return features;
}

export type Comparison = {
  attribute: string;
  op: '==' | '!=' | '<' | '<=' | '>' | '>=';
  value: string | number | boolean;
};

export function parseLegacyFilter(value: string): Comparison | undefined {
  const match = /^\s*([A-Za-z_][\w.-]*)\s*(==|!=|<=|>=|<|>)\s*(.*?)\s*$/.exec(value);
  if (!match) return undefined;
  const [, attribute, op, literal] = match;
  if (!attribute || !op || !literal) return undefined;
  let parsed: string | number | boolean;
  if (/^(['"]).*\1$/.test(literal)) parsed = literal.slice(1, -1);
  else if (literal === 'true' || literal === 'false') parsed = literal === 'true';
  else if (literal.trim() !== '' && Number.isFinite(Number(literal))) parsed = Number(literal);
  else return undefined;
  return { attribute, op: op as Comparison['op'], value: parsed };
}

export function matchesFilter(feature: Feature, filter: Comparison | undefined): boolean {
  if (!filter) return true;
  const actual = feature.properties[filter.attribute];
  if (typeof actual !== typeof filter.value || actual === null) return false;
  switch (filter.op) {
    case '==':
      return actual === filter.value;
    case '!=':
      return actual !== filter.value;
    case '<':
      return (actual as number) < (filter.value as number);
    case '<=':
      return (actual as number) <= (filter.value as number);
    case '>':
      return (actual as number) > (filter.value as number);
    case '>=':
      return (actual as number) >= (filter.value as number);
  }
}
