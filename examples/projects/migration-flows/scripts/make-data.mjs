// Rebuild the migration-flows data from the public originals (see ../README.md for provenance):
//
//   node scripts/make-data.mjs <ACS table, unzipped XLSX dir> <CenPop2020_Mean_ST.txt>
//     <TIGERweb states .geojson> <out dir>
//
// Unzip State_to_State_Migration_Table_2024_T13.xlsx first (sheet1 is "Table"). The script only
// selects and reshapes; it computes no estimates. It is the gallery-deck pipeline
// (fixtures/visual/gallery-deck/scripts/make-data.mjs) without the hurricane tracks.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [acsDir, centersFile, statesFile, outDir] = process.argv.slice(2);
if (!outDir) throw new Error('usage: make-data.mjs <acs-xlsx-dir> <cenpop.txt> <states> <out>');

/** How many of the largest flows the story draws. */
const TOP = 30;

// Generalized state outlines: local context, so the story reads without the online basemap.
const states = JSON.parse(readFileSync(statesFile, 'utf8'));
writeFileSync(
  join(outDir, 'census-2024-states-context.geojson'),
  `${JSON.stringify({
    type: 'FeatureCollection',
    features: states.features
      // The 50 states and DC (GEOID 01-56); territories are outside the flows shown.
      .filter((feature) => feature.properties.GEOID <= '56')
      .sort((a, b) => a.properties.GEOID.localeCompare(b.properties.GEOID))
      .map((feature) => ({
        type: 'Feature',
        id: feature.properties.STUSAB.toLowerCase(),
        properties: { name: feature.properties.NAME },
        geometry: feature.geometry,
      })),
  })}\n`,
);

/** One worksheet as a grid of strings (shared strings and plain values only). */
function sheet(dir, name) {
  const unescape = (text) =>
    text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&');
  const shared = [
    ...readFileSync(join(dir, 'xl/sharedStrings.xml'), 'utf8').matchAll(/<si>([\s\S]*?)<\/si>/g),
  ].map((m) => unescape([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')));
  const xml = readFileSync(join(dir, `xl/worksheets/${name}.xml`), 'utf8');
  const rows = [];
  for (const row of xml.matchAll(/<row [^>]*?r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells = [];
    for (const c of row[2].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const col = [...c[1]].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
      const value = /<v>([\s\S]*?)<\/v>/.exec(c[3] ?? '')?.[1];
      cells[col] = value === undefined ? '' : /t="s"/.test(c[2]) ? shared[+value] : unescape(value);
    }
    rows[+row[1] - 1] = cells;
  }
  return rows;
}

const slug = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z]+/g, '-')
    .replace(/^-|-$/g, '');

// 2020 centres of population: where each state's arcs start and end.
const centers = new Map(
  readFileSync(centersFile, 'utf8')
    .replace(/^\uFEFF/, '')
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.split(','))
    .map(([, name, , lat, lng]) => [name.trim(), [+(+lng).toFixed(4), +(+lat).toFixed(4)]]),
);

// Table 1: current residence (destination), residence one year ago (origin), estimate, MOE.
// Rows whose estimate or margin is "X" (same state) or "N" (too few sample cases) are skipped,
// and so are Puerto Rico, the U.S. Island Areas and abroad, which have no 2020 state centre here.
const flows = [];
for (const row of sheet(acsDir, 'sheet1').slice(8)) {
  const [destination, origin, estimate, moe] = (row ?? []).map((cell) => String(cell ?? '').trim());
  if (!centers.has(destination) || !centers.has(origin) || destination === origin) continue;
  if (!/^\d+$/.test(estimate) || !/^\d+$/.test(moe)) continue;
  flows.push({ origin, destination, movers: +estimate, moe: +moe });
}
flows.sort((a, b) => b.movers - a.movers || a.origin.localeCompare(b.origin));
const top = flows.slice(0, TOP);
writeFileSync(
  join(outDir, 'acs-2024-top-state-flows.geojson'),
  `${JSON.stringify({
    type: 'FeatureCollection',
    features: top.map((flow) => ({
      type: 'Feature',
      id: `${slug(flow.origin)}-to-${slug(flow.destination)}`,
      properties: {
        origin: flow.origin,
        destination: flow.destination,
        movers: flow.movers,
        movers_moe: flow.moe,
      },
      geometry: {
        type: 'LineString',
        coordinates: [centers.get(flow.origin), centers.get(flow.destination)],
      },
    })),
  })}\n`,
);
const next = flows[TOP];
console.log(
  `flows: ${top.length} of ${flows.length} (largest ${top[0].movers} ±${top[0].moe}, smallest ${top.at(-1).movers} ±${top.at(-1).moe}; next ${next.movers} ±${next.moe})`,
);
