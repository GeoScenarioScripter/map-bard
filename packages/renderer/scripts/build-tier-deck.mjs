import console from 'node:console';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath, URL } from 'node:url';
import { gzipSync } from 'node:zlib';
import { build } from 'esbuild';

// The deck tier is its own IIFE, loaded only by stories with a deck backend layer. It registers
// itself with the player, so it never bundles player code or MapLibre: `@deck.gl/maplibre`
// imports `maplibre-gl` for types only, and the page's global is the one MapLibre.
const entry = fileURLToPath(new URL('../player/tiers/deck/entry.ts', import.meta.url));
const outfile = fileURLToPath(new URL('../dist/vendor/tier-deck.js', import.meta.url));
await mkdir(fileURLToPath(new URL('../dist/vendor/', import.meta.url)), { recursive: true });
const result = await build({
  entryPoints: [entry],
  outfile,
  bundle: true,
  platform: 'browser',
  format: 'iife',
  target: 'es2020',
  minify: true,
  metafile: true,
  external: ['maplibre-gl'],
  define: { 'process.env.NODE_ENV': '"production"' },
  legalComments: 'none',
});
const imports = Object.values(result.metafile.outputs).flatMap((output) => output.imports);
if (imports.length) throw new Error(`Unexpected browser imports: ${JSON.stringify(imports)}`);
const inputs = Object.keys(result.metafile.inputs);
// Pure, type-only-dependent helpers (resolved-style.ts) may be shared; the player itself may not.
if (
  inputs.some(
    (path) =>
      /node_modules[\\/](\.pnpm[\\/])?maplibre-gl/.test(path) ||
      /player\/(?!tiers\/|resolved-style\.ts$)/.test(path),
  )
)
  throw new Error(`The deck tier bundled player or MapLibre code: ${JSON.stringify(inputs)}`);
// Each tier has its own budget (m2-visual.md, V2 done-when 4); fail the build well before it.
const gzip = gzipSync(await readFile(outfile), { level: 9 }).length;
if (gzip > 400 * 1024) throw new Error(`tier-deck.js is ${gzip} B gzip, over 400 KB`);
console.log(`Built deck tier: ${outfile} (${(gzip / 1024).toFixed(1)} KB gzip)`);
