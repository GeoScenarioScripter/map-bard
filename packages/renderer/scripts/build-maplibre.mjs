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
await build({
  entryPoints: [require.resolve('maplibre-gl/dist/maplibre-gl-worker.mjs')],
  outfile: `${directory}/maplibre-gl-worker.js`,
  bundle: true,
  platform: 'browser',
  format: 'iife',
  target: 'es2020',
  minify: true,
});
