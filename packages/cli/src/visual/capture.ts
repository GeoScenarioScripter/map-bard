import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Browser } from 'playwright-core';
import type { SceneMotion } from '@mapbard/schema';
import { geometryFindings, type Finding } from './occlusion.js';
import {
  collectRects,
  enableCapture,
  seekStory,
  shownProgress,
  waitIdle,
  type PageGeometry,
} from './page.js';
import { phaseAt, samplePositions, type Phase } from './phase.js';

/**
 * offline blocks every request and reports any attempt; stub answers the declared basemap style
 * URLs with an empty style and blocks everything else; live uses the network.
 */
export const NETWORK_MODES = ['offline', 'stub', 'live'] as const;
export type NetworkMode = (typeof NETWORK_MODES)[number];

export const VIEWPORTS = [
  { id: 'desktop', width: 1440, height: 900, isMobile: false },
  { id: 'phone', width: 390, height: 844, isMobile: true },
] as const;
export type CaptureViewport = (typeof VIEWPORTS)[number];

export const IDLE_TIMEOUT_MS = 15000;

/** The empty style that stands in for an online basemap when a run must not use the network. */
export const EMPTY_STYLE = JSON.stringify({ version: 8, sources: {}, layers: [] });

export type SampleFinding =
  | Finding
  | { kind: 'idle-timeout'; timeoutMs: number }
  | {
      kind: 'seek-mismatch';
      expected: { sceneId: string; p: number };
      shown: { sceneId: string; p: number } | null;
    };

export type PageFinding =
  | { kind: 'console-error'; message: string }
  | { kind: 'page-error'; message: string }
  | { kind: 'offline-request'; urls: string[] };

/**
 * One position of one scene at one viewport. Captures (p = 0, 0.5, 1) always have a screenshot;
 * flight-sweep samples only when they have a finding.
 */
export type Sample = {
  sceneId: string;
  p: number;
  viewport: CaptureViewport['id'];
  phase: Phase;
  screenshot?: string;
  symbolsChecked: number;
  findings: SampleFinding[];
};

export type CaptureReport = {
  publication: string;
  network: NetworkMode;
  viewports: readonly CaptureViewport[];
  captures: Sample[];
  sweep: Sample[];
  pageFindings: PageFinding[];
  remoteRequests: string[];
  findingCount: number;
};

/** The part of a publication's compiled story that capture reads. */
export type PublishedStory = {
  scenes: { id: string; motion: SceneMotion }[];
  basemap?: unknown;
};

export async function readPublishedStory(publication: string): Promise<PublishedStory> {
  const source = await readFile(join(publication, 'compiled-data.js'), 'utf8');
  const json = source.replace(/^window\.MAPBARD_COMPILED = /, '').replace(/;\s*$/, '');
  return (JSON.parse(json) as { story: PublishedStory }).story;
}

const styleUrls = (story: PublishedStory): Set<string> => {
  const basemap = story.basemap as { styles?: { url: string }[] } | undefined;
  return new Set(
    typeof basemap === 'object' && basemap?.styles ? basemap.styles.map((style) => style.url) : [],
  );
};

type Log = { consoleErrors: string[]; pageErrors: string[]; remoteRequests: Set<string> };

