// Review-time checks only: this is not the future project validator/compiler.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runInNewContext } from 'node:vm';

const root = new URL('../../../../../', import.meta.url);
const read = (path) => readFile(new URL(path, root));
const json = async (path) => JSON.parse((await read(path)).toString('utf8'));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const specimen = 'fixtures/two-period/';
const require = createRequire(new URL('packages/schema/package.json', root));
const schema = await import(pathToFileURL(require.resolve('@mapbard/schema')).href);
const { z } = require('zod');
const ts = require('typescript');

// Execute the documented shape proposal without adding public package APIs.
const markdown = (
  await read('docs/archive/2026-10-20-process-reset/stage-1/contracts.md')
).toString('utf8');
const blocks = [...markdown.matchAll(/```ts\r?\n([\s\S]*?)```/g)];
assert.ok(blocks.length >= 3);
const source =
  blocks
    .slice(0, 3)
    .map((match) => match[1])
    .join('\n') +
  '\nglobalThis.reviewSchemas = { Project, Design, Compiled, Diagnostic, ResolvedScale };';
const context = { z, ...schema };
runInNewContext(
  ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText,
  context,
);
const shapes = context.reviewSchemas;
const project = await json(specimen + 'mapbard.project.json');
const narrative = await json(specimen + 'narrative.geonarrative.json');
const design = await json(specimen + 'design.json');
const compiled = await json(specimen + 'compiled.expected.json');
shapes.Project.parse(project);
schema.GeoNarrativeSchema.parse(narrative);
shapes.Design.parse(design);
shapes.Compiled.parse(compiled);
const diagnostics = await json(specimen + 'diagnostics.expected.json');
diagnostics.forEach(({ expected }) => shapes.Diagnostic.parse(expected));
const variants = await json(specimen + 'scale-variants.expected.json');
variants.forEach((variant) => shapes.ResolvedScale.parse(variant));
const area = variants.find((variant) => variant.id === 'area-size');
for (const item of area.legend) assert.equal(item.radius, 16 * Math.sqrt(item.value / 100));
assert.deepEqual(
  variants[0].categories.map((category) => typeof category.value),
  ['boolean', 'number', 'string'],
);
const tiny = variants.find((variant) => variant.id === 'near-equal');
const [min, max] = tiny.domain;
const requestedEdges = Array.from({ length: 5 }, (_, i) =>
  i === 0 ? min : i === 4 ? max : (1 - i / 4) * min + (i / 4) * max,
);
assert.deepEqual([...new Set(requestedEdges)], tiny.edges);
assert.equal(project.id, narrative.id);
assert.equal(compiled.id, project.id);
for (const [file, key] of [
  ['mapbard.project.json', 'manifestSha256'],
  ['narrative.geonarrative.json', 'narrativeSha256'],
  ['design.json', 'designSha256'],
])
  assert.equal(compiled.input[key], 'sha256:' + hash(await read(specimen + file)));

const data = new Map();
for (const resource of project.resources.data) {
  const bytes = await read(specimen + resource.path);
  const digest = 'sha256:' + hash(bytes);
  assert.equal(resource.sha256, digest);
  assert.equal(compiled.input.resources.find((r) => r.id === resource.id).sha256, digest);
  const collection = JSON.parse(bytes.toString('utf8'));
  assert.equal(collection.features.length, 7);
  assert.equal(new Set(collection.features.map((f) => f.id)).size, 7);
  data.set(resource.id, collection);
}
const scale = compiled.scales[0];
const values = [...data.values()].flatMap((fc) => fc.features.map((f) => f.properties.value));
assert.equal(values.filter((v) => v === null).length, 1);
const numbers = values.filter((v) => v !== null);
assert.ok(numbers.every((v) => typeof v === 'number' && Number.isFinite(v)));
assert.equal(numbers.length, 13);
assert.deepEqual(scale.domain, [Math.min(...numbers), Math.max(...numbers)]);
assert.deepEqual(scale.edges, [0, 40, 80, 120]);
assert.deepEqual(scale.counts, { valid: 13, missing: 1, invalid: 0 });
assert.equal(scale.labels.length, scale.effectiveClasses);
assert.equal(scale.colors.length, scale.effectiveClasses);
assert.equal(new Set(compiled.scenes.flatMap((s) => s.layers.map((l) => l.runtimeId))).size, 2);
for (const member of design.sharedScales[0].members) {
  const scene = narrative.scenes.find((s) => s.id === member.sceneId);
  assert.equal(scene.layers.find((l) => l.id === member.layerId).dataSourceId, member.sourceId);
}
for (const scene of design.scenes)
  for (const annotation of scene.annotations) {
    if (annotation.target.kind === 'features') {
      for (const id of annotation.target.featureIds) {
        assert.equal(
          data.get(annotation.target.sourceId).features.filter((f) => f.id === id).length,
          1,
        );
      }
    }
  }

