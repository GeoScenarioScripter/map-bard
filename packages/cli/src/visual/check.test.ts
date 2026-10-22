import { cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { afterEach, describe, expect, it } from 'vitest';
import { BrowserMissingError, launchBrowser } from './browser.js';
import { checkVisual, type CaptureRunner } from './check.js';

const potomac = fileURLToPath(new URL('../../../../examples/projects/potomac/', import.meta.url));
const created: string[] = [];
afterEach(async () => {
  for (const path of created.splice(0)) await rm(path, { recursive: true, force: true });
});

/** A copy of the Potomac example's authored files, without its generated builds. */
async function project(): Promise<string> {
  const root = join(await mkdtemp(join(tmpdir(), 'mapbard-visual-')), 'potomac');
  created.push(join(root, '..'));
  for (const entry of ['mapbard.json', 'story.json', 'mapbard.lock.json', 'data', 'media'])
    await cp(join(potomac, entry), join(root, entry), { recursive: true });
  return root;
}

/** A small solid screenshot stand-in. */
function solidPng([r, g, b]: [number, number, number]): Buffer {
  const png = new PNG({ width: 8, height: 6 });
  for (let index = 0; index < 48; index++) png.data.set([r, g, b, 255], index * 4);
  return PNG.sync.write(png);
}

/** A capture that never opens a browser: one flight warning and one rest error. */
const fakeCapture: CaptureRunner = async ({ publication, out, network }) => ({
  contactSheet: join(out, 'contact-sheet.png'),
  report: {
    publication,
    network,
    viewports: [],
    captures: [
      {
        sceneId: 'limits',
        p: 1,
        viewport: 'phone',
        phase: 'rest',
        screenshot: 'limits-p100-phone.png',
        symbolsChecked: 2,
        findings: [{ kind: 'callout-occluded', callout: 'little-falls', by: 'legend', area: 40 }],
      },
    ],
    sweep: [
      {
        sceneId: 'context-2024',
        p: 0.35,
        viewport: 'phone',
        phase: 'flight',
        symbolsChecked: 3,
        findings: [{ kind: 'symbol-occluded', symbol: 'gauges#1', by: 'scene-card', covered: 0.5 }],
      },
    ],
    pageFindings: [],
    remoteRequests: [],
    findingCount: 2,
  },
});

describe('check --visual', () => {
  it('builds offline into .mapbard-visual, maps findings and leaves the project untouched', async () => {
    const root = await project();
    const lockBefore = await readFile(join(root, 'mapbard.lock.json'), 'utf8');
    let seen: Parameters<CaptureRunner>[0] | undefined;
    const outcome = await checkVisual(root, { network: 'offline' }, async (options) => {
      seen = options;
      return fakeCapture(options);
    });
    expect(seen?.network).toBe('offline');
    expect(seen?.publication).toBe(join(root, '.mapbard-visual', 'build'));
    expect(await stat(join(root, '.mapbard-visual', 'build', 'index.html'))).toBeTruthy();
    const verification = JSON.parse(
      await readFile(join(root, '.mapbard-visual', 'build', 'verification.json'), 'utf8'),
    );
    expect(verification.requiredNetwork).toEqual([]);
    expect(await readFile(join(root, 'mapbard.lock.json'), 'utf8')).toBe(lockBefore);
    const visual = outcome.diagnostics.filter((entry) => entry.code.startsWith('VISUAL_'));
    expect(visual).toEqual([
      expect.objectContaining({
        severity: 'warning',
        path: ['scenes', 0],
        ids: { sceneId: 'context-2024' },
      }),
      expect.objectContaining({
        severity: 'error',
        path: ['scenes', 2],
        ids: { sceneId: 'limits' },
      }),
    ]);
    expect(outcome.result).toMatchObject({
      scenes: 3,
      visual: {
        network: 'offline',
        captures: 1,
        sweepSamples: 1,
        findings: { rest: 1, flight: 1, page: 0 },
        errors: 1,
        warnings: 1,
      },
    });
    const report = JSON.parse(
      await readFile(join(root, '.mapbard-visual', 'captures', 'report.json'), 'utf8'),
    );
    expect(report.sweep[0].phase).toBe('flight');
  });

  it('skips the capture when check reports errors', async () => {
    const root = await project();
    const storyPath = join(root, 'story.json');
    // An edit without `mapbard lock` makes the lockfile stale, which check reports as an error.
    const story = await readFile(storyPath, 'utf8');
    await writeFile(storyPath, story.replace('"limits"', '"limits-edited"'));
    let called = false;
    const outcome = await checkVisual(root, { network: 'offline' }, async (options) => {
      called = true;
      return fakeCapture(options);
    });
    expect(called).toBe(false);
    expect(outcome.diagnostics[0]?.code).toBe('INPUT_STALE');
  });

  it('writes goldens with --update, then gates offline runs on them', async () => {
    const root = await project();
    let colour: [number, number, number] = [40, 80, 120];
    const pngCapture: CaptureRunner = async (options) => {
      const captured = await fakeCapture(options);
      await writeFile(join(options.out, 'limits-p100-phone.png'), solidPng(colour));
      const noise = [];
      for (let run = 1; run <= (options.noiseRuns ?? 0); run++) {
        const out = join(options.out, `noise-${run}`);
        await mkdir(out, { recursive: true });
        await writeFile(join(out, 'limits-p100-phone.png'), solidPng(colour));
        noise.push({ out, captures: captured.report.captures });
      }
      return { ...captured, browserVersion: '140.0.0.0', noise };
    };
    const updated = await checkVisual(root, { network: 'offline', update: true }, pngCapture);
    expect(updated.result).toMatchObject({
      visual: { goldens: { status: 'updated', captures: 1, noise: { maxDiffRatio: 0 } } },
    });
    const manifest = JSON.parse(await readFile(join(root, 'goldens', 'manifest.json'), 'utf8'));
    expect(manifest).toMatchObject({
      chromium: '140.0.0.0',
      platform: process.platform,
      captures: ['limits-p100-phone.png'],
    });
    await expect(stat(join(root, '.mapbard-visual', 'captures', 'noise-1'))).rejects.toThrow();

    const same = await checkVisual(root, { network: 'offline' }, pngCapture);
    expect(same.diagnostics.map((entry) => entry.code)).not.toContain('VISUAL_GOLDEN_MISMATCH');
    expect(same.result).toMatchObject({
      visual: { goldens: { status: 'match', compared: 1, mismatched: 0 } },
    });

    colour = [200, 80, 120];
    const changed = await checkVisual(root, { network: 'offline' }, pngCapture);
    expect(changed.diagnostics.at(-1)).toMatchObject({
      code: 'VISUAL_GOLDEN_MISMATCH',
      severity: 'error',
      ids: { sceneId: 'limits' },
    });
    expect(
      await stat(join(root, '.mapbard-visual', 'captures', 'limits-p100-phone.diff.png')),
    ).toBeTruthy();

    // Stub and live runs use other basemaps than the goldens, so they never compare.
    const stub = await checkVisual(root, { network: 'stub' }, pngCapture);
    expect(stub.result).toMatchObject({ visual: { goldens: { status: 'skipped' } } });
  });

  it('reports a missing browser as a diagnostic, not a crash', async () => {
    await expect(
      launchBrowser({ MAPBARD_CHROME_PATH: join(tmpdir(), 'no-such-chrome.exe') }),
    ).rejects.toBeInstanceOf(BrowserMissingError);
    const root = await project();
    const outcome = await checkVisual(root, { network: 'stub' }, async () => {
      throw new BrowserMissingError('No Chromium found.');
    });
    expect(outcome.diagnostics.at(-1)).toMatchObject({
      code: 'VISUAL_BROWSER_MISSING',
      severity: 'error',
    });
    expect(outcome.diagnostics.at(-1)?.remedy).toContain('MAPBARD_CHROME_PATH');
  });
});
