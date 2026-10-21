import { createServer } from 'node:http';
import { readFileSync, watch } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Command, CommanderError } from 'commander';
import { BASEMAP_PROVIDERS, TERRAIN_PROVIDERS, STAGE1_CAPABILITIES } from '@mapbard/knowledge';
import { projectJsonSchema, storyJsonSchema, type Diagnostic } from '@mapbard/schema';
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

const cliVersion = (
  JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
    version: string;
  }
).version;
type Global = { json?: boolean; limit?: string; project?: string };
const rootOf = (options: Global): string => resolve(options.project ?? '.');
function bounded(value: unknown, limit: number): unknown {
  if (Array.isArray(value)) return value.slice(0, limit).map((item) => bounded(item, limit));
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, bounded(item, limit)]),
    );
  return value;
}
function emit(command: string, outcome: Outcome, options: Global): number {
  const limit = Math.max(1, Math.min(1000, Number(options.limit ?? 100) || 100));
  const ok = !outcome.diagnostics.some((entry) => entry.severity === 'error');
  const envelope = {
    ok,
    command,
    cliVersion,
    diagnostics: outcome.diagnostics.slice(0, limit),
    result: bounded(outcome.result ?? null, limit),
  };
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
  }
  return ok ? 0 : 1;
}
async function preview(root: string, port: number, open: boolean): Promise<Outcome> {
  const output = '.mapbard-preview';
  const rebuilt = await build(root, output, false);
  if (rebuilt.diagnostics.some((entry) => entry.severity === 'error')) return rebuilt;
  const directory = resolve(root, output);
  const clients = new Set<import('node:http').ServerResponse>();
  const server = createServer(async (request, response) => {
    if (request.url === '/__mapbard_events') {
      response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
      clients.add(response);
      request.on('close', () => clients.delete(response));
      return;
    }
    const pathname = decodeURIComponent((request.url ?? '/').split('?')[0]!);
    const file = resolve(directory, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (
      !(file === directory || file.startsWith(`${directory}\\`) || file.startsWith(`${directory}/`))
    ) {
      response.writeHead(403);
      response.end();
      return;
    }
    try {
      let bytes = await readFile(file);
      if (file.endsWith('index.html'))
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
        file.endsWith('.html')
          ? 'text/html'
          : file.endsWith('.js')
            ? 'text/javascript'
            : file.endsWith('.css')
              ? 'text/css'
              : file.endsWith('.json')
                ? 'application/json'
                : 'application/octet-stream',
      );
      response.end(bytes);
    } catch {
      response.writeHead(404);
      response.end();
    }
  });
  await new Promise<void>((ready) => server.listen(port, '127.0.0.1', ready));
  let pending: NodeJS.Timeout | undefined;
  const watcher = watch(root, { recursive: true }, (_event, file) => {
    if (!file || String(file).startsWith(output) || String(file).startsWith('mapbard.lock.json'))
      return;
    clearTimeout(pending);
    pending = setTimeout(async () => {
      const next = await build(root, output, false);
      for (const client of clients)
        client.write(
          `data: ${JSON.stringify({ ok: !next.diagnostics.some((entry) => entry.severity === 'error'), diagnostics: next.diagnostics })}\n\n`,
        );
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
  process.once('SIGINT', () => {
    watcher.close();
    server.close();
  });
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
    .action(
      async (files: string[], local: { id?: string; attribution?: string }, command: Command) => {
        const options = command.optsWithGlobals() as Global;
        await execute('add', options, () =>
          add(rootOf(options), files, local.id, local.attribution),
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
  program.command('check').action(async (_local: unknown, command: Command) => {
    const options = command.optsWithGlobals() as Global;
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
  program.command('capabilities').action((_local: unknown, command: Command) => {
    const options = command.optsWithGlobals() as Global;
    code = emit(
      'capabilities',
      {
        result: {
          techniques: STAGE1_CAPABILITIES.ids,
          basemaps: {
            none: {},
            custom: { required: ['styleUrl', 'attribution'] },
            ...BASEMAP_PROVIDERS,
          },
          terrain: TERRAIN_PROVIDERS,
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
