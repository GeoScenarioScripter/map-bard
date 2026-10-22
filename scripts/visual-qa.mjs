/* global document, getComputedStyle, setTimeout, window */
// Visual QA capture for a built publication (docs/m2-visual.md, item A).
//
//   node scripts/visual-qa.mjs <publication-dir> <out-dir> [--network stub|offline|live] [--fail-on-findings]
//
// stub (default) answers the declared basemap style URLs with an empty style and blocks every
// other request; offline blocks everything and reports any attempt; live uses the network.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { EMPTY_STYLE, launchBrowser } from '../tests/browser.mjs';
import { calloutFindings, occlusionFindings } from './lib/occlusion.mjs';

const VIEWPORTS = [
  { id: 'desktop', width: 1440, height: 900, isMobile: false },
  { id: 'phone', width: 390, height: 844, isMobile: true },
];
const IDLE_TIMEOUT_MS = 15000;

function parseArgs(argv) {
  const positional = [];
  const options = { network: 'stub', failOnFindings: false };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--network') options.network = argv[++index];
    else if (arg === '--fail-on-findings') options.failOnFindings = true;
    else positional.push(arg);
  }
  if (positional.length !== 2 || !['stub', 'offline', 'live'].includes(options.network)) {
    console.error(
      'Usage: node scripts/visual-qa.mjs <publication-dir> <out-dir> [--network stub|offline|live] [--fail-on-findings]',
    );
    process.exit(2);
  }
  return { publication: resolve(positional[0]), out: resolve(positional[1]), ...options };
}

async function readStory(publication) {
  const source = await readFile(join(publication, 'compiled-data.js'), 'utf8');
  const json = source.replace(/^window\.MAPBARD_COMPILED = /, '').replace(/;\s*$/, '');
  return JSON.parse(json).story;
}

/** Collect overlay geometry in the page; only rendered, nonempty elements count. */
function collectRects() {
  const visible = (element) => {
    if (!element || element.closest('[hidden]')) return undefined;
    const box = element.getBoundingClientRect();
    return box.width > 0 && box.height > 0
      ? { x: box.x, y: box.y, width: box.width, height: box.height }
      : undefined;
  };
  // Callouts: the label's real rect and the halo rings around the symbols it points at.
  const callouts = [...document.querySelectorAll('.mb-callout')]
    .map((label, index) => {
      const id = label.dataset.calloutId || `callout-${index}`;
      const mark = document.querySelectorAll('.mb-callout-mark')[index];
      const halos = mark
        ? [...mark.querySelectorAll('.mb-callout-halo, .mb-callout-dot')]
            .map((circle) => circle.getBoundingClientRect())
            .filter((box) => box.width > 0)
            .map((box) => ({
              x: box.x + box.width / 2,
              y: box.y + box.height / 2,
              r: box.width / 2,
            }))
        : [];
      return { id, rect: label.hidden ? undefined : visible(label), halos };
    })
    .filter((item) => item.rect);
  const targets = [
    ...callouts.flatMap((callout) =>
      callout.halos.map((halo, index) => ({
        id: `${callout.id}#${index}`,
        rect: { x: halo.x - halo.r, y: halo.y - halo.r, width: 2 * halo.r, height: 2 * halo.r },
      })),
    ),
    ...[...document.querySelectorAll('.mb-marker')].map((element, index) => ({
      id: element.getAttribute('aria-label') || `marker-${index}`,
      rect: visible(element),
    })),
  ].filter((item) => item.rect);
  const media = document.querySelector('#media');
  const panels = [
    ['scene-card', document.querySelector('.scene.is-active .scene-card')],
    ['legend', document.querySelector('#legends')],
    ['controls', document.querySelector('#controls')],
    ['media', media && media.childElementCount ? media : null],
    ['basemap-notice', document.querySelector('#mb-basemap-notice')],
  ]
    .map(([id, element]) => ({ id, rect: visible(element) }))
    .filter((item) => item.rect);
  // Labels sit under the story and map controls, so those hide them too. The story only
  // counts when it paints a background (the sidecar column), not as a transparent scroller.
  const story = document.querySelector('#story');
  const opaque =
    story && !/rgba\(.*,\s*0\)|transparent/.test(getComputedStyle(story).backgroundColor);
  const occluders = [
    ...panels,
    ...(opaque ? [{ id: 'story-column', rect: visible(story) }] : []),
    ...[...document.querySelectorAll('#map .maplibregl-ctrl')].map((element, index) => ({
      id: `map-control-${index}`,
      rect: visible(element),
    })),
  ].filter((item) => item.rect);
  return { targets, panels, callouts, occluders };
}

