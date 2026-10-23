import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { afterEach, describe, expect, it } from 'vitest';
import type { Sample } from './capture.js';
import { drawnShare, VIEWPORTS } from './capture.js';
import {
  compareGoldens,
  diffImages,
  measureNoise,
  MIN_DIFF_RATIO,
  readGoldenManifest,
  toleranceFor,
  writeGoldens,
} from './goldens.js';

/** A solid PNG, with `marked` pixels of the first row painted another colour. */
function solidPng(
  width: number,
  height: number,
  colour: [number, number, number],
  marked = 0,
  mark: [number, number, number] = [255, 0, 0],
): Buffer {
  const png = new PNG({ width, height });
  for (let index = 0; index < width * height; index++) {
    const [r, g, b] = index < marked ? mark : colour;
    png.data.set([r, g, b, 255], index * 4);
  }
  return PNG.sync.write(png);
}

const created: string[] = [];
afterEach(async () => {
  for (const path of created.splice(0)) await rm(path, { recursive: true, force: true });
});
async function scratch(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'mapbard-goldens-'));
  created.push(root);
  return root;
}

const sample = (sceneId: string, viewport: 'desktop' | 'phone', p: number): Sample => ({
  sceneId,
  p,
  viewport,
  phase: 'rest',
  screenshot: `${sceneId}-p${Math.round(p * 100)}-${viewport}.png`,
  symbolsChecked: 0,
  findings: [],
});

describe('image diff', () => {
  it('reports the share of differing pixels', () => {
    const base = solidPng(10, 10, [200, 200, 200]);
    expect(diffImages(base, base)).toMatchObject({ differing: 0, ratio: 0 });
    const changed = solidPng(10, 10, [200, 200, 200], 5);
    expect(diffImages(base, changed)).toMatchObject({ differing: 5, ratio: 0.05 });
  });

  it('ignores changes under the per-pixel threshold and fails other sizes everywhere', () => {
    const base = solidPng(10, 10, [200, 200, 200]);
    expect(diffImages(base, solidPng(10, 10, [201, 200, 200])).ratio).toBe(0);
    expect(diffImages(base, solidPng(10, 12, [200, 200, 200])).ratio).toBe(1);
  });

  it('writes a diff image on request', () => {
    const result = diffImages(solidPng(4, 4, [0, 0, 0]), solidPng(4, 4, [0, 0, 0], 2), {
      diff: true,
    });
    const diff = PNG.sync.read(result.diffPng!);
    expect([diff.width, diff.height]).toEqual([4, 4]);
    expect([...diff.data.subarray(0, 3)]).toEqual([255, 0, 0]);
  });

  it('measures what the map drew over its background', () => {
    expect(drawnShare(solidPng(10, 10, [240, 238, 230]))).toBe(0);
    expect(drawnShare(solidPng(10, 10, [240, 238, 230], 3))).toBeCloseTo(0.03);
  });
});

