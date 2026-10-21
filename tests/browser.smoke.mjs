import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cp, copyFile, mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { test } from 'node:test';
import { promisify } from 'node:util';
import { URL, fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const runFile = promisify(execFile);
const repository = fileURLToPath(new URL('../', import.meta.url));
const example = join(repository, 'examples', 'projects', 'potomac');
const binary = join(repository, 'packages', 'cli', 'dist', 'bin.js');

async function build(root, out, offline = false) {
  const { stdout } = await runFile(process.execPath, [
    binary,
    '--project',
    root,
    '--json',
    'build',
    '--out',
    out,
    ...(offline ? ['--offline'] : []),
  ]);
  const envelope = JSON.parse(stdout);
  assert.equal(envelope.ok, true, JSON.stringify(envelope.diagnostics));
  return envelope.result.verification;
}

async function copyExample(root) {
  await mkdir(root, { recursive: true });
  for (const name of ['mapbard.json', 'story.json', 'mapbard.lock.json'])
    await copyFile(join(example, name), join(root, name));
  await cp(join(example, 'data'), join(root, 'data'), { recursive: true });
  await cp(join(example, 'media'), join(root, 'media'), { recursive: true });
}

async function openStory(browser, file, online) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  const remote = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('request', (request) => {
    if (/^https?:\/\//.test(request.url())) remote.push(request.url());
  });
  await page.route(/^https?:\/\//, async (route) => {
    if (online && route.request().url().startsWith('https://tiles.openfreemap.org/styles/positron'))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({ version: 8, sources: {}, layers: [] }),
      });
    else await route.abort();
  });
  try {
    await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
    await page.locator('[data-scene-id="context-2024"]').scrollIntoViewIfNeeded();
    await page.locator('[data-scene-id="context-2024"].is-active').waitFor({ timeout: 10000 });
    await page.locator('[data-scene-id="compare-2025"]').scrollIntoViewIfNeeded();
    await page.locator('[data-scene-id="compare-2025"].is-active').waitFor({ timeout: 10000 });
    assert.equal(await page.locator('[role="alert"]').count(), 0);
    assert.deepEqual(errors, []);
    return remote;
  } catch (error) {
    const alerts = await page.locator('[role="alert"]').allTextContents();
    const notice = await page.locator('#mb-basemap-notice').allTextContents();
    throw new Error(`${String(error)}; ${JSON.stringify({ errors, remote, alerts, notice })}`);
  } finally {
    await page.close();
  }
}

test(
  'Potomac publication plays on scroll and declares only its online basemap requests',
  { timeout: 90000 },
  async () => {
    const scratch = await mkdtemp(join(tmpdir(), 'mapbard-browser-'));
    const project = join(scratch, 'project');
    let browser;
    try {
      await copyExample(project);
      const online = await build(project, 'online');
      const offline = await build(project, 'offline', true);
      assert(online.requiredHosts.includes('tiles.openfreemap.org'));
      assert.deepEqual(offline.requiredNetwork, []);
      const launchOptions = {
        headless: true,
        args: ['--allow-file-access-from-files'],
        ...(process.env.MAPBARD_CHROME_PATH
          ? { executablePath: process.env.MAPBARD_CHROME_PATH }
          : {}),
      };
      try {
        browser = await chromium.launch(launchOptions);
      } catch (error) {
        if (process.env.MAPBARD_CHROME_PATH || !String(error).includes('Executable doesn'))
          throw error;
        browser = await chromium.launch({ ...launchOptions, channel: 'chrome' });
      }
      const onlineRequests = await openStory(browser, join(project, 'online', 'index.html'), true);
      assert(onlineRequests.some((url) => url.startsWith('https://tiles.openfreemap.org/')));
      const offlineRequests = await openStory(
        browser,
        join(project, 'offline', 'index.html'),
        false,
      );
      assert.deepEqual(offlineRequests, []);
      const offlineRecord = JSON.parse(
        await readFile(join(project, 'offline', 'verification.json')),
      );
      assert.deepEqual(offlineRecord.requiredNetwork, []);
    } finally {
      await browser?.close();
      await rm(scratch, { recursive: true, force: true });
    }
  },
);
