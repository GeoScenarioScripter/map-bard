import { readFile, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { extname } from 'node:path';
import { parseProject, parseProjectArtifacts } from '@mapbard/schema';
import { inputSnapshot, sha256 } from './fingerprint.js';
import { loadProjectV2 } from './format-v2.js';
import {
  assertUniquePaths,
  existingProjectFile,
  ProjectCollisionError,
  ProjectPathError,
} from './paths.js';
import {
  failure,
  type Diagnostic,
  type JsonValue,
  type LoadedProject,
  type Project,
  type Result,
} from './types.js';

function decode(bytes: Uint8Array): unknown {
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

export async function loadProject(root: string): Promise<Result<LoadedProject>> {
  try {
    await readFile(await existingProjectFile(await realpath(root), 'mapbard.json'));
    return loadProjectV2(root);
  } catch {
    /* Legacy 0.1 projects remain readable for migration. */
  }
  const diagnostics: Diagnostic[] = [];
  let projectRoot: string;
  try {
    projectRoot = await realpath(root);
  } catch {
    return {
      ok: false,
      diagnostics: [
        failure(
          'RESOURCE_MISSING',
          'project',
          [],
          'Project directory is missing.',
          'Choose an existing project directory.',
        ),
      ],
    };
  }
  let manifestBytes: Uint8Array;
  let project: Project;
  try {
    manifestBytes = await readFile(await existingProjectFile(projectRoot, 'mapbard.project.json'));
    const raw: unknown = decode(manifestBytes);
    const parsed = parseProject(raw);
    if (!parsed.ok) return parsed;
    project = parsed.value;
  } catch (error) {
    return {
      ok: false,
      diagnostics: [
        failure(
          error instanceof ProjectPathError ? 'ASSET_PATH_INVALID' : 'RESOURCE_MISSING',
          'project',
          [],
          'Project manifest cannot be read or parsed.',
          'Provide a valid mapbard.project.json inside the project directory.',
        ),
      ],
    };
  }
  try {
    assertUniquePaths([
      'mapbard.project.json',
      project.artifacts.narrative,
      project.artifacts.design,
      ...project.resources.data.map((resource) => resource.path),
      ...project.resources.media.flatMap((resource) =>
        resource.location.type === 'local' ? [resource.location.path] : [],
      ),
    ]);
  } catch (error) {
    return {
      ok: false,
      diagnostics: [
        failure(
          error instanceof ProjectCollisionError ? 'ASSET_COLLISION' : 'ASSET_PATH_INVALID',
          'project',
          ['resources'],
          'Project paths are invalid or collide.',
          'Use distinct project-relative paths.',
        ),
      ],
    };
  }

  async function readResource(
    path: string,
    artifact: Diagnostic['artifact'],
    fieldPath: (string | number)[],
    expectedHash?: string,
    ids: Diagnostic['ids'] = {},
  ): Promise<Uint8Array | undefined> {
    let bytes: Uint8Array;
    try {
      bytes = await readFile(await existingProjectFile(projectRoot, path));
    } catch (error) {
      diagnostics.push(
        failure(
          error instanceof ProjectPathError ? 'ASSET_PATH_INVALID' : 'RESOURCE_MISSING',
          artifact,
          fieldPath,
          error instanceof ProjectPathError
            ? 'Resource path escapes the project or is invalid.'
            : 'Required resource is missing.',
          'Keep a regular resource file inside the project at the declared relative path.',
          ids,
        ),
      );
      return undefined;
    }
    if (expectedHash && sha256(bytes) !== expectedHash) {
      diagnostics.push(
        failure(
          'RESOURCE_HASH_MISMATCH',
          artifact,
          fieldPath,
          'Resource bytes differ from the manifest digest.',
          'Review the changed file and update the manifest digest deliberately.',
          ids,
        ),
      );
      return undefined;
    }
    return bytes;
  }

  const narrativeBytes = await readResource(project.artifacts.narrative, 'narrative', [
    'artifacts',
    'narrative',
  ]);
  const designBytes = await readResource(project.artifacts.design, 'design', [
    'artifacts',
    'design',
  ]);
  if (!narrativeBytes || !designBytes) return { ok: false, diagnostics };
  let rawNarrative: unknown;
  let rawDesign: unknown;
  try {
    rawNarrative = decode(narrativeBytes);
    rawDesign = decode(designBytes);
  } catch {
    return {
      ok: false,
      diagnostics: [
        failure(
          'VALUE_INVALID',
          'narrative',
          [],
          'Narrative or design is not valid JSON.',
          'Repair the authored artifact; loading never changes its bytes.',
        ),
      ],
    };
  }
  const artifacts = parseProjectArtifacts({ project, narrative: rawNarrative, design: rawDesign });
  if (!artifacts.ok) return artifacts;
  const { narrative, design } = artifacts.value;

  const dataMap: Record<string, JsonValue> = {};
  const dataBytes: LoadedProject['dataBytes'] = [];
  const resolvedAssets: LoadedProject['resolvedAssets'] = [];
  for (const [index, resource] of project.resources.data.entries()) {
    const bytes = await readResource(
      resource.path,
      'data',
      ['resources', 'data', index, 'path'],
      resource.sha256,
      { sourceId: resource.id },
    );
    if (!bytes) continue;
    try {
      dataMap[resource.id] =
        resource.kind === 'geojson'
          ? (decode(bytes) as JsonValue)
          : new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      dataBytes.push({ id: resource.id, bytes });
    } catch {
      diagnostics.push(
        failure(
          'VALUE_INVALID',
          'data',
          ['resources', 'data', index],
          'Data resource is not valid for its declared kind.',
          'Repair the resource or declaration.',
          { sourceId: resource.id },
        ),
      );
    }
  }
  for (const [index, resource] of project.resources.media.entries()) {
    if (resource.location.type !== 'local') continue;
    const bytes = await readResource(
      resource.location.path,
      'media',
      ['resources', 'media', index, 'location', 'path'],
      resource.location.sha256,
      { assetId: resource.id },
    );
    if (!bytes) continue;
    resolvedAssets.push({
      id: resource.id,
      sourcePath: await existingProjectFile(projectRoot, resource.location.path),
      projectRoot,
      bundlePath: `media/${createHash('sha256').update(resource.id).digest('hex')}${extname(resource.location.path).toLowerCase()}`,
      sha256: resource.location.sha256,
    });
  }
  if (diagnostics.length) return { ok: false, diagnostics };
  return {
    ok: true,
    value: {
      root: projectRoot,
      project,
      narrative,
      design,
      dataMap,
      dataBytes,
      resolvedAssets,
      input: inputSnapshot(project, manifestBytes, narrativeBytes, designBytes),
    },
    diagnostics: [],
  };
}
