/**
 * `writeBundle()` — the I/O half. Writes the generated text files, copies the
 * static runtime (app.js, style.css), vendors the browser libraries
 * (maplibre-gl, scrollama) out of node_modules, and copies local media in.
 *
 * The result is self-contained: it opens from `file://` with no server.
 */
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RenderedBundle } from './types.js';

const require = createRequire(import.meta.url);
const runtimeDir = fileURLToPath(new URL('../runtime/', import.meta.url));

/** Browser libraries copied verbatim so the bundle needs no CDN/network. */
const VENDOR_FILES: ReadonlyArray<readonly [spec: string, dest: string]> = [
  ['maplibre-gl/dist/maplibre-gl.js', 'vendor/maplibre-gl.js'],
  ['maplibre-gl/dist/maplibre-gl.css', 'vendor/maplibre-gl.css'],
  ['scrollama/build/scrollama.min.js', 'vendor/scrollama.min.js'],
];

const RUNTIME_FILES = ['app.js', 'style.css'] as const;

export interface WriteResult {
  /** Bundle-relative paths written. */
  written: string[];
  warnings: string[];
}

export async function writeBundle(bundle: RenderedBundle, outDir: string): Promise<WriteResult> {
  const warnings = [...bundle.warnings];
  const written: string[] = [];

  await mkdir(outDir, { recursive: true });

  // 1. generated text files (may contain nested paths)
  for (const [rel, content] of Object.entries(bundle.files)) {
    const dest = join(outDir, rel);
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, content, 'utf8');
    written.push(rel);
  }

  // 2. static runtime
  for (const f of RUNTIME_FILES) {
    await copyFile(join(runtimeDir, f), join(outDir, f));
    written.push(f);
  }

  // 3. vendored browser libraries
  await mkdir(join(outDir, 'vendor'), { recursive: true });
  for (const [spec, dest] of VENDOR_FILES) {
    try {
      await copyFile(require.resolve(spec), join(outDir, dest));
      written.push(dest);
    } catch (err) {
      warnings.push(`could not vendor "${spec}": ${(err as Error).message}`);
    }
  }

  // 4. local media
  for (const m of bundle.mediaCopies) {
    if (!existsSync(m.from)) {
      warnings.push(`media file not found, skipped: ${m.from}`);
      continue;
    }
    const dest = join(outDir, m.to);
    await mkdir(dirname(dest), { recursive: true });
    await copyFile(m.from, dest);
    written.push(m.to);
  }

  return { written, warnings };
}
