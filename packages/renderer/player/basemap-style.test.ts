import { describe, expect, it } from 'vitest';
import { BASEMAP_PROVIDERS, resolveBasemap } from '@mapbard/knowledge';
import {
  hillshadeBefore,
  providerCredit,
  terrainCredit,
  styleBasemap,
  tintOperations,
  type StyleTarget,
} from './basemap-style.js';

// Layer IDs and source layers as published by OpenFreeMap positron and VersaTiles colorful.
const LAYERS = [
  { id: 'background', type: 'background' },
  { id: 'water', type: 'fill', 'source-layer': 'water' },
  { id: 'landcover_wood', type: 'fill', 'source-layer': 'landcover' },
  { id: 'waterway', type: 'line', 'source-layer': 'waterway' },
  { id: 'land-park', type: 'fill', 'source-layer': 'land' },
  { id: 'street-primary', type: 'line', 'source-layer': 'streets' },
  { id: 'boundary_state', type: 'line', 'source-layer': 'boundary' },
  { id: 'building-3d', type: 'fill-extrusion', 'source-layer': 'building' },
  { id: 'custom-hatch', type: 'fill', 'source-layer': 'something_else' },
  { id: 'place_city', type: 'symbol', layout: { 'text-field': '{name}' } },
  { id: 'poi_icon', type: 'symbol', layout: { 'icon-image': 'dot' } },
];
const basemap = resolveBasemap({
  provider: 'openfreemap',
  labels: 'minimal',
  terrain: { provider: 'mapterhorn' },
  projection: 'globe',
});
if (basemap.provider === 'none' || !basemap.tint) throw new Error('expected a tinted basemap');
const tint = basemap.tint;

function fakeMap() {
  const calls: unknown[][] = [];
  const record =
    (name: string) =>
    (...args: unknown[]) => {
      calls.push([name, ...args]);
    };
  const map: StyleTarget = {
    getStyle: () => ({ layers: LAYERS }),
    setPaintProperty: record('paint'),
    setLayoutProperty: record('layout'),
    addSource: record('source'),
    addLayer: record('layer'),
    setTerrain: record('terrain'),
    setSky: record('sky'),
    setProjection: record('projection'),
  };
  return { map, calls };
}

describe('basemap tint', () => {
  it('recolours known surfaces and labels and leaves unknown layers alone', () => {
    expect(tintOperations(LAYERS, tint)).toEqual([
      ['background', 'background-color', tint.land],
      ['water', 'fill-color', tint.water],
      ['landcover_wood', 'fill-color', tint.landcover],
      ['waterway', 'line-color', tint.water],
      ['land-park', 'fill-color', tint.landcover],
      ['street-primary', 'line-color', tint.road],
      ['boundary_state', 'line-color', tint.boundary],
      ['building-3d', 'fill-extrusion-color', tint.building],
      ['place_city', 'text-color', tint.label],
      ['place_city', 'text-halo-color', tint.labelHalo],
    ]);
  });

  it('puts hillshade below the first road, boundary, building or label layer', () => {
    expect(hillshadeBefore(LAYERS)).toBe('street-primary');
    expect(hillshadeBefore([{ id: 'background', type: 'background' }])).toBeUndefined();
  });
});

describe('styleBasemap', () => {
  it('applies projection, sky, labels, tint, terrain and hillshade in order', () => {
    const { map, calls } = fakeMap();
    styleBasemap(map, basemap, true);
    const names = calls.map((call) => call[0]);
    expect(names.slice(0, 2)).toEqual(['projection', 'sky']);
    expect(calls[0]).toEqual(['projection', { type: 'globe' }]);
    expect(calls).toContainEqual(['layout', 'place_city', 'visibility', 'none']);
    expect(calls).toContainEqual(['paint', 'water', 'fill-color', tint.water]);
    expect(calls).toContainEqual(['terrain', { source: 'mb-terrain', exaggeration: 1 }]);
    const hillshade = calls.find((call) => call[0] === 'layer');
    expect(hillshade?.[1]).toMatchObject({ id: 'mb-hillshade', source: 'mb-hillshade' });
    expect(hillshade?.[2]).toBe('street-primary');
    expect(calls.filter((call) => call[0] === 'source').map((call) => call[1])).toEqual([
      'mb-terrain',
      'mb-hillshade',
    ]);
  });

  it('keeps request-free settings on the local fallback and offline', () => {
    const { map, calls } = fakeMap();
    styleBasemap(map, basemap, false);
    expect(calls.map((call) => call[0])).toEqual(['projection', 'sky']);
    const offline = fakeMap();
    styleBasemap(offline.map, resolveBasemap({ provider: 'openfreemap', sky: false }, true), true);
    expect(offline.calls).toEqual([['projection', { type: 'mercator' }]]);
  });
});

describe('providerCredit', () => {
  const openfreemap = BASEMAP_PROVIDERS.openfreemap.attribution;

  it('leaves out what the style already credits, so OpenFreeMap appears once', () => {
    // The source attribution OpenFreeMap styles carry.
    const own =
      '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> <a href="https://www.openmaptiles.org/" target="_blank">&copy; OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>';
    expect(providerCredit(openfreemap, [own])).toBe('');
    expect(providerCredit(BASEMAP_PROVIDERS.versatiles.attribution, ['© OpenStreetMap'])).toBe(
      '© VersaTiles',
    );
  });

  it('keeps the whole credit when the style credits nothing', () => {
    expect(providerCredit(openfreemap, [])).toBe(openfreemap);
  });

  it('links the Mapterhorn credit to its list of elevation sources', () => {
    if (basemap.provider === 'none' || !basemap.terrain) throw new Error('expected terrain');
    expect(terrainCredit(basemap.terrain)).toBe(
      '<a href="https://mapterhorn.com/attribution/" target="_blank" rel="noopener">© Mapterhorn</a>',
    );
    expect(terrainCredit({ attribution: 'A & B' })).toBe('A &amp; B');
  });
});
