/*
 * Live smoke for Stage 1 (Plan). Ingests the example data + media, asks the
 * real DashScope model for a plan, and writes ./narrative.plan.json at the repo
 * root. Requires MAPBARD_LLM_KEY (see .env.example).
 *
 * Usage (after `pnpm --filter @mapbard/core build`):
 *   MAPBARD_LLM_KEY=... node packages/core/scripts/plan-example.mjs "your intent"
 *
 * Superseded by the CLI (`mapbard plan`) once M6 lands — kept for M4 verification.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  ingestDataFile,
  registerMediaInputs,
  planNarrative,
  createDashScopeAdapterFromEnv,
} from '@mapbard/core';

const examplesDir = new URL('../../../examples/', import.meta.url);
const outFile = fileURLToPath(new URL('../../../narrative.plan.json', import.meta.url));
const intent = process.argv[2] ?? 'Introduce the San Francisco waterfront and its landmarks.';

const ingested = await ingestDataFile(fileURLToPath(new URL('data/landmarks.geojson', examplesDir)));
const mediaAssets = await registerMediaInputs([
  { path: fileURLToPath(new URL('media/skyline.png', examplesDir)), caption: 'San Francisco skyline' },
]);

const adapter = createDashScopeAdapterFromEnv();
const { narrative, questions } = await planNarrative(
  { intent, dataSources: [ingested.dataSource], mediaAssets },
  adapter,
);

writeFileSync(outFile, JSON.stringify(narrative, null, 2));
console.log(`Wrote ${narrative.scenes.length}-scene plan to ${outFile}`);
for (const q of questions) console.warn('  fit-check question:', q);
