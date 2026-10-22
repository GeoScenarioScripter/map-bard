import { createHash } from 'node:crypto';
import { readFile, realpath, writeFile } from 'node:fs/promises';
import { extname } from 'node:path';
import {
  CompiledSchema,
  LockV2Schema,
  ProjectV2Schema,
  StoryV2Schema,
  validateProject,
  type Diagnostic,
  type Compiled,
  type JsonValue,
  type LoadedProject,
  type LockV2,
  type ProjectV2,
  type Result,
  type StoryV2,
} from '@mapbard/schema';
import { ingestCsvText, ingestGeoJsonText } from '../inspect/index.js';
import { sha256 } from './fingerprint.js';
import { assertUniquePaths, existingProjectFile } from './paths.js';
import { failure } from './types.js';

const decoder = new TextDecoder('utf-8', { fatal: true });
const encoder = new TextEncoder();

function omitKeys<T extends object, K extends keyof T>(value: T, keys: readonly K[]): Omit<T, K> {
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => !keys.includes(key as K)),
  ) as Omit<T, K>;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(',')}}`;
  return JSON.stringify(value);
}

function textBytes(bytes: Uint8Array): Uint8Array {
  return encoder.encode(decoder.decode(bytes).replace(/\r\n?/g, '\n'));
}

function problem(
  code: Diagnostic['code'],
  artifact: Diagnostic['artifact'],
  path: Diagnostic['path'],
  message: string,
  remedy: string,
): Result<never> {
  return { ok: false, diagnostics: [failure(code, artifact, path, message, remedy)] };
}

function shapeError(
  artifact: Diagnostic['artifact'],
  issues: { path: (string | number)[]; message: string; code: string; keys?: string[] }[],
): Result<never> {
  return {
    ok: false,
    diagnostics: issues.map((issue) =>
      failure(
        issue.code === 'unrecognized_keys' ? 'FIELD_UNKNOWN' : 'VALUE_INVALID',
        artifact,
        issue.code === 'unrecognized_keys' ? [...issue.path, issue.keys?.[0] ?? ''] : issue.path,
        issue.message,
        'Correct the field to match format 0.2.',
      ),
    ),
  };
}

type Inputs = {
  root: string;
  manifest: ProjectV2;
  story: StoryV2;
  dataBytes: { id: string; bytes: Uint8Array }[];
  dataMap: Record<string, JsonValue>;
  assets: LoadedProject['resolvedAssets'];
  hashes: LockV2['inputs'];
  profiles: LockV2['profiles'];
};

async function readInputs(root: string): Promise<Result<Inputs>> {
  let projectRoot: string;
  try {
    projectRoot = await realpath(root);
  } catch {
    return problem(
      'RESOURCE_MISSING',
      'project',
      [],
      'Project directory is missing.',
      'Choose an existing directory.',
    );
  }
  let manifestBytes: Uint8Array;
  let storyBytes: Uint8Array;
  try {
    manifestBytes = textBytes(
      await readFile(await existingProjectFile(projectRoot, 'mapbard.json')),
    );
    storyBytes = textBytes(await readFile(await existingProjectFile(projectRoot, 'story.json')));
  } catch {
    return problem(
      'RESOURCE_MISSING',
      'project',
      [],
      'mapbard.json or story.json is missing or unreadable.',
      'Provide both authored files inside the project.',
    );
  }
  let manifestRaw: unknown;
  let storyRaw: unknown;
  try {
    manifestRaw = JSON.parse(decoder.decode(manifestBytes));
    storyRaw = JSON.parse(decoder.decode(storyBytes));
  } catch {
    return problem(
      'VALUE_INVALID',
      'project',
      [],
      'Authored files contain invalid JSON.',
      'Repair mapbard.json and story.json.',
    );
  }
  if (
    !manifestRaw ||
    typeof manifestRaw !== 'object' ||
    !('formatVersion' in manifestRaw) ||
    manifestRaw.formatVersion !== '0.2.0'
  )
    return problem(
      'VERSION_UNSUPPORTED',
      'project',
      ['formatVersion'],
      'Project format version is unsupported.',
      'Use format 0.2 or migrate an older project explicitly.',
    );
  if (
    !storyRaw ||
    typeof storyRaw !== 'object' ||
    !('formatVersion' in storyRaw) ||
    storyRaw.formatVersion !== '0.2.0'
  )
    return problem(
      'VERSION_UNSUPPORTED',
      'narrative',
      ['formatVersion'],
      'Story format version is unsupported.',
      'Use a story.json with formatVersion 0.2.0.',
    );
  const manifestParse = ProjectV2Schema.safeParse(manifestRaw);
  if (!manifestParse.success) return shapeError('project', manifestParse.error.issues);
  const storyParse = StoryV2Schema.safeParse(storyRaw);
  if (!storyParse.success) return shapeError('narrative', storyParse.error.issues);
  const manifest = manifestParse.data;
  const story = storyParse.data;
  try {
    assertUniquePaths([
      'mapbard.json',
      'story.json',
      'mapbard.lock.json',
      ...manifest.resources.data.map((r) => r.path),
      ...manifest.resources.media.flatMap((r) =>
        r.location.type === 'local' ? [r.location.path] : [],
      ),
    ]);
  } catch {
    return problem(
      'ASSET_PATH_INVALID',
      'project',
      ['resources'],
      'Resource paths are invalid or collide.',
      'Use distinct project-relative paths without traversal.',
    );
  }
  const allIds = [...manifest.resources.data, ...manifest.resources.media].map((r) => r.id);
  if (new Set(allIds).size !== allIds.length)
    return problem(
      'ID_DUPLICATE',
      'project',
      ['resources'],
      'Resource IDs must be unique across data and media.',
      'Assign a distinct ID to each resource.',
    );
  const dataBytes: Inputs['dataBytes'] = [];
  const dataMap: Inputs['dataMap'] = {};
  const assets: Inputs['assets'] = [];
  const profiles: Inputs['profiles'] = {};
  const resources: LockV2['inputs']['resources'] = [];
  for (const resource of manifest.resources.data) {
    let bytes: Uint8Array;
    try {
      bytes = textBytes(await readFile(await existingProjectFile(projectRoot, resource.path)));
    } catch {
      return problem(
        'RESOURCE_MISSING',
        'data',
        ['resources', 'data', resource.id, 'path'],
        `Data file ${resource.path} is missing or unreadable.`,
        'Keep the resource inside the project.',
      );
    }
    try {
      const text = decoder.decode(bytes);
      const ingested =
        resource.kind === 'geojson'
          ? ingestGeoJsonText(text, { id: resource.id, path: resource.path })
          : ingestCsvText(text, { id: resource.id, path: resource.path });
      const records = ingested.data.features.map((feature) => feature.properties ?? {});
      const attributeStats: LockV2['profiles'][string]['attributeStats'] = {};
      for (const attribute of ingested.dataSource.profile.attributes) {
        const values = records
          .map((record) => record[attribute.name])
          .filter((value) => value !== null && value !== undefined && value !== '');
        let min = Infinity;
        let max = -Infinity;
        for (const value of values) {
          if (typeof value === 'number' && Number.isFinite(value)) {
            min = Math.min(min, value);
            max = Math.max(max, value);
          }
        }
        attributeStats[attribute.name] = {
          present: values.length,
          missing: records.length - values.length,
          ...(min !== Infinity ? { min, max } : {}),
        };
      }
      profiles[resource.id] = { ...ingested.dataSource.profile, attributeStats };
      dataMap[resource.id] = resource.kind === 'geojson' ? (JSON.parse(text) as JsonValue) : text;
    } catch {
      return problem(
        'VALUE_INVALID',
        'data',
        ['resources', 'data', resource.id],
        `Data file ${resource.path} cannot be profiled.`,
        'Repair the declared data format.',
      );
    }
    dataBytes.push({ id: resource.id, bytes });
    resources.push({ id: resource.id, sha256: sha256(bytes) });
  }
  for (const resource of manifest.resources.media) {
    if (resource.location.type === 'url') continue;
    const { path } = resource.location;
    let absolute: string;
    let bytes: Uint8Array;
    try {
      absolute = await existingProjectFile(projectRoot, path);
      bytes = await readFile(absolute);
    } catch {
      return problem(
        'RESOURCE_MISSING',
        'media',
        ['resources', 'media', resource.id, 'location'],
        `Media file ${path} is missing or unreadable.`,
        'Keep the media inside the project.',
      );
    }
    const digest = sha256(bytes);
    resources.push({ id: resource.id, sha256: digest });
    assets.push({
      id: resource.id,
      sourcePath: absolute,
      projectRoot,
      bundlePath: `media/${createHash('sha256').update(resource.id).digest('hex')}${extname(path).toLowerCase()}`,
      sha256: digest,
    });
  }
  resources.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return {
    ok: true,
    value: {
      root: projectRoot,
      manifest,
      story,
      dataBytes,
      dataMap,
      assets,
      profiles,
      hashes: { manifestSha256: sha256(manifestBytes), storySha256: sha256(storyBytes), resources },
    },
    diagnostics: [],
  };
}

/** Refresh only CLI-owned derived state. Authored files are never rewritten. */
export async function refreshProjectLock(root: string): Promise<Result<LockV2>> {
  const input = await readInputs(root);
  if (!input.ok) return input;
  const { root: projectRoot, manifest, hashes, profiles } = input.value;
  let previous: LockV2 | undefined;
  try {
    const raw: unknown = JSON.parse(
      await readFile(await existingProjectFile(projectRoot, 'mapbard.lock.json'), 'utf8'),
    );
    if (raw && typeof raw === 'object' && 'lockVersion' in raw && raw.lockVersion !== '0.2.0')
      return problem(
        'VERSION_UNSUPPORTED',
        'project',
        ['mapbard.lock.json', 'lockVersion'],
        'Lockfile version is unsupported.',
        'Use a compatible MapBard version or migrate explicitly.',
      );
    previous = LockV2Schema.parse(raw);
  } catch {
    /* An absent or malformed lock is regenerated. */
  }
  const changed =
    !previous ||
    canonical(previous.inputs) !== canonical(hashes) ||
    canonical(previous.profiles) !== canonical(profiles);
  const lock: LockV2 = {
    lockVersion: '0.2.0',
    projectId: manifest.id,
    revision: previous ? previous.revision + (changed ? 1 : 0) : 1,
    inputs: hashes,
    profiles,
    ...(previous?.lastCompileInputs ? { lastCompileInputs: previous.lastCompileInputs } : {}),
  };
  await writeFile(`${projectRoot}/mapbard.lock.json`, `${JSON.stringify(lock, null, 2)}\n`);
  return { ok: true, value: lock, diagnostics: [] };
}

/** Validate lock freshness before adapting 0.2 to the existing compiler core. */
export async function loadProjectV2(root: string): Promise<Result<LoadedProject>> {
  const input = await readInputs(root);
  if (!input.ok) return input;
  const {
    root: projectRoot,
    manifest,
    story,
    hashes,
    dataBytes,
    dataMap,
    assets,
    profiles,
  } = input.value;
  let rawLock: unknown;
  try {
    rawLock = JSON.parse(
      await readFile(await existingProjectFile(projectRoot, 'mapbard.lock.json'), 'utf8'),
    );
  } catch {
    return problem(
      'INPUT_STALE',
      'project',
      ['mapbard.lock.json'],
      'Project lockfile is missing or invalid.',
      'Run mapbard lock to refresh derived state.',
    );
  }
  if (
    rawLock &&
    typeof rawLock === 'object' &&
    'lockVersion' in rawLock &&
    rawLock.lockVersion !== '0.2.0'
  )
    return problem(
      'VERSION_UNSUPPORTED',
      'project',
      ['mapbard.lock.json', 'lockVersion'],
      'Lockfile version is unsupported.',
      'Use a compatible MapBard version or migrate explicitly.',
    );
  const parsed = LockV2Schema.safeParse(rawLock);
  if (!parsed.success) return shapeError('project', parsed.error.issues);
  const lock = parsed.data;
  if (
    lock.projectId !== manifest.id ||
    canonical(lock.inputs) !== canonical(hashes) ||
    canonical(lock.profiles) !== canonical(profiles)
  )
    return problem(
      'INPUT_STALE',
      'project',
      ['mapbard.lock.json'],
      'Lockfile hashes or profiles differ from current inputs.',
      'Run mapbard lock to refresh derived state.',
    );
  const sourceIds = new Set(manifest.resources.data.map((resource) => resource.id));
  const assetIds = new Set(manifest.resources.media.map((resource) => resource.id));
  const missing: Diagnostic[] = [];
  for (const [sceneIndex, scene] of story.scenes.entries()) {
    for (const [layerIndex, layer] of scene.layers.entries())
      if (!sourceIds.has(layer.sourceId))
        missing.push(
          failure(
            'REFERENCE_MISSING',
            'narrative',
            ['scenes', sceneIndex, 'layers', layerIndex, 'sourceId'],
            `Layer source ${layer.sourceId} is not registered.`,
            'Register the data resource or correct sourceId.',
            { sceneId: scene.id, layerId: layer.id, sourceId: layer.sourceId },
          ),
        );
    for (const [mediaIndex, media] of (scene.media ?? []).entries())
      if (!assetIds.has(media.assetId))
        missing.push(
          failure(
            'REFERENCE_MISSING',
            'narrative',
            ['scenes', sceneIndex, 'media', mediaIndex, 'assetId'],
            `Media ${media.assetId} is not registered.`,
            'Register the media resource or correct assetId.',
            { sceneId: scene.id, assetId: media.assetId },
          ),
        );
  }
  if (missing.length) return { ok: false, diagnostics: missing };
  const oldProject: LoadedProject['project'] = {
    projectVersion: '0.1.0',
    id: manifest.id,
    revision: lock.revision,
    artifacts: { narrative: 'story.json', design: 'story.json' },
    resources: {
      data: manifest.resources.data.map((r) => ({
        ...omitKeys(r, ['name']),
        sha256: hashes.resources.find((h) => h.id === r.id)!.sha256,
      })),
      media: manifest.resources.media.map((r) => ({
        ...omitKeys(r, ['name', 'mimeType', 'width', 'height', 'caption', 'credit', 'at']),
        location:
          r.location.type === 'local'
            ? { ...r.location, sha256: hashes.resources.find((h) => h.id === r.id)!.sha256 }
            : r.location,
      })),
    },
    ...(manifest.extensions ? { extensions: manifest.extensions } : {}),
  };
  const narrative: LoadedProject['narrative'] = {
    id: manifest.id,
    title: manifest.title,
    intent: manifest.intent,
    schemaVersion: '0.1.0',
    basemap: { style: 'neutral' },
    ...(manifest.theme ? { theme: manifest.theme } : {}),
    ...(manifest.layout ? { layout: manifest.layout } : {}),
    dataSources: manifest.resources.data.map((r) => ({
      id: r.id,
      name: r.name ?? r.id,
      kind: r.kind,
      path: r.path,
      profile: omitKeys(profiles[r.id]!, ['attributeStats']),
    })),
    mediaAssets: manifest.resources.media.map((r) => ({
      id: r.id,
      name: r.name ?? r.id,
      kind: r.kind,
      source: r.location.type,
      path: r.location.type === 'local' ? r.location.path : r.location.url,
      ...(r.mimeType ? { mimeType: r.mimeType } : {}),
      ...(r.width ? { width: r.width } : {}),
      ...(r.height ? { height: r.height } : {}),
      ...(r.caption ? { caption: r.caption } : {}),
      ...(r.credit ? { credit: r.credit } : {}),
      ...(r.at ? { location: r.at } : {}),
    })),
    scenes: story.scenes.map((scene) => ({
      ...omitKeys(scene, ['annotations', 'layers', 'motion']),
      content: scene.content ?? {},
      discourse: scene.discourse ?? {
        narrativeRole: 'develop',
        emphasis: 'medium',
        readerAgency: 'guided',
      },
      layers: scene.layers.map((layer) => ({
        ...omitKeys(layer, ['sourceId', 'filter', 'constant']),
        dataSourceId: layer.sourceId,
      })),
    })),
  };
  const design: LoadedProject['design'] = {
    designVersion: '0.1.0',
    sharedScales: story.sharedScales,
    scenes: story.scenes.map((scene) => ({
      sceneId: scene.id,
      annotations: scene.annotations,
      layers: scene.layers.map((layer) => ({
        layerId: layer.id,
        ...(layer.filter ? { filter: layer.filter } : {}),
        ...(layer.constant ? { constant: layer.constant } : {}),
      })),
    })),
  };
  const loaded: LoadedProject = {
    root: projectRoot,
    project: oldProject,
    narrative,
    design,
    dataMap,
    dataBytes,
    resolvedAssets: assets,
    authoredFormat: '0.2.0',
    authoredBasemap: manifest.basemap,
    authoredMotion: {
      ...(manifest.motion ? { story: manifest.motion } : {}),
      ...(manifest.motionPresets ? { presets: manifest.motionPresets } : {}),
      scenes: Object.fromEntries(
        story.scenes.flatMap((scene) => (scene.motion ? [[scene.id, scene.motion]] : [])),
      ),
    },
    input: {
      projectId: manifest.id,
      revision: lock.revision,
      manifestSha256: hashes.manifestSha256,
      narrativeSha256: hashes.storySha256,
      designSha256: hashes.storySha256,
      resources: hashes.resources,
    },
  };
  return validateProject(loaded);
}

/** Record successful compilation after a fresh load and compile. */
export async function recordProjectCompilation(
  root: string,
  compiled: Compiled,
): Promise<Result<LockV2>> {
  const loaded = await loadProjectV2(root);
  if (!loaded.ok) return loaded;
  if (
    !CompiledSchema.safeParse(compiled).success ||
    compiled.contractVersions.project !== '0.2.0' ||
    canonical(compiled.input) !== canonical(loaded.value.input)
  )
    return problem(
      'INPUT_STALE',
      'compiled',
      ['input'],
      'Compilation does not match current project inputs.',
      'Compile the freshly loaded project before recording its inputs.',
    );
  const projectRoot = loaded.value.root;
  const lock = LockV2Schema.parse(
    JSON.parse(await readFile(await existingProjectFile(projectRoot, 'mapbard.lock.json'), 'utf8')),
  );
  const updated = { ...lock, lastCompileInputs: lock.inputs };
  await writeFile(`${projectRoot}/mapbard.lock.json`, `${JSON.stringify(updated, null, 2)}\n`);
  return { ok: true, value: updated, diagnostics: [] };
}
