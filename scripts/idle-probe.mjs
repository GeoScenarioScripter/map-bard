// Trace live visual-idle failures without changing capture's 15-second limit.
// node scripts/idle-probe.mjs <publication> <capture-directory>
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { captureStory, launchBrowser, writeContactSheet } from 'mapbard';

const [publication, directory] = process.argv.slice(2);
if (!publication || !directory) throw new Error('Expected publication and capture directory');
const out = resolve(directory);
await mkdir(out, { recursive: true });
const browser = await launchBrowser();
const traces = [];
const newContext = browser.newContext.bind(browser);
browser.newContext = async (...args) => {
  const context = await newContext(...args);
  const pending = new Map();
  context.on('request', (request) =>
    pending.set(request, { url: request.url(), start: Date.now() }),
  );
  const finished = (request) => pending.delete(request);
  context.on('requestfinished', finished);
  context.on('requestfailed', finished);
  await context.exposeBinding('__idleTrace', (_source, trace) => {
    const record = {
      viewport: args[0]?.viewport,
      ...trace,
      pending: [...pending.values()].map(({ url, start }) => ({ url, ms: Date.now() - start })),
    };
    traces.push(record);
    console.log(JSON.stringify(record));
  });
  await context.addInitScript(() => {
    let map;
    Object.defineProperty(globalThis, 'MapBardCompiledPlayer', {
      configurable: true,
      set(api) {
        Object.defineProperty(globalThis, 'MapBardCompiledPlayer', { value: api });
        const create = api.createMapLibreAdapter;
        api.createMapLibreAdapter = (...args) => {
          map = args[2];
          return create(...args);
        };
      },
    });
    let story;
    Object.defineProperty(globalThis, 'MapBardStory', {
      configurable: true,
      get: () => story,
      set(api) {
        story = {
          ...api,
          whenIdle: async () => {
            const start = globalThis.performance.now();
            const requested = api.progress();
            const trace = (event) =>
              globalThis.__idleTrace({
                event,
                requested,
                ...api.progress(),
                ms: Math.round(globalThis.performance.now() - start),
                loaded: map.loaded(),
                tilesLoaded: map.areTilesLoaded(),
                moving: map.isMoving(),
                zoom: map.getZoom(),
                center: map.getCenter(),
                // Diagnostic only; never used to decide readiness.
                dirty: {
                  style: map._styleDirty,
                  sources: map._sourcesDirty,
                  placement: map._placementDirty,
                },
                frameScheduled: Boolean(map._frameRequest),
              });
            // Snapshot just before capture's deadline; only its report decides timeout.
            const timer = globalThis.setTimeout(() => trace('near-timeout'), 14900);
            try {
              await api.whenIdle();
              if (globalThis.performance.now() - start > 1000) await trace('settled');
            } finally {
              globalThis.clearTimeout(timer);
            }
          },
        };
      },
    });
  });
  return context;
};
try {
  const report = await captureStory(browser, {
    publication: resolve(publication),
    out,
    network: 'live',
  });
  await writeContactSheet(browser, out, report.captures);
  await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(
    JSON.stringify({
      captures: report.captures.length,
      sweep: report.sweep.length,
      findings: report.findingCount,
    }),
  );
} finally {
  await writeFile(join(out, 'idle-trace.json'), JSON.stringify(traces, null, 2) + '\n');
  await browser.close();
}
