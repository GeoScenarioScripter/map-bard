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

export const BROWSER_REMEDY =
  'Install Google Chrome, run `npx playwright install chromium`, or set MAPBARD_CHROME_PATH to a Chrome or Chromium executable.';

export type BrowserProbe =
  | { available: true; browser: string }
  | { available: false; reason: string; remedy: string };

/** Whether `check --visual` can start a browser here: launches one and closes it at once. */
export async function probeBrowser(env: NodeJS.ProcessEnv = process.env): Promise<BrowserProbe> {
  try {
    const browser = await launchBrowser(env);
    const version = browser.version();
    await browser.close();
    return { available: true, browser: `Chromium ${version}` };
  } catch (error) {
    return { available: false, reason: firstLine(error), remedy: BROWSER_REMEDY };
  }
}

/**
 * Headless Chromium: `MAPBARD_CHROME_PATH` when set, else Playwright's own build, else the
 * system Chrome. `playwright-core` loads only here, so commands without `--visual` never need it.
 * `args` replaces the visual flags, as the frame probe script does to keep the default GPU path.
 */
export async function launchBrowser(
  env: NodeJS.ProcessEnv = process.env,
  args: readonly string[] = VISUAL_BROWSER_ARGS,
): Promise<Browser> {
  let chromium: typeof import('playwright-core').chromium;
  try {
    ({ chromium } = await import('playwright-core'));
  } catch (error) {
    throw new BrowserMissingError(`playwright-core could not be loaded: ${String(error)}`);
  }
  const executablePath = env.MAPBARD_CHROME_PATH;
  const options = { headless: true, args: [...args] };
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