describe('goldens', () => {
  it('sets the tolerance at three times the noise, with a floor', () => {
    expect(toleranceFor(0)).toBe(MIN_DIFF_RATIO);
    expect(toleranceFor(0.001)).toBeCloseTo(0.003);
  });

  it('measures noise as the worst diff of later runs against the first', async () => {
    const root = await scratch();
    const captures = [sample('a', 'desktop', 0)];
    const runs = [0, 1, 2].map((run) => ({ out: join(root, `run-${run}`), captures }));
    for (const [index, run] of runs.entries()) {
      await mkdir(run.out);
      await writeFile(
        join(run.out, captures[0]!.screenshot!),
        solidPng(10, 10, [9, 9, 9], index === 2 ? 2 : 0),
      );
    }
    expect(await measureNoise(runs)).toBeCloseTo(0.02);
    expect(await measureNoise(runs.slice(0, 1))).toBe(0);
  });

  it('round-trips: written goldens match, a changed colour fails with a diff image', async () => {
    const root = await scratch();
    const out = join(root, 'captures');
    await mkdir(out);
    const captures = [sample('a', 'desktop', 0), sample('a', 'phone', 1)];
    for (const capture of captures)
      await writeFile(join(out, capture.screenshot!), solidPng(20, 10, [30, 60, 90]));
    // A stale golden from a removed scene is replaced, not kept.
    await mkdir(join(root, 'goldens'));
    await writeFile(join(root, 'goldens', 'old-p0-desktop.png'), solidPng(1, 1, [0, 0, 0]));
    const manifest = await writeGoldens(root, out, captures, {
      mapbard: '0.0.0-test',
      chromium: '140.0',
      platform: 'linux',
      viewports: VIEWPORTS,
      noise: 0,
    });
    expect(manifest).toMatchObject({
      manifestVersion: 1,
      platform: 'linux',
      threshold: 0.1,
      maxDiffRatio: MIN_DIFF_RATIO,
      noise: { runs: 5, maxDiffRatio: 0, factor: 3 },
      captures: ['a-p0-desktop.png', 'a-p100-phone.png'],
      viewports: [
        { id: 'desktop', width: 1440, height: 900 },
        { id: 'phone', width: 390, height: 844 },
      ],
    });
    expect((await readdir(join(root, 'goldens'))).sort()).toEqual([
      'a-p0-desktop.png',
      'a-p100-phone.png',
      'manifest.json',
    ]);
    expect(await readGoldenManifest(root)).toEqual(manifest);
    const scenes = new Map([['a', 0]]);
    const same = await compareGoldens(root, out, captures, manifest, scenes, 'linux');
    expect(same.diagnostics).toEqual([]);
    expect(same.comparisons.map((entry) => entry.status)).toEqual(['match', 'match']);

    await writeFile(join(out, 'a-p100-phone.png'), solidPng(20, 10, [200, 60, 90]));
    const changed = await compareGoldens(root, out, captures, manifest, scenes, 'linux');
    expect(changed.diagnostics).toEqual([
      expect.objectContaining({
        code: 'VISUAL_GOLDEN_MISMATCH',
        severity: 'error',
        path: ['scenes', 0],
        ids: { sceneId: 'a' },
      }),
    ]);
    expect(changed.diagnostics[0]!.message).toContain('100.00% of pixels differ');
    const diff = PNG.sync.read(await readFile(join(out, 'a-p100-phone.diff.png')));
    expect(diff.width).toBe(20);

    // Goldens from another platform give one summary warning.
    const elsewhere = await compareGoldens(root, out, captures, manifest, scenes, 'win32');
    expect(elsewhere.diagnostics).toEqual([
      expect.objectContaining({ severity: 'warning', path: ['goldens'] }),
    ]);
    expect(elsewhere.diagnostics[0]!.message).toContain('1 of 2 captures differ');
    expect(elsewhere.diagnostics[0]!.message).toContain('made on linux');
    expect(elsewhere.comparisons.map((entry) => entry.status)).toEqual(['match', 'mismatch']);
  });

  it('reports captures without a golden and goldens without a capture', async () => {
    const root = await scratch();
    const out = join(root, 'captures');
    await mkdir(out);
    const kept = sample('a', 'desktop', 0);
    await writeFile(join(out, kept.screenshot!), solidPng(2, 2, [1, 2, 3]));
    const manifest = await writeGoldens(root, out, [kept], {
      mapbard: '0.0.0-test',
      chromium: '140.0',
      platform: 'linux',
      viewports: VIEWPORTS,
      noise: 0,
    });
    const added = sample('b', 'desktop', 0);
    await writeFile(join(out, added.screenshot!), solidPng(2, 2, [1, 2, 3]));
    const result = await compareGoldens(
      root,
      out,
      [added],
      manifest,
      new Map([
        ['a', 0],
        ['b', 1],
      ]),
      'linux',
    );
    expect(result.comparisons.map((entry) => entry.status)).toEqual([
      'missing-golden',
      'missing-capture',
    ]);
    expect(result.diagnostics.map((entry) => entry.path)).toEqual([['scenes', 1], ['goldens']]);
  });
});
