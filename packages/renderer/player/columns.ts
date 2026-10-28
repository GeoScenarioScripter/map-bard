// Column footprints (step 5.2, M): the compiled data keeps points, and the player tessellates
// a round footprint around each one, so compiled data does not grow by a ring per point.

/** Sides of each footprint; 24 reads as round at every zoom a story frames a column. */
export const COLUMN_SIDES = 24;
const METRES_PER_DEGREE = 111_320;

type Position = [number, number];
type Feature = { type?: string; geometry?: unknown; properties?: Record<string, unknown> | null };

const round7 = (value: number) => Math.round(value * 1e7) / 1e7;

/** A closed counter-clockwise ring of `sides` vertices, `radiusMeters` around a point. */
export function footprintRing(
  [lng, lat]: Position,
  radiusMeters: number,
  sides = COLUMN_SIDES,
): Position[] {
  const dLat = radiusMeters / METRES_PER_DEGREE;
  const dLng = radiusMeters / (METRES_PER_DEGREE * Math.max(0.01, Math.cos((lat * Math.PI) / 180)));
  const ring: Position[] = [];
  for (let side = 0; side < sides; side++) {
    const angle = (2 * Math.PI * side) / sides;
    ring.push([round7(lng + dLng * Math.cos(angle)), round7(lat + dLat * Math.sin(angle))]);
  }
  ring.push(ring[0]!);
  return ring;
}

function points(geometry: unknown): Position[] {
  const { type, coordinates } = (geometry ?? {}) as { type?: string; coordinates?: unknown };
  const list = type === 'Point' ? [coordinates] : type === 'MultiPoint' ? coordinates : [];
  return (Array.isArray(list) ? list : []).filter(
    (point): point is Position =>
      Array.isArray(point) && typeof point[0] === 'number' && typeof point[1] === 'number',
  );
}

/**
 * One footprint feature per source feature, in source order, so generated feature IDs (and
 * the feature state that grows and morphs columns) match the point source's. A feature with
 * no point keeps its place with an empty geometry.
 */
export function columnFootprints(
  data: unknown,
  radiusMeters: number,
  sides = COLUMN_SIDES,
): { type: 'FeatureCollection'; features: Feature[] } {
  const features = ((data ?? {}) as { features?: unknown[] }).features ?? [];
  return {
    type: 'FeatureCollection',
    features: features.map((raw) => {
      const feature = (raw ?? {}) as Feature;
      const rings = points(feature.geometry).map((at) => [footprintRing(at, radiusMeters, sides)]);
      return {
        type: 'Feature',
        geometry: { type: 'MultiPolygon', coordinates: rings },
        properties: feature.properties ?? {},
      };
    }),
  };
}
