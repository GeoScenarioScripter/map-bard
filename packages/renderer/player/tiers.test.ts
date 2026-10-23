import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseCompiled, type ResolvedScale } from '@mapbard/schema';
import { createAltitudeProjector, projectThroughMatrix } from './altitude.js';
import { createMapLibreAdapter } from './maplibre-adapter.js';
import { heightMeters } from './resolved-style.js';
import { registerTier, resetTiers, type TierLayers } from './tiers.js';
import type { CompiledStory } from './types.js';

const parsed = parseCompiled(
  JSON.parse(
    readFileSync(
      new URL('../../core/src/compile/fixtures/compiled.g1-r1.json', import.meta.url),
      'utf8',
    ),
  ),
);
if (!parsed.ok) throw new Error(JSON.stringify(parsed.diagnostics));
const fixture = parsed.value;
const sourceData = Object.fromEntries(
  ['period-a', 'period-b'].map((id) => [
    id,
    JSON.parse(
      readFileSync(
        new URL(`../../../fixtures/two-period/data/${id}.geojson`, import.meta.url),
        'utf8',
      ),
    ),
  ]),
);
type AdapterMap = Parameters<typeof createMapLibreAdapter>[2];
type AdapterLibre = Parameters<typeof createMapLibreAdapter>[3];

afterEach(() => resetTiers());

/** Scale x and y into clip space with w = 1, so Mercator (0.5, 0.5) lands mid-canvas. */
const FLAT = [2, 0, 0, 0, 0, -2, 0, 0, 0, 0, 1, 0, -1, 1, 0, 1];

describe('altitude projection', () => {
  it('projects Mercator coordinates through a clip matrix to CSS pixels', () => {
    expect(projectThroughMatrix(FLAT, { x: 0.5, y: 0.5, z: 0 }, 800, 600)).toEqual({
      x: 400,
      y: 300,
    });
    expect(projectThroughMatrix(FLAT, { x: 0.75, y: 0.25, z: 0 }, 800, 600)).toEqual({
      x: 600,
      y: 150,
    });
    // Behind the camera (w ≤ 0) there is no screen position.
    const behind = [...FLAT];
    behind[15] = -1;
    expect(projectThroughMatrix(behind, { x: 0.5, y: 0.5, z: 0 }, 800, 600)).toBeUndefined();
  });

  it('adds its probe only when asked for a height, and uses the ground on the globe', () => {
    const layers = new Map<string, { render: (gl: unknown, args: unknown) => void }>();
    let projection = 'mercator';
    const map = {
      project: () => ({ x: 1, y: 2 }),
      getProjection: () => ({ type: projection }),
      getLayer: (id: string) => layers.get(id),
      addLayer: (layer: { id: string; render: (gl: unknown, args: unknown) => void }) => {
        layers.set(layer.id, layer);
        layer.render(undefined, { defaultProjectionData: { mainMatrix: FLAT } });
      },
      removeLayer: (id: string) => layers.delete(id),
      triggerRepaint: vi.fn(),
      getCanvas: () => ({ clientWidth: 800, clientHeight: 600 }),
      terrain: undefined,
    };
    const fromLngLat = vi.fn((_at: [number, number], altitude: number) => ({
      x: 0.5,
      y: 0.5 - altitude / 1e6,
      z: 0,
    }));
    const projector = createAltitudeProjector(map as unknown as AdapterMap, { fromLngLat });
    expect(projector.project([0, 0], 0)).toEqual({ x: 1, y: 2 });
    expect(layers.size).toBe(0);
    // Higher is further north in this fake, so the point rises on screen.
    expect(projector.project([0, 0], 100000)).toEqual({ x: 400, y: 240 });
    expect(fromLngLat).toHaveBeenLastCalledWith([0, 0], 100000);
    projection = 'globe';
    expect(projector.project([0, 0], 100000)).toEqual({ x: 1, y: 2 });
    projector.dispose();
    expect(layers.size).toBe(0);
  });

  it('turns a numeric-height value into metres, linear from zero', () => {
    const scale = {
      kind: 'numeric-height',
      domain: [0, 200],
      maxHeightMeters: 30000,
    } as Extract<ResolvedScale, { kind: 'numeric-height' }>;
    expect(heightMeters(scale, 200)).toBe(30000);
    expect(heightMeters(scale, 50)).toBe(7500);
    expect(heightMeters(scale, null)).toBe(0);
    expect(heightMeters(scale, -4)).toBe(0);
  });
});

