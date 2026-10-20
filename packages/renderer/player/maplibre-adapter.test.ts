import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseCompiled } from '@mapbard/schema';
import type { ResolvedScale } from '@mapbard/schema';
import { createMapLibreAdapter } from './maplibre-adapter.js';
import { createPlayer } from './player.js';
import { layerStyle, scalePaint } from './resolved-style.js';
import { legendMarkup } from './legend.js';
import type { SceneView } from './types.js';

const parsed = parseCompiled(
  JSON.parse(
    readFileSync(
      new URL('../../core/src/compile/fixtures/compiled.g1-r1.json', import.meta.url),
      'utf8',
    ),
  ),
);
if (!parsed.ok) throw new Error(JSON.stringify(parsed.diagnostics));
const story = parsed.value;
const sourceData = {
  'period-a': JSON.parse(
    readFileSync(
      new URL('../../../fixtures/two-period/data/period-a.geojson', import.meta.url),
      'utf8',
    ),
  ),
  'period-b': JSON.parse(
    readFileSync(
      new URL('../../../fixtures/two-period/data/period-b.geojson', import.meta.url),
      'utf8',
    ),
  ),
};

const variants = JSON.parse(
  readFileSync(
    new URL('../../../fixtures/two-period/scale-variants.expected.json', import.meta.url),
    'utf8',
  ),
) as ResolvedScale[];

afterEach(() => vi.unstubAllGlobals());

