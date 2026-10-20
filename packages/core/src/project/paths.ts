import { realpath, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';

export class ProjectPathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProjectPathError';
  }
}

export class ProjectCollisionError extends ProjectPathError {
  constructor(message: string) {
    super(message);
    this.name = 'ProjectCollisionError';
  }
}

export function projectRelativePath(value: string): string {
  if (
    !value ||
    value.includes('\0') ||
    value.includes('\\') ||
    value.startsWith('/') ||
    value.startsWith('//') ||
    isAbsolute(value) ||
    /^[a-z]:/i.test(value) ||
    /^[a-z]+:\/\//i.test(value)
  )
    throw new ProjectPathError(
      'Expected a project-relative path without a drive, URL or backslash.',
    );
  const parts = value.split('/');
  if (parts.some((part) => part === '' || part === '.' || part === '..'))
    throw new ProjectPathError('Project paths cannot contain empty, dot or parent segments.');
  if (parts.some((part) => /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)))
    throw new ProjectPathError('Project path contains a reserved device name.');
  return parts.join('/');
}

export function containedPath(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

export async function existingProjectFile(root: string, authoredPath: string): Promise<string> {
  const rel = projectRelativePath(authoredPath);
  const absoluteRoot = await realpath(root);
  const expected = resolve(absoluteRoot, ...rel.split('/'));
  if (!containedPath(absoluteRoot, expected))
    throw new ProjectPathError('Path leaves project root.');
  const actual = await realpath(expected);
  if (!containedPath(absoluteRoot, actual))
    throw new ProjectPathError('Symlink leaves project root.');
  if (!(await stat(actual)).isFile()) throw new ProjectPathError('Resource is not a regular file.');
  return actual;
}

export function assertUniquePaths(paths: string[]): void {
  const seen = new Set<string>();
  for (const path of paths) {
    const key = projectRelativePath(path).toLowerCase();
    if (seen.has(key)) throw new ProjectCollisionError(`Project paths collide: ${path}`);
    seen.add(key);
  }
}
