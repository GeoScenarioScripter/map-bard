import console from 'node:console';
import { createRequire } from 'node:module';
import { fileURLToPath, URL } from 'node:url';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
// Already present transitively through Vitest/Vite in this checkout. G1 owns
// any direct dependency and lockfile decision for the actual renderer build.
const esbuild = require('../../../node_modules/.pnpm/esbuild@0.21.5/node_modules/esbuild');
const here = fileURLToPath(new URL('.', import.meta.url));
const outdir = resolve(here, '../../../out/runtime-spike');

const result = await esbuild.build({
  entryPoints: [resolve(here, 'entry.ts')],
  outfile: resolve(outdir, 'player.js'),
  bundle: true,
  platform: 'browser',
  format: 'iife',
  target: 'es2020',
  metafile: true,
});

const imports = Object.values(result.metafile.outputs).flatMap((output) => output.imports);
if (imports.length) throw new Error(`Unexpected external imports: ${JSON.stringify(imports)}`);
console.log(`Built self-contained player.js in ${outdir}`);
