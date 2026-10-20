import assert from 'node:assert/strict';
import console from 'node:console';
import { readFile } from 'node:fs/promises';
import { URL } from 'node:url';
import { runInNewContext } from 'node:vm';

const code = await readFile(
  new URL('../../../packages/renderer/runtime/app.js', import.meta.url),
  'utf8',
);
const layers = new Map();
const events = [];
const controls = { hidden: true, innerHTML: '', appendChild() {} };
const credit = { hidden: true, textContent: '' };
const element = () => ({
  classList: { toggle() {} },
  appendChild() {},
  setAttribute() {},
  addEventListener() {},
});

class MapMock {
  constructor(options) {
    this.style = options.style;
    this.scrollZoom = { disable: () => events.push(['wheel-zoom-disabled']) };
  }
  on(name, callback) {
    if (name === 'load') callback();
  }
  addControl() {}
  addLayer(layer) {
    layers.set(layer.id, globalThis.structuredClone(layer));
    events.push(['add', layer.id, layer.source]);
  }
  getLayer(id) {
    return layers.get(id);
  }
  setLayoutProperty(id, property, value) {
    events.push(['layout', id, property, value]);
  }
  setPaintProperty(id, property, value) {
    events.push(['paint', id, property, value]);
  }
  setFilter() {}
  jumpTo() {}
  flyTo() {}
  easeTo() {}
}

const narrative = {
  dataSources: [{ id: 'old' }, { id: 'new' }],
  mediaAssets: [],
  scenes: [
    {
      id: 'one',
      camera: { center: [0, 0], zoom: 2 },
      layers: [{ id: 'shared', dataSourceId: 'old', technique: 'point' }],
    },
    {
      id: 'two',
      camera: { center: [1, 1], zoom: 4 },
      layers: [{ id: 'shared', dataSourceId: 'new', technique: 'point' }],
      controls: [
        {
          id: 'size',
          kind: 'slider',
          label: 'Size',
          bindsTo: { layerId: 'shared', property: 'circle-radius' },
          range: [2, 24],
          default: 8,
        },
      ],
    },
  ],
};
const context = {
  window: {
    MAPBARD: {
      narrative,
      data: {},
      localContextMap: {
        land: { type: 'FeatureCollection', features: [] },
        streets: { type: 'FeatureCollection', features: [] },
        attribution: 'City and County of San Francisco',
      },
    },
    addEventListener() {},
  },
  document: {
    getElementById: (id) => (id === 'map-credit' ? credit : controls),
    querySelectorAll: () => [element(), element()],
    createElement: element,
  },
  maplibregl: { Map: MapMock, NavigationControl: class {} },
  scrollama: () => ({
    setup() {
      return this;
    },
    onStepEnter() {
      return this;
    },
    resize() {},
  }),
  console,
};
runInNewContext(code, context);
context.window.MapBard.goToScene(1, true);
context.window.MapBard.goToScene(0, true);

assert.deepEqual(events[0], ['wheel-zoom-disabled']);
assert.equal(context.window.MapBard.map.style.sources.__mb_context_land.type, 'geojson');
assert.equal(context.window.MapBard.map.style.sources.__mb_context_streets.type, 'geojson');
assert.equal(context.window.MapBard.map.style.layers[0].paint['background-color'], '#dce9e8');
assert.equal(context.window.MapBard.map.style.layers[1].id, '__mb_context_land');
assert.equal(context.window.MapBard.map.style.layers[3].id, '__mb_context_major_streets');
assert.equal(credit.hidden, false);
assert.equal(credit.textContent, 'City and County of San Francisco');

assert.deepEqual(
  events.filter((event) => event[0] === 'add'),
  [['add', 'shared', 'old']],
);
assert.equal(layers.get('shared').source, 'old');
assert.equal(events.filter((event) => event[0] === 'paint').length, 0);
console.log(
  'Reproduced: reused scene layer ID stays bound to first source; slider default is never applied on scene entry.',
);
