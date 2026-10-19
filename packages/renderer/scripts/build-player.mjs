import console from 'node:console';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath, URL } from 'node:url';
import { build } from 'esbuild';

const entry = fileURLToPath(new URL('../player/entry.ts', import.meta.url));
const outfile = fileURLToPath(new URL('../dist/player/player.js', import.meta.url));
await mkdir(fileURLToPath(new URL('../dist/player/', import.meta.url)), { recursive: true });
const result = await build({
  entryPoints: [entry],
  outfile,
  bundle: true,
  platform: 'browser',
  format: 'iife',
  target: 'es2020',
  metafile: true,
});
const imports = Object.values(result.metafile.outputs).flatMap((output) => output.imports);
if (imports.length) throw new Error(`Unexpected browser imports: ${JSON.stringify(imports)}`);
console.log(`Built self-contained compiled player: ${outfile}`);
