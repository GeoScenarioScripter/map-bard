import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Browser, Page } from 'playwright-core';
import { PNG } from 'pngjs';
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
 * URLs with an empty style and blocks everything else; live uses the network; unavailable is an
 * online build with every request aborted, style URLs included, so the story must fall back to
 * its local layers and say so.
 */
export const NETWORK_MODES = ['offline', 'stub', 'live', 'unavailable'] as const;
export type NetworkMode = (typeof NETWORK_MODES)[number];

export const VIEWPORTS = [
  { id: 'desktop', width: 1440, height: 900, isMobile: false },
  { id: 'phone', width: 390, height: 844, isMobile: true },
] as const;
export type CaptureViewport = (typeof VIEWPORTS)[number];

export const IDLE_TIMEOUT_MS = 15000;

/** The empty style that stands in for an online basemap when a run must not use the network. */
export const EMPTY_STYLE = JSON.stringify({ version: 8, sources: {}, layers: [] });

/**
 * A terrarium tile at sea level (RGB 128, 0, 0), so stub terrain loads flat. Every terrain
 * provider in the catalog uses terrarium encoding; the tile matches the source's tile size.
 */
export function flatTerrainTile(size: number): Buffer {
  const png = new PNG({ width: size, height: size });
  for (let index = 0; index < png.data.length; index += 4) png.data.set([128, 0, 0, 255], index);
  return PNG.sync.write(png);
}

/** A regular expression for the request URLs of a `{z}/{x}/{y}` tile template. */
export function tileUrlPattern(template: string): RegExp {
  const escaped = template.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\{[xyz]\\\}/g, '\\d+');
  return new RegExp(`^${escaped}(?:\\?.*)?$`);
}

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
  | { kind: 'offline-request'; urls: string[] }
  | { kind: 'basemap-notice-missing'; viewport: CaptureViewport['id'] }
  | { kind: 'map-blank'; viewport: CaptureViewport['id']; drawn: number };

/** With the basemap unavailable, at least this share of map pixels must show the local layers. */
export const MIN_DRAWN_SHARE = 0.001;

/**
 * The share of pixels that differ from the most common colour: with every overlay hidden and no
 * basemap, that is what the story's own layers drew over the background.
 */
export function drawnShare(png: Buffer): number {
  const { data, width, height } = PNG.sync.read(png);
  const counts = new Map<number, number>();
  for (let index = 0; index < data.length; index += 4) {
    const colour = (data[index]! << 16) | (data[index + 1]! << 8) | data[index + 2]!;
    counts.set(colour, (counts.get(colour) ?? 0) + 1);
  }
  const background = Math.max(...counts.values());
  return (width * height - background) / (width * height);
}

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

/** Apply a network mode to a page before it loads the story. */
export async function routeNetwork(
  page: Page,
  network: NetworkMode,
  story: PublishedStory,
): Promise<void> {
  if (network === 'live') return;
  const styles = styleUrls(story);
  const terrain = (story.basemap as { terrain?: { tiles: string; tileSize?: number } } | undefined)
    ?.terrain;
  const terrainUrl = terrain && tileUrlPattern(terrain.tiles);
  const flat = terrain && network === 'stub' ? flatTerrainTile(terrain.tileSize ?? 256) : undefined;
  await page.route(/^https?:\/\//, async (route) => {
    if (network === 'stub' && styles.has(route.request().url()))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: EMPTY_STYLE,
      });
    // Stub terrain is flat, so terrain stories load and settle without the network.
    else if (flat && terrainUrl?.test(route.request().url()))
      await route.fulfill({
        status: 200,
        contentType: 'image/png',
        headers: { 'access-control-allow-origin': '*' },
        body: flat,
      });
    else await route.abort();
  });
}

/** Where a capture run reads its publication and writes its screenshots, and its network. */
export type CaptureOptions = {
  publication: string;
  out: string;
  network: NetworkMode;
};

/**
 * With every request aborted, the story must show the basemap notice and still draw its own
 * layers. The map is screenshotted with every overlay hidden, so panels do not count as drawn.
 */
async function fallback(page: Page, viewport: CaptureViewport): Promise<PageFinding[]> {
  const findings: PageFinding[] = [];
  if (!(await page.locator('#mb-basemap-notice').isVisible()))
    findings.push({ kind: 'basemap-notice-missing', viewport: viewport.id });
  await page.evaluate(waitIdle, IDLE_TIMEOUT_MS);
  const hide = await page.addStyleTag({
    content:
      'body > :not(#map), #map > :not(.maplibregl-canvas-container) { visibility: hidden !important; }',
  });
  const drawn = drawnShare(await page.screenshot());
  await hide.evaluate((element) => (element as unknown as { remove(): void }).remove());
  if (drawn < MIN_DRAWN_SHARE) findings.push({ kind: 'map-blank', viewport: viewport.id, drawn });
  return findings;
}

type Log = {
  consoleErrors: string[];
  pageErrors: string[];
  remoteRequests: Set<string>;
  pageFindings: PageFinding[];
};

/** Chromium logs each request the run aborted; with the network unavailable that is expected. */
const ABORTED_REQUEST = /^Failed to load resource: net::ERR_/;
/**
 * Terrain providers answer 404 where they have no tile (open sea, outside coverage), and
 * MapLibre draws those as flat. Chromium still logs each one, so 404s from the terrain host pass.
 */
const MISSING_RESOURCE = /^Failed to load resource: the server responded with a status of 404/;

async function captureViewport(
  browser: Browser,
  options: CaptureOptions,
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
  const terrain = (story.basemap as { terrain?: { tiles: string } } | undefined)?.terrain;
  const terrainUrl = terrain && tileUrlPattern(terrain.tiles);
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    if (options.network === 'unavailable' && ABORTED_REQUEST.test(message.text())) return;
    if (MISSING_RESOURCE.test(message.text()) && terrainUrl?.test(message.location().url)) return;
    log.consoleErrors.push(`${viewport.id}: ${message.text()}`);
  });
  page.on('request', (request) => {
    if (/^https?:\/\//.test(request.url())) log.remoteRequests.add(request.url());
  });
  await routeNetwork(page, options.network, story);
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
        // In the first scene, where the rail shows (the title panel hides it).
        if (options.network === 'unavailable' && samples.length === 1)
          log.pageFindings.push(...(await fallback(page, viewport)));
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
  options: CaptureOptions,
): Promise<CaptureReport> {
  await mkdir(options.out, { recursive: true });
  const story = await readPublishedStory(options.publication);
  const log: Log = {
    consoleErrors: [],
    pageErrors: [],
    remoteRequests: new Set(),
    pageFindings: [],
  };
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
    ...log.pageFindings,
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
