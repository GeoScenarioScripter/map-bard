import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { access, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { URL, fileURLToPath } from 'node:url';
import { test } from 'node:test';

const repository = fileURLToPath(new URL('../', import.meta.url));
const packages = ['schema', 'knowledge', 'core', 'renderer', 'cli'];

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      shell: process.platform === 'win32',
      env: { ...process.env, npm_config_update_notifier: 'false' },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (data) => (stdout += data));
    child.stderr.on('data', (data) => (stderr += data));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`${command} ${args.join(' ')} exited ${code}\n${stdout}\n${stderr}`));
    });
  });
}

test(
  'packed packages install and publish a story outside the workspace',
  { timeout: 300000 },
  async () => {
    const scratch = await mkdtemp(join(tmpdir(), 'mapbard-pack-'));
    try {
      const tarballs = join(scratch, 'tarballs');
      const consumer = join(scratch, 'consumer');
      await mkdir(tarballs);
      await mkdir(consumer);
      const archives = [];
      for (const name of packages) {
        const before = new Set(await readdir(tarballs));
        await run(
          'corepack',
          ['pnpm', 'pack', '--pack-destination', tarballs],
          join(repository, 'packages', name),
        );
        const created = (await readdir(tarballs)).filter(
          (file) => file.endsWith('.tgz') && !before.has(file),
        );
        assert.equal(created.length, 1, `${name} should produce one tarball`);
        archives.push(join(tarballs, created[0]));
      }
      await writeFile(join(consumer, 'package.json'), '{"private":true,"type":"module"}\n');
      await run(
        'npm',
        ['install', '--no-audit', '--no-fund', '--package-lock=false', ...archives],
        consumer,
      );

      const installed = join(consumer, 'node_modules');
      for (const name of ['mapbard', ...packages.slice(0, -1).map((item) => `@mapbard/${item}`)]) {
        await access(join(installed, name, 'LICENSE'));
        await access(join(installed, name, 'README.md'));
        const manifest = JSON.parse(await readFile(join(installed, name, 'package.json'), 'utf8'));
        assert.equal(manifest.version, '0.1.0');
        assert(
          !Object.values(manifest.dependencies ?? {}).some((value) =>
            value.startsWith('workspace:'),
          ),
        );
      }
      await access(join(installed, 'mapbard', 'dist', 'skill', 'SKILL.md'));
      await access(join(installed, '@mapbard', 'renderer', 'dist', 'player', 'player.js'));
      await access(join(installed, '@mapbard', 'renderer', 'dist', 'vendor', 'maplibre-gl.js'));
      await access(join(installed, '@mapbard', 'renderer', 'runtime', 'style.css'));

      const binary = join(installed, 'mapbard', 'dist', 'bin.js');
      const project = join(consumer, 'story');
      const init = JSON.parse(
        await run(process.execPath, [binary, '--json', 'init', project], consumer),
      );
      assert.equal(init.ok, true, JSON.stringify(init.diagnostics));
      const build = JSON.parse(
        await run(
          process.execPath,
          [binary, '--project', project, '--json', 'build', '--offline'],
          consumer,
        ),
      );
      assert.equal(build.ok, true, JSON.stringify(build.diagnostics));
      assert.equal(build.cliVersion, '0.1.0');
      await access(join(project, 'out', 'index.html'));
      const verification = JSON.parse(
        await readFile(join(project, 'out', 'verification.json'), 'utf8'),
      );
      assert.deepEqual(verification.requiredNetwork, []);
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  },
);
