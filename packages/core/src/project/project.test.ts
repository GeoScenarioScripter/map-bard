import { afterEach, describe, expect, it } from 'vitest';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProject } from './load.js';
import { sha256 } from './fingerprint.js';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const specimen = join(root, 'fixtures/two-period');
const temporary: string[] = [];

async function scratch(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), 'mapbard-project-'));
  temporary.push(path);
  return path;
}

async function copiedSpecimen(): Promise<string> {
  const path = join(await scratch(), 'project');
  await cp(specimen, path, { recursive: true });
  return path;
}

afterEach(async () => {
  for (const path of temporary.splice(0)) await rm(path, { recursive: true, force: true });
});

describe('project/resource I/O', () => {
  it('loads the G1 specimen and retains deterministic fingerprints after relocation', async () => {
    const first = await loadProject(specimen);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.value.dataBytes.map((entry) => entry.id)).toEqual(['period-a', 'period-b']);
    expect(first.value.input.resources).toEqual([
      { id: 'period-a', sha256: first.value.project.resources.data[0]?.sha256 },
      { id: 'period-b', sha256: first.value.project.resources.data[1]?.sha256 },
    ]);
    const relocated = await loadProject(await copiedSpecimen());
    expect(relocated.ok).toBe(true);
    if (relocated.ok) expect(relocated.value.input).toEqual(first.value.input);
  });

  it('keeps opaque optional extensions and declared override data', async () => {
    const path = await copiedSpecimen();
    const manifestPath = join(path, 'mapbard.project.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    manifest.extensions = {
      'org.example.payload': { required: false, payload: { answer: [1, null, true] } },
    };
    await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`);
    const designPath = join(path, 'design.json');
    const design = JSON.parse(await readFile(designPath, 'utf8'));
    design.extensions = { 'org.example.design': { required: false, payload: { x: 'preserved' } } };
    await writeFile(designPath, `${JSON.stringify(design)}\n`);
    const loaded = await loadProject(path);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.value.project.extensions).toEqual(manifest.extensions);
    expect(loaded.value.design.extensions).toEqual(design.extensions);
    expect(loaded.value.project.resources.data[0]?.attributes[1]?.override?.rationale).toBeTruthy();
    const original = await loadProject(specimen);
    expect(original.ok).toBe(true);
    if (original.ok) {
      expect(loaded.value.input.manifestSha256).not.toBe(original.value.input.manifestSha256);
      expect(loaded.value.input.designSha256).not.toBe(original.value.input.designSha256);
    }
  });

  it('rejects changed, missing and escaping resources', async () => {
    const path = await copiedSpecimen();
    const dataPath = join(path, 'data/period-a.geojson');
    await writeFile(dataPath, `${await readFile(dataPath, 'utf8')} `);
    const changed = await loadProject(path);
    expect(changed.ok).toBe(false);
    if (!changed.ok)
      expect(changed.diagnostics.some((item) => item.code === 'RESOURCE_HASH_MISMATCH')).toBe(true);

    const path2 = await copiedSpecimen();
    await rm(join(path2, 'data/period-b.geojson'));
    const missing = await loadProject(path2);
    expect(missing.ok).toBe(false);
    if (!missing.ok)
      expect(missing.diagnostics.some((item) => item.code === 'RESOURCE_MISSING')).toBe(true);

    const path3 = await copiedSpecimen();
    const manifestPath = join(path3, 'mapbard.project.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    manifest.resources.data[0].path = '../outside.geojson';
    await writeFile(manifestPath, JSON.stringify(manifest));
    const escaping = await loadProject(path3);
    expect(escaping.ok).toBe(false);
    if (!escaping.ok)
      expect(
        escaping.diagnostics.some(
          (item) => item.code === 'ASSET_COLLISION' || item.code === 'ASSET_PATH_INVALID',
        ),
      ).toBe(true);
  });

  it('preserves the six pinned USGS observations in the derived resources', async () => {
    const acquisition = JSON.parse(
      await readFile(join(root, 'examples/projects/first-slice/source/acquisition.json'), 'utf8'),
    );
    for (const date of ['2024-10-01', '2025-10-01']) {
      const derived = JSON.parse(
        await readFile(
          join(root, `examples/projects/first-slice/data/potomac-${date}.geojson`),
          'utf8',
        ),
      );
      expect(derived.features).toHaveLength(3);
      for (const feature of derived.features) {
        const station = feature.id.slice(5);
        const file = `${station}-${date}.json`;
        const inventory = acquisition.find((entry: { file: string }) => entry.file === file);
        const originalBytes = await readFile(
          join(root, 'examples/projects/first-slice/source', file),
        );
        const original = JSON.parse(originalBytes.toString('utf8')).features[0];
        expect(sha256(originalBytes)).toBe(`sha256:${inventory.sha256}`);
        expect(feature.properties.daily_mean_discharge).toBe(Number(original.properties.value));
        expect(feature.properties.reported_value).toBe(original.properties.value);
        expect(feature.properties.observation_id).toBe(original.id);
        expect(feature.properties.time_series_id).toBe(original.properties.time_series_id);
        expect(feature.properties.station_day).toBe(date);
        expect(feature.properties.source_url).toBe(inventory.url);
        expect(feature.properties.approval_status).toBe('Approved');
        expect(feature.properties.qualifier).toBeNull();
        expect(feature.geometry).toEqual(original.geometry);
      }
    }
    expect(
      sha256(await readFile(join(root, 'examples/projects/first-slice/media/potomac-context.jpg'))),
    ).toBe(
      sha256(
        await readFile(
          join(root, 'examples/projects/first-slice/source/potomac-context-original.jpg'),
        ),
      ),
    );
  });
});
