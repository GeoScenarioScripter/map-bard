import assert from 'node:assert/strict';
import console from 'node:console';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { fileURLToPath, URL } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const html = await readFile(join(here, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script\s+src="([^"]+)"\s*><\/script>/g)].map((m) => m[1]);
assert.deepEqual(scripts, ['player.js']);
assert.doesNotMatch(html, /https?:|type="module"|\bfetch\s*\(/i);

const output = join(here, '../../../out/runtime-spike/player.js');
const code = await readFile(output, 'utf8');
assert.doesNotMatch(code, /\b(?:import|fetch)\s*\(/);
const context = { window: {} };
runInNewContext(code, context, { filename: output });
assert.equal(typeof context.window.MapBardSpike?.createPlayer, 'function');

const events = [];
const map = {
  addLayer: (id, source, radius) => events.push(['add', id, source, radius]),
  removeLayer: (id) => events.push(['remove', id]),
  setCamera: (camera) => events.push(['camera', camera.zoom]),
  addMarker: (id) => events.push(['marker', id]),
  clearMarkers: () => events.push(['clearMarkers']),
  setRadius: (id, radius) => events.push(['radius', id, radius]),
};
const scenes = [
  {
    id: 'one',
    camera: { center: [0, 0], zoom: 2 },
    layers: [{ id: 'shared', sourceId: 'old', radius: 5 }],
    markers: ['first'],
  },
  {
    id: 'two',
    camera: { center: [1, 1], zoom: 4 },
    layers: [{ id: 'shared', sourceId: 'new', radius: 10 }],
    markers: ['second'],
  },
];
const player = context.window.MapBardSpike.createPlayer(scenes, map);
player.enter('one');
player.setRadius('shared', 22);
player.enter('two');
player.enter('one');

const added = events.filter((event) => event[0] === 'add');
assert.equal(added.length, 3);
assert.notEqual(added[0][1], added[1][1]);
assert.equal(added[0][1], added[2][1]);
assert.deepEqual(
  added.map((event) => [event[2], event[3]]),
  [
    ['old', 5],
    ['new', 10],
    ['old', 5],
  ],
);
assert.deepEqual(
  events.filter((event) => event[0] === 'remove').map((event) => event[1]),
  [added[0][1], added[1][1]],
);
assert.equal(events.filter((event) => event[0] === 'clearMarkers').length, 3);
assert.deepEqual(
  events.filter((event) => event[0] === 'marker').map((event) => event[1]),
  ['first', 'second', 'first'],
);
console.log(
  'Local classic script loads in Node VM; scene IDs isolate bindings and revisits reset radius/markers.',
);
