import { afterEach, describe, expect, it } from 'vitest';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importLegacyNarrative, loadProject, validateProject } from '@mapbard/core';
import {
  ImportReportSchema,
  parseCompiled,
  type Design,
  type GeoNarrative,
  type Project,
} from '@mapbard/schema';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const specimen = join(root, 'docs/stage-1/specimens');
const temporary: string[] = [];

async function scratch() {
  const directory = await mkdtemp(join(tmpdir(), 'mapbard-g2-'));
  temporary.push(directory);
  return directory;
}

async function mutate(
  edit: (artifacts: { project: Project; narrative: GeoNarrative; design: Design }) => void,
) {
  const directory = join(await scratch(), 'project');
  await cp(specimen, directory, { recursive: true });
  const project: Project = JSON.parse(
    await readFile(join(directory, 'mapbard.project.json'), 'utf8'),
  );
  const narrative: GeoNarrative = JSON.parse(
    await readFile(join(directory, project.artifacts.narrative), 'utf8'),
  );
  const design: Design = JSON.parse(
    await readFile(join(directory, project.artifacts.design), 'utf8'),
  );
  edit({ project, narrative, design });
  await writeFile(join(directory, 'mapbard.project.json'), JSON.stringify(project));
  await writeFile(join(directory, project.artifacts.narrative), JSON.stringify(narrative));
  await writeFile(join(directory, project.artifacts.design), JSON.stringify(design));
  const loaded = await loadProject(directory);
  return loaded.ok ? validateProject(loaded.value) : loaded;
}

afterEach(async () => {
  for (const directory of temporary.splice(0))
    await rm(directory, { recursive: true, force: true });
});

describe('G2 public package composition (build first)', () => {
  it('validates actual loaded bytes and matches the frozen compiled input identity', async () => {
    const loaded = await loadProject(specimen);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) throw new Error(JSON.stringify(loaded.diagnostics));
    const validated = validateProject(loaded.value);
    expect(validated.ok).toBe(true);
    if (!validated.ok) throw new Error(JSON.stringify(validated.diagnostics));
    const compiled = parseCompiled(
      JSON.parse(await readFile(join(specimen, 'compiled.expected.json'), 'utf8')),
    );
    expect(compiled.ok).toBe(true);
    if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
    expect(validated.value.input).toEqual(compiled.value.input);
    expect(validated.value.project.resources.data[0]?.attributes[1]?.override).toEqual({
      rationale: 'Synthetic test declaration; zero is not an asserted absence.',
    });
    for (const { id, bytes } of validated.value.dataBytes) {
      expect(JSON.parse(new TextDecoder().decode(bytes))).toEqual(validated.value.dataMap[id]);
    }
    const relocatedRoot = join(await scratch(), 'relocated');
    await cp(specimen, relocatedRoot, { recursive: true });
    const relocated = await loadProject(relocatedRoot);
    expect(relocated.ok).toBe(true);
    if (!relocated.ok) throw new Error(JSON.stringify(relocated.diagnostics));
    expect(validateProject(relocated.value).ok).toBe(true);
    expect(relocated.value.input).toEqual(compiled.value.input);
  });

  it('round-trips optional extensions and measurement overrides through real validation', async () => {
    const extensions = { 'org.example.g2': { required: false, payload: { x: [1, null, true] } } };
    const result = await mutate(({ project, design }) => {
      project.extensions = extensions;
      design.extensions = extensions;
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
    expect(result.value.project.extensions).toEqual(extensions);
    expect(result.value.design.extensions).toEqual(extensions);
    expect(result.value.project.resources.data[0]?.attributes[1]?.level).toBe('interval');
    expect(result.value.project.resources.data[0]?.attributes[1]?.inferredLevel).toBe('ratio');
  });

  it('diagnoses missing full-data feature targets', async () => {
    const result = await mutate(({ design }) => {
      const annotation = design.scenes[0]!.annotations[0]!;
      if (annotation.target.kind !== 'features')
        throw new Error('Frozen specimen lost its bound target');
      annotation.target.featureIds = ['p9'];
    });
    expect(result.ok).toBe(false);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'REFERENCE_MISSING',
          ids: expect.objectContaining({ featureId: 'p9' }),
        }),
      ]),
    );
  });

  it('diagnoses incompatible measurement declarations after loading', async () => {
    const result = await mutate(({ project }) => {
      project.resources.data[1]!.attributes[1]!.unit = 'incompatible units';
    });
    expect(result.ok).toBe(false);
    expect(result.diagnostics.some((entry) => entry.code === 'MEASUREMENT_INCOMPATIBLE')).toBe(
      true,
    );
  });

  it('rejects unknown narrative fields before the legacy parser can strip them', async () => {
    const result = await mutate(({ narrative }) => {
      Object.assign(narrative.scenes[0]!, { unsupportedAuthorIntent: true });
    });
    expect(result.ok).toBe(false);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'FIELD_UNKNOWN',
          artifact: 'narrative',
          path: ['scenes', 0, 'unsupportedAuthorIntent'],
        }),
      ]),
    );
  });

  it('rejects required unknown extensions', async () => {
    const result = await mutate(({ project }) => {
      project.extensions = { 'org.example.required': { required: true, payload: null } };
    });
    expect(result.ok).toBe(false);
    expect(result.diagnostics.some((entry) => entry.code === 'EXTENSION_REQUIRED')).toBe(true);
  });

  it('rejects malformed manifests at the public load boundary', async () => {
    const result = await mutate(({ project }) => {
      project.revision = -1;
    });
    expect(result.ok).toBe(false);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'VALUE_INVALID', artifact: 'project', path: ['revision'] }),
      ]),
    );
  });

  it('exports the byte-preserving legacy importer with the shared report contract', async () => {
    const original = join(root, 'examples/sf-waterfront.geonarrative.json');
    const destination = join(await scratch(), 'imported');
    const imported = await importLegacyNarrative(original, destination);
    expect(imported.ok).toBe(true);
    if (!imported.ok) throw new Error(JSON.stringify(imported.diagnostics));
    expect(ImportReportSchema.safeParse(imported.value).success).toBe(true);
    expect(await readFile(join(destination, 'narrative.geonarrative.json'))).toEqual(
      await readFile(original),
    );
    expect((await loadProject(destination)).ok).toBe(true);
    expect(
      imported.value.unsupportedRequests.some((entry) => entry.code === 'CAPABILITY_UNSUPPORTED'),
    ).toBe(true);
  });
});
