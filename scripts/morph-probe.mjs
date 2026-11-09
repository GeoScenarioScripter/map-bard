// Synthetic load probe, never a published observation or a flagship data source.
// node scripts/morph-probe.mjs [output-dir] [feature-count] [--swiftshader]
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { launchBrowser } from 'mapbard';

const args = process.argv.slice(2);
const swiftshader = args.includes('--swiftshader');
const [directory = 'out/morph-probe', features = '1000'] = args.filter(
  (arg) => arg !== '--swiftshader',
);
const out = resolve(directory);
const count = Number(features);
assert(Number.isInteger(count) && count > 0 && count <= 10000);
await mkdir(join(out, 'data'), { recursive: true });
const json = (path, value) => writeFile(path, JSON.stringify(value, null, 2) + '\n');
const resources = ['before', 'after'].map((id) => ({
  id,
  kind: 'geojson',
  path: `data/${id}.geojson`,
  crs: 'EPSG:4326',
  featureId: { method: 'geojson-id', scope: 'source' },
  attributes: [
    {
      name: 'value',
      observedType: 'number',
      inferredLevel: 'ratio',
      role: 'quantity',
      level: 'ratio',
      unit: 'test units',
      label: 'Synthetic value',
    },
  ],
  observationLabel: id,
  attribution: {
    label: 'MapBard deterministic synthetic performance fixture',
    license: 'MIT',
    qualification: 'Generated test values; not observations.',
  },
}));
await json(join(out, 'mapbard.json'), {
  formatVersion: '0.2.0',
  id: 'morph-probe',
  title: 'Synthetic morph performance probe',
  intent: 'Measure 1,000-feature morph cost; no real-world claim.',
  basemap: { provider: 'none' },
  resources: { data: resources, media: [] },
});
for (const [period, resource] of resources.entries()) {
  await json(join(out, resource.path), {
    type: 'FeatureCollection',
    features: Array.from({ length: count }, (_, i) => ({
      type: 'Feature',
      id: `test-${i}`,
      properties: { value: period ? 10 + (i % 31) : 50 + (i % 51) },
      geometry: {
        type: 'Point',
        coordinates: [-77.9 + (i % 40) * 0.015, 39 + Math.floor(i / 40) * 0.015],
      },
    })),
  });
}
await json(join(out, 'story.json'), {
  formatVersion: '0.2.0',
  scenes: resources.map(({ id }, index) => ({
    id,
    title: `Synthetic ${id}`,
    narration: 'Generated performance fixture, not observations.',
    camera: { center: [-77.6, 39.2], zoom: 9, pitch: 45 },
    annotations: [],
    layers: [
      {
        id: 'columns',
        technique: 'column',
        sourceId: id,
        encode: { attribute: 'value', visualVariable: 'height' },
        column: { radiusMeters: 300 },
        ...(index ? { transition: { from: { sceneId: 'before' } } } : {}),
      },
    ],
    ...(index
      ? { motion: { layers: [{ layerId: 'columns', property: 'morph', mode: 'scrub' }] } }
      : {}),
  })),
  sharedScales: [
    {
      id: 'values',
      visualVariable: 'height',
      maxHeightMeters: 4000,
      members: resources.map(({ id }) => ({
        sceneId: id,
        sourceId: id,
        layerId: 'columns',
        observationLabel: id,
      })),
    },
  ],
});
execFileSync(
  process.execPath,
  [
    'packages/cli/dist/bin.js',
    '--project',
    out,
    '--json',
    'build',
    '--offline',
    '--out',
    'publication',
  ],
  { stdio: 'pipe' },
);
// Match frame-probe.mjs by default; opt into the slower canonical screenshot renderer.
const browser = await launchBrowser(process.env, swiftshader ? undefined : []);
const reports = [];
try {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.route(/^https?:/, (route) => route.abort());
    await page.addInitScript(() => {
      globalThis.MAPBARD_CAPTURE = true;
      // Capture the production adapter without adding test hooks to the shipped player.
      Object.defineProperty(globalThis, 'MapBardCompiledPlayer', {
        configurable: true,
        set(api) {
          Object.defineProperty(globalThis, 'MapBardCompiledPlayer', { value: api });
          const create = api.createMapLibreAdapter;
          api.createMapLibreAdapter = (...args) => {
            const adapter = create(...args);
            globalThis.__probe = { adapter, map: args[2], story: args[0] };
            return adapter;
          };
        },
      });
    });
    await page.goto(pathToFileURL(join(out, 'publication/index.html')).href);
    await page.waitForSelector('html[data-mb-state="ready"]');
    await page.evaluate(async () => {
      globalThis.MapBardStory.seek('after', 0);
      await globalThis.MapBardStory.whenIdle();
    });
    const report = await page.evaluate(async () => {
      const { map, adapter, story } = globalThis.__probe;
      const layer = story.scenes.find((s) => s.id === 'after').layers[0];
      const frames = [],
        updates = [];
      let last,
        rendered = 0;
      const onRender = () => {
        rendered++;
      };
      map.on('render', onRender);
      for (let i = 0; i < 180; i++) {
        const now = await new Promise(globalThis.requestAnimationFrame);
        if (i > 10) frames.push(now - last);
        last = now;
        const start = globalThis.performance.now();
        adapter.setLayerProperty(layer.runtimeId, 'morph', (i % 60) / 59);
        if (i > 10) updates.push(globalThis.performance.now() - start);
      }
      map.off('render', onRender);
      adapter.setLayerProperty(layer.runtimeId, 'morph', 1);
      await globalThis.MapBardStory.whenIdle();
      const stats = (values) => {
        const sorted = [...values].sort((a, b) => a - b);
        const at = (p) => Math.round(sorted[Math.floor(p * sorted.length)] * 100) / 100;
        return { samples: sorted.length, p50Ms: at(0.5), p95Ms: at(0.95), p99Ms: at(0.99) };
      };
      const gl = map.getCanvas().getContext('webgl2');
      const debug = gl?.getExtension('WEBGL_debug_renderer_info');
      const renderer = debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : 'unavailable';
      return { frames: stats(frames), updateCost: stats(updates), rendered, renderer };
    });
    await page.screenshot({ path: join(out, `morph-${viewport.width}.png`) });
    assert.deepEqual(errors, []);
    assert(report.rendered > 0);
    reports.push({ viewport, count, browser: `Chromium ${browser.version()}`, ...report });
    await page.close();
  }
} finally {
  await browser.close();
}
await json(join(out, 'report.json'), {
  renderer: swiftshader ? 'forced SwiftShader' : 'default WebGL',
  reports,
});
console.log(JSON.stringify(reports, null, 2));
