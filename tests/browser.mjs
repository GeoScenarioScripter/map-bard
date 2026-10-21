import process from 'node:process';
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
