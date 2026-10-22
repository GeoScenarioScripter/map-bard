import type { Browser } from 'playwright-core';

/**
 * Chromium flags for visual runs. SwiftShader on every OS, so Windows and Linux rasterise
 * WebGL with the same software renderer; file access lets `file://` pages load their data.
 */
export const VISUAL_BROWSER_ARGS = [
  '--allow-file-access-from-files',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
];

/** No usable Chromium: reported as VISUAL_BROWSER_MISSING, never as a crash. */
export class BrowserMissingError extends Error {
  override name = 'BrowserMissingError';
}

/**
 * Headless Chromium: `MAPBARD_CHROME_PATH` when set, else Playwright's own build, else the
 * system Chrome. `playwright-core` loads only here, so commands without `--visual` never need it.
 */
export async function launchBrowser(env: NodeJS.ProcessEnv = process.env): Promise<Browser> {
  let chromium: typeof import('playwright-core').chromium;
  try {
    ({ chromium } = await import('playwright-core'));
  } catch (error) {
    throw new BrowserMissingError(`playwright-core could not be loaded: ${String(error)}`);
  }
  const executablePath = env.MAPBARD_CHROME_PATH;
  const options = { headless: true, args: VISUAL_BROWSER_ARGS };
  if (executablePath) {
    try {
      return await chromium.launch({ ...options, executablePath });
    } catch (error) {
      throw new BrowserMissingError(
        `MAPBARD_CHROME_PATH=${executablePath} did not start: ${firstLine(error)}`,
      );
    }
  }
  try {
    return await chromium.launch(options);
  } catch (bundled) {
    try {
      return await chromium.launch({ ...options, channel: 'chrome' });
    } catch (system) {
      throw new BrowserMissingError(
        `No Chromium found (Playwright: ${firstLine(bundled)}; Chrome: ${firstLine(system)})`,
      );
    }
  }
}

const firstLine = (error: unknown): string =>
  String(error instanceof Error ? error.message : error)
    .split('\n')
    .find((line) => line.trim())
    ?.trim() ?? 'unknown error';
