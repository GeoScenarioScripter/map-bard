import { afterEach, describe, expect, it } from 'vitest';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importLegacyNarrative } from './import-legacy.js';
import { loadProject } from './load.js';
import { sha256 } from './fingerprint.js';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const specimen = join(root, 'docs/stage-1/specimens');
const legacy = join(root, 'examples/sf-waterfront.geonarrative.json');
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

  it('imports without changing original narrative bytes or source resource bytes', async () => {
    const destination = join(await scratch(), 'imported');
    const sourceBytes = await readFile(legacy);
    const imported = await importLegacyNarrative(legacy, destination);
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;
    expect(await readFile(legacy)).toEqual(sourceBytes);
    expect(await readFile(join(destination, 'narrative.geonarrative.json'))).toEqual(sourceBytes);
    expect(imported.value.normalizedPaths).toHaveLength(3);
    expect(imported.value.retainedFields).toContain('scenes[0].narration');
    expect(imported.value.featureIdAssignments).toHaveLength(3);
    expect(
      imported.value.unsupportedRequests.some((item) => item.code === 'CAPABILITY_UNSUPPORTED'),
    ).toBe(true);
    const sourceData = await readFile(join(root, 'examples/data/landmarks.geojson'));
    expect(sha256(await readFile(join(destination, 'data/landmarks.geojson')))).toBe(
      sha256(sourceData),
    );
    const loaded = await loadProject(destination);
    expect(loaded.ok).toBe(true);
    const repeated = await importLegacyNarrative(legacy, destination);
    expect(repeated.ok).toBe(false);
    if (!repeated.ok) expect(repeated.diagnostics[0]?.code).toBe('ASSET_COLLISION');
  });

  it('keeps failed imports non-destructive', async () => {
    const scratchRoot = await scratch();
    const unsafeInput = join(scratchRoot, 'unsafe.json');
    const authored = JSON.parse(await readFile(legacy, 'utf8'));
    authored.dataSources[0].path = '../private.geojson';
    await writeFile(unsafeInput, JSON.stringify(authored));
    const before = await readFile(unsafeInput);
    const destination = join(scratchRoot, 'result');
    const imported = await importLegacyNarrative(unsafeInput, destination);
    expect(imported.ok).toBe(false);
    expect(await readFile(unsafeInput)).toEqual(before);
    await expect(readFile(join(destination, 'mapbard.project.json'))).rejects.toThrow();
  });

  it('reports normalized legacy path mapping while retaining authored bytes', async () => {
    const sourceRoot = await scratch();
    await mkdir(join(sourceRoot, 'data'));
    await mkdir(join(sourceRoot, 'media'));
    await cp(
      join(root, 'examples/data/landmarks.geojson'),
      join(sourceRoot, 'data/landmarks.geojson'),
    );
    for (const image of ['skyline.png', 'ferry-building.png'])
      await cp(join(root, 'examples/media', image), join(sourceRoot, 'media', image));
    const story = JSON.parse(await readFile(legacy, 'utf8'));
    story.dataSources[0].path = 'data\\landmarks.geojson';
    const input = join(sourceRoot, 'legacy.json');
    await writeFile(input, JSON.stringify(story));
    const destination = join(sourceRoot, 'imported');
    const result = await importLegacyNarrative(input, destination);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.normalizedPaths[0]).toEqual({
      resourceId: 'landmarks',
      from: 'data\\landmarks.geojson',
      to: 'data/landmarks.geojson',
    });
    expect(
      JSON.parse(await readFile(join(destination, 'narrative.geonarrative.json'), 'utf8'))
        .dataSources[0].path,
    ).toBe('data\\landmarks.geojson');
    expect((await loadProject(destination)).ok).toBe(true);
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
