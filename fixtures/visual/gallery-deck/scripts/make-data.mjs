// Rebuild the gallery-deck data from the public originals (see ../README.md for provenance):
//
//   node make-data.mjs <ACS table, unzipped XLSX dir> <CenPop2020_Mean_ST.txt> <hurdat2 .txt>
//     <TIGERweb states .geojson> <out dir>
//
// Unzip State_to_State_Migration_Table_2024_T13.xlsx first (sheet1 is "Table"). The script only
// reads and reshapes; it computes no estimates.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [acsDir, centersFile, hurdatFile, statesFile, outDir] = process.argv.slice(2);
if (!outDir)
  throw new Error('usage: make-data.mjs <acs-xlsx-dir> <cenpop.txt> <hurdat2.txt> <states> <out>');

// Generalized state outlines: local context, so the gallery reads without the online basemap.
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
const flows = [];
for (const row of sheet(acsDir, 'sheet1').slice(8)) {
  const [destination, origin, estimate, moe] = (row ?? []).map((cell) => String(cell ?? '').trim());
  if (!centers.has(destination) || !centers.has(origin) || destination === origin) continue;
  if (!/^\d+$/.test(estimate) || !/^\d+$/.test(moe)) continue;
  flows.push({ origin, destination, movers: +estimate, moe: +moe });
}
flows.sort((a, b) => b.movers - a.movers || a.origin.localeCompare(b.origin));
const top = flows.slice(0, 30);
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

// HURDAT2: the three 2024 hurricanes that made landfall from the Gulf of Mexico in September and October.
const STORMS = ['FRANCINE', 'HELENE', 'MILTON'];
const lines = readFileSync(hurdatFile, 'utf8').split(/\r?\n/);
const tracks = [];
for (let index = 0; index < lines.length; index++) {
  const header = /^(AL\d{2}2024),\s*([A-Z]+),\s*(\d+),/.exec(lines[index]);
  if (!header) continue;
  const [, id, name, count] = header;
  const fixes = lines.slice(index + 1, index + 1 + +count).map((line) => line.split(','));
  index += +count;
  if (!STORMS.includes(name)) continue;
  const coordinates = [];
  const times = [];
  let peak = 0;
  for (const [date, time, , , lat, lng, wind] of fixes) {
    const latitude = parseFloat(lat) * (lat.trim().endsWith('S') ? -1 : 1);
    const longitude = parseFloat(lng) * (lng.trim().endsWith('W') ? -1 : 1);
    const t = time.trim();
    times.push(
      `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T${t.slice(0, 2)}:${t.slice(2, 4)}:00Z`,
    );
    coordinates.push([longitude, latitude]);
    peak = Math.max(peak, +wind);
  }
  tracks.push({
    type: 'Feature',
    id: id.toLowerCase(),
    properties: {
      name: name[0] + name.slice(1).toLowerCase(),
      peak_wind_kt: peak,
      times,
    },
    geometry: { type: 'LineString', coordinates },
  });
}
writeFileSync(
  join(outDir, 'hurdat2-2024-gulf-hurricanes.geojson'),
  `${JSON.stringify({ type: 'FeatureCollection', features: tracks })}\n`,
);
console.log(
  `flows: ${top.length} of ${flows.length} (largest ${top[0].movers}, smallest ${top.at(-1).movers}); tracks: ${tracks.map((t) => `${t.properties.name} ${t.properties.times.length}`).join(', ')}`,
);
