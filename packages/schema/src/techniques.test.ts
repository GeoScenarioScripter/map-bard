import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CompiledSchema, TECHNIQUE_BACKENDS, COMPILED_TECHNIQUES } from './compiled.js';
import { SharedScaleSchema } from './design.js';
import { StoryLayerSchema } from './format-v2.js';
import { LayerTrackSchema } from './motion.js';
import { AggregateSchema } from './techniques.js';

const compiled = (): Record<string, unknown> & {
  scenes: { layers: Record<string, unknown>[] }[];
  derived: unknown[];
} =>
  JSON.parse(
    readFileSync(
      new URL('../../../fixtures/two-period/compiled.expected.json', import.meta.url),
      'utf8',
    ),
  );

describe('V2 authored fields', () => {
  it('accepts a column layer with a height encoding and footprint', () => {
    const layer = {
      id: 'gauges',
      technique: 'column',
      sourceId: 'potomac-2024',
      encode: {
        attribute: 'daily_mean_discharge',
        visualVariable: 'height',
        maxHeightMeters: 30000,
      },
      column: { radiusMeters: 1500 },
    };
    expect(StoryLayerSchema.parse(layer)).toEqual(layer);
    expect(
      StoryLayerSchema.safeParse({ ...layer, column: { radiusMeters: 1500, sides: 6 } }).success,
    ).toBe(false);
  });

  it('accepts change, transition, hexbin, arc and trip options', () => {
    const base = { id: 'l', sourceId: 's' };
    for (const layer of [
      { ...base, technique: 'change', compare: { sourceId: 'potomac-2024', labels: true } },
      { ...base, technique: 'column', transition: { from: { sceneId: 'context-2024' } } },
      {
        ...base,
        technique: 'hexbin',
        aggregate: { cellKm: 25, op: 'count' },
        extrude: { maxHeightMeters: 40000 },
      },
      { ...base, technique: 'arc', arc: { greatCircle: true } },
      { ...base, technique: 'trip', trip: { timeProperty: 'times', trailHours: 24 } },
    ])
      expect(StoryLayerSchema.safeParse(layer).success).toBe(true);
  });

  it('needs an attribute for sum and mean, and none for count', () => {
    expect(AggregateSchema.safeParse({ cellKm: 25, op: 'count' }).success).toBe(true);
    expect(AggregateSchema.safeParse({ cellKm: 25, op: 'sum' }).success).toBe(false);
    expect(AggregateSchema.safeParse({ cellKm: 25, op: 'mean', attribute: 'mag' }).success).toBe(
      true,
    );
    expect(AggregateSchema.safeParse({ cellKm: 25, op: 'count', attribute: 'mag' }).success).toBe(
      false,
    );
  });

  it('shares height and width scales', () => {
    const members = [
      { sceneId: 'a', layerId: 'l', sourceId: 's', observationLabel: '2024' },
      { sceneId: 'b', layerId: 'l', sourceId: 't', observationLabel: '2025' },
    ];
    expect(
      SharedScaleSchema.safeParse({
        id: 'h',
        visualVariable: 'height',
        maxHeightMeters: 30000,
        members,
      }).success,
    ).toBe(true);
    expect(
      SharedScaleSchema.safeParse({ id: 'w', visualVariable: 'width', maxWidth: 12, members })
        .success,
    ).toBe(true);
    expect(
      SharedScaleSchema.safeParse({ id: 'w', visualVariable: 'width', maxRadius: 12, members })
        .success,
    ).toBe(false);
  });
});

describe('compiled 0.4.0', () => {
  it('routes every compiled technique to one backend, deck.gl only for arcs and trips', () => {
    expect(Object.keys(TECHNIQUE_BACKENDS).sort()).toEqual([...COMPILED_TECHNIQUES].sort());
    expect(
      COMPILED_TECHNIQUES.filter((technique) => TECHNIQUE_BACKENDS[technique] === 'deck'),
    ).toEqual(['arc', 'trip']);
  });

  it('rejects a layer drawn by the wrong backend', () => {
    const value = compiled();
    value.scenes[0]!.layers[0]!.backend = 'deck';
    const result = CompiledSchema.safeParse(value);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['scenes', 0, 'layers', 0, 'backend']);
  });

  it('accepts derived sources that layers draw, and rejects colliding or unknown sources', () => {
    const value = compiled();
    const derived = {
      id: 'mb-derived:change',
      kind: 'change',
      inputs: [{ sourceId: 'period-a', sha256: `sha256:${'0'.repeat(64)}` }],
      parameters: { compare: 'period-b' },
      data: {
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', id: 1, geometry: null, properties: { 'mb:before': 2, 'mb:after': 1 } },
        ],
      },
    };
    value.derived = [derived];
    value.scenes[0]!.layers[0]!.sourceId = derived.id;
    expect(CompiledSchema.safeParse(value).success).toBe(true);

    value.derived = [{ ...derived, id: 'period-a' }];
    value.scenes[0]!.layers[0]!.sourceId = 'period-a';
    expect(CompiledSchema.safeParse(value).error?.issues[0]?.message).toBe(
      'Derived source period-a collides with another source.',
    );

    const unknown = compiled();
    unknown.scenes[0]!.layers[0]!.sourceId = 'nowhere';
    expect(CompiledSchema.safeParse(unknown).error?.issues[0]?.path).toEqual([
      'scenes',
      0,
      'layers',
      0,
      'sourceId',
    ]);
  });

  it('staggers grow but never trail', () => {
    const track = {
      mode: 'play',
      range: [0, 1],
      durationMs: 1200,
      runtimeLayerId: 'mb:l',
      keyframes: [
        { at: 0, value: 0, easing: 'linear' },
        { at: 1, value: 1, easing: 'linear' },
      ],
      final: 1,
      stagger: { delayMs: 80, order: 'data' },
    };
    expect(LayerTrackSchema.safeParse({ ...track, property: 'grow' }).success).toBe(true);
    expect(
      LayerTrackSchema.safeParse({ ...track, property: 'trail' }).error?.issues[0]?.message,
    ).toBe('trail draws the whole layer at once and cannot stagger.');
  });
});