async function captureViewport(
  browser: Browser,
  options: { publication: string; out: string; network: NetworkMode },
  story: PublishedStory,
  viewport: CaptureViewport,
  log: Log,
): Promise<{ capture: boolean; sample: Sample }[]> {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    isMobile: viewport.isMobile,
    hasTouch: viewport.isMobile,
    // Motion plays as authored; seek() settles timed tracks so captures do not depend on timing.
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();
  await page.addInitScript(enableCapture);
  page.on('pageerror', (error) => log.pageErrors.push(`${viewport.id}: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') log.consoleErrors.push(`${viewport.id}: ${message.text()}`);
  });
  page.on('request', (request) => {
    if (/^https?:\/\//.test(request.url())) log.remoteRequests.add(request.url());
  });
  if (options.network !== 'live') {
    const styles = styleUrls(story);
    await page.route(/^https?:\/\//, async (route) => {
      if (options.network === 'stub' && styles.has(route.request().url()))
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: { 'access-control-allow-origin': '*' },
          body: EMPTY_STYLE,
        });
      else await route.abort();
    });
  }
  const samples: { capture: boolean; sample: Sample }[] = [];
  try {
    await page.goto(pathToFileURL(join(options.publication, 'index.html')).href);
    await page.waitForSelector('html[data-mb-state="ready"], html[data-mb-state="error"]', {
      timeout: 30000,
    });
    if ((await page.getAttribute('html', 'data-mb-state')) === 'error')
      throw new Error(
        `Story failed to start: ${(await page.locator('[role="alert"]').allTextContents()).join(' ')}`,
      );
    for (const scene of story.scenes)
      for (const { p, capture } of samplePositions(scene.motion.camera)) {
        await page.evaluate(seekStory, [scene.id, p] as [string, number]);
        await page.locator(`[data-scene-id="${scene.id}"].is-active`).waitFor({ timeout: 10000 });
        const idle = await page.evaluate(waitIdle, IDLE_TIMEOUT_MS);
        const geometry: PageGeometry = await page.evaluate(collectRects);
        const findings: SampleFinding[] = geometryFindings(geometry, viewport);
        if (!idle) findings.unshift({ kind: 'idle-timeout', timeoutMs: IDLE_TIMEOUT_MS });
        const shown = await page.evaluate(shownProgress);
        if (!shown || shown.sceneId !== scene.id || shown.p !== p)
          findings.unshift({
            kind: 'seek-mismatch',
            expected: { sceneId: scene.id, p },
            shown: shown ?? null,
          });
        const screenshot =
          capture || findings.length
            ? `${scene.id}-p${Math.round(p * 100)}-${viewport.id}.png`
            : undefined;
        if (screenshot) await page.screenshot({ path: join(options.out, screenshot) });
        samples.push({
          capture,
          sample: {
            sceneId: scene.id,
            p,
            viewport: viewport.id,
            phase: phaseAt(scene.motion.camera, p),
            ...(screenshot ? { screenshot } : {}),
            symbolsChecked: geometry.symbols.length,
            findings,
          },
        });
      }
  } finally {
    await context.close();
  }
  return samples;
}

/**
 * Capture a built publication at every viewport: each scene at p = 0, 0.5 and 1 with
 * screenshots, plus the flight sweep across each moving camera track.
 */
export async function captureStory(
  browser: Browser,
  options: { publication: string; out: string; network: NetworkMode },
): Promise<CaptureReport> {
  await mkdir(options.out, { recursive: true });
  const story = await readPublishedStory(options.publication);
  const log: Log = { consoleErrors: [], pageErrors: [], remoteRequests: new Set() };
  const samples: { capture: boolean; sample: Sample }[] = [];
  for (const viewport of VIEWPORTS)
    samples.push(...(await captureViewport(browser, options, story, viewport, log)));
  const remoteRequests = [...log.remoteRequests].sort();
  const pageFindings: PageFinding[] = [
    ...log.consoleErrors.map((message) => ({ kind: 'console-error' as const, message })),
    ...log.pageErrors.map((message) => ({ kind: 'page-error' as const, message })),
    ...(options.network === 'offline' && remoteRequests.length
      ? [{ kind: 'offline-request' as const, urls: remoteRequests }]
      : []),
  ];
  const captures = samples.filter((entry) => entry.capture).map((entry) => entry.sample);
  const sweep = samples.filter((entry) => !entry.capture).map((entry) => entry.sample);
  return {
    publication: options.publication,
    network: options.network,
    viewports: VIEWPORTS,
    captures,
    sweep,
    pageFindings,
    remoteRequests,
    findingCount:
      pageFindings.length +
      samples.reduce((total, entry) => total + entry.sample.findings.length, 0),
  };
}
