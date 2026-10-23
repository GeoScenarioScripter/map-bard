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
});
