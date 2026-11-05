import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ResolvedScale } from '@mapbard/schema';
import { legendMarkup } from '../../legend.js';
import type { TierContext } from '../../tiers.js';
import type { CompiledLayer, CompiledStory } from '../../types.js';
import { createDeckTier, type DeckLibrary } from './deck-tier.js';
import { arcRows, clockLabel, hexRgba, scaleColor, staggerOrder, tripRows } from './flows-data.js';

const base = JSON.parse(
  readFileSync(
    new URL('../../../../../fixtures/two-period/compiled.expected.json', import.meta.url),
    'utf8',
  ),
) as CompiledStory;

const ARC = {
  origin: '#66c2a4',
  destination: '#0b3d91',
  greatCircle: false,
  height: 0.25,
  width: 2,
};
const TRIP = {
  timeProperty: 'times',
  start: '2024-09-24T00:00:00.000Z',
  end: '2024-09-25T00:00:00.000Z',
  durationSeconds: 86400,
  trailSeconds: 6 * 3600,
  width: 3,
  rangeLabel: 'Sep 24 to Sep 25, 2024 (UTC)',
  clock: [
    { at: 0, label: 'Sep 24, 2024, 00:00 UTC' },
    { at: 43200, label: 'Sep 24, 2024, 12:00 UTC' },
    { at: 86400, label: 'Sep 25, 2024, 00:00 UTC' },
  ],
};

const widthScale = {
  ...base.scales[0]!,
  id: 'flow-width',
  kind: 'numeric-width',
  domain: [0, 40],
  mapping: 'linear',
  maxWidth: 8,
  noDataWidth: 1,
  legend: [
    { value: 10, width: 2, label: '10' },
    { value: 20, width: 4, label: '20' },
    { value: 40, width: 8, label: '40' },
  ],
} as unknown as ResolvedScale;

const arcs = {
  type: 'FeatureCollection',
  features: [10, 40, null, 20].map((value, index) => ({
    type: 'Feature',
    properties: { value, kind: index === 3 ? 'skip' : 'keep' },
    geometry: {
      type: 'LineString',
      coordinates: [
        [-77, 39],
        [-90 + index, 35],
      ],
    },
  })),
};
const trips = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { times: ['2024-09-24T00:00:00Z', '2024-09-24T12:00:00Z'] },
      geometry: {
        type: 'LineString',
        coordinates: [
          [-80, 25],
          [-82, 30],
        ],
      },
    },
  ],
};

function story(): { story: CompiledStory; arc: CompiledLayer; trip: CompiledLayer } {
  const copy = structuredClone(base);
  const template = copy.scenes[0]!.layers[0]!;
  const arc: CompiledLayer = {
    ...template,
    runtimeId: 'mb:arc',
    sourceId: 'arcs',
    geometry: 'line',
    technique: 'arc',
    backend: 'deck',
    attribute: 'value',
    scaleId: 'flow-width',
    filter: { attribute: 'kind', op: '==', value: 'keep' },
    constant: { opacity: 0.8 },
    arc: ARC,
  };
  const trip: CompiledLayer = {
    ...template,
    runtimeId: 'mb:trip',
    sourceId: 'trips',
    geometry: 'line',
    technique: 'trip',
    backend: 'deck',
    constant: { color: '#9a3b1c' },
    trip: TRIP,
  };
  delete trip.attribute;
  delete trip.scaleId;
  copy.scenes[0]!.layers = [arc, trip];
  copy.scales.push(widthScale);
  return { story: copy, arc, trip };
}

type Recorded = { kind: 'arc' | 'trip'; props: Record<string, unknown> };

function fakeDeck() {
  const created: Recorded[] = [];
  let shown: Recorded[] = [];
  let afterRender = () => {};
  const overlay = {
    onAdd: () => ({}) as HTMLElement,
    onRemove: () => {},
    setProps: vi.fn((props: { layers: unknown[] }) => {
      shown = props.layers as Recorded[];
    }),
  };
  const library: DeckLibrary = {
    overlay: (props) => {
      afterRender = props.onAfterRender;
      expect(props.interleaved).toBe(true);
      return overlay;
    },
    arcLayer: (props) => {
      const layer = { kind: 'arc' as const, props };
      created.push(layer);
      return layer;
    },
    tripsLayer: (props) => {
      const layer = { kind: 'trip' as const, props };
      created.push(layer);
      return layer;
    },
  };
  return { library, overlay, shown: () => shown, render: () => afterRender() };
}

function fakeMap() {
  return {
    addControl: vi.fn(),
    removeControl: vi.fn(),
    triggerRepaint: vi.fn(),
    getStyle: () => ({
      layers: [
        { id: 'water', type: 'fill' },
        { id: 'place-city', type: 'symbol' },
      ],
    }),
  };
}