// Actual original bytes; do not coerce or rewrite source records in place.
const sourceDir = 'examples/projects/first-slice/source/';
const acquisitions = await json(sourceDir + 'acquisition.json');
assert.equal(acquisitions.length, 7);
const expectedCoordinates = {
  '01613000': [-78.17788888888889, 39.69755555555555],
  '01638500': [-77.5431111111111, 39.273583333333335],
  '01646500': [-77.12763888888888, 38.949777777777776],
};
const records = [];
for (const entry of acquisitions) {
  const bytes = await read(sourceDir + entry.file);
  assert.equal(hash(bytes), entry.sha256);
  if (entry.file.endsWith('.jpg')) {
    assert.equal(bytes.subarray(0, 2).toString('hex'), 'ffd8');
    assert.equal(entry.license, 'Public Domain');
    continue;
  }
  const collection = JSON.parse(bytes.toString('utf8'));
  assert.equal(collection.type, 'FeatureCollection');
  assert.equal(collection.numberReturned, 1);
  assert.equal(collection.features.length, 1);
  assert.ok(!collection.links.some((link) => link.rel === 'next'));
  const match = /^(\d{8})-(\d{4}-\d{2}-\d{2})\.json$/.exec(entry.file);
  assert.ok(match);
  const [, station, date] = match;
  const feature = collection.features[0];
  const p = feature.properties;
  assert.equal(p.monitoring_location_id, 'USGS-' + station);
  assert.equal(p.time, date);
  assert.equal(p.parameter_code, '00060');
  assert.equal(p.statistic_id, '00003');
  assert.equal(p.unit_of_measure, 'ft^3/s');
  assert.equal(p.approval_status, 'Approved');
  assert.equal(p.qualifier, null);
  assert.match(p.value, /^\d+(?:\.\d+)?$/);
  assert.ok(Number.isFinite(Number(p.value)));
  assert.equal(feature.geometry.type, 'Point');
  assert.deepEqual(feature.geometry.coordinates, expectedCoordinates[station]);
  records.push({
    station,
    date,
    value: p.value,
    status: p.approval_status,
    seriesId: p.time_series_id,
  });
}
assert.equal(new Set(records.map((r) => r.station + '/' + r.date)).size, 6);

// Review evidence: exact metadata bytes and joins to both observation dates.
// This checks published metadata, not the hydrologic computation itself.
const metadataDir = sourceDir + 'metadata/';
const metadataAcquisitions = await json(metadataDir + 'acquisition.json');
const stations = Object.keys(expectedCoordinates);
const dates = ['2024-10-01', '2025-10-01'];
const expectedMetadataFiles = [
  ...stations.flatMap((station) => [`${station}-location.json`, `${station}-series.json`]),
  ...dates.map((date) => `legacy-${date}.json`),
];
assert.deepEqual(
  metadataAcquisitions.map((entry) => entry.file).sort(),
  expectedMetadataFiles.sort(),
);
for (const entry of metadataAcquisitions) {
  assert.equal(hash(await read(metadataDir + entry.file)), entry.sha256);
}
const drainageAreas = { '01613000': 4064, '01638500': 9651, '01646500': 11560 };
for (const station of stations) {
  const location = await json(metadataDir + station + '-location.json');
  const series = await json(metadataDir + station + '-series.json');
  assert.equal(location.id, 'USGS-' + station);
  assert.deepEqual(location.geometry.coordinates, expectedCoordinates[station]);
  assert.equal(location.properties.time_zone_abbreviation, 'EST');
  assert.equal(location.properties.uses_daylight_savings, 'Y');
  assert.equal(location.properties.drainage_area, drainageAreas[station]);
  assert.equal(series.properties.monitoring_location_id, location.id);
  assert.equal(series.properties.parameter_code, '00060');
  assert.equal(series.properties.statistic_id, '00003');
  assert.equal(series.properties.unit_of_measure, 'ft^3/s');
  assert.equal(series.properties.computation_period_identifier, 'Daily');
  assert.equal(series.properties.computation_identifier, 'Mean');
  assert.equal(series.properties.primary, 'Primary');
  for (const date of dates) {
    assert.equal(records.find((r) => r.station === station && r.date === date).seriesId, series.id);
  }
}
for (const date of dates) {
  const legacy = await json(metadataDir + `legacy-${date}.json`);
  assert.equal(legacy.value.timeSeries.length, 3);
  const seen = new Set();
  for (const series of legacy.value.timeSeries) {
    const station = series.sourceInfo.siteCode[0].value;
    assert.ok(stations.includes(station));
    assert.ok(!seen.has(station));
    seen.add(station);
    assert.equal(series.name, `USGS:${station}:00060:00003`);
    const zone = series.sourceInfo.timeZoneInfo;
    assert.deepEqual(zone.defaultTimeZone, { zoneOffset: '-05:00', zoneAbbreviation: 'EST' });
    assert.deepEqual(zone.daylightSavingsTimeZone, {
      zoneOffset: '-04:00',
      zoneAbbreviation: 'EDT',
    });
    assert.equal(zone.siteUsesDaylightSavingsTime, true);
    assert.equal(series.variable.unit.unitCode, 'ft3/s');
    assert.equal(series.values.length, 1);
    assert.equal(series.values[0].value.length, 1);
    const observation = series.values[0].value[0];
    assert.ok([date + 'T00:00:00', date + 'T00:00:00.000'].includes(observation.dateTime));
    assert.deepEqual(observation.qualifiers, ['A']);
    assert.equal(
      observation.value,
      records.find((r) => r.station === station && r.date === date).value,
    );
  }
}
console.log(
  'PASS: proposal shapes, seven scale variants, 12 diagnostic shapes, five byte hashes, full-data oracle and references.',
);
console.log(
  'PASS: six unique USGS records, coordinates/units/status, and seven acquisition hashes.',
);
console.table(records);
console.log(
  'PASS: eight metadata hashes, both-date series joins, Daily/Mean/time-zone metadata, and legacy value cross-checks.',
);
console.log(
  'NOT TESTED: production validation/compilation, source daily-mean recomputation, browser playback. Case suitability is a documented review judgment.',
);
console.log('Review root:', fileURLToPath(root));