describe('renderer tiers', () => {
  /** The fixture with its first scene's layer drawn by the deck tier. */
  function deckStory(): CompiledStory {
    const story = structuredClone(fixture);
    Object.assign(story.scenes[0]!.layers[0]!, {
      technique: 'arc',
      geometry: 'line',
      backend: 'deck',
    });
    return story;
  }
  const baseMap = () => ({
    getSource: () => undefined,
    addSource: vi.fn(),
    getStyle: () => ({ layers: [] }),
    addLayer: vi.fn(),
    getLayer: () => undefined,
    setPaintProperty: vi.fn(),
  });

  it('refuses a story whose tier script is not loaded', () => {
    expect(() =>
      createMapLibreAdapter(
        deckStory(),
        sourceData,
        baseMap() as unknown as AdapterMap,
        {} as AdapterLibre,
      ),
    ).toThrow('Renderer tier deck is not loaded');
  });

  it('routes deck layers to their tier and keeps MapLibre layers in the map', async () => {
    const calls: string[] = [];
    const drawn = vi.fn(() => Promise.resolve());
    const tier: TierLayers = {
      bindLayer: (layer) => calls.push(`bind ${layer.runtimeId}`),
      unbindLayer: (id) => calls.push(`unbind ${id}`),
      setControl: (id, property) => calls.push(`control ${id} ${property}`),
      setLayerProperty: (id, property, value) => calls.push(`${property} ${id} ${value}`),
      staggerCount: () => 3,
      setLayerFeatureValues: (id, property) => calls.push(`stagger ${id} ${property}`),
      whenDrawn: drawn,
      dispose: () => calls.push('dispose'),
    };
    const factory = vi.fn(() => tier);
    registerTier('deck', factory);
    expect(() => registerTier('deck', factory)).toThrow(/already registered/);
    const story = deckStory();
    const map = baseMap();
    const adapter = createMapLibreAdapter(
      story,
      sourceData,
      map as unknown as AdapterMap,
      {} as AdapterLibre,
    );
    expect(factory).toHaveBeenCalledTimes(1);
    const deck = story.scenes[0]!.layers[0]!;
    const libre = story.scenes[1]!.layers[0]!;
    adapter.bindLayer(deck);
    adapter.bindLayer(libre);
    expect(map.addLayer).toHaveBeenCalledTimes(1);
    expect(map.addLayer.mock.calls[0]![0]).toMatchObject({ id: libre.runtimeId });
    adapter.setLayerProperty(deck.runtimeId, 'trail', 0.5);
    adapter.setControl(deck.runtimeId, 'opacity', 0.4);
    const stagger = { delayMs: 50, order: 'data' as const };
    expect(adapter.staggerCount(deck.runtimeId, stagger)).toBe(3);
    adapter.setLayerFeatureValues(deck.runtimeId, 'opacity', stagger, () => 1);
    await adapter.whenDrawn();
    expect(drawn).toHaveBeenCalled();
    adapter.unbindLayer(deck.runtimeId);
    adapter.dispose();
    expect(calls).toEqual([
      `bind ${deck.runtimeId}`,
      `trail ${deck.runtimeId} 0.5`,
      `control ${deck.runtimeId} opacity`,
      `stagger ${deck.runtimeId} opacity`,
      `unbind ${deck.runtimeId}`,
      'dispose',
    ]);
    // MapLibre layers do not draw V2 tracks until steps M and N.
    expect(() => adapter.setLayerProperty(libre.runtimeId, 'grow', 1)).toThrow(/grow tracks/);
  });

  it('reports a column as two symbols, its base and its top', () => {
    const story = structuredClone(fixture);
    const scale = story.scales[0]!;
    const height = {
      id: scale.id,
      memberKeys: scale.memberKeys,
      unit: scale.unit,
      title: scale.title,
      unitLabel: scale.unitLabel,
      noDataLabel: scale.noDataLabel,
      noDataColor: scale.noDataColor,
      counts: scale.counts,
      kind: 'numeric-height',
      domain: [0, 200],
      mapping: 'linear',
      maxHeightMeters: 30000,
      tallest: { value: 200, label: '200' },
    } satisfies ResolvedScale;
    story.scales[0] = height;
    const layer = story.scenes[0]!.layers[0]!;
    layer.technique = 'column';
    const map = {
      ...baseMap(),
      getLayer: () => true,
      project: () => ({ x: 10, y: 20 }),
      getProjection: () => ({ type: 'mercator' }),
      getCanvas: () => ({ clientWidth: 800, clientHeight: 600 }),
    };
    const adapter = createMapLibreAdapter(
      story,
      sourceData,
      map as unknown as AdapterMap,
      {
        MercatorCoordinate: { fromLngLat: () => ({ x: 0, y: 0, z: 0 }) },
      } as unknown as AdapterLibre,
    );
    adapter.bindLayer(layer);
    const projected = vi.spyOn(adapter, 'projectAltitude').mockReturnValue({ x: 10, y: 5 });
    const symbols = adapter.drawnSymbols();
    const features = (sourceData['period-a'] as { features: { properties: { value: unknown } }[] })
      .features;
    const tall = features.filter((feature) => heightMeters(height, feature.properties.value) > 0);
    expect(symbols).toHaveLength(features.length + tall.length);
    expect(symbols.filter((symbol) => symbol.y === 5)).toHaveLength(tall.length);
    expect(projected).toHaveBeenCalledTimes(tall.length);
  });
});
