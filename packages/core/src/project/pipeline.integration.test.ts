import { afterEach, describe, expect, it } from 'vitest';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileProject, importLegacyNarrative, loadProject, validateProject } from '@mapbard/core';
import { STAGE1_CAPABILITIES } from '@mapbard/knowledge';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const example = join(root, 'examples/projects/first-slice');
const temporary: string[] = [];

async function scratch(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), 'mapbard-w4b-core-'));
  temporary.push(path);
  return path;
}

async function copyExample(): Promise<string> {
  const path = join(await scratch(), 'project');
  await cp(example, path, { recursive: true });
  return path;
}

async function editJson(path: string, edit: (value: Record<string, unknown>) => void) {
  const value = JSON.parse(await readFile(path, 'utf8'));
  edit(value);
  await writeFile(path, JSON.stringify(value));
}

const codes = (result: { diagnostics: { code: string }[] }) =>
  result.diagnostics.map((diagnostic) => diagnostic.code);

afterEach(async () => {
  for (const path of temporary.splice(0)) await rm(path, { recursive: true, force: true });
});

describe('W4-B real project regression through public APIs', () => {
  it('compiles deterministically after relocation without changing editable bytes', async () => {
    const path = await copyExample();
    const files = ['mapbard.project.json', 'narrative.geonarrative.json', 'design.json'];
    const before = await Promise.all(files.map((file) => readFile(join(path, file))));
    const original = await loadProject(example);
    const relocated = await loadProject(path);
    expect(original.ok).toBe(true);
    expect(relocated.ok).toBe(true);
    if (!original.ok || !relocated.ok) return;
    expect(relocated.value.input).toEqual(original.value.input);
    const validated = validateProject(relocated.value);
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;
    const first = compileProject(validated.value, STAGE1_CAPABILITIES);
    const second = compileProject(validated.value, STAGE1_CAPABILITIES);
    expect(first.ok).toBe(true);
    expect(second).toEqual(first);
    if (!first.ok) return;
    expect(first.value.scenes).toHaveLength(3);
    expect(first.value.input.resources.map((item) => item.id)).toEqual([
      'potomac-2024',
      'potomac-2025',
      'potomac-context',
      'potomac-river-context',
      'potomac-states-context',
    ]);
    for (const scene of first.value.scenes)
      expect(scene.layers.map((layer) => layer.sourceId)).toEqual([
        'potomac-states-context',
        'potomac-river-context',
        scene.id === 'context-2024' ? 'potomac-2024' : 'potomac-2025',
      ]);
    expect(await Promise.all(files.map((file) => readFile(join(path, file))))).toEqual(before);
  });

  it.each([
    ['mapbard.project.json', 'projectVersion'],
    ['narrative.geonarrative.json', 'schemaVersion'],
    ['design.json', 'designVersion'],
  ])('rejects an unsupported %s version', async (file, field) => {
    const path = await copyExample();
    await editJson(join(path, file), (value) => {
      value[field] = '99.0.0';
    });
    const loaded = await loadProject(path);
    expect(loaded.ok).toBe(false);
    expect(codes(loaded)).toContain('VERSION_UNSUPPORTED');
  });

  it('rejects duplicate source identity and missing required data', async () => {
    const duplicate = await copyExample();
    await editJson(join(duplicate, 'mapbard.project.json'), (value) => {
      const resources = value.resources as { data: { id: string }[] };
      resources.data[3]!.id = resources.data[2]!.id;
    });
    const loaded = await loadProject(duplicate);
    expect(loaded.ok).toBe(true);
    if (loaded.ok) expect(codes(validateProject(loaded.value))).toContain('ID_DUPLICATE');

    const missing = await copyExample();
    await rm(join(missing, 'data/potomac-2025-10-01.geojson'));
    const absent = await loadProject(missing);
    expect(absent.ok).toBe(false);
    expect(codes(absent)).toContain('RESOURCE_MISSING');
  });

  it('diagnoses unsupported basemap intent before compilation', async () => {
    const path = await copyExample();
    await editJson(join(path, 'narrative.geonarrative.json'), (value) => {
      value.basemap = { style: 'protomaps-light' };
    });
    const loaded = await loadProject(path);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(codes(compileProject(loaded.value, STAGE1_CAPABILITIES))).toContain(
      'CAPABILITY_UNSUPPORTED',
    );
  });

  it('preserves every authored legacy narrative field during import', async () => {
    const legacy = join(root, 'examples/sf-waterfront.geonarrative.json');
    const destination = join(await scratch(), 'imported');
    const source = await readFile(legacy);
    const result = await importLegacyNarrative(legacy, destination);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const imported = await readFile(join(destination, 'narrative.geonarrative.json'));
    expect(imported).toEqual(source);
    expect(JSON.parse(imported.toString('utf8'))).toEqual(JSON.parse(source.toString('utf8')));
    expect(result.value.unsupportedRequests.length).toBeGreaterThan(0);
    expect((await loadProject(destination)).ok).toBe(true);
  });
});
