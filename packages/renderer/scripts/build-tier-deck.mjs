import console from 'node:console';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath, URL } from 'node:url';
import { build } from 'esbuild';

// The deck tier is its own IIFE, loaded only by stories with a deck backend layer. It registers
// itself with the player, so it never bundles player code or MapLibre.
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
});
const imports = Object.values(result.metafile.outputs).flatMap((output) => output.imports);
if (imports.length) throw new Error(`Unexpected browser imports: ${JSON.stringify(imports)}`);
const inputs = Object.keys(result.metafile.inputs);
if (inputs.some((path) => /maplibre-gl|player\/(?!tiers\/)/.test(path)))
  throw new Error(`The deck tier bundled player or MapLibre code: ${JSON.stringify(inputs)}`);
console.log(`Built deck tier: ${outfile}`);
