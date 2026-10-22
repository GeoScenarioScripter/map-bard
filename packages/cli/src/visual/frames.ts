/// <reference lib="dom" />
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Browser } from 'playwright-core';
import { readPublishedStory, routeNetwork, type NetworkMode, VIEWPORTS } from './capture.js';
import { cameraMoves, sweeps } from './phase.js';

/**
 * Frame sample (`check --visual --frames`, and `scripts/frame-probe.mjs`): scroll the whole story
 * like a reader and record requestAnimationFrame intervals, with the scene and progress each
 * frame showed. Headless Chromium renders WebGL in software, so this measures main-thread cost
 * (player, callout placement, MapLibre render calls), not the frame rate of a real GPU.
 */
export const FRAME_STEPS = 240;
/** The first frames include start-up work. */
const WARM_UP_FRAMES = 5;

export type Frame = { ms: number; sceneId?: string; p?: number };
export type FrameStats = {
  frames: number;
  meanFps: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  over50Ms: number;
};

const tenth = (value: number): number => Math.round(value * 10) / 10;

export function frameStats(intervals: readonly number[]): FrameStats {
  const sorted = [...intervals].sort((a, b) => a - b);
  if (!sorted.length) return { frames: 0, meanFps: 0, p50Ms: 0, p95Ms: 0, p99Ms: 0, over50Ms: 0 };
  const at = (q: number) =>
    tenth(sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]!);
  const mean = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
  return {
    frames: sorted.length,
    meanFps: tenth(1000 / mean),
    p50Ms: at(0.5),
    p95Ms: at(0.95),
    p99Ms: at(0.99),
    over50Ms: sorted.filter((value) => value > 50).length,
  };
}

export type CameraTrackFrames = { sceneId: string } & FrameStats;

/** Frames shown while each scene's scrub camera track moves the camera. */
export function cameraTrackFrames(
  frames: readonly Frame[],
  scenes: readonly { id: string; motion: { camera: Parameters<typeof sweeps>[0] } }[],
): CameraTrackFrames[] {
  return scenes
    .filter((scene) => sweeps(scene.motion.camera))
    .map((scene) => ({
      sceneId: scene.id,
      ...frameStats(
        frames
          .filter(
            (frame) =>
              frame.sceneId === scene.id &&
              frame.p !== undefined &&
              cameraMoves(scene.motion.camera, frame.p),
          )
          .map((frame) => frame.ms),
      ),
    }));
}

export type FrameReport = { viewport: string } & FrameStats & { cameraTracks: CameraTrackFrames[] };

type Probe = {
  progress(): { sceneId: string; p: number } | undefined;
};

/** Scroll one viewport through the story and summarise its frames. */
export async function probeFrames(
  browser: Browser,
  options: {
    publication: string;
    network: NetworkMode;
    viewport: { id?: string; width: number; height: number; isMobile?: boolean };
    steps?: number;
  },
): Promise<FrameReport> {
  const story = await readPublishedStory(options.publication);
  const { width, height, isMobile = false } = options.viewport;
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    isMobile,
    hasTouch: isMobile,
    reducedMotion: 'no-preference',
  });
  try {
    const page = await context.newPage();
    await routeNetwork(page, options.network, story);
    await page.goto(pathToFileURL(join(options.publication, 'index.html')).href);
    await page.waitForSelector('html[data-mb-state="ready"]', { timeout: 30000 });
    await page.evaluate(() => {
      const target = window as unknown as { __mbFrames: Frame[]; MapBardStory?: Probe };
      target.__mbFrames = [];
      let last = performance.now();
      const tick = (now: number) => {
        const shown = target.MapBardStory?.progress();
        target.__mbFrames.push({ ms: now - last, sceneId: shown?.sceneId, p: shown?.p });
        last = now;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    const steps = options.steps ?? FRAME_STEPS;
    for (let step = 0; step < steps; step++) {
      await page.mouse.wheel(0, total / steps);
      await page.waitForTimeout(16);
    }
    const frames = (
      await page.evaluate(() => (window as unknown as { __mbFrames: Frame[] }).__mbFrames)
    ).slice(WARM_UP_FRAMES);
    return {
      viewport: options.viewport.id ?? `${width}x${height}`,
      ...frameStats(frames.map((frame) => frame.ms)),
      cameraTracks: cameraTrackFrames(frames, story.scenes),
    };
  } finally {
    await context.close();
  }
}

/** The frame sample at every capture viewport. */
export async function probeStoryFrames(
  browser: Browser,
  options: { publication: string; network: NetworkMode },
): Promise<FrameReport[]> {
  const reports: FrameReport[] = [];
  for (const viewport of VIEWPORTS)
    reports.push(await probeFrames(browser, { ...options, viewport }));
  return reports;
}
