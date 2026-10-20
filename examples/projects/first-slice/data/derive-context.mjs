/** Reproduce the bounded offline context from pinned public GIS responses. */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { URL } from 'node:url';

const sources = [
  {
    input: '../source/potomac-states-raw.geojson',
    output: './potomac-states-context.geojson',
    sha256: 'd17ef45f9e3940ed7d757065b5900d522450645e94fc21630960630117cb59c0',
    select(features) {
      const wanted = new Set(['MD', 'VA', 'WV', 'PA', 'DC']);
      const selected = features.filter((feature) => wanted.has(feature.properties?.STUSAB));
      if (
        selected.length !== 5 ||
        new Set(selected.map((feature) => feature.properties.STUSAB)).size !== 5
      )
        throw new Error('Expected five distinct Census state outlines');
      return selected
        .map((feature) => ({
          type: 'Feature',
          id: `census-${feature.properties.STUSAB}`,
          geometry: feature.geometry,
          properties: { name: feature.properties.NAME, state: feature.properties.STUSAB },
        }))
        .sort((a, b) => a.id.localeCompare(b.id));
    },
  },
  {
    input: '../source/potomac-river-raw.geojson',
    output: './potomac-river-context.geojson',
    sha256: 'e39d981e6d0033d3c383bc2f52e557dea7930460f4d1727a76704ddd1f0f377a',
    select(features) {
      const selected = features.filter((feature) => feature.properties?.PNAME === 'POTOMAC R');
      if (selected.length !== 52 || new Set(selected.map((feature) => feature.id)).size !== 52)
        throw new Error('Expected 52 distinct main Potomac River segments');
      return selected
        .map((feature) => ({
          type: 'Feature',
          id: `mdimap-${feature.id}`,
          geometry: feature.geometry,
          properties: { name: 'Potomac River' },
        }))
        .sort((a, b) => a.id.localeCompare(b.id));
    },
  },
];

for (const source of sources) {
  const bytes = await readFile(new URL(source.input, import.meta.url));
  const hash = createHash('sha256').update(bytes).digest('hex');
  if (hash !== source.sha256) throw new Error(`Source hash changed: ${source.input}`);
  const raw = JSON.parse(bytes.toString('utf8'));
  if (raw.type !== 'FeatureCollection' || !Array.isArray(raw.features))
    throw new Error(`Invalid source FeatureCollection: ${source.input}`);
  const features = source.select(raw.features);
  await writeFile(
    new URL(source.output, import.meta.url),
    `${JSON.stringify({ type: 'FeatureCollection', features })}\n`,
  );
  process.stdout.write(`${source.output}: ${features.length} features\n`);
}
