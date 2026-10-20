import {
  copyFile,
  cp,
  lstat,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { basename, extname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  compileProject,
  ingestDataFile,
  loadProjectV2,
  migrateProject,
  refreshProjectLock,
  recordProjectCompilation,
  registerMedia,
  slugify,
} from '@mapbard/core';
import { STAGE1_CAPABILITIES } from '@mapbard/knowledge';
import { renderCompiled, writeCompiledBundle } from '@mapbard/renderer';
import type { Diagnostic, ProjectV2, StoryV2 } from '@mapbard/schema';

export const issue = (
  code: Diagnostic['code'],
  artifact: Diagnostic['artifact'],
  path: Diagnostic['path'],
  message: string,
  remedy: string,
  severity: Diagnostic['severity'] = 'error',
): Diagnostic => ({ code, artifact, path, message, remedy, severity, ids: {} });
export type Outcome = { result?: unknown; diagnostics: Diagnostic[] };
const jsonFile = async <T>(path: string): Promise<T> =>
  JSON.parse(await readFile(path, 'utf8')) as T;
const saveJson = async (path: string, value: unknown): Promise<void> => {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
};

export async function initialize(directory: string, template: boolean): Promise<Outcome> {
  const root = resolve(directory);
  try {
    if ((await readdir(root)).length)
      return {
        diagnostics: [
          issue(
            'ASSET_COLLISION',
            'project',
            [],
            'Destination is not empty.',
            'Choose an empty directory.',
          ),
        ],
      };
  } catch {
    /* New directory. */
  }
  await mkdir(root, { recursive: true });
  const id = slugify(basename(root));
  const manifest: ProjectV2 = {
    formatVersion: '0.2.0',
    id,
    title: template ? 'My first map story' : id,
    intent: 'Describe the geographic story.',
    basemap: { provider: 'openfreemap', style: 'positron', fallback: ['versatiles'] },
    resources: { data: [], media: [] },
  };
  const story: StoryV2 = {
    formatVersion: '0.2.0',
    scenes: [
      {
        id: 'introduction',
        title: 'Introduction',
        narration: 'Write your story here.',
        layers: [],
        camera: { center: [0, 0], zoom: 2 },
        annotations: [],
      },
    ],
    sharedScales: [],
  };
  await saveJson(join(root, 'mapbard.json'), manifest);
  await saveJson(join(root, 'story.json'), story);
  await writeFile(join(root, '.gitignore'), 'out/\n.mapbard-preview/\n');
  await writeFile(
    join(root, '.gitattributes'),
    '*.json text eol=lf\n*.geojson text eol=lf\n*.csv text eol=lf\n',
  );
  const locked = await refreshProjectLock(root);
  if (template) await installSkill(root);
  return {
    result: {
      directory: root,
      files: [
        'mapbard.json',
        'story.json',
        'mapbard.lock.json',
        '.gitignore',
        '.gitattributes',
        ...(template ? ['skills/mapbard/SKILL.md'] : []),
      ],
    },
    diagnostics: locked.diagnostics,
  };
}

/** Install the versioned pack bundled with this CLI build. */
export async function installSkill(
  root: string,
  target: 'project' | 'claude' | 'codex' = 'project',
): Promise<Outcome> {
  const source = fileURLToPath(new URL('./skill/', import.meta.url));
  const destination = join(root, target === 'claude' ? '.claude/skills/mapbard' : 'skills/mapbard');
  await mkdir(destination, { recursive: true });
  await cp(source, destination, { recursive: true, force: true });
  if (target === 'codex') {
    const agents = join(root, 'AGENTS.md');
    const marker = 'Read `skills/mapbard/SKILL.md` before authoring MapBard stories.';
    const previous = await readFile(agents, 'utf8').catch(() => '');
    if (!previous.includes(marker))
      await writeFile(
        agents,
        `${previous}${previous.endsWith('\n') || !previous ? '' : '\n'}${marker}\n`,
      );
  }
  return { result: { directory: destination, version: '0.1.0' }, diagnostics: [] };
}

export async function add(
  root: string,
  files: string[],
  requestedId?: string,
  attribution?: string,
): Promise<Outcome> {
  const manifestPath = join(root, 'mapbard.json');
  const manifest = await jsonFile<ProjectV2>(manifestPath);
  const added: string[] = [];
  const diagnostics: Diagnostic[] = [];
  for (const file of files) {
    const source = resolve(file);
    const extension = extname(source).toLowerCase();
    const media = !['.geojson', '.json', '.csv'].includes(extension);
    const id = requestedId ?? slugify(basename(source));
    if (
      manifest.resources.data.some((entry) => entry.id === id) ||
      manifest.resources.media.some((entry) => entry.id === id)
    ) {
      diagnostics.push(
        issue(
          'ID_DUPLICATE',
          'project',
          ['resources', id],
          `Resource ${id} already exists.`,
          'Use --id with a unique ID.',
        ),
      );
      continue;
    }
    try {
      const target = join(root, media ? 'media' : 'data', basename(source));
      if (resolve(target) !== source) {
        await mkdir(resolve(target, '..'), { recursive: true });
        if (
          await stat(target).then(
            () => true,
            () => false,
          )
        )
          throw new Error('Target file already exists.');
        await copyFile(source, target);
      }
      const path = relative(root, target).replaceAll('\\', '/');
      const credit = attribution ?? 'Attribution pending';
      if (!attribution)
        diagnostics.push(
          issue(
            'VALUE_INVALID',
            media ? 'media' : 'data',
            ['resources', id, 'attribution'],
            `Attribution is missing for ${id}.`,
            'Add a real attribution label before publishing.',
            'warning',
          ),
        );
      if (media) {
        const info = await registerMedia({ path: target, id });
        manifest.resources.media.push({
          id,
          kind: info.kind,
          location: { type: 'local', path },
          attribution: { label: credit },
          name: info.name,
          mimeType: info.mimeType,
          ...(info.width ? { width: info.width } : {}),
          ...(info.height ? { height: info.height } : {}),
        });
      } else {
        const info = await ingestDataFile(target, { id, path });
        const features = info.data.features;
        const ids = features.map((feature) => (feature as { id?: unknown }).id);
        const useIds =
          ids.every((value) => typeof value === 'string' || typeof value === 'number') &&
          new Set(ids).size === ids.length;
        const candidate = info.dataSource.profile.attributes.find(
          (attr) =>
            attr.name === 'id' && features.every((feature) => feature.properties?.id != null),
        );
        const featureId = useIds
          ? { method: 'geojson-id' as const, scope: 'source' as const }
          : candidate
            ? { method: 'property' as const, property: 'id', scope: 'source' as const }
            : undefined;
        if (!featureId) {
          diagnostics.push(
            issue(
              'VALUE_INVALID',
              'data',
              ['resources', id, 'featureId'],
              'No unique feature ID was found.',
              'Add unique GeoJSON feature IDs or an id property.',
            ),
          );
          continue;
        }
        manifest.resources.data.push({
          id,
          kind: extension === '.csv' ? 'csv' : 'geojson',
          path,
          crs: 'EPSG:4326',
          featureId,
          attributes: info.dataSource.profile.attributes.map((attr) => ({
            name: attr.name,
            observedType: attr.dataType,
            inferredLevel: attr.measurement,
            role:
              attr.name === 'id'
                ? 'identifier'
                : attr.dataType === 'number'
                  ? 'quantity'
                  : 'category',
            level: attr.measurement,
            unit: null,
          })),
          attribution: { label: credit },
          name: info.dataSource.name,
        });
      }
      added.push(id);
    } catch (error) {
      diagnostics.push(
        issue(
          'VALUE_INVALID',
          media ? 'media' : 'data',
          [file],
          String(error),
          'Use a supported readable local file.',
        ),
      );
    }
  }
  if (added.length) {
    await saveJson(manifestPath, manifest);
    const locked = await refreshProjectLock(root);
    diagnostics.push(...locked.diagnostics);
  }
  return { result: { added }, diagnostics };
}

export async function inspect(root: string, resourceId?: string): Promise<Outcome> {
  const loaded = await loadProjectV2(root);
  if (!loaded.ok) return { diagnostics: loaded.diagnostics };
  const manifest = await jsonFile<ProjectV2>(join(root, 'mapbard.json'));
  const lock = await jsonFile<{ profiles: Record<string, unknown> }>(
    join(root, 'mapbard.lock.json'),
  );
  const ids = resourceId ? [resourceId] : manifest.resources.data.map((entry) => entry.id);
  const result = (
    await Promise.all(
      ids.map(async (id) => {
        const source = manifest.resources.data.find((entry) => entry.id === id);
        const profile = lock.profiles[id];
        if (!source || !profile) return undefined;
        const data = (await ingestDataFile(join(root, source.path), { id })).data.features;
        const featureIds = data.map((feature) =>
          source.featureId.method === 'geojson-id'
            ? (feature as { id?: unknown }).id
            : feature.properties?.[source.featureId.property],
        );
        const distributions = Object.fromEntries(
          source.attributes.map((attribute) => {
            const values = data
              .map((feature) => feature.properties?.[attribute.name])
              .filter((value) => value !== null && value !== undefined && value !== '');
            const numeric = values.filter(
              (value): value is number => typeof value === 'number' && Number.isFinite(value),
            );
            if (attribute.observedType === 'number' && numeric.length) {
              let min = Infinity;
              let max = -Infinity;
              for (const value of numeric) {
                min = Math.min(min, value);
                max = Math.max(max, value);
              }
              const bins = [0, 0, 0, 0, 0];
              for (const value of numeric)
                bins[Math.min(4, Math.floor(((value - min) / (max - min || 1)) * 5))]!++;
              return [attribute.name, { min, max, bins }];
            }
            const counts = new Map<string, number>();
            for (const value of values)
              counts.set(String(value), (counts.get(String(value)) ?? 0) + 1);
            return [
              attribute.name,
              {
                topValues: [...counts]
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 10)
                  .map(([value, count]) => ({ value, count })),
              },
            ];
          }),
        );
        const geometry = (profile as { geometryType?: string }).geometryType;
        return {
          id,
          path: source.path,
          profile,
          featureId: source.featureId,
          featureIdUnique:
            featureIds.every((value) => value !== null && value !== undefined) &&
            new Set(featureIds).size === featureIds.length,
          distributions,
          suggestedTechniques:
            geometry === 'point'
              ? ['point', 'graduated-symbol']
              : geometry === 'line'
                ? ['line']
                : geometry === 'polygon'
                  ? ['fill', 'choropleth']
                  : [],
        };
      }),
    )
  ).filter(Boolean);
  if (resourceId && !result.length)
    return {
      diagnostics: [
        issue(
          'REFERENCE_MISSING',
          'data',
          [resourceId],
          'Resource is not registered.',
          'Run mapbard add first.',
        ),
      ],
    };
  return { result, diagnostics: [] };
}

