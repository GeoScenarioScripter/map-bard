import { readFile, mkdir, mkdtemp, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { URL } from 'node:url';
import { parseGeoNarrative, type DataSource, type GeoNarrative } from '@mapbard/schema';
import { sha256 } from './fingerprint.js';
import {
  assertUniquePaths,
  existingProjectFile,
  legacyRelativePath,
  ProjectCollisionError,
  ProjectPathError,
} from './paths.js';
import {
  failure,
  type DataResource,
  type Diagnostic,
  type ImportReport,
  type MediaResource,
  type Project,
  type Result,
} from './types.js';

function dataFeatureIds(
  source: DataSource,
  bytes: Uint8Array,
): {
  basis: DataResource['featureId'];
  assignments: ImportReport['featureIdAssignments'];
} {
  if (source.kind === 'csv')
    return { basis: { method: 'property', property: 'id', scope: 'source' }, assignments: [] };
  const data: unknown = JSON.parse(new TextDecoder().decode(bytes));
  if (!data || typeof data !== 'object' || !('features' in data) || !Array.isArray(data.features))
    throw new Error(`GeoJSON source ${source.id} lacks features.`);
  const features = data.features as unknown[];
  const records = features.map((entry) => {
    if (!entry || typeof entry !== 'object') throw new Error('Malformed feature.');
    return entry as Record<string, unknown>;
  });
  const validKey = (value: unknown): value is string | number =>
    (typeof value === 'string' && value.length > 0) ||
    (typeof value === 'number' && Number.isSafeInteger(value));
  if (
    records.every((feature) => validKey(feature.id)) &&
    new Set(records.map((f) => String(f.id))).size === records.length
  )
    return {
      basis: { method: 'geojson-id', scope: 'source' },
      assignments: records.map((feature, featureIndex) => ({
        sourceId: source.id,
        featureIndex,
        assignedId: String(feature.id),
        basis: 'geojson-id',
      })),
    };
  for (const attribute of source.profile.attributes) {
    const values = records.map((feature) => {
      const props = feature.properties;
      return props && typeof props === 'object' && !Array.isArray(props)
        ? (props as Record<string, unknown>)[attribute.name]
        : undefined;
    });
    if (values.every(validKey) && new Set(values.map(String)).size === values.length)
      return {
        basis: { method: 'property', property: attribute.name, scope: 'source' },
        assignments: values.map((value, featureIndex) => ({
          sourceId: source.id,
          featureIndex,
          assignedId: String(value),
          basis: `property:${attribute.name}`,
        })),
      };
  }
  throw new Error(`GeoJSON source ${source.id} has no stable unique feature ID basis.`);
}

function attributedMedia(
  story: GeoNarrative,
  asset: GeoNarrative['mediaAssets'][number],
): MediaResource['attribution'] {
  return {
    label: asset.credit || asset.name || story.title,
    ...(asset.credit ? { creator: asset.credit } : {}),
  };
}

class ImportReferenceError extends Error {}

function leafPaths(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value))
    return value.flatMap((entry, index) => leafPaths(entry, `${prefix}[${index}]`));
  if (value !== null && typeof value === 'object')
    return Object.entries(value).flatMap(([key, entry]) =>
      leafPaths(entry, prefix ? `${prefix}.${key}` : key),
    );
  return [prefix];
}

function unsupported(story: GeoNarrative): Diagnostic[] {
  const warnings: Diagnostic[] = [];
  for (const source of story.dataSources) {
    if (source.kind === 'csv')
      warnings.push({
        ...failure(
          'CAPABILITY_UNSUPPORTED',
          'data',
          [],
          'Imported CSV is retained but the Stage 1 compiler requires authored GeoJSON.',
          'Add an explicit GeoJSON adaptation before compilation.',
          { sourceId: source.id },
        ),
        severity: 'warning',
      });
  }
  if (story.basemap.style === 'protomaps-light' || story.basemap.pmtilesUrl) {
    warnings.push({
      ...failure(
        'CAPABILITY_UNSUPPORTED',
        'narrative',
        ['basemap'],
        'Imported basemap is not in the Stage 1 compiled player.',
        'Choose a supported local presentation before compilation.',
      ),
      severity: 'warning',
    });
  }
  story.scenes.forEach((scene, index) => {
    scene.layers.forEach((layer, layerIndex) => {
      if (layer.classification?.method === 'quantile')
        warnings.push({
          ...failure(
            'CAPABILITY_UNSUPPORTED',
            'narrative',
            ['scenes', index, 'layers', layerIndex, 'classification'],
            'Imported quantile classification is not supported.',
            'Choose a supported equal-interval classification before compilation.',
          ),
          severity: 'warning',
        });
    });
  });
  return warnings;
}

