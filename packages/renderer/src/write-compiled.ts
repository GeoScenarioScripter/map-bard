import { createHash } from 'node:crypto';
import {
  lstat,
  mkdtemp,
  mkdir,
  readFile,
  realpath,
  rename,
  rm,
  copyFile,
  writeFile,
} from 'node:fs/promises';
import { createRequire } from 'node:module';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CompiledBundleSchema,
  type CompiledBundle,
  type CompiledWriteResult,
  type Diagnostic,
  type Result,
} from '@mapbard/schema';

const require = createRequire(import.meta.url);
const runtimeDir = fileURLToPath(new URL('../runtime/', import.meta.url));
const vendor = [
  ['@mapbard/renderer/vendor/maplibre-gl.js', 'vendor/maplibre-gl.js'],
  ['@mapbard/renderer/vendor/maplibre-gl-worker.js', 'vendor/maplibre-gl-worker.js'],
  ['maplibre-gl/dist/maplibre-gl.css', 'vendor/maplibre-gl.css'],
] as const;
const builtPlayer = '@mapbard/renderer/player.js';
const fixedPaths = [
  'index.html',
  'compiled-data.js',
  'compiled-app.js',
  'style.css',
  'player.js',
  ...vendor.map((item) => item[1]),
];

function issue(
  code: Diagnostic['code'],
  message: string,
  remedy: string,
  ids: Diagnostic['ids'] = {},
): Diagnostic {
  return { code, severity: 'error', artifact: 'export', path: [], ids, message, remedy };
}

function safePath(path: string): boolean {
  return (
    !path.startsWith('/') &&
    !path.includes('\\') &&
    !/^[A-Za-z]:/.test(path) &&
    path.split('/').every((part) => part !== '' && part !== '.' && part !== '..')
  );
}

function inside(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return (
    rel === '' ||
    (rel !== '..' && !rel.startsWith(`..\\`) && !rel.startsWith('../') && !isAbsolute(rel))
  );
}

async function exists(path: string): Promise<boolean> {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

/** Preflight all sources before creating a publication; atomically install a new output directory. */
export async function writeCompiledBundle(
  bundle: CompiledBundle,
  outDir: string,
): Promise<Result<CompiledWriteResult>> {
  if (!CompiledBundleSchema.safeParse(bundle).success)
    return {
      ok: false,
      diagnostics: [
        issue(
          'VALUE_INVALID',
          'Bundle does not match the compiled publication contract.',
          'Render the project again.',
        ),
      ],
    };
  const diagnostics: Diagnostic[] = [];
  const destinations = [...fixedPaths, ...bundle.mediaCopies.map((item) => item.bundlePath)];
  if (
    Object.keys(bundle.files).length !== 3 ||
    !['index.html', 'compiled-data.js', 'compiled-app.js'].every((path) => path in bundle.files)
  )
    diagnostics.push(
      issue(
        'RESOURCE_MISSING',
        'Generated page files are incomplete.',
        'Render the compiled story again.',
      ),
    );
  const seen = new Set<string>();
  for (const path of destinations) {
    if (!safePath(path))
      diagnostics.push(
        issue(
          'ASSET_PATH_INVALID',
          'Publication destination is unsafe.',
          'Use a relative path without traversal.',
        ),
      );
    const folded = path.toLowerCase();
    if (seen.has(folded))
      diagnostics.push(
        issue(
          'ASSET_COLLISION',
          'Publication destinations collide ignoring case.',
          'Give assets unique bundle paths.',
        ),
      );
    seen.add(folded);
  }
  for (const path of seen) {
    const parts = path.split('/');
    for (let i = 1; i < parts.length; i++) {
      if (seen.has(parts.slice(0, i).join('/')))
        diagnostics.push(
          issue(
            'ASSET_COLLISION',
            'A publication file collides with a destination directory.',
            'Give assets distinct paths.',
          ),
        );
    }
  }
  const sources: { from: string; to: string }[] = [];
  for (const asset of bundle.mediaCopies) {
    try {
      const root = await realpath(asset.projectRoot);
      const source = await realpath(asset.sourcePath);
      const stat = await lstat(asset.sourcePath);
      if (!inside(root, source) || !stat.isFile() || stat.isSymbolicLink())
        throw new Error('Asset is not a regular contained file');
      const bytes = await readFile(source);
      const digest = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
      if (
        digest !== asset.sha256 ||
        !bundle.input.resources.some((entry) => entry.id === asset.id && entry.sha256 === digest)
      ) {
        diagnostics.push(
          issue(
            'RESOURCE_HASH_MISMATCH',
            'Asset bytes changed since compilation.',
            'Reload and recompile the current asset.',
            { assetId: asset.id },
          ),
        );
        continue;
      }
      sources.push({ from: source, to: asset.bundlePath });
    } catch {
      diagnostics.push(
        issue(
          'ASSET_PATH_INVALID',
          'Asset source is missing, linked, or outside its project root.',
          'Keep a regular local file inside the project.',
          { assetId: asset.id },
        ),
      );
    }
  }
  for (const spec of [builtPlayer, ...vendor.map((item) => item[0])]) {
    try {
      require.resolve(spec);
    } catch {
      diagnostics.push(
        issue(
          'RESOURCE_MISSING',
          `Required browser asset ${spec} is not built or installed.`,
          'Build the renderer package and install its dependencies.',
        ),
      );
    }
  }
  try {
    if (await exists(resolve(outDir)))
      diagnostics.push(
        issue(
          'ASSET_COLLISION',
          'Output directory already exists.',
          'Choose a new output directory.',
        ),
      );
  } catch {
    diagnostics.push(
      issue(
        'ASSET_PATH_INVALID',
        'Output directory cannot be inspected.',
        'Choose a writable output location.',
      ),
    );
  }
  if (diagnostics.length) return { ok: false, diagnostics };
  const target = resolve(outDir);
  let staging: string | undefined;
  try {
    await mkdir(dirname(target), { recursive: true });
    staging = await mkdtemp(join(dirname(target), `.${basename(target)}-`));
    for (const [path, content] of Object.entries(bundle.files))
      await writeFile(join(staging, path), content, 'utf8');
    await copyFile(join(runtimeDir, 'style.css'), join(staging, 'style.css'));
    await copyFile(require.resolve(builtPlayer), join(staging, 'player.js'));
    for (const [spec, path] of vendor) {
      await mkdir(dirname(join(staging, path)), { recursive: true });
      await copyFile(require.resolve(spec), join(staging, path));
    }
    for (const source of sources) {
      const destination = join(staging, source.to);
      await mkdir(dirname(destination), { recursive: true });
      await copyFile(source.from, destination);
    }
    // Detect a race where source bytes changed between preflight and copy.
    for (const asset of bundle.mediaCopies) {
      const bytes = await readFile(join(staging, asset.bundlePath));
      if (`sha256:${createHash('sha256').update(bytes).digest('hex')}` !== asset.sha256)
        throw new Error(`Asset ${asset.id} changed during publication`);
    }
    if (await exists(target)) throw new Error('Output directory appeared during publication');
    await rename(staging, target);
    staging = undefined;
    return {
      ok: true,
      value: { written: destinations, input: bundle.input },
      diagnostics: bundle.diagnostics,
    };
  } catch {
    return {
      ok: false,
      diagnostics: [
        issue(
          'RESOURCE_MISSING',
          'Publication failed while writing the bundle.',
          'Check source files and output permissions, then retry with a new output directory.',
        ),
      ],
    };
  } finally {
    if (staging) await rm(staging, { recursive: true, force: true });
  }
}
