import { createHash } from 'node:crypto';
import type { InputSnapshot, Project } from './types.js';

export function sha256(bytes: Uint8Array): string {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

export function inputSnapshot(
  project: Project,
  manifestBytes: Uint8Array,
  narrativeBytes: Uint8Array,
  designBytes: Uint8Array,
): InputSnapshot {
  const resources = [
    ...project.resources.data.map(({ id, sha256: hash }) => ({ id, sha256: hash })),
    ...project.resources.media.flatMap(({ id, location }) =>
      location.type === 'local' ? [{ id, sha256: location.sha256 }] : [],
    ),
  ].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return {
    projectId: project.id,
    revision: project.revision,
    narrativeSha256: sha256(narrativeBytes),
    designSha256: sha256(designBytes),
    manifestSha256: sha256(manifestBytes),
    resources,
  };
}
