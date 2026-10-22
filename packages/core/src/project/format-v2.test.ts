import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STAGE1_CAPABILITIES } from '@mapbard/knowledge';
import { compileProject } from '../compile/compile.js';
import { loadProject } from './load.js';
import { migrateProject } from './migrate.js';
import { recordProjectCompilation, refreshProjectLock } from './format-v2.js';

const source = fileURLToPath(
  new URL('../../../../examples/projects/first-slice/', import.meta.url),
);
const fixture = fileURLToPath(new URL('../../../../fixtures/two-period/', import.meta.url));
const created: string[] = [];

async function destination(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'mapbard-m1b-'));
  created.push(root);
  return join(root, 'converted');
}

afterEach(async () => {
  for (const root of created.splice(0)) await rm(root, { recursive: true, force: true });
});

describe('format 0.2 migration and lock', () => {
  it('migrates Potomac without changing source and compiles the same scenes and scales', async () => {
    const before = await readFile(join(source, 'mapbard.project.json'));
    const dest = await destination();
    const migrated = await migrateProject(source, dest);
    expect(migrated.ok).toBe(true);
    expect(await readFile(join(source, 'mapbard.project.json'))).toEqual(before);
    const manifest = JSON.parse(await readFile(join(dest, 'mapbard.json'), 'utf8'));
    const story = JSON.parse(await readFile(join(dest, 'story.json'), 'utf8'));
    const lock = JSON.parse(await readFile(join(dest, 'mapbard.lock.json'), 'utf8'));
    expect(manifest.resources.data[0]).not.toHaveProperty('sha256');
    expect(story.scenes[0].layers[0]).toHaveProperty('constant');
    expect(lock.profiles['potomac-2024'].attributeStats.daily_mean_discharge).toEqual({
      present: 3,
      missing: 0,
      min: 5580,
      max: 23600,
    });
    const loaded = await loadProject(dest);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const compiled = compileProject(loaded.value, STAGE1_CAPABILITIES);
    expect(compiled.ok).toBe(true);
    if (compiled.ok) {
      expect(compiled.value.compiledVersion).toBe('0.3.0');
      expect(compiled.value.contractVersions.project).toBe('0.2.0');
      expect(compiled.value.scenes).toHaveLength(3);
      expect(compiled.value.scales.some((scale) => scale.id === 'daily-discharge')).toBe(true);
      const recorded = await recordProjectCompilation(dest, compiled.value);
      expect(recorded.ok).toBe(true);
      if (recorded.ok) expect(recorded.value.lastCompileInputs).toEqual(recorded.value.inputs);
    }
  });

  it('normalizes text line endings, detects drift, and refreshes only the lock', async () => {
    const dest = await destination();
    expect((await migrateProject(source, dest)).ok).toBe(true);
    const path = join(dest, 'story.json');
    const original = await readFile(path, 'utf8');
    await writeFile(path, original.replace(/\n/g, '\r\n'));
    expect((await loadProject(dest)).ok).toBe(true);
    await writeFile(
      path,
      original.replace('Three gauges, one published day', 'Changed scene title'),
    );
    const stale = await loadProject(dest);
    expect(stale.ok).toBe(false);
    expect(stale.diagnostics.some((entry) => entry.code === 'INPUT_STALE')).toBe(true);
    const refreshed = await refreshProjectLock(dest);
    expect(refreshed.ok).toBe(true);
    expect((await loadProject(dest)).ok).toBe(true);
    expect(await readFile(path, 'utf8')).toContain('Changed scene title');
  });

  it('rejects unknown versions and semantic resource references', async () => {
    const dest = await destination();
    expect((await migrateProject(source, dest)).ok).toBe(true);
    const path = join(dest, 'story.json');
    const story = JSON.parse(await readFile(path, 'utf8'));
    story.formatVersion = '9.0.0';
    await writeFile(path, JSON.stringify(story));
    const version = await loadProject(dest);
    expect(version.ok).toBe(false);
    expect(version.diagnostics[0]?.code).toBe('VERSION_UNSUPPORTED');
    story.formatVersion = '0.2.0';
    story.scenes[0].layers[0].sourceId = 'missing';
    await writeFile(path, JSON.stringify(story));
    expect((await refreshProjectLock(dest)).ok).toBe(true);
    const reference = await loadProject(dest);
    expect(reference.ok).toBe(false);
    expect(reference.diagnostics.some((entry) => entry.code === 'REFERENCE_MISSING')).toBe(true);
  });

  it('carries authored motion through the 0.2 loader into compiled tracks and diagnostics', async () => {
    const dest = await destination();
    expect((await migrateProject(source, dest)).ok).toBe(true);
    const manifestPath = join(dest, 'mapbard.json');
    const storyPath = join(dest, 'story.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    const story = JSON.parse(await readFile(storyPath, 'utf8'));
    manifest.motion = { trigger: 'top', data: { durationMs: 600 } };
    manifest.motionPresets = { long: { scrollLength: 2.5 } };
    const gauges = story.scenes[0].layers.find((layer: { id: string }) => layer.id === 'gauges');
    story.scenes[0].motion = {
      preset: 'long',
      camera: { preset: 'fly-along', feature: `${gauges.sourceId}/USGS-01646500` },
      layers: [{ layerId: 'gauges', property: 'opacity' }],
    };
    await writeFile(manifestPath, JSON.stringify(manifest));
    await writeFile(storyPath, JSON.stringify(story));
    expect((await refreshProjectLock(dest)).ok).toBe(true);
    let loaded = await loadProject(dest);
    if (!loaded.ok) throw new Error(JSON.stringify(loaded.diagnostics));
    const rejected = compileProject(loaded.value, STAGE1_CAPABILITIES);
    expect(rejected.ok).toBe(false);
    expect(rejected.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'VALUE_INVALID',
        artifact: 'narrative',
        path: ['scenes', 0, 'motion', 'camera', 'feature'],
        ids: { sceneId: story.scenes[0].id, featureId: 'USGS-01646500' },
      }),
    );
    story.scenes[0].motion.camera = {
      preset: 'push-in',
      feature: `${gauges.sourceId}/USGS-01646500`,
    };
    await writeFile(storyPath, JSON.stringify(story));
    expect((await refreshProjectLock(dest)).ok).toBe(true);
    loaded = await loadProject(dest);
    if (!loaded.ok) throw new Error(JSON.stringify(loaded.diagnostics));
    const compiled = compileProject(loaded.value, STAGE1_CAPABILITIES);
    if (!compiled.ok) throw new Error(JSON.stringify(compiled.diagnostics));
    const motion = compiled.value.scenes[0]!.motion;
    expect(motion).toMatchObject({ scrollLength: 2.5, trigger: 0 });
    expect(motion.camera.final.center).toEqual([-77.127639, 38.949778]);
    expect(motion.layers[0]).toMatchObject({ property: 'opacity', mode: 'play', durationMs: 600 });
    // Scenes without authored motion keep the built-in held camera.
    expect(compiled.value.scenes[1]!.motion.camera.keyframes).toHaveLength(1);
  });

  it('migrates the two-period fixture and rejects a future lock version', async () => {
    const dest = await destination();
    expect((await migrateProject(fixture, dest)).ok).toBe(true);
    const loaded = await loadProject(dest);
    expect(loaded.ok).toBe(true);
    if (loaded.ok) expect(compileProject(loaded.value, STAGE1_CAPABILITIES).ok).toBe(true);
    const path = join(dest, 'mapbard.lock.json');
    const lock = JSON.parse(await readFile(path, 'utf8'));
    lock.lockVersion = '9.0.0';
    await writeFile(path, JSON.stringify(lock));
    expect((await loadProject(dest)).diagnostics[0]?.code).toBe('VERSION_UNSUPPORTED');
    expect((await refreshProjectLock(dest)).diagnostics[0]?.code).toBe('VERSION_UNSUPPORTED');
  });
});
