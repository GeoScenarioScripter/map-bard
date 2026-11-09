import { describe, expect, it, vi } from 'vitest';
import { compileProject, loadProject } from '@mapbard/core';
import { STAGE1_CAPABILITIES } from '@mapbard/knowledge';
import { COLUMN_SIDES, columnFootprints, footprintRing } from './columns.js';
import { createMapLibreAdapter, metresPerPixel, styleLight } from './maplibre-adapter.js';
import { changeLegend, legendMarkup } from './legend.js';
import {
  GHOST_WIDTH,
  footprintSourceId,
  ghostLayerId,
  heightMeters,
  layerStyles,
  stateKey,
} from './resolved-style.js';
import type { CompiledLayer, CompiledStory } from './types.js';

// The compiled MapLibre technique gallery (step 5.2, M), with its derived sources.
const loaded = await loadProject(
  new URL('../../../fixtures/visual/gallery-maplibre', import.meta.url).pathname.replace(
    /^\/([A-Za-z]:)/,
    '$1',
  ),
);
if (!loaded.ok) throw new Error(JSON.stringify(loaded.diagnostics));
const result = compileProject(loaded.value, STAGE1_CAPABILITIES, { offline: true });
if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
const story: CompiledStory = result.value;
const data: Record<string, unknown> = { ...loaded.value.dataMap };
for (const source of story.derived) data[source.id] = source.data;

const layer = (sceneId: string, layerId: string): CompiledLayer =>
  story.scenes
    .find((scene) => scene.id === sceneId)!
    .layers.find((item) => item.authoredLayerId === layerId)!;
const colors = { accent: '#0b3d91', labelHalo: '#ffffff', ink: '#1b2a26', muted: '#455a55' };

type Call = [string, ...unknown[]];
function fakeMap() {
  const calls: Call[] = [];
  const sources = new Map<string, Record<string, unknown>>();
  const layers = new Map<string, Record<string, unknown>>();
  const states = new Map<string, Record<string, number>>();
  const map = {
    calls,
    sources,
    layers,
    states,
    getSource: (id: string) => sources.get(id),
    addSource: (id: string, source: Record<string, unknown>) => sources.set(id, source),
    removeSource: (id: string) => sources.delete(id),
    getLayer: (id: string) => layers.get(id),
    addLayer: (spec: { id: string }) => layers.set(spec.id, spec),
    removeLayer: (id: string) => layers.delete(id),
    getStyle: () => ({ layers: [] }),
    setLight: (light: unknown) => calls.push(['setLight', light]),
    setPaintProperty: (id: string, name: string, value: unknown) =>
      calls.push(['paint', id, name, value]),
    setFeatureState: (target: { source: string; id: number }, state: Record<string, number>) =>
      states.set(`${target.source}#${target.id}`, {
        ...states.get(`${target.source}#${target.id}`),
        ...state,
      }),
    project: () => ({ x: 0, y: 100 }),
    getZoom: () => 8,
  };
  return map;
}
const adapterFor = (map: ReturnType<typeof fakeMap>, compiled = story) =>
  createMapLibreAdapter(
    compiled,
    data,
    map as unknown as Parameters<typeof createMapLibreAdapter>[2],
    {} as Parameters<typeof createMapLibreAdapter>[3],
  );

