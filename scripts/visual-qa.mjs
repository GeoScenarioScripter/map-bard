// Visual QA capture for a built publication. The capture code lives in the CLI
// (`mapbard check --visual`, packages/cli/src/visual/); this wrapper runs it on any built
// publication directory, as the STATUS commands do.
//
//   node scripts/visual-qa.mjs <publication-dir> <out-dir> [--network stub|offline|live|unavailable] [--fail-on-findings]
//
// stub (default) answers the declared basemap style URLs with an empty style and blocks every
// other request; offline blocks everything and reports any attempt; live uses the network;
// unavailable aborts every request, style URLs included (give it an online build).
import { writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { captureStory, launchBrowser, NETWORK_MODES, writeContactSheet } from 'mapbard';

function parseArgs(argv) {
  const positional = [];
  const options = { network: 'stub', failOnFindings: false };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--network') options.network = argv[++index];
    else if (arg === '--fail-on-findings') options.failOnFindings = true;
    else positional.push(arg);
  }
  if (positional.length !== 2 || !NETWORK_MODES.includes(options.network)) {
    console.error(
      'Usage: node scripts/visual-qa.mjs <publication-dir> <out-dir> [--network stub|offline|live|unavailable] [--fail-on-findings]',
    );
    process.exit(2);
  }
  return { publication: resolve(positional[0]), out: resolve(positional[1]), ...options };
}

const options = parseArgs(process.argv.slice(2));
const browser = await launchBrowser();
let report;
try {
  report = await captureStory(browser, options);
  await writeContactSheet(browser, options.out, report.captures);
  await writeFile(join(options.out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
} finally {
  await browser.close();
}
console.log(
  `Visual QA: ${report.captures.length} captures, ${report.sweep.length} sweep samples, ${report.findingCount} findings -> ${join(options.out, 'report.json')}`,
);
for (const sample of [...report.captures, ...report.sweep])
  for (const finding of sample.findings)
    console.log(
      `  ${sample.sceneId} p=${sample.p} ${sample.viewport} ${sample.phase}: ${JSON.stringify(finding)}`,
    );
for (const finding of report.pageFindings) console.log(`  page: ${JSON.stringify(finding)}`);
if (options.failOnFindings && report.findingCount) process.exit(1);