export async function prepare(root: string, offline: boolean, refresh: boolean) {
  if (refresh) {
    const lock = await refreshProjectLock(root);
    if (!lock.ok) return { diagnostics: lock.diagnostics };
  }
  const loaded = await loadProjectV2(root);
  if (!loaded.ok) return { diagnostics: loaded.diagnostics };
  const manifest = await jsonFile<ProjectV2>(join(root, 'mapbard.json'));
  const attribution: Diagnostic[] = [...manifest.resources.data, ...manifest.resources.media]
    .filter((resource) => resource.attribution.label === 'Attribution pending')
    .map((resource) =>
      issue(
        'VALUE_INVALID',
        'project',
        ['resources', resource.id, 'attribution'],
        `Attribution is missing for ${resource.id}.`,
        'Replace the placeholder with the source credit.',
      ),
    );
  if (attribution.length) return { diagnostics: attribution };
  const compiled = compileProject(loaded.value, STAGE1_CAPABILITIES, { offline });
  if (!compiled.ok) return { diagnostics: compiled.diagnostics };
  return { loaded: loaded.value, compiled: compiled.value, diagnostics: compiled.diagnostics };
}

export async function build(root: string, output: string, offline: boolean): Promise<Outcome> {
  const prepared = await prepare(root, offline, true);
  if (!prepared.compiled || !prepared.loaded) return { diagnostics: prepared.diagnostics };
  const publication = renderCompiled(prepared.compiled, {
    currentInput: prepared.loaded.input,
    dataBytes: prepared.loaded.dataBytes,
    assets: prepared.loaded.resolvedAssets,
  });
  if (!publication.ok) return { diagnostics: publication.diagnostics };
  const out = resolve(root, output);
  const relativeOut = relative(resolve(root), out);
  if (
    !relativeOut ||
    relativeOut === '..' ||
    relativeOut.startsWith(`..\\`) ||
    relativeOut.startsWith('../') ||
    isAbsolute(relativeOut)
  )
    return {
      diagnostics: [
        issue(
          'ASSET_PATH_INVALID',
          'export',
          [out],
          'Output must be inside the project.',
          'Choose a project-relative output directory.',
        ),
      ],
    };
  let parent = resolve(root);
  for (const segment of relativeOut.split(/[\\/]/).slice(0, -1)) {
    parent = join(parent, segment);
    const entry = await lstat(parent).catch(() => undefined);
    if (entry && (!entry.isDirectory() || entry.isSymbolicLink()))
      return {
        diagnostics: [
          issue(
            'ASSET_PATH_INVALID',
            'export',
            [parent],
            'Output parent is linked or is not a directory.',
            'Choose a regular project directory.',
          ),
        ],
      };
  }
  const existingOutput = await lstat(out).catch(() => undefined);
  if (existingOutput && (!existingOutput.isDirectory() || existingOutput.isSymbolicLink()))
    return {
      diagnostics: [
        issue(
          'ASSET_PATH_INVALID',
          'export',
          [out],
          'Output is linked or is not a directory.',
          'Choose a regular project directory.',
        ),
      ],
    };
  const staging = `${out}.next-${randomUUID()}`;
  const written = await writeCompiledBundle(publication.value, staging);
  if (!written.ok) return { diagnostics: written.diagnostics };
  const verification = {
    input: prepared.compiled.input,
    offline,
    requiredNetwork: prepared.compiled.requiredNetwork,
    requiredHosts: [
      ...new Set(prepared.compiled.requiredNetwork.map((url) => new URL(url).host)),
    ].sort(),
    compilerVersion: prepared.compiled.compilerVersion,
  };
  await saveJson(join(staging, 'verification.json'), verification);
  const backup = `${out}.previous-${randomUUID()}`;
  let backedUp = false;
  try {
    if (existingOutput) {
      await stat(join(out, 'verification.json'));
      await rename(out, backup);
      backedUp = true;
    }
    await rename(staging, out);
  } catch (error) {
    let restored = true;
    if (backedUp)
      restored = await rename(backup, out).then(
        () => true,
        () => false,
      );
    await rm(staging, { recursive: true, force: true });
    return {
      diagnostics: [
        issue(
          'ASSET_COLLISION',
          'export',
          [out],
          `${String(error)}${restored ? '' : ` Previous output remains at ${backup}.`}`,
          restored
            ? 'Choose a generated output directory.'
            : `Restore the previous output from ${backup}.`,
        ),
      ],
    };
  }
  const cleanupDiagnostics: Diagnostic[] = [];
  if (backedUp) {
    try {
      await rm(backup, { recursive: true, force: true });
    } catch {
      cleanupDiagnostics.push(
        issue(
          'ASSET_COLLISION',
          'export',
          [backup],
          'Previous generated output could not be removed.',
          'Remove the previous generated directory when it is no longer needed.',
          'warning',
        ),
      );
    }
  }
  await recordProjectCompilation(root, prepared.compiled);
  return {
    result: {
      directory: out,
      verification,
      files: [...written.value.written, 'verification.json'],
    },
    diagnostics: [...prepared.diagnostics, ...publication.diagnostics, ...cleanupDiagnostics],
  };
}

export { migrateProject, refreshProjectLock };
