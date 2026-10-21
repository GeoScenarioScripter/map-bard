// Run package tests with the pnpm that started this script, not whichever pnpm is on PATH.
// Under `corepack pnpm`, a different global pnpm would otherwise refuse the pinned version.
import { spawnSync } from 'node:child_process';

const pnpm = process.env.npm_execpath;
const steps = [
  pnpm && /\.c?js$/.test(pnpm)
    ? [process.execPath, [pnpm, '-r', 'test']]
    : [pnpm ?? 'pnpm', ['-r', 'test']],
  [process.execPath, ['node_modules/vitest/vitest.mjs', 'run', 'tests/g3.integration.test.mjs']],
  [process.execPath, ['tests/browser.smoke.mjs']],
];
for (const [command, args] of steps) {
  const { status, error } = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32' && command !== process.execPath,
  });
  if (error) throw error;
  if (status !== 0) process.exit(status ?? 1);
}
