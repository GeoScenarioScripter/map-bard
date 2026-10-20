// Review-time source/oracle verification, not a production analysis operation.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const root = new URL('../../../', import.meta.url);
const base = new URL('examples/projects/first-slice/', root);
const read = async (path) => readFile(new URL(path, base));
const json = async (path) => JSON.parse((await read(path)).toString('utf8'));
const digest = (bytes) => 'sha256:' + createHash('sha256').update(bytes).digest('hex');
const fixture = JSON.parse(
  await readFile(new URL('../specimens/method-case.json', import.meta.url), 'utf8'),
);
assert.equal(fixture.specimenRevision, 's2-w1-a-r1');
for (const file of fixture.pinnedFiles)
  assert.equal(digest(await read(file.path)), file.sha256, file.path);
const project = await json('mapbard.project.json');
assert.equal(project.id, fixture.projectId);
assert.equal(project.revision, fixture.projectRevision);
const acquisition = await json('source/acquisition.json');
const metadata = await json('source/metadata/acquisition.json');
for (const entry of metadata)
  assert.equal(digest(await read('source/metadata/' + entry.file)), 'sha256:' + entry.sha256);
assert.equal(fixture.rows.length, 3);
assert.equal(new Set(fixture.rows.map((row) => row.stationId)).size, 3);
assert.deepEqual(fixture.method.dates, ['2024-10-01', '2025-10-01']);
assert.deepEqual(
  fixture.rows.map((row) => row.expectedDifference),
  [-5000, -21580, -15500],
);
for (const row of fixture.rows) {
  assert.equal(row.observations.length, 2);
  const series = (await json(`source/metadata/${row.stationId.slice(5)}-series.json`)).properties;
  assert.equal(series.monitoring_location_id, row.stationId);
  assert.equal(series.computation_period_identifier, 'Daily');
  assert.equal(series.computation_identifier, 'Mean');
  assert.equal(series.primary, 'Primary');
  const values = [];
  for (const [index, observation] of row.observations.entries()) {
    const resource = project.resources.data.find((item) => item.id === observation.sourceId);
    assert.ok(resource);
    assert.equal(resource.observationLabel, fixture.method.dates[index]);
    assert.equal(resource.attributes.find((a) => a.name === observation.attribute).unit, 'ft^3/s');
    const bytes = await read(resource.path);
    assert.equal(digest(bytes), resource.sha256);
    const collection = JSON.parse(bytes.toString('utf8'));
    const matches = collection.features.filter((f) => f.id === observation.featureId);
    assert.equal(matches.length, 1);
    const p = matches[0].properties;
    assert.equal(p.station_id, row.stationId);
    assert.equal(p.station_day, fixture.method.dates[index]);
    assert.equal(p.station_day, observation.date);
    assert.equal(p.observation_id, observation.observationId);
    assert.equal(p.time_series_id, observation.seriesId);
    assert.equal(p.time_series_id, series.id);
    assert.equal(p.source_sha256, observation.sourceSha256);
    assert.equal(p.source_url, observation.sourceUrl);
    assert.equal(p.source_qualification, observation.qualification);
    assert.equal(p.unit, 'ft^3/s');
    const sourceBytes = await read(observation.sourceFile);
    assert.equal(digest(sourceBytes), observation.sourceSha256);
    const inventory = acquisition.find(
      (entry) => 'source/' + entry.file === observation.sourceFile,
    );
    assert.ok(inventory);
    assert.equal('sha256:' + inventory.sha256, observation.sourceSha256);
    assert.equal(inventory.url, observation.sourceUrl);
    const original = JSON.parse(sourceBytes.toString('utf8'));
    assert.equal(original.features.length, 1);
    assert.equal(
      original.links.some((link) => link.rel === 'next'),
      false,
    );
    const source = original.features[0];
    assert.equal(source.id, observation.observationId);
    assert.equal(source.properties.monitoring_location_id, row.stationId);
    assert.equal(source.properties.time, observation.date);
    assert.equal(source.properties.time_series_id, observation.seriesId);
    for (const record of [source.properties, series]) {
      assert.equal(record.parameter_code, fixture.method.parameterCode);
      assert.equal(record.statistic_id, fixture.method.statisticId);
      assert.equal(record.unit_of_measure, fixture.method.unit);
    }
    assert.equal(source.properties.approval_status, 'Approved');
    assert.equal(source.properties.qualifier, null);
    assert.equal(p.approval_status, source.properties.approval_status);
    assert.equal(p.qualifier, source.properties.qualifier);
    assert.equal(p.reported_value, source.properties.value);
    assert.match(source.properties.value, /^\d+(?:\.\d+)?$/);
    const value = p[observation.attribute];
    assert.equal(typeof value, 'number');
    assert.ok(Number.isFinite(value));
    assert.equal(value, Number(source.properties.value)); // Explicit raw-string conversion.
    values.push(value);
  }
  assert.deepEqual(values, [row.before, row.after]);
  assert.equal(values[1] - values[0], row.expectedDifference);
}
assert.equal(fixture.unsupportedRequest.expectedOutcome, 'insufficient-evidence');
console.log(
  'S2-W1-A: pinned inputs, six observation/series joins and three signed differences verified.',
);
console.log(
  'Trend specimen is a requirement only; production rejection and negative tests await W1-C/W2.',
);
