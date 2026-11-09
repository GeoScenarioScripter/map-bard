// Frame-interval probe for a built publication: scroll the whole story like a reader and
// report requestAnimationFrame intervals, overall and while each scrub camera track moves.
// The probe lives in the CLI (`mapbard check --visual --frames`, packages/cli/src/visual/);
// this wrapper runs it on any built publication directory.
//
//   node scripts/frame-probe.mjs <publication-dir> [width] [height] [--swiftshader]
//
// Without --swiftshader, Chromium keeps its default WebGL path. This can still be software:
// inspect the report's renderer before interpreting results. MAPBARD_CHROME_PATH can select
// an installed browser. Frame intervals include rendering and scheduling, not just JS cost.
import { resolve } from 'node:path';
import { launchBrowser, probeFrames } from 'mapbard';

const args = process.argv.slice(2);
const swiftshader = args.includes('--swiftshader');
const [publication, width = '1440', height = '900'] = args.filter((arg) => !arg.startsWith('--'));
if (!publication) {
  console.error(
    'Usage: node scripts/frame-probe.mjs <publication-dir> [width] [height] [--swiftshader]',
  );
  process.exit(2);
}
const browser = await launchBrowser(process.env, swiftshader ? undefined : []);
try {
  const report = await probeFrames(browser, {
    publication: resolve(publication),
    // The probe has always used the network as the build declares it.
    network: 'live',
    viewport: { width: +width, height: +height },
  });
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
}
