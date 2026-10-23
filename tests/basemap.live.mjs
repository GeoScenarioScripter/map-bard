import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import console from 'node:console';
import { cp, copyFile, mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { URL, fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const runFile = promisify(execFile);
const repository = fileURLToPath(new URL('../', import.meta.url));
const example = join(repository, 'examples', 'projects', 'potomac');
const screenshot = resolve(process.argv[2] ?? join(repository, 'out', 'live-basemap.png'));
const scratch = await mkdtemp(join(tmpdir(), 'mapbard-live-'));
let browser;

try {
  const project = join(scratch, 'project');
  await mkdir(project);
  for (const name of ['mapbard.json', 'story.json', 'mapbard.lock.json'])
    await copyFile(join(example, name), join(project, name));
  await cp(join(example, 'data'), join(project, 'data'), { recursive: true });
  await cp(join(example, 'media'), join(project, 'media'), { recursive: true });
  const { stdout } = await runFile(process.execPath, [
    join(repository, 'packages', 'cli', 'dist', 'bin.js'),
    '--project',
    project,
    '--json',
    'build',
  ]);
  const build = JSON.parse(stdout);
  assert.equal(build.ok, true, JSON.stringify(build.diagnostics));
  browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
    ...(process.env.MAPBARD_CHROME_PATH ? { executablePath: process.env.MAPBARD_CHROME_PATH } : {}),
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const responses = [];
  const errors = [];
  page.on('response', (response) => {
    if (/^https?:/.test(response.url()))
      responses.push({ url: response.url(), status: response.status() });
  });
  page.on('requestfailed', (request) =>
    errors.push({ url: request.url(), reason: request.failure()?.errorText }),
  );
  page.on('pageerror', (error) => errors.push({ pageError: error.message }));
  await page.goto(pathToFileURL(join(project, 'out', 'index.html')).href, { waitUntil: 'load' });
  await page.locator('[data-scene-id="context-2024"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(15000);
  await mkdir(dirname(screenshot), { recursive: true });
  await page.screenshot({ path: screenshot, fullPage: false });
  const style = responses.find((item) => /openfreemap\.org\/styles\/positron/.test(item.url));
  const tile = responses.find(
    (item) => item.status === 200 && /openfreemap\.org\/planet\/.*\.pbf(\?|$)/.test(item.url),
  );
  console.log(
    JSON.stringify({ style, tile, responses: responses.length, errors, screenshot }, null, 2),
  );
  assert(style?.status === 200, 'OpenFreeMap style did not load');
  assert(tile, 'No live basemap tile loaded');
} finally {
  await browser?.close();
  await rm(scratch, { recursive: true, force: true });
}
