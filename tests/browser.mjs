import { Buffer } from 'node:buffer';
import process from 'node:process';
import { deflateSync } from 'node:zlib';
import { chromium } from 'playwright-core';

/** Headless Chromium for `file://` publications: Playwright's build, else the system Chrome. */
export async function launchBrowser() {
  const launchOptions = {
    headless: true,
    args: ['--allow-file-access-from-files'],
    ...(process.env.MAPBARD_CHROME_PATH ? { executablePath: process.env.MAPBARD_CHROME_PATH } : {}),
  };
  try {
    return await chromium.launch(launchOptions);
  } catch (error) {
    if (process.env.MAPBARD_CHROME_PATH || !String(error).includes('Executable doesn')) throw error;
    return chromium.launch({ ...launchOptions, channel: 'chrome' });
  }
}

/** The empty style that stands in for an online basemap when tests must not use the network. */
export const EMPTY_STYLE = JSON.stringify({ version: 8, sources: {}, layers: [] });

/** A 256 px terrarium elevation tile at sea level (RGB 128, 0, 0), for stubbed terrain. */
export const FLAT_DEM = (() => {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (bytes) => {
    let c = 0xffffffff;
    for (const byte of bytes) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body));
    return Buffer.concat([length, body, sum]);
  };
  const size = 256;
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 2, 0, 0, 0], 8);
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(size * 3, Buffer.from([128, 0, 0]))]);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.concat(Array.from({ length: size }, () => row)))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
})();
