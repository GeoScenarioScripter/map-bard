import { createServer } from 'node:http';
import { readFileSync, watch } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { Command, CommanderError, Option } from 'commander';
import { BASEMAP_PROVIDERS, TERRAIN_PROVIDERS, STAGE1_CAPABILITIES } from '@mapbard/knowledge';
import {
  CAMERA_PRESETS,
  COMPILED_TECHNIQUES,
  LAYER_TRACK_PROPERTIES,
  LAYOUT_TEMPLATES,
  MotionModeSchema,
  NAMED_EASINGS,
  projectJsonSchema,
  REDUCED_MOTION_MODES,
  STAGGER_ORDERS,
  storyJsonSchema,
  THEME_PRESETS,
  type Diagnostic,
} from '@mapbard/schema';
import {
  add,
  build,
  initialize,
  installSkill,
  inspect,
  issue,
  migrateProject,
  prepare,
  refreshProjectLock,
  type Outcome,
} from './operations.js';
import { probeBrowser } from './visual/browser.js';
import { NETWORK_MODES, type NetworkMode } from './visual/capture.js';
import { checkVisual, VISUAL_DIRECTORY } from './visual/check.js';
import { GOLDEN_DIRECTORY } from './visual/goldens.js';

export * from './visual/index.js';

const cliVersion = (
  JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
    version: string;
  }
).version;
type Global = { json?: boolean; limit?: string; project?: string };
type CheckFlags = {
  visual?: boolean;
  network: NetworkMode;
  failOnWarnings?: boolean;
  update?: boolean;
  frames?: boolean;
};
const rootOf = (options: Global): string => resolve(options.project ?? '.');
/**
 * Bound list output: diagnostics, a list result and the lists directly inside an object result.
 * Deeper arrays (coordinates, extents, schema `required` lists) are content and stay whole.
 */
