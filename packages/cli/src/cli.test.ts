import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const runFile = promisify(execFile);
const binary = fileURLToPath(new URL('../dist/bin.js', import.meta.url));
const created: string[] = [];
async function cli(...args: string[]) {
  try {
    const output = await runFile(process.execPath, [binary, '--json', ...args]);
    return { code: 0, envelope: JSON.parse(output.stdout) };
  } catch (error) {
    const failed = error as { code: number; stdout: string };
    return { code: failed.code, envelope: JSON.parse(failed.stdout) };
  }
}
afterEach(async () => {
  for (const path of created.splice(0)) await rm(path, { recursive: true, force: true });
});

describe('CLI binary', () => {
  it('runs init, add, inspect, check and both build modes with stable envelopes', async () => {
    const scratch = await mkdtemp(join(tmpdir(), 'mapbard-cli-'));
    created.push(scratch);
    const root = join(scratch, 'project');
    const data = join(scratch, 'points.geojson');
    await writeFile(
      data,
      JSON.stringify({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            id: 'a',
            properties: { value: 3 },
            geometry: { type: 'Point', coordinates: [0, 0] },
          },
        ],
      }),
    );
    expect((await cli('init', root)).envelope.ok).toBe(true);
    const registered = await cli('--project', root, 'add', data, '--attribution', 'Field survey');
    expect(registered.envelope.result.added).toEqual(['points']);
    expect(
      (await cli('--project', root, 'inspect', 'points')).envelope.result[0].profile.featureCount,
    ).toBe(1);
    expect(
      (await cli('--project', root, 'inspect', 'points')).envelope.result[0].featureIdUnique,
    ).toBe(true);
    expect((await cli('--project', root, 'check')).envelope.ok).toBe(true);
    const online = await cli('--project', root, 'build', '--out', 'online');
    expect(online.code).toBe(0);
    expect(online.envelope.result.verification.requiredHosts).toContain('tiles.openfreemap.org');
    const offline = await cli('--project', root, 'build', '--offline', '--out', 'offline');
    expect(offline.code).toBe(0);
    expect(offline.envelope.result.verification.requiredNetwork).toEqual([]);
    expect(await readFile(join(root, 'offline', 'index.html'), 'utf8')).toContain(
      'compiled-app.js',
    );
    const storyPath = join(root, 'story.json');
    const story = await readFile(storyPath, 'utf8');
    await writeFile(storyPath, story.replace('Introduction', 'Edited'));
    const stale = await cli('--project', root, 'check');
    expect(stale.code).toBe(1);
    expect(stale.envelope.diagnostics[0].code).toBe('INPUT_STALE');
    expect((await cli('--project', root, 'build', '--offline', '--out', 'offline')).code).toBe(0);
    const skill = await cli('--project', root, 'skill', 'install', '--codex');
    expect(skill.code).toBe(0);
    expect(await readFile(join(root, 'AGENTS.md'), 'utf8')).toContain('skills/mapbard/SKILL.md');
  });
  it('returns usage code 2 in JSON mode', async () => {
    const usage = await cli('build', '--bogus');
    expect(usage.code).toBe(2);
    expect(usage.envelope.command).toBe('build');
  });
});
