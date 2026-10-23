import { writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const require = createRequire(import.meta.url);
const directory = fileURLToPath(new URL('../dist/vendor/', import.meta.url));
await build({
  entryPoints: [require.resolve('maplibre-gl/dist/maplibre-gl.mjs')],
  outfile: `${directory}/maplibre-gl.js`,
  bundle: true,
  platform: 'browser',
  format: 'iife',
  globalName: 'maplibregl',
  target: 'es2020',
  minify: true,
});
const worker = await build({
  entryPoints: [require.resolve('maplibre-gl/dist/maplibre-gl-worker.mjs')],
  bundle: true,
  platform: 'browser',
  format: 'iife',
  target: 'es2020',
  minify: true,
  write: false,
});
// Browsers refuse `new Worker('file:///…')`, so the page loads the worker's source as a string
// with a classic script and starts the worker from a Blob URL, which works from file:// too.
await writeFile(
  `${directory}/maplibre-gl-worker.js`,
  `window.MAPBARD_MAPLIBRE_WORKER=${JSON.stringify(worker.outputFiles[0].text)};\n`,
);