async function captureViewport(browser, options, story, viewport, log) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    isMobile: viewport.isMobile,
    hasTouch: viewport.isMobile,
    // Reduced motion makes scene changes cuts, so a settled capture does not depend on timing.
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => log.pageErrors.push(`${viewport.id}: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') log.consoleErrors.push(`${viewport.id}: ${message.text()}`);
  });
  page.on('request', (request) => {
    if (/^https?:\/\//.test(request.url())) log.remoteRequests.add(request.url());
  });
  if (options.network !== 'live') {
    const styles = new Set(
      typeof story.basemap === 'object' && story.basemap.styles
        ? story.basemap.styles.map((style) => style.url)
        : [],
    );
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
  const captures = [];
  try {
    await page.goto(pathToFileURL(join(options.publication, 'index.html')).href);
    await page.waitForSelector('html[data-mb-state="ready"], html[data-mb-state="error"]', {
      timeout: 30000,
    });
    if ((await page.getAttribute('html', 'data-mb-state')) === 'error')
      throw new Error(
        `Story failed to start: ${await page.locator('[role="alert"]').allTextContents()}`,
      );
    for (const sceneId of story.scenes.map((scene) => scene.id)) {
      const scene = page.locator(`[data-scene-id="${sceneId}"]`);
      await scene.evaluate((element) => element.scrollIntoView({ block: 'center' }));
      await page.locator(`[data-scene-id="${sceneId}"].is-active`).waitFor({ timeout: 10000 });
      const idle = await page.evaluate(
        (timeout) =>
          Promise.race([
            window.MapBardStory.whenIdle().then(() => true),
            new Promise((done) => setTimeout(() => done(false), timeout)),
          ]),
        IDLE_TIMEOUT_MS,
      );
      const geometry = await page.evaluate(collectRects);
      const findings = [
        ...occlusionFindings({ viewport, ...geometry }),
        ...calloutFindings({ viewport, ...geometry }),
      ];
      if (!idle) findings.unshift({ kind: 'idle-timeout', timeoutMs: IDLE_TIMEOUT_MS });
      const screenshot = `${sceneId}-${viewport.id}.png`;
      await page.screenshot({ path: join(options.out, screenshot) });
      captures.push({ sceneId, viewport: viewport.id, screenshot, findings });
    }
  } finally {
    await context.close();
  }
  return captures;
}

async function writeContactSheet(browser, out, captures) {
  const cells = await Promise.all(
    captures.map(async (capture) => ({
      ...capture,
      data: (await readFile(join(out, capture.screenshot))).toString('base64'),
    })),
  );
  const escape = (text) =>
    String(text).replace(
      /[&<>"]/g,
      (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char],
    );
  const rows = [...new Set(cells.map((cell) => cell.sceneId))]
    .map((sceneId) => {
      const row = cells
        .filter((cell) => cell.sceneId === sceneId)
        .map(
          (cell) =>
            `<figure><img src="data:image/png;base64,${cell.data}"><figcaption>${escape(`${cell.sceneId} · ${cell.viewport}`)}${
              cell.findings.length
                ? `<b>${cell.findings.length} finding${cell.findings.length === 1 ? '' : 's'}</b>`
                : ''
            }</figcaption></figure>`,
        )
        .join('');
      return `<div class="row">${row}</div>`;
    })
    .join('');
  const page = await browser.newPage({ viewport: { width: 1200, height: 600 } });
  try {
    await page.setContent(
      `<!doctype html><style>body{margin:16px;font:14px system-ui,sans-serif;background:#f4f4f2}
.row{display:flex;gap:16px;align-items:flex-start;margin-bottom:16px}figure{margin:0}
img{height:450px;display:block;border:1px solid #ccc}figcaption{padding:4px 0}b{color:#b00020;margin-left:8px}</style>${rows}`,
      { waitUntil: 'load' },
    );
    await page.screenshot({ path: join(out, 'contact-sheet.png'), fullPage: true });
  } finally {
    await page.close();
  }
}

const options = parseArgs(process.argv.slice(2));
await mkdir(options.out, { recursive: true });
const story = await readStory(options.publication);
const log = { consoleErrors: [], pageErrors: [], remoteRequests: new Set() };
const browser = await launchBrowser();
let report;
try {
  const captures = [];
  for (const viewport of VIEWPORTS)
    captures.push(...(await captureViewport(browser, options, story, viewport, log)));
  await writeContactSheet(browser, options.out, captures);
  const remoteRequests = [...log.remoteRequests].sort();
  const pageFindings = [
    ...log.consoleErrors.map((message) => ({ kind: 'console-error', message })),
    ...log.pageErrors.map((message) => ({ kind: 'page-error', message })),
    ...(options.network === 'offline' && remoteRequests.length
      ? [{ kind: 'offline-request', urls: remoteRequests }]
      : []),
  ];
  report = {
    publication: options.publication,
    network: options.network,
    viewports: VIEWPORTS,
    captures,
    pageFindings,
    remoteRequests,
    findingCount:
      pageFindings.length + captures.reduce((total, capture) => total + capture.findings.length, 0),
  };
  await writeFile(join(options.out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
} finally {
  await browser.close();
}
console.log(
  `Visual QA: ${report.captures.length} captures, ${report.findingCount} findings -> ${join(options.out, 'report.json')}`,
);
for (const capture of report.captures)
  for (const finding of capture.findings)
    console.log(`  ${capture.sceneId} ${capture.viewport}: ${JSON.stringify(finding)}`);
for (const finding of report.pageFindings) console.log(`  page: ${JSON.stringify(finding)}`);
if (options.failOnFindings && report.findingCount) process.exit(1);
