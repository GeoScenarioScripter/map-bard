import { rm } from 'node:fs/promises';

const packageName = process.argv[2];
if (!['core', 'renderer'].includes(packageName)) {
  throw new Error('Expected core or renderer package name.');
}

await rm(new URL(`../packages/${packageName}/dist/`, import.meta.url), {
  recursive: true,
  force: true,
});
