import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Browser } from 'playwright-core';
import type { Sample } from './capture.js';

const escape = (text: string): string =>
  text.replace(
    /[&<>"]/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char] ?? char,
  );

/**
 * A labelled grid of the captures, one row per scene, composed in the same browser from the
 * captured PNGs so no image library is needed. Writes `contact-sheet.png` into `out`.
 */
export async function writeContactSheet(
  browser: Browser,
  out: string,
  captures: readonly Sample[],
): Promise<string> {
  const cells = await Promise.all(
    captures
      .filter((capture) => capture.screenshot)
      .map(async (capture) => ({
        ...capture,
        data: (await readFile(join(out, capture.screenshot!))).toString('base64'),
      })),
  );
  const rows = [...new Set(cells.map((cell) => cell.sceneId))]
    .map((sceneId) => {
      const row = cells
        .filter((cell) => cell.sceneId === sceneId)
        .map(
          (cell) =>
            `<figure><img src="data:image/png;base64,${cell.data}"><figcaption>${escape(`${cell.sceneId} · p ${cell.p} · ${cell.viewport}`)}${
              cell.findings.length
                ? `<b>${cell.findings.length} finding${cell.findings.length === 1 ? '' : 's'}</b>`
                : ''
            }</figcaption></figure>`,
        )
        .join('');
      return `<div class="row">${row}</div>`;
    })
    .join('');
  const path = join(out, 'contact-sheet.png');
  const page = await browser.newPage({ viewport: { width: 1200, height: 600 } });
  try {
    await page.setContent(
      `<!doctype html><style>body{margin:16px;font:14px system-ui,sans-serif;background:#f4f4f2}
.row{display:flex;gap:16px;align-items:flex-start;margin-bottom:16px}figure{margin:0}
img{height:300px;display:block;border:1px solid #ccc}figcaption{padding:4px 0}b{color:#b00020;margin-left:8px}</style>${rows}`,
      { waitUntil: 'load' },
    );
    await page.screenshot({ path, fullPage: true });
  } finally {
    await page.close();
  }
  return path;
}
