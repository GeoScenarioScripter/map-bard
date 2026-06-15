/*
 * Dev helper: render the hand-written example to ./out at the repo root.
 * Usage (after `pnpm --filter @mapbard/renderer build`):
 *   node packages/renderer/scripts/render-example.mjs
 * Superseded by the CLI (`mapbard build`) once M6 lands — kept for M3 verification.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseGeoNarrative } from '@mapbard/schema';
import { render, writeBundle } from '@mapbard/renderer';

const examplesDir = new URL('../../../examples/', import.meta.url);
const outDir = fileURLToPath(new URL('../../../out/', import.meta.url));

const narrative = parseGeoNarrative(
  JSON.parse(readFileSync(fileURLToPath(new URL('sf-waterfront.geonarrative.json', examplesDir)), 'utf8')),
);
const data = {
  landmarks: JSON.parse(readFileSync(fileURLToPath(new URL('data/landmarks.geojson', examplesDir)), 'utf8')),
};

const bundle = render(narrative, data, { assetBaseDir: fileURLToPath(examplesDir) });
const { written, warnings } = await writeBundle(bundle, outDir);

console.log(`Rendered ${written.length} files to ${outDir}`);
for (const w of warnings) console.warn('  warning:', w);
