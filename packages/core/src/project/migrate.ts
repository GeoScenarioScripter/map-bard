import { cp, mkdir, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import {
  ProjectV2Schema,
  StoryV2Schema,
  type ProjectV2,
  type Result,
  type StoryV2,
} from '@mapbard/schema';
import { loadProject } from './load.js';
import { refreshProjectLock } from './format-v2.js';
import { existingProjectFile } from './paths.js';
import { failure } from './types.js';

function omitKeys<T extends object, K extends keyof T>(value: T, keys: readonly K[]): Omit<T, K> {
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => !keys.includes(key as K)),
  ) as Omit<T, K>;
}

export type MigrationReport = {
  from: '0.1.0';
  to: '0.2.0';
  source: string;
  destination: string;
  resources: number;
  scenes: number;
  files: string[];
};

/** Copy a checked 0.1 project into a new 0.2 directory. The source is untouched. */
export async function migrateProject(
  source: string,
  destination: string,
): Promise<Result<MigrationReport>> {
  const loaded = await loadProject(source);
  if (!loaded.ok) return loaded;
  const { project, narrative, design } = loaded.value;
  const target = resolve(destination);
  try {
    if ((await readdir(target)).length)
      return {
        ok: false,
        diagnostics: [
          failure(
            'ASSET_COLLISION',
            'project',
            [],
            'Migration destination is not empty.',
            'Choose a new or empty directory.',
          ),
        ],
      };
  } catch {
    /* New destination. */
  }
  if (narrative.basemap.style !== 'neutral' || narrative.basemap.pmtilesUrl)
    return {
      ok: false,
      diagnostics: [
        failure(
          'CAPABILITY_UNSUPPORTED',
          'narrative',
          ['basemap'],
          'This 0.1 basemap cannot be migrated automatically.',
          'Select a supported provider explicitly after migrating the authored source.',
        ),
      ],
    };
  const unsupported = narrative.scenes.flatMap((scene) =>
    scene.layers.filter((layer) => layer.filter).map((layer) => `${scene.id}/${layer.id}`),
  );
  if (unsupported.length)
    return {
      ok: false,
      diagnostics: [
        failure(
          'CAPABILITY_UNSUPPORTED',
          'narrative',
          ['scenes'],
          `Legacy string filters need manual conversion: ${unsupported.join(', ')}.`,
          'Replace them with typed filters before migrating.',
        ),
      ],
    };
  const manifest: ProjectV2 = {
    formatVersion: '0.2.0',
    id: project.id,
    title: narrative.title,
    intent: narrative.intent,
    ...(narrative.theme ? { theme: narrative.theme } : {}),
    basemap: { provider: 'none' },
    resources: {
      data: project.resources.data.map((resource) => ({
        ...omitKeys(resource, ['sha256']),
        name: narrative.dataSources.find((item) => item.id === resource.id)?.name,
      })),
      media: project.resources.media.map(({ location, ...resource }) => {
        const asset = narrative.mediaAssets.find((item) => item.id === resource.id);
        return {
          ...resource,
          location:
            location.type === 'local' ? { type: 'local' as const, path: location.path } : location,
          name: asset?.name,
          mimeType: asset?.mimeType,
          width: asset?.width,
          height: asset?.height,
          caption: asset?.caption,
          credit: asset?.credit,
          at: asset?.location,
        };
      }),
    },
    ...(project.extensions ? { extensions: project.extensions } : {}),
  };
  const story: StoryV2 = {
    formatVersion: '0.2.0',
    scenes: narrative.scenes.map((scene) => {
      const designed = design.scenes.find((item) => item.sceneId === scene.id);
      return {
        id: scene.id,
        title: scene.title,
        narration: scene.narration,
        ...(scene.media ? { media: scene.media } : {}),
        ...(scene.mediaAnchors ? { mediaAnchors: scene.mediaAnchors } : {}),
        content: scene.content,
        discourse: scene.discourse,
        layers: scene.layers.map((layer) => {
          const extra = designed?.layers.find((item) => item.layerId === layer.id);
          return {
            ...omitKeys(layer, ['dataSourceId', 'filter']),
            sourceId: layer.dataSourceId,
            ...(extra?.filter ? { filter: extra.filter } : {}),
            ...(extra?.constant ? { constant: extra.constant } : {}),
          };
        }),
        camera: scene.camera,
        ...(scene.transitionIn ? { transitionIn: scene.transitionIn } : {}),
        annotations: designed?.annotations ?? [],
        ...(scene.controls ? { controls: scene.controls } : {}),
      };
    }),
    sharedScales: design.sharedScales,
    ...(design.extensions ? { extensions: design.extensions } : {}),
  };
  if (!ProjectV2Schema.safeParse(manifest).success || !StoryV2Schema.safeParse(story).success)
    return {
      ok: false,
      diagnostics: [
        failure(
          'VALUE_INVALID',
          'project',
          [],
          'Migration output did not satisfy format 0.2.',
          'Review the source project fields.',
        ),
      ],
    };
  const files = [
    ...project.resources.data.map((r) => r.path),
    ...project.resources.media.flatMap((r) =>
      r.location.type === 'local' ? [r.location.path] : [],
    ),
  ];
  const reserved = new Set([
    'mapbard.json',
    'story.json',
    'mapbard.lock.json',
    'migration-report.json',
    '.gitattributes',
  ]);
  if (files.some((path) => reserved.has(path.toLowerCase())))
    return {
      ok: false,
      diagnostics: [
        failure(
          'ASSET_COLLISION',
          'project',
          ['resources'],
          'A resource path collides with a format 0.2 project file.',
          'Rename the resource before migrating.',
        ),
      ],
    };
  await mkdir(target, { recursive: true });
  for (const path of files) {
    const dest = join(target, path);
    await mkdir(dirname(dest), { recursive: true });
    await cp(await existingProjectFile(loaded.value.root, path), dest);
  }
  await writeFile(join(target, 'mapbard.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(join(target, 'story.json'), `${JSON.stringify(story, null, 2)}\n`);
  await writeFile(
    join(target, '.gitattributes'),
    '* text=auto\n*.json text eol=lf\n*.geojson text eol=lf\n*.csv text eol=lf\n',
  );
  const locked = await refreshProjectLock(target);
  if (!locked.ok) return locked;
  const report: MigrationReport = {
    from: '0.1.0',
    to: '0.2.0',
    source: resolve(source),
    destination: target,
    resources: files.length,
    scenes: story.scenes.length,
    files: [
      'mapbard.json',
      'story.json',
      'mapbard.lock.json',
      '.gitattributes',
      'migration-report.json',
      ...files,
    ],
  };
  await writeFile(join(target, 'migration-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  return { ok: true, value: report, diagnostics: [] };
}