export async function importLegacyNarrative(
  inputPath: string,
  destinationRoot: string,
  options: { onExisting?: 'error' } = {},
): Promise<Result<ImportReport>> {
  if (options.onExisting && options.onExisting !== 'error')
    return {
      ok: false,
      diagnostics: [
        failure(
          'VALUE_INVALID',
          'project',
          ['onExisting'],
          'Unsupported import overwrite mode.',
          'Use onExisting: error.',
        ),
      ],
    };
  const destination = resolve(destinationRoot);
  try {
    await stat(destination);
    return {
      ok: false,
      diagnostics: [
        failure(
          'ASSET_COLLISION',
          'project',
          [],
          'Destination already exists.',
          'Choose a new destination directory.',
        ),
      ],
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
      return {
        ok: false,
        diagnostics: [
          failure(
            'ASSET_PATH_INVALID',
            'project',
            [],
            'Destination cannot be inspected.',
            'Choose an accessible destination directory.',
          ),
        ],
      };
  }
  let original: Uint8Array;
  let story: GeoNarrative;
  let retainedFields: string[];
  try {
    original = await readFile(inputPath);
    const raw: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(original));
    if (
      !raw ||
      typeof raw !== 'object' ||
      !('schemaVersion' in raw) ||
      raw.schemaVersion !== '0.1.0'
    )
      return {
        ok: false,
        diagnostics: [
          failure(
            'VERSION_UNSUPPORTED',
            'narrative',
            ['schemaVersion'],
            'Unsupported legacy narrative version.',
            'Use an explicit migration for this version.',
          ),
        ],
      };
    story = parseGeoNarrative(raw);
    retainedFields = leafPaths(raw).sort();
  } catch {
    return {
      ok: false,
      diagnostics: [
        failure(
          'VALUE_INVALID',
          'narrative',
          [],
          'Legacy narrative cannot be parsed.',
          'Repair the original narrative before import.',
        ),
      ],
    };
  }
  const sourceRoot = dirname(resolve(inputPath));
  const files: { path: string; bytes: Uint8Array }[] = [];
  const data: DataResource[] = [];
  const media: MediaResource[] = [];
  const assignments: ImportReport['featureIdAssignments'] = [];
  const normalizedPaths: ImportReport['normalizedPaths'] = [];
  try {
    for (const source of story.dataSources) {
      if (source.profile.crs !== 'EPSG:4326') throw new Error(`Unverified CRS for ${source.id}.`);
      const path = legacyRelativePath(source.path);
      const bytes = await readFile(await existingProjectFile(sourceRoot, path));
      const { basis, assignments: assigned } = dataFeatureIds(source, bytes);
      assignments.push(...assigned);
      const attributes: DataResource['attributes'] = source.profile.attributes.map((attribute) => ({
        name: attribute.name,
        observedType: attribute.dataType,
        inferredLevel: attribute.measurement,
        role:
          basis.method === 'property' && basis.property === attribute.name
            ? 'identifier'
            : attribute.dataType === 'number'
              ? 'quantity'
              : 'category',
        level: attribute.measurement,
        unit: null,
      }));
      data.push({
        id: source.id,
        kind: source.kind,
        path,
        sha256: sha256(bytes),
        crs: 'EPSG:4326',
        featureId: basis,
        attributes,
        attribution: {
          label: source.name,
          qualification: 'Imported legacy source; verify measurement units and provenance.',
        },
      });
      files.push({ path, bytes });
      normalizedPaths.push({ resourceId: source.id, from: source.path, to: path });
    }
    for (const asset of story.mediaAssets) {
      if (asset.source === 'url') {
        const remote = new URL(asset.path);
        if (remote.protocol !== 'https:' && remote.protocol !== 'http:')
          throw new Error('Unsupported media URL protocol.');
        media.push({
          id: asset.id,
          kind: asset.kind,
          location: { type: 'url', url: asset.path },
          attribution: attributedMedia(story, asset),
        });
        continue;
      }
      const path = legacyRelativePath(asset.path);
      const bytes = await readFile(await existingProjectFile(sourceRoot, path));
      const posters = asset.poster
        ? story.mediaAssets.filter(
            (other) =>
              other.kind === 'image' && (other.id === asset.poster || other.path === asset.poster),
          )
        : [];
      if (asset.poster && posters.length !== 1)
        throw new ImportReferenceError(`Missing or ambiguous poster for ${asset.id}.`);
      const poster = posters[0];
      media.push({
        id: asset.id,
        kind: asset.kind,
        location: { type: 'local', path, sha256: sha256(bytes) },
        ...(poster ? { posterId: poster.id } : {}),
        attribution: attributedMedia(story, asset),
      });
      files.push({ path, bytes });
      normalizedPaths.push({ resourceId: asset.id, from: asset.path, to: path });
    }
    assertUniquePaths([
      'mapbard.project.json',
      'narrative.geonarrative.json',
      'design.json',
      ...files.map((file) => file.path),
    ]);
  } catch (error) {
    const code: Diagnostic['code'] =
      error instanceof ProjectCollisionError
        ? 'ASSET_COLLISION'
        : error instanceof ProjectPathError
          ? 'ASSET_PATH_INVALID'
          : error instanceof ImportReferenceError
            ? 'REFERENCE_MISSING'
            : (error as NodeJS.ErrnoException).code === 'ENOENT'
              ? 'RESOURCE_MISSING'
              : 'VALUE_INVALID';
    return {
      ok: false,
      diagnostics: [
        failure(
          code,
          'project',
          ['resources'],
          'Legacy resource is missing, unsafe, ambiguous or lacks stable feature IDs.',
          'Repair resource paths, poster references and feature identity before import.',
        ),
      ],
    };
  }
  const project: Project = {
    projectVersion: '0.1.0',
    id: story.id,
    revision: 0,
    artifacts: { narrative: 'narrative.geonarrative.json', design: 'design.json' },
    resources: { data, media },
  };
  const design = { designVersion: '0.1.0', scenes: [], sharedScales: [] };
  let temporary: string;
  try {
    await mkdir(dirname(destination), { recursive: true });
    temporary = await mkdtemp(join(dirname(destination), `.${basename(destination)}-import-`));
  } catch {
    return {
      ok: false,
      diagnostics: [
        failure(
          'ASSET_PATH_INVALID',
          'project',
          [],
          'Import destination cannot be prepared.',
          'Choose a writable project location.',
        ),
      ],
    };
  }
  try {
    for (const file of files) {
      const target = join(temporary, ...file.path.split('/'));
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, file.bytes, { flag: 'wx' });
    }
    await writeFile(join(temporary, 'narrative.geonarrative.json'), original, { flag: 'wx' });
    await writeFile(join(temporary, 'design.json'), `${JSON.stringify(design, null, 2)}\n`, {
      flag: 'wx',
    });
    await writeFile(
      join(temporary, 'mapbard.project.json'),
      `${JSON.stringify(project, null, 2)}\n`,
      { flag: 'wx' },
    );
    await rename(temporary, destination);
  } catch {
    await rm(temporary, { recursive: true, force: true });
    return {
      ok: false,
      diagnostics: [
        failure(
          'ASSET_COLLISION',
          'project',
          [],
          'Import could not write the new destination.',
          'Choose a writable, absent destination directory.',
        ),
      ],
    };
  }
  return {
    ok: true,
    value: {
      projectRoot: destination,
      retainedFields,
      normalizedPaths,
      unsupportedRequests: unsupported(story),
      featureIdAssignments: assignments,
    },
    diagnostics: [],
  };
}
