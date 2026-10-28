import { humanizeId, numericColorPrerequisite, type CapabilityId } from '@mapbard/knowledge';
import type { Aggregate, Diagnostic, ResolvedScale, V2Technique } from '@mapbard/schema';
import { featurePoints } from './data.js';
import {
  derivedData,
  derivedSourceId,
  drawnFeatures,
  finiteNumber,
  moduleIssue,
  requireContext,
  type DerivedRow,
} from './change.js';
import { numericColorScale, numericHeightScale, type ClassificationMethod } from './scales.js';
import type { TechniqueCompiler } from './techniques.js';

// Hexbins (step 5.2, M): a Web Mercator hexagon grid anchored at (0, 0), aggregated at compile
// time into a derived polygon source with provenance.

export const AGGREGATE_READY: readonly V2Technique[] = ['hexbin'];

const EARTH_RADIUS = 6378137;
const SQRT3 = Math.sqrt(3);

const CLASSIFICATION_CAPABILITY: Record<ClassificationMethod, CapabilityId> = {
  'equal-interval': 'color.equal-interval',
  quantile: 'color.quantile',
  'natural-breaks': 'color.natural-breaks',
  manual: 'color.manual-breaks',
};

const round6 = (value: number) => {
  const rounded = Math.round(value * 1e6) / 1e6;
  return Object.is(rounded, -0) ? 0 : rounded;
};

export function toMercator([lng, lat]: readonly [number, number]): [number, number] {
  const phi = (Math.max(-85.0511, Math.min(85.0511, lat)) * Math.PI) / 180;
  return [
    (EARTH_RADIUS * lng * Math.PI) / 180,
    EARTH_RADIUS * Math.log(Math.tan(Math.PI / 4 + phi / 2)),
  ];
}

export function fromMercator([x, y]: readonly [number, number]): [number, number] {
  return [
    ((x / EARTH_RADIUS) * 180) / Math.PI,
    ((2 * Math.atan(Math.exp(y / EARTH_RADIUS)) - Math.PI / 2) * 180) / Math.PI,
  ];
}

/**
 * The grid's hexagon size (centre to vertex) in Web Mercator metres: a flat-topped cell is
 * twice its size wide, and `cellKm` is that width on the ground at `latitude`.
 */
export function hexSize(cellKm: number, latitude: number): number {
  return (cellKm * 1000) / 2 / Math.cos((latitude * Math.PI) / 180);
}

/** The flat-topped cell (axial q, r) holding a Web Mercator point; the grid is anchored at (0, 0). */
export function hexCell([x, y]: readonly [number, number], size: number): [number, number] {
  const q = ((2 / 3) * x) / size;
  const r = ((-1 / 3) * x + (SQRT3 / 3) * y) / size;
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return [rq + 0, rr + 0];
}

/** A cell's closed ring of lng/lat corners, counter-clockwise from its east vertex. */
export function hexRing([q, r]: readonly [number, number], size: number): [number, number][] {
  const cx = size * 1.5 * q;
  const cy = size * SQRT3 * (r + q / 2);
  const ring = [0, 1, 2, 3, 4, 5].map((corner) => {
    const angle = (Math.PI / 3) * corner;
    const [lng, lat] = fromMercator([cx + size * Math.cos(angle), cy + size * Math.sin(angle)]);
    return [round6(lng), round6(lat)] as [number, number];
  });
  return [...ring, ring[0]!];
}

export type HexCell = { q: number; r: number; count: number; sum: number; valid: number };

/** Aggregate weighted points into cells; `value` undefined counts the point but adds nothing. */
export function aggregateHexbins(
  points: readonly { at: [number, number]; value?: number }[],
  size: number,
): HexCell[] {
  const cells = new Map<string, HexCell>();
  for (const point of points) {
    const [q, r] = hexCell(toMercator(point.at), size);
    const id = `${q},${r}`;
    const cell = cells.get(id) ?? { q, r, count: 0, sum: 0, valid: 0 };
    cell.count++;
    if (point.value !== undefined) {
      cell.sum += point.value;
      cell.valid++;
    }
    cells.set(id, cell);
  }
  // A stable order: south to north, then west to east.
  return [...cells.values()].sort((a, b) => a.r + a.q / 2 - (b.r + b.q / 2) || a.q - b.q);
}

export function cellValue(cell: HexCell, op: Aggregate['op']): number | null {
  if (op === 'count') return cell.count;
  if (op === 'sum') return cell.valid ? cell.sum : null;
  return cell.valid ? cell.sum / cell.valid : null;
}

/** The compiled legend title, for example "Count per 25 km cell". */
export function hexbinTitle(aggregate: Aggregate, label: string | undefined): string {
  const cell = `per ${aggregate.cellKm.toLocaleString('en-US')} km cell`;
  if (aggregate.op === 'count') return `Count ${cell}`;
  return `${aggregate.op === 'sum' ? 'Total' : 'Mean'} ${label ?? ''} ${cell}`.replace(/\s+/g, ' ');
}

