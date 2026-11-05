import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compileProject, critiqueProject, loadProject } from '@mapbard/core';
import { STAGE1_CAPABILITIES } from '@mapbard/knowledge';

// The flows example (m2-visual.md, P): ACS 2024 state-to-state flows as deck.gl arcs.
const root = resolve('examples/projects/migration-flows');
const json = async (file) => JSON.parse(await readFile(join(root, file), 'utf8'));

async function compiled(offline = false) {
  const loaded = await loadProject(root);
  if (!loaded.ok) throw new Error(JSON.stringify(loaded.diagnostics));
  const result = compileProject(loaded.value, STAGE1_CAPABILITIES, { offline });
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
  return { loaded: loaded.value, story: result.value };
}

/** Every number of four or more digits in a text, as written ("77,161" is 77161). */
const numbersIn = (text) =>
  [...text.matchAll(/\d{1,3}(?:,\d{3})+|\d{4,}/g)].map((m) => +m[0].replace(/,/g, ''));

describe('migration-flows example', () => {
  it('is current and critic-clean, online and offline', async () => {
    const { loaded, story } = await compiled();
    expect(critiqueProject(loaded, story)).toEqual([]);
    const offline = await compiled(true);
    expect(offline.story.requiredNetwork).toEqual([]);
    expect(story.requiredNetwork.length).toBeGreaterThan(0);
  }, 30_000);

  it('draws deck.gl arcs on one width scale, in Mercator with no terrain and no atlas theme', async () => {
    const { story } = await compiled();
    expect(story.theme.preset).not.toBe('atlas');
    expect(story.basemap.projection).toBe('mercator');
    expect(story.basemap.terrain).toBeUndefined();
    expect(story.scenes.map((scene) => scene.id)).toEqual([
      'overview',
      'largest-first',
      'east-coast',
      'limits',
    ]);
    const arcs = story.scenes.flatMap((scene) => scene.layers.filter((l) => l.technique === 'arc'));
    expect(arcs).toHaveLength(5);
    for (const arc of arcs) expect(arc).toMatchObject({ backend: 'deck', scaleId: 'movers-width' });
    const scale = story.scales.find((item) => item.id === 'movers-width');
    expect(scale).toMatchObject({ kind: 'numeric-width', domain: [0, 77161], maxWidth: 10 });
    // Arcs are revealed largest first.
    const ranked = story.scenes[1].motion.layers.find((track) => track.property === 'opacity');
    expect(ranked.stagger).toMatchObject({ order: 'descending', attribute: 'movers' });
  }, 30_000);

  it('keeps the 30 largest published flows, each with its 90% margin of error', async () => {
    const { features } = await json('data/acs-2024-top-state-flows.geojson');
    expect(features).toHaveLength(30);
    const movers = features.map((feature) => feature.properties.movers);
    expect(movers).toEqual([...movers].sort((a, b) => b - a));
    for (const { id, properties, geometry } of features) {
      expect(id).toMatch(/^[a-z-]+-to-[a-z-]+$/);
      expect(properties.movers_moe).toBeGreaterThan(0);
      expect(geometry.coordinates).toHaveLength(2);
    }
    const manifest = await json('mapbard.json');
    for (const resource of manifest.resources.data)
      expect(resource.attribution).toMatchObject({
        license: 'U.S. public domain',
        accessedAt: expect.any(String),
        url: expect.stringMatching(/^https:\/\/[a-z0-9.]+\.census\.gov\//),
      });
  });

  it('traces every value in the narration and callouts to the data, with its margin', async () => {
    const { features } = await json('data/acs-2024-top-state-flows.geojson');
    const story = await json('story.json');
    const byId = new Map(features.map((feature) => [feature.id, feature.properties]));
    // Estimates, margins and the limits scene's filter threshold; nothing else is a value.
    const thresholds = story.scenes.flatMap((scene) =>
      scene.layers.flatMap((layer) => (layer.filter ? [layer.filter.value] : [])),
    );
    const known = new Set([
      ...features.flatMap((f) => [f.properties.movers, f.properties.movers_moe]),
      ...thresholds,
      2020, // the centers of population
      2024, // the survey year
    ]);
    const pairs = new Set(features.map((f) => `${f.properties.movers}±${f.properties.movers_moe}`));
    for (const scene of story.scenes) {
      for (const value of numbersIn(scene.narration)) expect(known).toContain(value);
      // Each estimate written with a margin, "77,161 (±9,059)" or "(53,289 ±6,970)", is one flow's.
      for (const match of scene.narration.matchAll(/([\d,]+)\)? ?\(?±([\d,]+)/g))
        expect(pairs).toContain(`${match[1].replace(/,/g, '')}±${match[2].replace(/,/g, '')}`);
      for (const annotation of scene.annotations) {
        expect(annotation.target.featureIds).toHaveLength(1);
        const flow = byId.get(annotation.target.featureIds[0]);
        expect(annotation.text).toContain(`${flow.origin} to ${flow.destination}`);
        expect(annotation.text).toContain(`${flow.movers.toLocaleString('en-US')}`);
        expect(annotation.text).toContain(`(±${flow.movers_moe.toLocaleString('en-US')}`);
        // Callouts on arcs anchor at the destination, where the arc ends.
        const feature = features.find((f) => f.id === annotation.target.featureIds[0]);
        expect(annotation.at).toEqual(feature.geometry.coordinates[1]);
      }
    }
  });
});
