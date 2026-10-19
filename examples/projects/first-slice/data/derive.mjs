import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dataDir = dirname(fileURLToPath(import.meta.url));
const caseDir = dirname(dataDir);
const sourceDir = join(caseDir, 'source');
const acquisition = JSON.parse(await readFile(join(sourceDir, 'acquisition.json'), 'utf8'));
const stations = [
  {
    id: '01613000',
    label: 'Hancock',
    qualification: 'Upstream power-plant effects at low flow and reservoir regulation.',
  },
  {
    id: '01638500',
    label: 'Point of Rocks',
    qualification: 'Reservoir and run-of-river hydroelectric effects may affect low flow.',
  },
  {
    id: '01646500',
    label: 'Little Falls',
    qualification: 'Water diversions and reservoir effects; not unregulated natural flow.',
  },
];

async function writeNewOrVerify(path, bytes) {
  try {
    const existing = await readFile(path);
    if (!existing.equals(bytes)) throw new Error(`Derived output differs: ${path}`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await writeFile(path, bytes, { flag: 'wx' });
  }
}

for (const date of ['2024-10-01', '2025-10-01']) {
  const features = [];
  for (const station of stations) {
    const file = `${station.id}-${date}.json`;
    const inventory = acquisition.find((entry) => entry.file === file);
    if (!inventory) throw new Error(`Missing acquisition entry ${file}`);
    const bytes = await readFile(join(sourceDir, file));
    if (createHash('sha256').update(bytes).digest('hex') !== inventory.sha256)
      throw new Error(`Source hash changed: ${file}`);
    const original = JSON.parse(bytes.toString('utf8'));
    if (original.features.length !== 1) throw new Error(`Expected one observation in ${file}`);
    const feature = original.features[0];
    const p = feature.properties;
    if (
      p.monitoring_location_id !== `USGS-${station.id}` ||
      p.time !== date ||
      p.parameter_code !== '00060' ||
      p.statistic_id !== '00003' ||
      p.unit_of_measure !== 'ft^3/s' ||
      p.approval_status !== 'Approved' ||
      p.qualifier !== null ||
      !/^\d+(?:\.\d+)?$/.test(p.value) ||
      !Number.isFinite(Number(p.value))
    )
      throw new Error(`Unexpected source observation ${file}`);
    features.push({
      type: 'Feature',
      id: p.monitoring_location_id,
      geometry: feature.geometry,
      properties: {
        station_id: p.monitoring_location_id,
        station_name: station.label,
        station_day: p.time,
        daily_mean_discharge: Number(p.value),
        reported_value: p.value,
        unit: p.unit_of_measure,
        approval_status: p.approval_status,
        qualifier: p.qualifier,
        observation_id: feature.id,
        time_series_id: p.time_series_id,
        source_last_modified: p.last_modified,
        source_url: inventory.url,
        source_sha256: `sha256:${inventory.sha256}`,
        source_qualification: station.qualification,
        time_basis: 'Published USGS station-local daily mean; Eastern time calendar date',
      },
    });
  }
  const derived = { type: 'FeatureCollection', features };
  await writeNewOrVerify(
    join(dataDir, `potomac-${date}.geojson`),
    Buffer.from(`${JSON.stringify(derived, null, 2)}\n`),
  );
}
const photo = acquisition.find((entry) => entry.file === 'potomac-context-original.jpg');
if (!photo) throw new Error('Missing photo inventory.');
const photoBytes = await readFile(join(sourceDir, photo.file));
if (createHash('sha256').update(photoBytes).digest('hex') !== photo.sha256)
  throw new Error('Source photo hash changed.');
await mkdir(join(caseDir, 'media'), { recursive: true });
await writeNewOrVerify(join(caseDir, 'media', 'potomac-context.jpg'), photoBytes);
