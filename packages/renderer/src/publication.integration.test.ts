import { afterEach, describe, expect, it } from 'vitest';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileProject, loadProject, validateProject } from '@mapbard/core';
import { STAGE1_CAPABILITIES } from '@mapbard/knowledge';
import { renderCompiled, writeCompiledBundle } from '@mapbard/renderer';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const example = join(root, 'examples/projects/first-slice');
const temporary: string[] = [];

async function copiedProject(): Promise<{ scratch: string; project: string }> {
  const scratch = await mkdtemp(join(tmpdir(), 'mapbard-w4b-publish-'));
  temporary.push(scratch);
  const project = join(scratch, 'project');
  await cp(example, project, { recursive: true });
  return { scratch, project };
}

async function compile(path: string) {
  const loaded = await loadProject(path);
  expect(loaded.ok).toBe(true);
  if (!loaded.ok) throw new Error(JSON.stringify(loaded.diagnostics));
  const validated = validateProject(loaded.value);
  expect(validated.ok).toBe(true);
  if (!validated.ok) throw new Error(JSON.stringify(validated.diagnostics));
  const compiled = compileProject(validated.value, STAGE1_CAPABILITIES);
  expect(compiled.ok).toBe(true);
  if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
  return { loaded: validated.value, story: compiled.value };
}

const codes = (result: { diagnostics: { code: string }[] }) =>
  result.diagnostics.map((diagnostic) => diagnostic.code);

afterEach(async () => {
  for (const path of temporary.splice(0)) await rm(path, { recursive: true, force: true });
});

describe('W4-B real publication regression through public APIs', () => {
  it('keeps publication separate from editable state and retains real content', async () => {
    const { scratch, project } = await copiedProject();
    const before = await Promise.all(
      ['mapbard.project.json', 'narrative.geonarrative.json', 'design.json'].map((file) =>
        readFile(join(project, file)),
      ),
    );
    const { loaded, story } = await compile(project);
    const bundle = renderCompiled(story, {
      currentInput: loaded.input,
      dataBytes: loaded.dataBytes,
      assets: loaded.resolvedAssets,
    });
    expect(bundle.ok).toBe(true);
    if (!bundle.ok) return;
    expect(bundle.value.requiredNetwork).toEqual([]);
    expect(bundle.value.files['index.html']).toContain('Two October days on the Potomac');
    expect(bundle.value.files['index.html']).toContain('Sources and qualifications');
    expect(bundle.value.files['compiled-data.js']).toContain('USGS-01613000');
    const output = join(scratch, 'story');
    const written = await writeCompiledBundle(bundle.value, output);
    expect(written.ok).toBe(true);
    if (!written.ok) return;
    const mediaPath = loaded.resolvedAssets[0]!.bundlePath;
    expect(written.value.written).toContain(mediaPath);
    expect(await readFile(join(output, mediaPath))).toEqual(
      await readFile(join(project, 'media/potomac-context.jpg')),
    );
    await expect(readFile(join(output, 'mapbard.project.json'))).rejects.toThrow();
    expect(
      await Promise.all(
        ['mapbard.project.json', 'narrative.geonarrative.json', 'design.json'].map((file) =>
          readFile(join(project, file)),
        ),
      ),
    ).toEqual(before);
  });

  it('rejects stale author edits and changed data before publishing', async () => {
    const { scratch, project } = await copiedProject();
    const { loaded, story } = await compile(project);
    const narrativePath = join(project, 'narrative.geonarrative.json');
    const narrative = JSON.parse(await readFile(narrativePath, 'utf8'));
    narrative.scenes[0].narration += ' Edited after compilation.';
    await writeFile(narrativePath, JSON.stringify(narrative));
    const fresh = await loadProject(project);
    expect(fresh.ok).toBe(true);
    if (!fresh.ok) return;
    const stale = renderCompiled(story, {
      currentInput: fresh.value.input,
      dataBytes: fresh.value.dataBytes,
      assets: fresh.value.resolvedAssets,
    });
    expect(codes(stale)).toContain('INPUT_STALE');
    await expect(readFile(join(scratch, 'story/index.html'))).rejects.toThrow();

    const changed = renderCompiled(story, {
      currentInput: loaded.input,
      dataBytes: [
        { id: loaded.dataBytes[0]!.id, bytes: new TextEncoder().encode('{}') },
        ...loaded.dataBytes.slice(1),
      ],
      assets: loaded.resolvedAssets,
    });
    expect(codes(changed)).toContain('INPUT_STALE');
  });

  it('preflights missing and escaping media without installing output', async () => {
    const { scratch, project } = await copiedProject();
    const { loaded, story } = await compile(project);
    const rendered = renderCompiled(story, {
      currentInput: loaded.input,
      dataBytes: loaded.dataBytes,
      assets: loaded.resolvedAssets,
    });
    expect(rendered.ok).toBe(true);
    if (!rendered.ok) return;
    const escaped = structuredClone(rendered.value);
    escaped.mediaCopies[0]!.bundlePath = '../outside.jpg';
    const escapeOutput = join(scratch, 'escape-output');
    expect(codes(await writeCompiledBundle(escaped, escapeOutput))).toContain('ASSET_PATH_INVALID');
    await expect(readFile(join(escapeOutput, 'index.html'))).rejects.toThrow();
    await expect(readFile(join(scratch, 'outside.jpg'))).rejects.toThrow();

    await rm(join(project, 'media/potomac-context.jpg'));
    const missingOutput = join(scratch, 'missing-output');
    const missing = await writeCompiledBundle(rendered.value, missingOutput);
    expect(codes(missing)).toContain('ASSET_PATH_INVALID');
    await expect(readFile(join(missingOutput, 'index.html'))).rejects.toThrow();
  });
});