describe('column footprints', () => {
  it('tessellate a closed 24-sided ring at the radius', () => {
    const ring = footprintRing([-77.5, 39.3], 1800);
    expect(ring).toHaveLength(COLUMN_SIDES + 1);
    expect(ring[0]).toEqual(ring[COLUMN_SIDES]);
    const lat = (39.3 * Math.PI) / 180;
    for (const [lng, at] of ring.slice(0, -1)) {
      const dx = (lng - -77.5) * 111320 * Math.cos(lat);
      const dy = (at - 39.3) * 111320;
      expect(Math.hypot(dx, dy)).toBeCloseTo(1800, -1);
    }
  });

  it('keep one feature per source feature, in order, with its properties', () => {
    const footprints = columnFootprints(
      {
        features: [
          { geometry: { type: 'Point', coordinates: [0, 0] }, properties: { v: 1 } },
          { geometry: null, properties: { v: 2 } },
          {
            geometry: {
              type: 'MultiPoint',
              coordinates: [
                [1, 1],
                [2, 2],
              ],
            },
            properties: null,
          },
        ],
      },
      100,
    );
    expect(footprints.features.map((f) => f.properties)).toEqual([{ v: 1 }, { v: 2 }, {}]);
    expect(
      footprints.features.map((f) => (f.geometry as { coordinates: unknown[] }).coordinates.length),
    ).toEqual([1, 0, 2]);
  });
});

describe('3D and change styles', () => {
  it('draw columns as fill-extrusion on a footprint source, grown and on the height scale', () => {
    const column = layer('columns', 'gauges');
    const { specs, footprints } = layerStyles(column, story.scales, colors);
    expect(footprints).toEqual([{ id: footprintSourceId(column.runtimeId), radiusMeters: 1800 }]);
    expect(specs).toHaveLength(1);
    expect(specs[0]).toMatchObject({ type: 'fill-extrusion', source: footprints[0]!.id });
    expect(specs[0]!.paint['fill-extrusion-height']).toEqual([
      '*',
      [
        '*',
        30000 / 23600,
        ['min', 23600, ['max', 0, ['to-number', ['get', 'daily_mean_discharge'], 0]]],
      ],
      ['coalesce', ['feature-state', stateKey(column.runtimeId, 'grow')], 1],
    ]);
  });

  it('blend morphs from the transition value by feature state', () => {
    const morph = layer('morph', 'gauges');
    const height = layerStyles(morph, story.scales, colors).specs[0]!.paint[
      'fill-extrusion-height'
    ] as unknown[];
    expect(JSON.stringify(height)).toContain(
      JSON.stringify(['coalesce', ['feature-state', stateKey(morph.runtimeId, 'morph')], 1]),
    );
    expect(JSON.stringify(height)).toContain('"mb:from"');
  });

  it('draw change columns as a solid and a wider translucent ghost, coloured by sign', () => {
    const change = layer('change-height', 'gauges');
    const { specs, footprints } = layerStyles(change, story.scales, colors);
    expect(specs.map((spec) => spec.id)).toEqual([
      change.runtimeId,
      ghostLayerId(change.runtimeId),
    ]);
    expect(footprints.map((f) => f.radiusMeters)).toEqual([1800, 1800 * GHOST_WIDTH]);
    expect(specs[0]!.paint['fill-extrusion-color']).toEqual([
      'match',
      ['get', 'mb:sign'],
      -1,
      '#b2182b',
      1,
      '#2166ac',
      change.change!.colors.unchanged,
    ]);
    expect(specs[1]!.paint['fill-extrusion-opacity']).toBeLessThan(0.5);
    // The comparison must use the theme's foreground contrast, including dark maps.
    expect(specs[1]!.paint['fill-extrusion-color']).toBe(colors.ink);
    const key = changeLegend(change.change!, colors);
    expect(key).toContain(
      `fill="${colors.ink}" fill-opacity="${specs[1]!.paint['fill-extrusion-opacity']}"`,
    );
  });

  it('draw change symbols as a disc and a ring on the size scale', () => {
    const change = layer('change-size', 'gauges');
    const { specs } = layerStyles(change, story.scales, colors);
    expect(specs.map((spec) => spec.type)).toEqual(['circle', 'circle']);
    expect(specs[1]!.paint['circle-opacity']).toBe(0);
    expect(JSON.stringify(specs[1]!.paint['circle-radius'])).toContain('"mb:before"');
  });

  it('colour extrusions and hexbins from their classes, flat or extruded', () => {
    const extrusion = layerStyles(layer('extrusion', 'density'), story.scales, colors).specs[0]!;
    expect(extrusion.type).toBe('fill-extrusion');
    expect(JSON.stringify(extrusion.paint['fill-extrusion-color'])).toContain('"step"');
    expect(layerStyles(layer('hexbin-flat', 'quakes'), story.scales, colors).specs[0]!.type).toBe(
      'fill',
    );
    expect(
      layerStyles(layer('hexbin-extruded', 'quakes'), story.scales, colors).specs[0]!.type,
    ).toBe('fill-extrusion');
  });
});

