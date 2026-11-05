import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// The atlas and night Potomac examples tell one story from the same files.
const atlas = resolve('examples/projects/potomac');
const night = resolve('examples/projects/potomac-night');

const json = async (root, file) => JSON.parse(await readFile(join(root, file), 'utf8'));

/** Paths where two JSON values differ, as dotted strings. */
function differences(a, b, path = []) {
  if (Object.is(a, b)) return [];
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    return [...keys].flatMap((key) => differences(a[key], b[key], [...path, key]));
  }
  return [path.join('.')];
}

/** Theme, basemap style and layer colours may differ; nothing else. */
const ALLOWED = [/^theme(\.|$)/, /^basemap\.style$/, /^scenes\.\d+\.layers\.\d+\.constant\.color$/];

describe('Potomac variants', () => {
  it('share every resource byte for byte', async () => {
    const hashes = async (root) => (await json(root, 'mapbard.lock.json')).inputs.resources;
    const shared = await hashes(atlas);
    expect(shared.length).toBeGreaterThan(0);
    expect(await hashes(night)).toEqual(shared);
  });

  it('differ only in theme, basemap style and layer colours', async () => {
    for (const file of ['mapbard.json', 'story.json']) {
      const changed = differences(await json(atlas, file), await json(night, file));
      expect(changed.filter((path) => !ALLOWED.some((rule) => rule.test(path)))).toEqual([]);
    }
    const [atlasManifest, nightManifest] = await Promise.all([
      json(atlas, 'mapbard.json'),
      json(night, 'mapbard.json'),
    ]);
    expect([atlasManifest.theme.preset, nightManifest.theme.preset]).toEqual(['atlas', 'night']);
  });

  // V2 acceptance (docs/m2-visual.md, O): 2024 columns, 2025 change columns that morph from
  // them beside 2024 ghosts, one height scale, and the size form where the view is top-down.
  it('draw the gauges as columns and change symbols on one height scale', async () => {
    for (const root of [atlas, night]) {
      const story = await json(root, 'story.json');
      const gauges = Object.fromEntries(
        story.scenes.map((scene) => [
          scene.id,
          scene.layers.find((layer) => layer.id === 'gauges'),
        ]),
      );
      expect(gauges['context-2024']).toMatchObject({
        technique: 'column',
        sourceId: 'potomac-2024',
        encode: { visualVariable: 'height' },
      });
      expect(gauges['compare-2025']).toMatchObject({
        technique: 'change',
        sourceId: 'potomac-2025',
        encode: { visualVariable: 'height' },
        compare: { sourceId: 'potomac-2024', labels: true },
        transition: { from: { sceneId: 'context-2024' } },
      });
      expect(gauges.limits).toMatchObject({ technique: 'column', sourceId: 'potomac-2025' });
      expect(gauges.scope).toMatchObject({
        technique: 'change',
        encode: { visualVariable: 'size' },
        compare: { sourceId: 'potomac-2024' },
      });

      const height = story.sharedScales.find((scale) => scale.visualVariable === 'height');
      const members = height.members.map((member) => `${member.sceneId}/${member.sourceId}`);
      expect(members).toEqual([
        'context-2024/potomac-2024',
        'compare-2025/potomac-2025',
        'limits/potomac-2025',
      ]);
      // Every scene that draws heights pitches its camera at rest.
      for (const scene of story.scenes)
        if (gauges[scene.id].encode.visualVariable === 'height')
          expect(scene.camera.pitch).toBeGreaterThan(0);
      // The 2024 columns rise downstream, one after another.
      const grow = story.scenes[0].motion.layers.find((track) => track.property === 'grow');
      expect(grow).toMatchObject({ layerId: 'gauges', stagger: { delayMs: expect.any(Number) } });
    }
  });
});
