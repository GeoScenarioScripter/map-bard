import { cp, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
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
