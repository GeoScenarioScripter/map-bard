import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import type { Diagnostic } from '@mapbard/schema';
import type { CaptureViewport, Sample } from './capture.js';

/** Committed reference captures, in the project next to `mapbard.json`. */
export const GOLDEN_DIRECTORY = 'goldens';
export const GOLDEN_MANIFEST = 'manifest.json';
/** pixelmatch's per-pixel colour threshold (0–1; smaller is stricter). */
export const GOLDEN_THRESHOLD = 0.1;
/** `--update` captures this many times and sets the tolerance from the spread between runs. */
export const NOISE_RUNS = 5;
/** The tolerance is this many times the measured noise... */
export const NOISE_FACTOR = 3;
/**
 * ...but never below this share of pixels. SwiftShader repeats itself exactly on one machine
 * (0 noise), and a zero tolerance would fail on the first changed pixel of a font hint.
 */
export const MIN_DIFF_RATIO = 0.0005;

export type GoldenManifest = {
  manifestVersion: 1;
  mapbard: string;
  chromium: string;
  platform: string;
  viewports: { id: string; width: number; height: number }[];
  threshold: number;
  /** A capture fails when more than this share of its pixels differ from its golden. */
  maxDiffRatio: number;
  noise: { runs: number; maxDiffRatio: number; factor: number; minimum: number };
  captures: string[];
};

export type ImageDiff = { width: number; height: number; differing: number; ratio: number };

/**
 * Compare two PNGs with pixelmatch. Images of different sizes differ everywhere. With `diff`,
 * the result also carries a diff image (changed pixels red over a faded copy of `expected`).
 */
export function diffImages(
  expected: Buffer,
  actual: Buffer,
  options: { threshold?: number; diff?: boolean } = {},
): ImageDiff & { diffPng?: Buffer } {
  const a = PNG.sync.read(expected);
  const b = PNG.sync.read(actual);
  if (a.width !== b.width || a.height !== b.height)
    return {
      width: b.width,
      height: b.height,
      differing: b.width * b.height,
      ratio: 1,
    };
  const output = options.diff ? new PNG({ width: a.width, height: a.height }) : undefined;
  const differing = pixelmatch(a.data, b.data, output?.data, a.width, a.height, {
    threshold: options.threshold ?? GOLDEN_THRESHOLD,
  });
  return {
    width: a.width,
    height: a.height,
    differing,
    ratio: differing / (a.width * a.height),
    ...(output ? { diffPng: PNG.sync.write(output) } : {}),
  };
}

/** The tolerance for a measured noise ratio. */
export const toleranceFor = (noise: number): number =>
  Math.max(NOISE_FACTOR * noise, MIN_DIFF_RATIO);

/**
 * The largest diff ratio between the first run's captures and each later run's captures of the
 * same name: how much the same build differs from itself between runs.
 */
export async function measureNoise(
  runs: readonly { out: string; captures: readonly Sample[] }[],
  threshold = GOLDEN_THRESHOLD,
): Promise<number> {
  const [first, ...rest] = runs;
  if (!first) return 0;
  let worst = 0;
  for (const run of rest)
    for (const capture of run.captures) {
      if (!capture.screenshot) continue;
      const expected = await readFile(join(first.out, capture.screenshot));
      const actual = await readFile(join(run.out, capture.screenshot));
      worst = Math.max(worst, diffImages(expected, actual, { threshold }).ratio);
    }
  return worst;
}

export async function readGoldenManifest(root: string): Promise<GoldenManifest | undefined> {
  const text = await readFile(join(root, GOLDEN_DIRECTORY, GOLDEN_MANIFEST), 'utf8').catch(
    () => undefined,
  );
  return text === undefined ? undefined : (JSON.parse(text) as GoldenManifest);
}

/**
 * Replace the project's goldens with this run's captures and write the manifest. Old golden
 * PNGs are removed first, so a dropped scene leaves no stale file behind.
 */
