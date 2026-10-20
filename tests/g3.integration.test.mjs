import { afterEach, describe, expect, it } from 'vitest';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Script } from 'node:vm';
import { compileProject, loadProject, validateProject } from '@mapbard/core';
import { STAGE1_CAPABILITIES } from '@mapbard/knowledge';
import { renderCompiled } from '@mapbard/renderer';
import { buildCompiledExample } from '../scripts/build-compiled-example.mjs';

const specimen = resolve('fixtures/two-period');
const temporary = [];

async function copyProject() {
  const scratch = await mkdtemp(join(tmpdir(), 'mapbard-g3-'));
  temporary.push(scratch);
  const projectRoot = join(scratch, 'project');
  await cp(specimen, projectRoot, { recursive: true });
  return { scratch, projectRoot };
}

async function editJson(path, edit) {
  const value = JSON.parse(await readFile(path, 'utf8'));
  edit(value);
  await writeFile(path, JSON.stringify(value));
}

async function compiledProject(projectRoot) {
  const loaded = await loadProject(projectRoot);
  expect(loaded.ok).toBe(true);
  if (!loaded.ok) throw new Error(JSON.stringify(loaded.diagnostics));
  const validated = validateProject(loaded.value);
  expect(validated.ok).toBe(true);
  if (!validated.ok) throw new Error(JSON.stringify(validated.diagnostics));
  const compiled = compileProject(validated.value, STAGE1_CAPABILITIES);
  expect(compiled.ok).toBe(true);
  if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
  return { loaded: loaded.value, compiled: compiled.value };
}

afterEach(async () => {
  for (const directory of temporary.splice(0))
    await rm(directory, { recursive: true, force: true });
});

describe('G3 public package composition', () => {
  it('publishes the compiled g1-r1 story and its built player with a portable manifest', async () => {
    const { scratch, projectRoot } = await copyProject();
    const output = join(scratch, 'story');
    const manifest = await buildCompiledExample(projectRoot, output);
    const actual = JSON.parse(
      await readFile(join(output, 'compiled-data.js'), 'utf8').then((s) =>
        s.slice('window.MAPBARD_COMPILED = '.length, -2),
      ),
    );
    const expected = JSON.parse(
      await readFile(resolve('packages/core/src/compile/fixtures/compiled.g1-r1.json'), 'utf8'),
    );
    expect(actual.story).toEqual(expected);
    expect(actual.story.scenes[0].layers[0].runtimeId).not.toBe(
      actual.story.scenes[1].layers[0].runtimeId,
    );
    expect(actual.story.scales.find((scale) => scale.id === 'period-color').edges).toEqual([
      0, 40, 80, 120,
    ]);
    expect(manifest.written).toContain('player.js');
    expect(manifest.requiredNetwork).toEqual([]);
    expect(manifest.input).toEqual(expected.input);
    const playerScript = await readFile(join(output, 'player.js'), 'utf8');
    expect(() => new Script(playerScript)).not.toThrow();
    const relocated = join(scratch, 'relocated');
    await cp(output, relocated, { recursive: true });
    expect(await readFile(join(relocated, 'index.html'), 'utf8')).toContain('compiled-app.js');
    expect(await readFile(join(relocated, 'compiled-data.js'), 'utf8')).toContain('period-b');
  });

  it('rejects a changed declaration and a missing feature target through public APIs', async () => {
    const { projectRoot } = await copyProject();
    const { compiled } = await compiledProject(projectRoot);
    const manifestPath = join(projectRoot, 'mapbard.project.json');
    await editJson(manifestPath, (project) => {
      project.resources.data[0].attributes[1].override.rationale = 'Changed declaration';
    });
    const changed = await loadProject(projectRoot);
    expect(changed.ok).toBe(true);
    if (!changed.ok) return;
    const stale = renderCompiled(compiled, {
      currentInput: changed.value.input,
      dataBytes: changed.value.dataBytes,
      assets: changed.value.resolvedAssets,
    });
    expect(stale.ok).toBe(false);
    expect(stale.diagnostics.map((item) => item.code)).toContain('INPUT_STALE');

    await editJson(join(projectRoot, 'design.json'), (design) => {
      design.scenes[0].annotations[0].target.featureIds = ['p9'];
    });
    const invalid = await loadProject(projectRoot);
    expect(invalid.ok).toBe(true);
    if (!invalid.ok) return;
    const checked = validateProject(invalid.value);
    expect(checked.ok).toBe(false);
    expect(checked.diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'REFERENCE_MISSING' })]),
    );
  });

  it('blocks unsupported requests and changed source bytes before publication', async () => {
    const { projectRoot } = await copyProject();
    await editJson(join(projectRoot, 'narrative.geonarrative.json'), (narrative) => {
      narrative.basemap.style = 'protomaps-light';
    });
    const loaded = await loadProject(projectRoot);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const compiled = compileProject(loaded.value, STAGE1_CAPABILITIES);
    expect(compiled.ok).toBe(false);
    expect(compiled.diagnostics.map((item) => item.code)).toContain('CAPABILITY_UNSUPPORTED');

    await writeFile(join(projectRoot, 'data/period-a.geojson'), '{}');
    const stale = await loadProject(projectRoot);
    expect(stale.ok).toBe(false);
    expect(stale.diagnostics.map((item) => item.code)).toContain('RESOURCE_HASH_MISMATCH');
  });
});