export const compileHexbin: TechniqueCompiler = (input) => {
  const context = requireContext(input);
  const { layer, resource, path } = input;
  const diagnostics: Diagnostic[] = [];
  context.capability('aggregate.hexbin', [...path, 'technique']);
  const aggregate = layer.aggregate;
  if (!aggregate)
    diagnostics.push(
      moduleIssue(
        input,
        'VALUE_INVALID',
        [...path, 'aggregate'],
        'A hexbin needs aggregate: the cell size and the operation.',
        'Add "aggregate": { "cellKm": 25, "op": "count" } to the layer.',
      ),
    );
  if (layer.encode)
    diagnostics.push(
      moduleIssue(
        input,
        'CAPABILITY_UNSUPPORTED',
        [...path, 'encode'],
        "A hexbin's value is its aggregate, so it takes no encode.",
        'Remove encode; name a summed or averaged quantity in aggregate.attribute.',
      ),
    );
  if (!layer.classification)
    diagnostics.push(
      moduleIssue(
        input,
        'CAPABILITY_UNSUPPORTED',
        [...path, 'classification'],
        'A hexbin needs a classification for its colour classes.',
        'Specify equal-interval, quantile, natural-breaks or manual classes.',
      ),
    );
  if (layer.transition)
    diagnostics.push(
      moduleIssue(
        input,
        'CAPABILITY_UNSUPPORTED',
        [...path, 'transition'],
        'Hexbin transitions are not compiled in this version.',
        'Show the two periods as separate hexbin scenes on one manual classification.',
      ),
    );
  if (diagnostics.length || !aggregate || !layer.classification) return { diagnostics };
  const declaration = aggregate.attribute
    ? resource.attributes.find((entry) => entry.name === aggregate.attribute)
    : undefined;
  if (aggregate.attribute) {
    if (!declaration)
      return {
        diagnostics: [
          moduleIssue(
            input,
            'REFERENCE_MISSING',
            [...path, 'aggregate', 'attribute'],
            `Aggregated column ${aggregate.attribute} is undeclared.`,
            'Declare a source column present in full data.',
          ),
        ],
      };
    const prerequisite = numericColorPrerequisite(declaration);
    if (!prerequisite.ok)
      return {
        diagnostics: [
          moduleIssue(
            input,
            'MEASUREMENT_REQUIRED',
            [
              'resources',
              'data',
              resource.id,
              'attributes',
              aggregate.attribute,
              prerequisite.field,
            ],
            prerequisite.reason,
            `A ${aggregate.op} needs a numeric quantity with a unit.`,
            {},
            'project',
          ),
        ],
      };
  }
  const points = drawnFeatures(input).flatMap((feature) => {
    const value = aggregate.attribute
      ? finiteNumber(feature.properties[aggregate.attribute])
      : undefined;
    return featurePoints(context.project, resource.id, feature).map((at) => ({
      at,
      ...(value !== undefined ? { value } : {}),
    }));
  });
  if (!points.length) return { diagnostics };
  const latitudes = points.map((point) => point.at[1]);
  const south = Math.min(...latitudes);
  const north = Math.max(...latitudes);
  const centre = (south + north) / 2;
  const size = hexSize(aggregate.cellKm, centre);
  const valueName = aggregate.op;
  const rows: DerivedRow[] = aggregateHexbins(points, size).map((cell) => ({
    key: `hex:${cell.q}:${cell.r}`,
    geometry: { type: 'Polygon', coordinates: [hexRing([cell.q, cell.r], size)] },
    properties: { count: cell.count, [valueName]: cellValue(cell, aggregate.op) },
  }));
  const id = derivedSourceId('hexbin', input.sceneId, layer.id);
  const memberKeys = [{ sceneId: input.sceneId, layerId: layer.id, sourceId: resource.id }];
  const unit = aggregate.op === 'count' ? null : (declaration?.unit ?? null);
  const title = hexbinTitle(
    aggregate,
    declaration ? (declaration.label ?? humanizeId(declaration.name)) : undefined,
  );
  const values = rows.map((row) => row.properties[valueName]);
  const keyId = `${input.sceneId.length}:${input.sceneId}:${layer.id.length}:${layer.id}`;
  const classification = layer.classification;
  context.capability(CLASSIFICATION_CAPABILITY[classification.method], [...path, 'classification']);
  const color = numericColorScale({
    id: `mb-scale:${keyId}`,
    title,
    memberKeys,
    unit,
    values,
    palette: context.theme.palette,
    classes: classification.classes,
    method: classification.method,
    ...(classification.breaks ? { breaks: classification.breaks } : {}),
    path: [...path, 'aggregate'],
  });
  diagnostics.push(...color.diagnostics);
  const scales: ResolvedScale[] = color.scale ? [color.scale] : [];
  let heightScaleId: string | undefined;
  if (layer.extrude) {
    const height = numericHeightScale({
      id: `mb-scale-height:${keyId}`,
      title,
      memberKeys,
      unit,
      values,
      palette: [],
      classes: 0,
      maxHeightMeters: layer.extrude.maxHeightMeters,
      path: [...path, 'extrude'],
    });
    diagnostics.push(...height.diagnostics);
    if (height.scale) {
      scales.push(height.scale);
      heightScaleId = height.scale.id;
    }
  }
  return {
    diagnostics,
    layer: {
      sourceId: id,
      geometry: 'polygon',
      attribute: valueName,
      // The filter chose the aggregated points; cells carry only their aggregates.
      filter: undefined,
      ...(color.scale ? { scaleId: color.scale.id } : {}),
      ...(heightScaleId ? { heightScaleId } : {}),
    },
    scales,
    derived: [
      {
        id,
        kind: 'hexbin',
        inputs: [{ sourceId: resource.id, sha256: resource.sha256 }],
        parameters: {
          cellKm: aggregate.cellKm,
          op: aggregate.op,
          ...(aggregate.attribute ? { attribute: aggregate.attribute } : {}),
          grid: 'flat-topped hexagons in Web Mercator, anchored at (0, 0)',
          sizeMercatorMeters: Math.round(size * 1000) / 1000,
          centreLatitude: round6(centre),
          latitudeSpan: [round6(south), round6(north)],
          points: points.length,
        },
        data: derivedData(rows),
      },
    ],
  };
};