describe('W3-B compiled playback against the actual W3-A fixture', () => {
  it('uses shared exact class edges and the compiler labels in both scenes', () => {
    const scale = story.scales[0]!;
    expect(scale.kind).toBe('numeric-color');
    expect(scalePaint(scale, 'value')).toEqual([
      'case',
      ['==', ['typeof', ['get', 'value']], 'number'],
      ['step', ['get', 'value'], '#edf8fb', 40, '#66c2a4', 80, '#238b45'],
      '#9e9e9e',
    ]);
    for (const scene of story.scenes) {
      expect(layerStyle(scene.layers[0]!, scale).paint['circle-color']).toEqual(
        scalePaint(scale, 'value'),
      );
      const legend = legendMarkup(scene, story);
      expect(legend).toContain('[40, 80) index points');
      expect(legend).toContain('No data');
    }
  });

  it('keeps category types, zero/constant area and constant color as resolved', () => {
    const categories = variants.find((item) => item.id === 'typed-categories')!;
    expect(scalePaint(categories, 'kind')).toContainEqual(['==', ['get', 'kind'], ['literal', 1]]);
    expect(scalePaint(categories, 'kind')).toContainEqual([
      '==',
      ['get', 'kind'],
      ['literal', '1'],
    ]);
    const zero = variants.find((item) => item.id === 'zero-size')!;
    const constant = variants.find((item) => item.id === 'constant-size')!;
    expect(scalePaint(zero, 'area')).toEqual([
      'case',
      ['==', ['typeof', ['get', 'area']], 'number'],
      0,
      3,
    ]);
    expect(scalePaint(constant, 'area')).toEqual([
      'case',
      ['==', ['typeof', ['get', 'area']], 'number'],
      8,
      3,
    ]);
    const color = variants.find((item) => item.id === 'constant-color')!;
    expect(scalePaint(color, 'value')).toEqual([
      'case',
      ['==', ['typeof', ['get', 'value']], 'number'],
      '#111111',
      '#9e9e9e',
    ]);
    const missing = variants.find((item) => item.id === 'all-missing-categories')!;
    expect(scalePaint(missing, 'kind')).toBe('#9e9e9e');
  });

  it('uses geometry-specific paint and a typed comparison filter', () => {
    const base = story.scenes[0]!.layers[0]!;
    const line = layerStyle(
      {
        ...base,
        geometry: 'line',
        technique: 'line',
        filter: { attribute: 'value', op: '>=', value: 40 },
      },
      story.scales[0],
    );
    expect(line.type).toBe('line');
    expect(line.paint['line-color']).toEqual(scalePaint(story.scales[0]!, 'value'));
    expect(line.filter).toEqual([
      'all',
      ['==', ['typeof', ['get', 'value']], 'number'],
      ['>=', ['get', 'value'], 40],
    ]);
    const polygon = layerStyle(
      { ...base, geometry: 'polygon', technique: 'choropleth' },
      story.scales[0],
    );
    expect(polygon.type).toBe('fill');
    expect(polygon.paint['fill-color']).toEqual(scalePaint(story.scales[0]!, 'value'));
    const size = variants.find((item) => item.id === 'area-size')!;
    const point = layerStyle({ ...base, technique: 'graduated-symbol', attribute: 'area' }, size);
    expect(point.paint['circle-radius']).toEqual(scalePaint(size, 'area'));
    expect(point.paint['circle-color']).toEqual([
      'case',
      ['==', ['typeof', ['get', 'area']], 'number'],
      '#0b3d91',
      '#9e9e9e',
    ]);
    expect(
      legendMarkup(
        { ...story.scenes[0]!, layers: [{ ...base, scaleId: 'area-size' }] },
        { ...story, scales: [size] },
      ),
    ).toContain('25 test units');
  });

  it('binds scene-local IDs, applies controls, and removes annotations and sources on revisit', () => {
    const events: string[] = [];
    const sources = new Set<string>();
    const layers = new Set<string>();
    const map = {
      jumpTo: () => events.push('camera'),
      easeTo: () => events.push('ease'),
      flyTo: () => events.push('fly'),
      getSource: (id: string) => sources.has(id),
      addSource: (id: string, source: { data: unknown }) => {
        expect(source.data).toEqual(sourceData[id as keyof typeof sourceData]);
        sources.add(id);
        events.push(`source:${id}`);
      },
      removeSource: (id: string) => {
        sources.delete(id);
        events.push(`remove-source:${id}`);
      },
      getLayer: (id: string) => layers.has(id),
      addLayer: (layer: { id: string; source: string; paint: Record<string, unknown> }) => {
        layers.add(layer.id);
        events.push(`layer:${layer.id}:${layer.source}`);
        expect(layer.paint['circle-color']).toEqual(scalePaint(story.scales[0]!, 'value'));
      },
      removeLayer: (id: string) => {
        layers.delete(id);
        events.push(`remove-layer:${id}`);
      },
      setLayoutProperty: vi.fn(),
      setPaintProperty: vi.fn(),
    };
    class Popup {
      setHTML() {
        return this;
      }
      remove() {
        events.push('popup:remove');
      }
    }
    class Marker {
      setLngLat() {
        return this;
      }
      setPopup() {
        return this;
      }
      addTo() {
        events.push('marker:add');
        return this;
      }
      togglePopup() {
        events.push('popup:open');
        return this;
      }
      remove() {
        events.push('marker:remove');
      }
    }
    const buttons: { type: string; className: string; setAttribute: ReturnType<typeof vi.fn> }[] =
      [];
    vi.stubGlobal('document', {
      createElement: () => {
        const button = { type: '', className: '', setAttribute: vi.fn() };
        buttons.push(button);
        return button;
      },
    });
    const adapter = createMapLibreAdapter(
      story,
      sourceData,
      map as unknown as Parameters<typeof createMapLibreAdapter>[2],
      { Popup, Marker } as unknown as Parameters<typeof createMapLibreAdapter>[3],
    );
    const view: SceneView = {
      showScene: vi.fn(() => () => events.push('view:dispose')),
      clear: vi.fn(),
    };
    const player = createPlayer(story, adapter, view);
    player.enter('a');
    expect(layers).toEqual(new Set(['mb:1:a:5:sites']));
    expect(buttons[0]!.type).toBe('button');
    expect(buttons[0]!.setAttribute).toHaveBeenCalledWith(
      'aria-label',
      'Annotation: Invented site One',
    );
    player.setControl('opacity', 0.2);
    expect(map.setPaintProperty).toHaveBeenLastCalledWith('mb:1:a:5:sites', 'circle-opacity', 0.2);
    player.enter('b');
    expect(sources).toEqual(new Set(['period-b']));
    expect(layers).toEqual(new Set(['mb:1:b:5:sites']));
    expect(events.indexOf('remove-layer:mb:1:a:5:sites')).toBeLessThan(
      events.indexOf('layer:mb:1:b:5:sites:period-b'),
    );
    player.enter('a');
    expect(map.setPaintProperty).toHaveBeenLastCalledWith('mb:1:a:5:sites', 'circle-opacity', 0.8);
    player.dispose();
    expect(sources.size).toBe(0);
    expect(layers.size).toBe(0);
    expect(events.filter((item) => item === 'marker:remove')).toHaveLength(3);
    expect(story).toEqual(parsed.value);
  });
});
