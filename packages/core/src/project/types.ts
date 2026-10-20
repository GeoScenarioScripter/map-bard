import type { Diagnostic } from '@mapbard/schema';

export type {
  DataResource,
  Design,
  Diagnostic,
  InputSnapshot,
  JsonValue,
  LoadedProject,
  MediaResource,
  Project,
  Result,
} from '@mapbard/schema';
export function failure(
  code: Diagnostic['code'],
  artifact: Diagnostic['artifact'],
  path: Diagnostic['path'],
  message: string,
  remedy: string,
  ids: Diagnostic['ids'] = {},
): Diagnostic {
  return { code, severity: 'error', artifact, path, ids, message, remedy };
}
