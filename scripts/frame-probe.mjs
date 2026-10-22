/* global document, innerHeight, performance, requestAnimationFrame, window */
// Frame-interval probe for a built publication: scroll the whole story like a reader and
// report requestAnimationFrame intervals.
//
//   node scripts/frame-probe.mjs <publication-dir> [width] [height]
//
// Headless Chrome renders WebGL in software, so this measures main-thread cost (player,
// callout placement, MapLibre render calls), not the frame rate of a real GPU.
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { launchBrowser } from '../tests/browser.mjs';

const [, , publication, width = '1440', height = '900'] = process.argv;
if (!publication) {
  console.error('Usage: node scripts/frame-probe.mjs <publication-dir> [width] [height]');
  process.exit(2);
}
const STEPS = 240;
const browser = await launchBrowser();
try {
  const page = await browser.newPage({ viewport: { width: +width, height: +height } });
  await page.goto(pathToFileURL(join(resolve(publication), 'index.html')).href);
  await page.waitForSelector('html[data-mb-state="ready"]', { timeout: 30000 });
  await page.evaluate(() => {
    window.__mbFrames = [];
    let last = performance.now();
    const tick = (now) => {
      window.__mbFrames.push(now - last);
      last = now;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  for (let step = 0; step < STEPS; step++) {
    await page.mouse.wheel(0, total / STEPS);
    await page.waitForTimeout(16);
  }
  // The first frames include start-up work.
  const frames = (await page.evaluate(() => window.__mbFrames.slice(5))).sort((a, b) => a - b);
  const at = (q) => +frames[Math.min(frames.length - 1, Math.floor(q * frames.length))].toFixed(1);
  const mean = frames.reduce((sum, value) => sum + value, 0) / frames.length;
  console.log(
    JSON.stringify({
      viewport: `${width}x${height}`,
      frames: frames.length,
      meanFps: +(1000 / mean).toFixed(1),
      p50Ms: at(0.5),
      p95Ms: at(0.95),
      p99Ms: at(0.99),
      over50Ms: frames.filter((value) => value > 50).length,
    }),
  );
} finally {
  await browser.close();
}
