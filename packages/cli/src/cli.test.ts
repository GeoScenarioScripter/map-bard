import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
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
    const storyPath = join(root, 'story.json');
    const story = JSON.parse(await readFile(storyPath, 'utf8'));
    story.scenes[0].title = 'Survey location';
    story.scenes[0].narration = 'A field survey recorded this location.';
    story.scenes[0].layers = [{ id: 'locations', sourceId: 'points', technique: 'point' }];
    await writeFile(storyPath, `${JSON.stringify(story, null, 2)}\n`);
    const initialStale = await cli('--project', root, 'check');
    expect(initialStale.code).toBe(1);
    expect(initialStale.envelope.diagnostics[0].code).toBe('INPUT_STALE');
    expect((await cli('--project', root, 'lock')).code).toBe(0);
    expect((await cli('--project', root, 'check')).envelope.ok).toBe(true);
    const online = await cli('--project', root, 'build', '--out', 'online');
    expect(online.code).toBe(0);
    expect(online.envelope.result.verification.input.resources).toHaveLength(1);
    expect(await readFile(join(root, 'online', 'compiled-data.js'), 'utf8')).toContain('locations');
    expect(online.envelope.result.verification.requiredHosts).toContain('tiles.openfreemap.org');
    const offline = await cli('--project', root, 'build', '--offline', '--out', 'offline');
    expect(offline.code).toBe(0);
    expect(offline.envelope.result.verification.requiredNetwork).toEqual([]);
    expect(await readFile(join(root, 'offline', 'index.html'), 'utf8')).toContain(
      'compiled-app.js',
    );
    const revisedStory = await readFile(storyPath, 'utf8');
    await writeFile(storyPath, revisedStory.replace('Survey location', 'Edited'));
    const stale = await cli('--project', root, 'check');
    expect(stale.code).toBe(1);
    expect(stale.envelope.diagnostics[0].code).toBe('INPUT_STALE');
    const refreshed = await cli('--project', root, 'lock');
    expect(refreshed.envelope.result).toEqual({ revision: 4, resources: 1, profiles: 1 });
    expect((await cli('--project', root, 'check')).code).toBe(0);
    // Critic findings are warnings: reported by check, never blocking.
    await writeFile(storyPath, revisedStory.replace('Survey location', 'Flow in m^3/s'));
    await cli('--project', root, 'lock');
    const critiqued = await cli('--project', root, 'check');
    expect(critiqued.code).toBe(0);
    expect(critiqued.envelope.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'TEXT_UNIT_UNFORMATTED',
        severity: 'warning',
        path: ['scenes', 0, 'title'],
      }),
    );
    expect((await cli('--project', root, 'build', '--offline', '--out', 'offline')).code).toBe(0);
    const skill = await cli('--project', root, 'skill', 'install', '--codex');
    expect(skill.code).toBe(0);
    expect(await readFile(join(root, 'AGENTS.md'), 'utf8')).toContain('skills/mapbard/SKILL.md');
  });
  it('keeps failed adds retryable and reports every blocking problem', async () => {
    const scratch = await mkdtemp(join(tmpdir(), 'mapbard-cli-'));
    created.push(scratch);
    const root = join(scratch, 'project');
    const outside = await cli('--project', root, 'add', 'missing.geojson');
    expect(outside.code).toBe(1);
    expect(outside.envelope.diagnostics[0].code).toBe('RESOURCE_MISSING');
    await cli('init', root);
    const data = join(scratch, 'stations.geojson');
    await writeFile(
      data,
      JSON.stringify({
        type: 'FeatureCollection',
        features: ['North', 'South'].map((name) => ({
          type: 'Feature',
          properties: { name, depth: 4 },
          geometry: { type: 'Point', coordinates: [0, 0] },
        })),
      }),
    );
    const unkeyed = await cli('--project', root, 'add', data, '--attribution', 'Survey');
    expect(unkeyed.envelope.result.added).toEqual([]);
    expect(unkeyed.envelope.diagnostics).toHaveLength(1);
    expect(unkeyed.envelope.diagnostics[0].remedy).toContain(
      '--feature-id with a unique property: name',
    );
    await expect(readFile(join(root, 'data', 'stations.geojson'))).rejects.toThrow();
    const repeated = await cli('--project', root, 'add', data, '--feature-id', 'depth');
    expect(repeated.envelope.diagnostics[0].message).toContain('depth is missing or repeated');
    const keyed = await cli('--project', root, 'add', data, '--feature-id', 'name');
    expect(keyed.envelope.result.added).toEqual(['stations']);
    const manifest = JSON.parse(await readFile(join(root, 'mapbard.json'), 'utf8'));
    expect(manifest.resources.data[0].featureId).toEqual({
      method: 'property',
      property: 'name',
      scope: 'source',
    });
    const storyPath = join(root, 'story.json');
    const story = JSON.parse(await readFile(storyPath, 'utf8'));
    story.scenes[0].layers = [
      { id: 'a', sourceId: 'nowhere', technique: 'point' },
      { id: 'b', sourceId: 'elsewhere', technique: 'point' },
    ];
    await writeFile(storyPath, JSON.stringify(story));
    await cli('--project', root, 'lock');
    const references = await cli('--project', root, 'check');
    expect(references.envelope.diagnostics.map((entry: { code: string }) => entry.code)).toEqual([
      'REFERENCE_MISSING',
      'REFERENCE_MISSING',
    ]);
    story.scenes[0].layers = [{ id: 'a', sourceId: 'stations', technique: 'heatmap' }];
    await writeFile(storyPath, JSON.stringify(story));
    await cli('--project', root, 'lock');
    const blocked = await cli('--project', root, 'check');
    expect(blocked.envelope.diagnostics.map((entry: { code: string }) => entry.code)).toEqual(
      expect.arrayContaining(['VALUE_INVALID', 'CAPABILITY_UNSUPPORTED']),
    );
    const limited = await cli('--limit', '1', 'schema', 'story.json');
    expect(limited.envelope.truncated).toBe(false);
    expect(JSON.stringify(limited.envelope.result)).toContain(
      '"required":["narrativeRole","emphasis","readerAgency"]',
    );
    const capabilities = await cli('--limit', '1', 'capabilities');
    expect(capabilities.envelope.result.techniques).toHaveLength(1);
    expect(capabilities.envelope.truncated).toBe(true);
  });
  it('serves preview assets with real types and survives malformed URLs', async () => {
    const scratch = await mkdtemp(join(tmpdir(), 'mapbard-cli-'));
    created.push(scratch);
    const root = join(scratch, 'project');
    await cli('init', root);
    const photo = fileURLToPath(
      new URL('../../../fixtures/ingest/media/skyline.png', import.meta.url),
    );
    await cli('--project', root, 'add', photo, '--attribution', 'Fixture');
    const story = JSON.parse(await readFile(join(root, 'story.json'), 'utf8'));
    story.scenes[0].media = [{ assetId: 'skyline' }];
    await writeFile(join(root, 'story.json'), JSON.stringify(story));
    const server = spawn(process.execPath, [binary, '--json', '--project', root, 'preview']);
    try {
      const line = await new Promise<string>((ready, fail) => {
        let text = '';
        server.stdout.on('data', (chunk) => {
          text += chunk;
          if (text.includes('\n')) ready(text);
        });
        server.once('exit', () => fail(new Error(`preview exited: ${text}`)));
      });
      const { url, directory } = JSON.parse(line).result as { url: string; directory: string };
      expect((await fetch(`${url}%E0%A4%A`)).status).toBe(400);
      const index = await fetch(url);
      expect(index.headers.get('content-type')).toBe('text/html; charset=utf-8');
      const [image] = await readdir(join(directory, 'media'));
      expect((await fetch(`${url}media/${image}`)).headers.get('content-type')).toBe('image/png');
    } finally {
      server.kill();
    }
  });
  it('keeps previewing a broken project and streams its diagnostics', async () => {
    const scratch = await mkdtemp(join(tmpdir(), 'mapbard-cli-'));
    created.push(scratch);
    const root = join(scratch, 'project');
    await cli('init', root);
    const story = JSON.parse(await readFile(join(root, 'story.json'), 'utf8'));
    story.scenes[0].layers = [{ id: 'a', sourceId: 'nowhere', technique: 'point' }];
    await writeFile(join(root, 'story.json'), JSON.stringify(story));
    const server = spawn(process.execPath, [binary, '--json', '--project', root, 'preview']);
    try {
      const line = await new Promise<string>((ready, fail) => {
        let text = '';
        server.stdout.on('data', (chunk) => {
          text += chunk;
          if (text.includes('\n')) ready(text);
        });
        server.once('exit', () => fail(new Error(`preview exited: ${text}`)));
      });
      const envelope = JSON.parse(line);
      expect(envelope.ok).toBe(false);
      const page = await (await fetch(envelope.result.url)).text();
      expect(page).toContain('__mapbard_events');
      const events = await fetch(`${envelope.result.url}__mapbard_events`);
      const reader = events.body!.getReader();
      let stream = '';
      while (!stream.includes('REFERENCE_MISSING'))
        stream += new TextDecoder().decode((await reader.read()).value);
      await reader.cancel();
    } finally {
      server.kill();
    }
  });
  it('rejects names outside printable ASCII', async () => {
    const scratch = await mkdtemp(join(tmpdir(), 'mapbard-cli-'));
    created.push(scratch);
    expect((await cli('init', join(scratch, '地图'))).envelope.diagnostics[0].message).toContain(
      'English (ASCII)',
    );
    const root = join(scratch, 'project');
    await cli('init', root);
    const data = join(scratch, '河流.geojson');
    await writeFile(data, JSON.stringify({ type: 'FeatureCollection', features: [] }));
    const named = await cli('--project', root, 'add', data);
    expect(named.envelope.result.added).toEqual([]);
    expect(named.envelope.diagnostics[0].message).toContain('English (ASCII)');
    const id = await cli('--project', root, 'add', data, '--id', '河流');
    expect(id.envelope.diagnostics[0].path).toEqual(['--id']);
  });
  it('returns usage code 2 in JSON mode', async () => {
    const usage = await cli('build', '--bogus');
    expect(usage.code).toBe(2);
    expect(usage.envelope.command).toBe('build');
  });
});