function bounded(outcome: Outcome, limit: number) {
  let truncated = outcome.diagnostics.length > limit;
  const cut = <T>(list: T[]): T[] => {
    if (list.length > limit) truncated = true;
    return list.slice(0, limit);
  };
  const result = outcome.result ?? null;
  return {
    diagnostics: outcome.diagnostics.slice(0, limit),
    result: Array.isArray(result)
      ? cut(result)
      : result && typeof result === 'object'
        ? Object.fromEntries(
            Object.entries(result).map(([key, item]) => [
              key,
              Array.isArray(item) ? cut(item) : item,
            ]),
          )
        : result,
    truncated,
  };
}
function emit(command: string, outcome: Outcome, options: Global): number {
  const limit = Math.max(1, Math.min(1000, Number(options.limit ?? 100) || 100));
  const ok = !outcome.diagnostics.some((entry) => entry.severity === 'error');
  const { diagnostics, result, truncated } = bounded(outcome, limit);
  const envelope = { ok, command, cliVersion, diagnostics, result, truncated };
  if (options.json) process.stdout.write(`${JSON.stringify(envelope)}\n`);
  else {
    if (outcome.result !== undefined)
      process.stdout.write(
        `${typeof outcome.result === 'string' ? outcome.result : JSON.stringify(envelope.result, null, 2)}\n`,
      );
    for (const diagnostic of envelope.diagnostics)
      process.stderr.write(
        `${process.stderr.isTTY && !process.env.NO_COLOR ? (diagnostic.severity === 'error' ? '\x1b[31m' : '\x1b[33m') : ''}${diagnostic.severity.toUpperCase()} ${diagnostic.code}${process.stderr.isTTY && !process.env.NO_COLOR ? '\x1b[0m' : ''} ${diagnostic.artifact}:${diagnostic.path.join('.')} ${diagnostic.message} Remedy: ${diagnostic.remedy}\n`,
      );
    if (truncated) process.stderr.write(`Output limited to ${limit} entries; raise --limit.\n`);
  }
  return ok ? 0 : 1;
}
const contentTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.geojson': 'application/geo+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
};
/** Watch events from generated output or VCS metadata do not trigger rebuilds. */
const ignoredChange = (file: string, output: string): boolean => {
  const first = file.split(/[\\/]/)[0]!;
  return (
    // Builds stage into `<output>.next-*`, and the renderer stages that into `.<that>-*`.
    first.startsWith(output) ||
    first.startsWith(`.${output}`) ||
    first === VISUAL_DIRECTORY ||
    first === GOLDEN_DIRECTORY ||
    first === '.git' ||
    first === 'node_modules' ||
    file === 'mapbard.lock.json'
  );
};
async function preview(root: string, port: number, open: boolean): Promise<Outcome> {
  const output = '.mapbard-preview';
  const rebuilt = await build(root, output, false);
  // Without a manifest there is nothing to watch; any other failure is shown in the page.
  if (!(await stat(resolve(root, 'mapbard.json')).catch(() => undefined))) return rebuilt;
  const status = (outcome: Outcome): string =>
    JSON.stringify({
      ok: !outcome.diagnostics.some((entry) => entry.severity === 'error'),
      diagnostics: outcome.diagnostics,
    });
  let latest = rebuilt;
  const directory = resolve(root, output);
  const clients = new Set<import('node:http').ServerResponse>();
  const server = createServer(async (request, response) => {
    if (request.url === '/__mapbard_events') {
      response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
      response.write(': connected\n\n');
      if (latest.diagnostics.some((entry) => entry.severity === 'error'))
        response.write(`data: ${status(latest)}\n\n`);
      clients.add(response);
      request.on('close', () => clients.delete(response));
      return;
    }
    let pathname: string;
    try {
      pathname = decodeURIComponent((request.url ?? '/').split('?')[0]!);
    } catch {
      response.writeHead(400);
      response.end();
      return;
    }
    const file = resolve(directory, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (
      !(file === directory || file.startsWith(`${directory}\\`) || file.startsWith(`${directory}/`))
    ) {
      response.writeHead(403);
      response.end();
      return;
    }
    const index = file === resolve(directory, 'index.html');
    try {
      let bytes = await readFile(file).catch((error: unknown) => {
        if (!index) throw error;
        // No successful build yet: a blank page that carries the diagnostics panel.
        return Buffer.from(
          '<!doctype html><html><head><meta charset="utf-8"><title>MapBard preview</title></head><body></body></html>',
        );
      });
      if (index)
        bytes = Buffer.from(
          bytes
            .toString()
            .replace(
              '</body>',
              '<script>(()=>{let panel;new EventSource("/__mapbard_events").onmessage=(event)=>{const update=JSON.parse(event.data);if(update.ok)location.reload();else{panel??=document.createElement("pre");panel.id="mb-preview-diagnostics";panel.style.cssText="position:fixed;inset:12px;z-index:1000;overflow:auto;background:#fff;color:#900;padding:20px;border:2px solid #900";panel.textContent=update.diagnostics.map(d=>d.code+" "+d.path.join(".")+": "+d.message+" Remedy: "+d.remedy).join("\\n");document.body.append(panel)}}})()</script></body>',
            ),
        );
      response.setHeader(
        'Content-Type',
        contentTypes[extname(file).toLowerCase()] ?? 'application/octet-stream',
      );
      response.setHeader('Cache-Control', 'no-store');
      response.end(bytes);
    } catch {
      response.writeHead(404);
      response.end();
    }
  });
  await new Promise<void>((ready) => server.listen(port, '127.0.0.1', ready));
  let pending: NodeJS.Timeout | undefined;
  // Rebuilds run one at a time: two concurrent builds would race on the output rename.
  let building = Promise.resolve();
  const rebuild = async (): Promise<void> => {
    const next = await build(root, output, false).catch(
      (error: unknown): Outcome => ({
        diagnostics: [
          issue('VALUE_INVALID', 'export', [], String(error), 'Fix the project and save again.'),
        ],
      }),
    );
    latest = next;
    for (const client of clients) client.write(`data: ${status(next)}\n\n`);
  };
  const watcher = watch(root, { recursive: true }, (_event, file) => {
    if (!file || ignoredChange(String(file), output)) return;
    clearTimeout(pending);
    pending = setTimeout(() => {
      building = building.then(rebuild);
    }, 180);
  });
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/`;
  if (open) {
    const { spawn } = await import('node:child_process');
    const command =
      process.platform === 'win32' ? 'cmd' : process.platform === 'darwin' ? 'open' : 'xdg-open';
    const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
    spawn(command, args, { detached: true, stdio: 'ignore', windowsHide: true }).unref();
  }
  // Open live-reload streams would otherwise keep the process alive after Ctrl+C.
  const stop = (): void => {
    clearTimeout(pending);
    watcher.close();
    for (const client of clients) client.end();
    server.close();
    server.closeAllConnections();
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  return { result: { url, directory }, diagnostics: rebuilt.diagnostics };
}

/** Parse arguments and return the documented CLI exit code. */
export async function run(argv: string[] = process.argv): Promise<number> {
  const program = new Command();
  let code = 0;
  const execute = async (
    name: string,
    options: Global,
    work: () => Promise<Outcome>,
  ): Promise<void> => {
    try {
      code = emit(name, await work(), options);
    } catch (error) {
      emit(
        name,
        {
          diagnostics: [
            issue('VALUE_INVALID', 'project', [], String(error), 'Inspect the project and retry.'),
          ],
        },
        options,
      );
      code = 3;
    }
  };
  program
    .name('mapbard')
    .version(cliVersion)
    .option('--json', 'Print a JSON envelope')
    .option('--limit <count>', 'Maximum returned list entries', '100')
    .option('--project <dir>', 'Project directory', '.')
    .exitOverride();
  program.configureOutput({
    writeErr: () => {},
    writeOut: (value) => {
      if (!argv.includes('--json')) process.stdout.write(value);
    },
  });
  program
    .command('init [dir]')
    .option('--template', 'Include starter scene text')
    .action(async (dir: string | undefined, local: { template?: boolean }, command: Command) => {
      const options = command.optsWithGlobals() as Global;
      await execute('init', options, () => initialize(dir ?? '.', Boolean(local.template)));
    });
  program
    .command('add <files...>')
    .option('--id <id>')
    .option('--attribution <text>')
    .option('--feature-id <property>', 'Property holding a unique feature ID')
    .action(
      async (
        files: string[],
        local: { id?: string; attribution?: string; featureId?: string },
        command: Command,
      ) => {
        const options = command.optsWithGlobals() as Global;
        await execute('add', options, () =>
          add(rootOf(options), files, local.id, local.attribution, local.featureId),
        );
      },
    );
  program
    .command('inspect [resourceId]')
    .action(async (id: string | undefined, _local: unknown, command: Command) => {
      const options = command.optsWithGlobals() as Global;
      await execute('inspect', options, () => inspect(rootOf(options), id));
    });
  program.command('lock').action(async (_local: unknown, command: Command) => {
    const options = command.optsWithGlobals() as Global;
    await execute('lock', options, async () => {
      const result = await refreshProjectLock(rootOf(options));
      return {
        result: result.ok
          ? {
              revision: result.value.revision,
              resources: result.value.inputs.resources.length,
              profiles: Object.keys(result.value.profiles).length,
            }
          : undefined,
        diagnostics: result.diagnostics,
      };
    });
  });
  program
    .command('check')
    .option('--visual', 'Build into .mapbard-visual/ and check the story in headless Chromium')
    .addOption(
      new Option('--network <mode>', 'Network for --visual')
        .choices(NETWORK_MODES)
        .default('offline'),
    )
    .option('--fail-on-warnings', 'With --visual, treat visual warnings as errors')
    .option('--update', 'With --visual (offline), rewrite the goldens/ directory from this run')
    .option('--frames', 'With --visual, also sample frame intervals during camera tracks')
    .action(async (local: CheckFlags, command: Command) => {
      const options = command.optsWithGlobals() as Global;
      const visualOnly = command.options
        .filter((option) => option.long !== '--visual')
        .map((option) => option.attributeName())
        .filter((name) => command.getOptionValueSource(name) === 'cli');
      const usage =
        !local.visual && visualOnly.length
          ? '--network, --fail-on-warnings, --update and --frames only apply to visual checks.'
          : local.update && local.network !== 'offline'
            ? 'Goldens come only from offline runs, so --update needs --network offline.'
            : undefined;
      if (usage) {
        emit(
          'check',
          {
            diagnostics: [
              issue(
                'VALUE_INVALID',
                'project',
                [],
                usage,
                local.visual
                  ? 'Drop --network, or drop --update.'
                  : 'Add --visual, or drop those options.',
              ),
            ],
          },
          options,
        );
        code = 2;
        return;
      }
      if (local.visual)
        return execute('check', options, () =>
          checkVisual(rootOf(options), {
            network: local.network,
            failOnWarnings: Boolean(local.failOnWarnings),
            update: Boolean(local.update),
            frames: Boolean(local.frames),
          }),
        );
      await execute('check', options, async () => {
        const result = await prepare(rootOf(options), false, false);
        return {
          result: result.compiled
            ? {
                scenes: result.compiled.scenes.length,
                requiredNetwork: result.compiled.requiredNetwork,
              }
            : undefined,
          diagnostics: result.diagnostics,
        };
      });
    });
  program
    .command('build')
    .option('--out <dir>', 'Output directory', 'out')
    .option('--offline', 'Remove online sources')
    .action(async (local: { out: string; offline?: boolean }, command: Command) => {
      const options = command.optsWithGlobals() as Global;
      await execute('build', options, () =>
        build(rootOf(options), local.out, Boolean(local.offline)),
      );
    });
  program
    .command('preview')
    .option('--port <port>', 'Local port', '0')
    .option('--open', 'Open browser')
    .action(async (local: { port: string; open?: boolean }, command: Command) => {
      const options = command.optsWithGlobals() as Global;
      await execute('preview', options, () =>
        preview(rootOf(options), Number(local.port), Boolean(local.open)),
      );
    });
  program.command('capabilities').action(async (_local: unknown, command: Command) => {
    const options = command.optsWithGlobals() as Global;
    code = emit(
      'capabilities',
      {
        result: {
          capabilities: STAGE1_CAPABILITIES.ids,
          techniques: COMPILED_TECHNIQUES,
          themes: THEME_PRESETS,
          layouts: LAYOUT_TEMPLATES,
          motion: {
            cameraPresets: CAMERA_PRESETS,
            modes: MotionModeSchema.options,
            layerTracks: LAYER_TRACK_PROPERTIES,
            staggerOrders: STAGGER_ORDERS,
            easings: [
              ...NAMED_EASINGS,
              'cubic-bezier(x1, y1, x2, y2)',
              'spring(stiffness, damping)',
            ],
            reducedMotion: REDUCED_MOTION_MODES,
          },
          basemaps: {
            none: {},
            custom: { required: ['styleUrl', 'attribution'] },
            ...BASEMAP_PROVIDERS,
          },
          terrain: TERRAIN_PROVIDERS,
          visual: { ...(await probeBrowser()), networks: NETWORK_MODES },
          versions: { cli: cliVersion, format: '0.2.0' },
        },
        diagnostics: [],
      },
      options,
    );
  });
  program
    .command('schema [file]')
    .action((file: string | undefined, _local: unknown, command: Command) => {
      const options = command.optsWithGlobals() as Global;
      code = emit(
        'schema',
        {
          result: file === 'story.json' ? storyJsonSchema() : projectJsonSchema(),
          diagnostics:
            file && !['story.json', 'mapbard.json'].includes(file)
              ? [
                  issue(
                    'VALUE_INVALID',
                    'project',
                    [file],
                    'Unknown schema file.',
                    'Use mapbard.json or story.json.',
                  ),
                ]
              : [],
        },
        options,
      );
    });
  program
    .command('migrate <src> <dest>')
    .action(async (src: string, dest: string, _local: unknown, command: Command) => {
      const options = command.optsWithGlobals() as Global;
      await execute('migrate', options, async () => {
        const result = await migrateProject(src, dest);
        return { result: result.ok ? result.value : undefined, diagnostics: result.diagnostics };
      });
    });
  program
    .command('skill')
    .command('install')
    .option('--claude')
    .option('--codex')
    .action(async (local: { claude?: boolean; codex?: boolean }, command: Command) => {
      const options = command.optsWithGlobals() as Global;
      await execute('skill install', options, () =>
        installSkill(rootOf(options), local.claude ? 'claude' : local.codex ? 'codex' : 'project'),
      );
    });
  try {
    await program.parseAsync(argv);
    return code;
  } catch (error) {
    if (
      error instanceof CommanderError &&
      (error.code === 'commander.helpDisplayed' || error.code === 'commander.version')
    ) {
      if (argv.includes('--json'))
        emit(
          error.code === 'commander.version' ? 'version' : 'help',
          {
            result: error.code === 'commander.version' ? cliVersion : program.helpInformation(),
            diagnostics: [],
          },
          { json: true },
        );
      return 0;
    }
    const diagnostic: Diagnostic = issue(
      'VALUE_INVALID',
      'project',
      [],
      error instanceof CommanderError ? error.message : String(error),
      'Run mapbard --help for usage.',
    );
    emit(
      program.args[0] ?? 'usage',
      { diagnostics: [diagnostic] },
      { json: argv.includes('--json') },
    );
    return error instanceof CommanderError ? 2 : 3;
  }
}