function tier() {
  const { story: compiled, arc, trip } = story();
  const deck = fakeDeck();
  const map = fakeMap();
  const layers = createDeckTier(deck.library)({
    story: compiled,
    data: { arcs, trips },
    map: map as unknown as TierContext['map'],
  });
  return { layers, deck, map, arc, trip, compiled };
}

afterEach(() => vi.unstubAllGlobals());

describe('deck tier data (step 5.2, N)', () => {
  it('reads hex colours as deck.gl RGBA, with alpha and opacity', () => {
    expect(hexRgba('#0b3d91')).toEqual([11, 61, 145, 255]);
    expect(hexRgba('#fff', 0.5)).toEqual([255, 255, 255, 128]);
    expect(hexRgba('#00000080')).toEqual([0, 0, 0, 128]);
  });

  it('turns arcs into rows: filtered, width on the linear scale, gradient ends, widest last', () => {
    const { arc } = story();
    const rows = arcRows(arc, widthScale, arcs);
    expect(rows.map((row) => row.index)).toEqual([2, 0, 1]);
    expect(rows.map((row) => row.width)).toEqual([1, 2, 8]);
    expect(rows[0]).toMatchObject({
      from: [-77, 39],
      to: [-88, 35],
      origin: hexRgba(ARC.origin),
      destination: hexRgba(ARC.destination),
    });
  });

  it('colours classified flows by their scale, as the MapLibre paint would', () => {
    const scale = base.scales[0]!;
    if (scale.kind !== 'numeric-color') throw new Error('fixture scale changed');
    expect(scaleColor(scale, scale.edges[0]!)).toBe(scale.colors[0]);
    expect(scaleColor(scale, scale.edges.at(-1)!)).toBe(scale.colors.at(-1));
    expect(scaleColor(scale, 'x')).toBe(scale.noDataColor);
  });

  it('gives trip vertices seconds after the start, for float32 precision', () => {
    const { trip } = story();
    const rows = tripRows(trip, undefined, trips, '#000000');
    expect(rows[0]!.timestamps).toEqual([0, 43200]);
    expect(rows[0]!.color).toEqual(hexRgba('#9a3b1c'));
  });

  it('picks the last clock label at or before a time', () => {
    expect(clockLabel(TRIP.clock, 0)).toBe('Sep 24, 2024, 00:00 UTC');
    expect(clockLabel(TRIP.clock, 43199)).toBe('Sep 24, 2024, 00:00 UTC');
    expect(clockLabel(TRIP.clock, 50000)).toBe('Sep 24, 2024, 12:00 UTC');
    expect(clockLabel(TRIP.clock, 1e9)).toBe('Sep 25, 2024, 00:00 UTC');
  });

  it('orders staggered rows largest first with missing values last', () => {
    const rows = [5, null, 9, 5].map((value) => ({ properties: { value } }));
    expect(staggerOrder(rows, { delayMs: 10, order: 'descending', attribute: 'value' })).toEqual([
      2, 0, 3, 1,
    ]);
    expect(staggerOrder(rows, { delayMs: 10, order: 'data' })).toEqual([0, 1, 2, 3]);
  });
});

