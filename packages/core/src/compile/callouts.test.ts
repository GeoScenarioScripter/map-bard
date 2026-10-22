import { describe, expect, it } from 'vitest';
import type { Annotation, Compiled, ResolvedScale } from '@mapbard/schema';
import { SceneCalloutsSchema } from '@mapbard/schema';
import { pointSymbolRadius, resolveSceneCallouts, type PointFeature } from './callouts.js';

type Layer = Compiled['scenes'][number]['layers'][number];

const size: ResolvedScale = {
  id: 'discharge',
  memberKeys: [],
  unit: 'ft^3/s',
  title: 'Daily mean discharge',
  unitLabel: 'ft³/s',
  noDataLabel: 'No data',
  noDataColor: '#9e9e9e',
  counts: { valid: 3, missing: 0, invalid: 0 },
  kind: 'numeric-size',
  domain: [0, 23600],
  mapping: 'sqrt-area',
  radiusRange: [0, 16],
  noDataRadius: 3,
  legend: [{ value: 23600, radius: 16, label: '23,600' }],
};

const gauges: Layer = {
  sceneId: 'compare',
  authoredLayerId: 'gauges',
  runtimeId: 'mb:gauges',
  sourceId: 'gauges-2025',
  geometry: 'point',
  technique: 'graduated-symbol',
  attribute: 'discharge',
  scaleId: 'discharge',
};

const features: Record<string, PointFeature> = {
  hancock: {
    feature: { id: 'hancock', index: 0, geometry: 'point', properties: { discharge: 580 } },
    points: [[-78.18, 39.7]],
  },
  rocks: {
    feature: { id: 'rocks', index: 1, geometry: 'point', properties: { discharge: 23600 } },
    points: [[-77.54, 39.27]],
  },
  pair: {
    feature: { id: 'pair', index: 2, geometry: 'point', properties: { discharge: null } },
    points: [
      [-77.1, 38.9],
      [-77.2, 38.95],
    ],
  },
};
const lookup = (sourceId: string, id: string) =>
  sourceId === 'gauges-2025' ? features[id] : undefined;

function annotation(
  id: string,
  featureIds: string[] | undefined,
  at: [number, number],
): Annotation {
  return {
    id,
    text: `${id} note`,
    at,
    target: featureIds
      ? { kind: 'features', sourceId: 'gauges-2025', featureIds }
      : { kind: 'free' },
  };
}

describe('compiled callouts', () => {
  it('sizes targets like the renderer circle paint, including the stroke', () => {
    expect(pointSymbolRadius(gauges, size, { discharge: 23600 })).toBe(17);
    // 16 * sqrt(580 / 23600) + 1 stroke: the small 2025 Hancock symbol.
    expect(pointSymbolRadius(gauges, size, { discharge: 580 })).toBe(3.51);
    expect(pointSymbolRadius(gauges, size, { discharge: 'n/a' })).toBe(4);
    const constant = {
      ...size,
      domain: [5, 5] as [number, number],
      radiusRange: [8, 8] as [number, number],
    };
    expect(pointSymbolRadius(gauges, constant, { discharge: 5 })).toBe(9);
    const plain: Layer = {
      ...gauges,
      technique: 'point',
      attribute: undefined,
      scaleId: undefined,
    };
    expect(pointSymbolRadius(plain, undefined, {})).toBe(8);
    expect(pointSymbolRadius({ ...plain, constant: { radius: 4 } }, undefined, {})).toBe(5);
  });

  it('resolves anchors, authored priority and every drawn target point', () => {
    const callouts = resolveSceneCallouts(
      [
        annotation('rocks-note', ['rocks', 'hancock'], [-77.54, 39.27]),
        annotation('pair-note', ['pair'], [-77.1, 38.9]),
        annotation('free-note', undefined, [-77.6, 39]),
      ],
      [gauges],
      [size],
      lookup,
    );
    expect(callouts).toEqual([
      {
        id: 'rocks-note',
        text: 'rocks-note note',
        anchor: [-77.54, 39.27],
        priority: 0,
        targets: [
          { at: [-77.54, 39.27], radius: 17 },
          { at: [-78.18, 39.7], radius: 3.51 },
        ],
      },
      {
        id: 'pair-note',
        text: 'pair-note note',
        anchor: [-77.1, 38.9],
        priority: 1,
        targets: [
          { at: [-77.1, 38.9], radius: 4 },
          { at: [-77.2, 38.95], radius: 4 },
        ],
      },
      { id: 'free-note', text: 'free-note note', anchor: [-77.6, 39], priority: 2, targets: [] },
    ]);
    expect(SceneCalloutsSchema.safeParse(callouts).success).toBe(true);
  });

  it('keeps the largest drawing of a feature and skips filtered or non-point layers', () => {
    const halo: Layer = {
      ...gauges,
      authoredLayerId: 'halo',
      runtimeId: 'mb:halo',
      technique: 'point',
      attribute: undefined,
      scaleId: undefined,
      constant: { radius: 30 },
      filter: { attribute: 'discharge', op: '>', value: 1000 },
    };
    const line: Layer = {
      ...gauges,
      authoredLayerId: 'river',
      geometry: 'line',
      technique: 'line',
    };
    const [rocks, hancock] = resolveSceneCallouts(
      [
        annotation('rocks', ['rocks'], [-77.54, 39.27]),
        annotation('hancock', ['hancock'], [-78.18, 39.7]),
      ],
      [line, gauges, halo],
      [size],
      lookup,
    );
    expect(rocks!.targets).toEqual([{ at: [-77.54, 39.27], radius: 31 }]);
    expect(hancock!.targets).toEqual([{ at: [-78.18, 39.7], radius: 3.51 }]);
    const undrawn = resolveSceneCallouts(
      [annotation('rocks', ['rocks'], [-77.54, 39.27])],
      [line],
      [size],
      lookup,
    );
    expect(undrawn[0]!.targets).toEqual([]);
  });

  it('rejects duplicate callout IDs and priorities in a scene', () => {
    const callout = { id: 'a', text: 'A', anchor: [0, 0], priority: 0, targets: [] };
    expect(SceneCalloutsSchema.safeParse([callout, { ...callout, priority: 1 }]).success).toBe(
      false,
    );
    expect(SceneCalloutsSchema.safeParse([callout, { ...callout, id: 'b' }]).success).toBe(false);
    expect(
      SceneCalloutsSchema.safeParse([{ ...callout, targets: [{ at: [0, 0], radius: -1 }] }])
        .success,
    ).toBe(false);
  });
});