describe('MapLibre adapter, 3D layers', () => {
  it('prepares column-top projection before idle without a callout overlay', () => {
    const map = {
      ...fakeMap(),
      triggerRepaint: vi.fn(),
      getProjection: () => ({ type: 'mercator' }),
      getCanvas: () => ({ clientWidth: 800, clientHeight: 600 }),
    };
    const adapter = createMapLibreAdapter(
      story,
      data,
      map as unknown as Parameters<typeof createMapLibreAdapter>[2],
      {
        MercatorCoordinate: {
          fromLngLat: (_at: [number, number], height: number) => ({
            x: 0,
            y: 0,
            z: height / 100000,
          }),
        },
      } as unknown as Parameters<typeof createMapLibreAdapter>[3],
    );
    adapter.bindLayer(layer('columns', 'gauges'));
    const probe = map.layers.get('mb-altitude-probe') as unknown as {
      render(gl: unknown, args: { defaultProjectionData: { mainMatrix: number[] } }): void;
    };
    expect(probe).toBeDefined();
    // A pitched projection makes positive altitude visibly different from the ground.
    probe.render(null, {
      defaultProjectionData: { mainMatrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1] },
    });
    expect(adapter.projectAltitude([-77.5, 39.3], 10000)).toEqual({ x: 400, y: 270 });
    adapter.dispose();
    expect(map.layers.has('mb-altitude-probe')).toBe(false);
  });

  it('shades 3D stories with the theme light, and leaves flat ones alone', () => {
    const map = fakeMap();
    adapterFor(map);
    expect(map.calls).toEqual([['setLight', styleLight(story.theme.light)]]);
    expect(styleLight({ azimuth: 315, altitude: 45, intensity: 0.4, color: '#ffffff' })).toEqual({
      anchor: 'map',
      position: [1.15, 315, 45],
      color: '#ffffff',
      intensity: 0.4,
    });
    const flat = structuredClone(story);
    flat.scenes = flat.scenes.filter(
      (scene) => scene.id === 'hexbin-flat' || scene.id === 'change-size',
    );
    const flatMap = fakeMap();
    adapterFor(flatMap, flat);
    expect(flatMap.calls).toEqual([]);
  });

  it('adds and removes the footprint sources with the layer', () => {
    const map = fakeMap();
    const adapter = adapterFor(map);
    const change = layer('change-height', 'gauges');
    adapter.bindLayer(change);
    expect([...map.sources.keys()].sort()).toEqual(
      [
        change.sourceId,
        footprintSourceId(change.runtimeId),
        footprintSourceId(change.runtimeId, true),
      ].sort(),
    );
    expect([...map.layers.keys()]).toEqual([change.runtimeId, ghostLayerId(change.runtimeId)]);
    adapter.unbindLayer(change.runtimeId);
    expect(map.sources.size).toBe(0);
    expect(map.layers.size).toBe(0);
  });

  it('morphs heights through feature state on every feature', () => {
    const map = fakeMap();
    const adapter = adapterFor(map);
    const morph = layer('morph', 'gauges');
    adapter.bindLayer(morph);
    const altitude = vi.spyOn(adapter, 'projectAltitude').mockReturnValue({ x: 0, y: 0 });
    const scale = story.scales.find((item) => item.id === morph.scaleId)!;
    if (scale.kind !== 'numeric-height') throw new Error('expected a height scale');
    const tops = (value: number) => {
      adapter.setLayerProperty(morph.runtimeId, 'morph', value);
      altitude.mockClear();
      adapter.drawnSymbols();
      return altitude.mock.calls.map(([, height]) => Math.round(height));
    };
    const key = stateKey(morph.runtimeId, 'morph');
    tops(0);
    const source = footprintSourceId(morph.runtimeId);
    expect([0, 1, 2].map((id) => map.states.get(`${source}#${id}`)?.[key])).toEqual([0, 0, 0]);
    // From 2024 (5,580; 23,600; 17,300) to 2025 (580; 2,020; 1,800) on one height scale.
    expect(tops(0)).toEqual([5580, 23600, 17300].map((v) => Math.round(heightMeters(scale, v))));
    expect(tops(0.5)).toEqual([3080, 12810, 9550].map((v) => Math.round(heightMeters(scale, v))));
    expect(tops(1)).toEqual([580, 2020, 1800].map((v) => Math.round(heightMeters(scale, v))));
  });

  it('grows columns one after another with a stagger, smallest first', () => {
    const map = fakeMap();
    const adapter = adapterFor(map);
    const column = layer('columns', 'gauges');
    adapter.bindLayer(column);
    const stagger = {
      delayMs: 300,
      order: 'ascending',
      attribute: 'daily_mean_discharge',
    } as const;
    expect(adapter.staggerCount(column.runtimeId, stagger)).toBe(3);
    // Rank 0 (Hancock, the smallest) has grown fully, rank 1 halfway, rank 2 not at all.
    adapter.setLayerFeatureValues(column.runtimeId, 'grow', stagger, (rank) => [1, 0.5, 0][rank]!);
    const key = stateKey(column.runtimeId, 'grow');
    const source = footprintSourceId(column.runtimeId);
    // Source order: Hancock 5,580; Point of Rocks 23,600; Little Falls 17,300.
    expect([0, 1, 2].map((id) => map.states.get(`${source}#${id}`)?.[key])).toEqual([1, 0, 0.5]);
    const altitude = vi.spyOn(adapter, 'projectAltitude').mockReturnValue({ x: 0, y: 0 });
    const symbols = adapter.drawnSymbols();
    // Point of Rocks has not risen, so it reports only its base.
    expect(symbols).toHaveLength(5);
    expect(altitude).toHaveBeenCalledTimes(2);
  });

  it('fades extrusions as a whole layer, since their opacity cannot read feature state', () => {
    const map = fakeMap();
    const adapter = adapterFor(map);
    const density = layer('extrusion', 'density');
    adapter.bindLayer(density);
    adapter.setLayerProperty(density.runtimeId, 'opacity', 0.5);
    expect(map.calls.at(-1)).toEqual(['paint', density.runtimeId, 'fill-extrusion-opacity', 0.45]);
  });

  it('converts a footprint radius to pixels at the camera zoom', () => {
    expect(1800 / metresPerPixel(8.1, 39.22)).toBeCloseTo(8.1, 1);
  });
});

describe('V2 legends', () => {
  it('name before and after by their observation labels, with a colour per sign', () => {
    const change = layer('change-height', 'gauges').change!;
    const markup = changeLegend(change, colors);
    expect(markup).toContain('<h3>Change, 2024-10-01 to 2025-10-01</h3>');
    expect(markup).toContain('<span>2024-10-01 (before)</span>');
    expect(markup).toContain('<span>2025-10-01 (after)</span>');
    expect(markup).toContain('<span>Decrease</span>');
    expect(markup).not.toContain('Increase');
  });

  it('say an extrusion title once over its colour and height keys', () => {
    const scene = story.scenes.find((item) => item.id === 'extrusion')!;
    const markup = legendMarkup(scene, story);
    expect(markup.match(/<h3>/g)).toHaveLength(1);
    expect(markup).toContain('mb-legend--classes');
    expect(markup).toContain('Height from 0 to 487.6');
  });
});