describe('deck tier layers', () => {
  it('adds one interleaved overlay and binds layers below the first label', () => {
    const { layers, deck, map, arc, trip } = tier();
    expect(map.addControl).toHaveBeenCalledTimes(1);
    layers.bindLayer(arc);
    layers.bindLayer(trip);
    const [arcLayer, tripLayer] = deck.shown();
    expect(arcLayer!.props).toMatchObject({
      id: 'mb:arc',
      beforeId: 'place-city',
      pickable: false,
      opacity: 0.8,
      getHeight: 0.25,
      getTilt: 12,
      parameters: { depthCompare: 'always', depthWriteEnabled: false },
      greatCircle: false,
      widthUnits: 'pixels',
      revealFraction: 1,
    });
    expect(arcLayer!.props.data).toHaveLength(3);
    // Without a trail track a trip draws its full tracks, unfaded.
    expect(tripLayer!.props).toMatchObject({
      currentTime: 86400,
      trailLength: 86401,
      fadeTrail: false,
      opacity: 0.9,
    });
    expect(() => layers.bindLayer(arc)).toThrow(/already bound/);
    layers.unbindLayer(arc.runtimeId);
    expect(deck.shown().map((layer) => layer.props.id)).toEqual(['mb:trip']);
    layers.dispose();
    expect(map.removeControl).toHaveBeenCalledTimes(1);
  });

  it('applies opacity, highlight, line-reveal, trail and controls each frame', () => {
    const { layers, deck, arc, trip } = tier();
    const clock = { dataset: { mbClock: 'mb:trip' }, textContent: '' };
    vi.stubGlobal('document', { querySelectorAll: () => [clock] });
    layers.bindLayer(arc);
    layers.bindLayer(trip);
    expect(clock.textContent).toBe(TRIP.rangeLabel);
    layers.setLayerProperty(arc.runtimeId, 'opacity', 0.5);
    layers.setLayerProperty(arc.runtimeId, 'highlight', 1);
    layers.setLayerProperty(arc.runtimeId, 'line-reveal', 0.25);
    layers.setLayerProperty(trip.runtimeId, 'trail', 0.6);
    const [arcLayer, tripLayer] = deck.shown();
    expect(arcLayer!.props).toMatchObject({ opacity: 0.4, widthScale: 1.8, revealFraction: 0.25 });
    expect(tripLayer!.props).toMatchObject({
      currentTime: 0.6 * 86400,
      trailLength: 6 * 3600,
      fadeTrail: true,
    });
    expect(clock.textContent).toBe('Sep 24, 2024, 12:00 UTC');
    layers.setControl(arc.runtimeId, 'visibility', false);
    layers.setControl(arc.runtimeId, 'opacity', 0.2);
    expect(deck.shown()[0]!.props).toMatchObject({ visible: false, opacity: 0.1 });
    expect(() => layers.setLayerProperty(arc.runtimeId, 'trail', 1)).toThrow(/trail/);
    expect(() => layers.setLayerProperty(arc.runtimeId, 'grow', 1)).toThrow(/grow/);
  });

  it('shows full tracks under reduced motion unless the scene keeps motion', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const { layers, deck, trip } = tier();
    layers.bindLayer(trip);
    layers.setLayerProperty(trip.runtimeId, 'trail', 0.3);
    expect(deck.shown()[0]!.props).toMatchObject({ currentTime: 86400, fadeTrail: false });
  });

  it('staggers opacity per arc through its colour accessors', () => {
    const { layers, deck, arc } = tier();
    layers.bindLayer(arc);
    const stagger = { delayMs: 100, order: 'descending' as const, attribute: 'value' };
    expect(layers.staggerCount(arc.runtimeId, stagger)).toBe(3);
    // Rank 0 (the largest, 40) is fully shown; the rest are still hidden.
    layers.setLayerFeatureValues(arc.runtimeId, 'opacity', stagger, (rank) => (rank === 0 ? 1 : 0));
    const props = deck.shown()[0]!.props as {
      data: { width: number }[];
      getTargetColor: (row: unknown) => number[];
      updateTriggers: { getTargetColor: number };
    };
    const alphas = props.data.map((row) => props.getTargetColor(row)[3]);
    expect(alphas).toEqual([0, 0, 255]);
    expect(props.updateTriggers.getTargetColor).toBe(1);
  });

  it('resolves whenDrawn once the overlay has drawn after the last change', async () => {
    const frames: (() => void)[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: () => void) => frames.push(callback));
    const { layers, deck, arc } = tier();
    await layers.whenDrawn();
    layers.bindLayer(arc);
    let done = false;
    const drawn = layers.whenDrawn().then(() => (done = true));
    deck.render();
    frames.shift()?.();
    await Promise.resolve();
    expect(done).toBe(false);
    deck.render();
    frames.shift()?.();
    await drawn;
    expect(done).toBe(true);
  });
});

describe('flow legends', () => {
  it('draws width examples as lines, a direction key and a trip clock', () => {
    const { story: compiled } = story();
    compiled.resources.push(
      { id: 'arcs', kind: 'data', name: 'State-to-state movers' },
      { id: 'trips', kind: 'data', name: 'Hurricane tracks' },
    );
    const html = legendMarkup(compiled.scenes[0]!, compiled);
    expect(html).toContain('class="mb-legend-widths"');
    expect(html).toContain('stroke-width="8"');
    expect(html).toContain('From origin to destination');
    expect(html).toContain('<h3>State-to-state movers</h3>');
    expect(html).toContain('Trail: the last 6 hours');
    expect(html).toContain(`data-mb-clock="mb:trip">${TRIP.rangeLabel}</p>`);
  });

  it('draws one direction key for arc layers that split one source', () => {
    const { story: compiled, arc } = story();
    compiled.resources.push({ id: 'arcs', kind: 'data', name: 'State-to-state movers' });
    const rest: CompiledLayer = {
      ...arc,
      runtimeId: 'mb:arc-rest',
      filter: { attribute: 'kind', op: '!=', value: 'keep' },
      constant: { opacity: 0.25 },
    };
    const recoloured: CompiledLayer = {
      ...arc,
      runtimeId: 'mb:arc-recoloured',
      arc: { ...ARC, destination: '#c8102e' },
    };
    const scene = { ...compiled.scenes[0]!, layers: [arc, rest, recoloured] };
    const keys = legendMarkup(scene, compiled).match(/From origin to destination/g) ?? [];
    // The filtered halves share a key; different colours still get their own.
    expect(keys).toHaveLength(2);
  });
});