export async function writeGoldens(
  root: string,
  out: string,
  captures: readonly Sample[],
  meta: {
    mapbard: string;
    chromium: string;
    platform: string;
    viewports: readonly CaptureViewport[];
    noise: number;
  },
): Promise<GoldenManifest> {
  const directory = join(root, GOLDEN_DIRECTORY);
  await mkdir(directory, { recursive: true });
  for (const entry of await readdir(directory))
    if (entry.endsWith('.png')) await rm(join(directory, entry));
  const names = captures.flatMap((capture) => (capture.screenshot ? [capture.screenshot] : []));
  for (const name of names) await writeFile(join(directory, name), await readFile(join(out, name)));
  const manifest: GoldenManifest = {
    manifestVersion: 1,
    mapbard: meta.mapbard,
    chromium: meta.chromium,
    platform: meta.platform,
    viewports: meta.viewports.map(({ id, width, height }) => ({ id, width, height })),
    threshold: GOLDEN_THRESHOLD,
    maxDiffRatio: toleranceFor(meta.noise),
    noise: {
      runs: NOISE_RUNS,
      maxDiffRatio: meta.noise,
      factor: NOISE_FACTOR,
      minimum: MIN_DIFF_RATIO,
    },
    captures: [...names].sort(),
  };
  await writeFile(join(directory, GOLDEN_MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

export type GoldenComparison = {
  name: string;
  sceneId?: string;
  ratio?: number;
  status: 'match' | 'mismatch' | 'missing-golden' | 'missing-capture';
  diff?: string;
};

const percent = (ratio: number): string => `${(ratio * 100).toFixed(2)}%`;

/**
 * Compare each capture with its golden. A mismatch writes `<name>.diff.png` next to the capture
 * and is an error. Goldens made on another platform give one summary warning instead: the map
 * rasterises alike under SwiftShader, but DOM text wraps differently between Windows and Linux
 * (0.8–4.5% of pixels on Potomac), and Linux (CI) is the canonical platform.
 */
export async function compareGoldens(
  root: string,
  out: string,
  captures: readonly Sample[],
  manifest: GoldenManifest,
  sceneIndex: ReadonlyMap<string, number>,
  platform: string = process.platform,
): Promise<{ comparisons: GoldenComparison[]; diagnostics: Diagnostic[] }> {
  const comparisons: GoldenComparison[] = [];
  const diagnostics: Diagnostic[] = [];
  const at = (sceneId: string | undefined): Pick<Diagnostic, 'path' | 'ids'> => {
    const index = sceneId === undefined ? undefined : sceneIndex.get(sceneId);
    return {
      path: index === undefined ? [GOLDEN_DIRECTORY] : ['scenes', index],
      ids: sceneId === undefined ? {} : { sceneId },
    };
  };
  const captured = new Set<string>();
  for (const capture of captures) {
    if (!capture.screenshot) continue;
    const name = capture.screenshot;
    captured.add(name);
    const golden = await readFile(join(root, GOLDEN_DIRECTORY, name)).catch(() => undefined);
    if (!golden) {
      comparisons.push({ name, sceneId: capture.sceneId, status: 'missing-golden' });
      diagnostics.push({
        code: 'VISUAL_GOLDEN_MISMATCH',
        severity: 'error',
        artifact: 'design',
        ...at(capture.sceneId),
        message: `No golden for ${name} (scene ${capture.sceneId}, ${capture.viewport}, p ${capture.p}).`,
        remedy:
          'Check the capture, then run check --visual --update and commit the goldens directory.',
      });
      continue;
    }
    const result = diffImages(golden, await readFile(join(out, name)), {
      threshold: manifest.threshold,
      diff: true,
    });
    if (result.ratio <= manifest.maxDiffRatio) {
      comparisons.push({ name, sceneId: capture.sceneId, ratio: result.ratio, status: 'match' });
      continue;
    }
    const diff = name.replace(/\.png$/, '.diff.png');
    await writeFile(join(out, diff), result.diffPng!);
    comparisons.push({
      name,
      sceneId: capture.sceneId,
      ratio: result.ratio,
      status: 'mismatch',
      diff: join(out, diff),
    });
    diagnostics.push({
      code: 'VISUAL_GOLDEN_MISMATCH',
      severity: 'error',
      artifact: 'design',
      ...at(capture.sceneId),
      message: `Scene ${capture.sceneId}, ${capture.viewport}, p ${capture.p}: ${percent(result.ratio)} of pixels differ from goldens/${name} (tolerance ${percent(manifest.maxDiffRatio)}); see ${diff}.`,
      remedy:
        'Open the diff image. If the change is intended, run check --visual --update and commit the goldens; otherwise fix what changed.',
    });
  }
  for (const name of manifest.captures)
    if (!captured.has(name)) {
      comparisons.push({ name, status: 'missing-capture' });
      diagnostics.push({
        code: 'VISUAL_GOLDEN_MISMATCH',
        severity: 'error',
        artifact: 'design',
        ...at(undefined),
        message: `goldens/${name} has no matching capture; a scene or viewport was removed or renamed.`,
        remedy: 'Run check --visual --update and commit the goldens directory.',
      });
    }
  if (manifest.platform !== platform && diagnostics.length) {
    const mismatched = comparisons.filter((entry) => entry.status !== 'match');
    const worst = Math.max(0, ...mismatched.map((entry) => entry.ratio ?? 0));
    return {
      comparisons,
      diagnostics: [
        {
          code: 'VISUAL_GOLDEN_MISMATCH',
          severity: 'warning',
          artifact: 'design',
          path: [GOLDEN_DIRECTORY],
          ids: {},
          message: `${mismatched.length} of ${comparisons.length} captures differ from the goldens (worst ${percent(worst)}; diff images next to the captures). The goldens were made on ${manifest.platform} and this run is on ${platform}, so it only warns.`,
          remedy:
            'Text renders differently across platforms. Compare on the goldens platform (the CI visual job), or run check --visual --update there.',
        },
      ],
    };
  }
  return { comparisons, diagnostics };
}
