/** Build the real-source Stage 1 example using public package APIs only. */
import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadProject, validateProject, compileProject } from '@mapbard/core';
import { STAGE1_CAPABILITIES } from '@mapbard/knowledge';
import { renderCompiled, writeCompiledBundle } from '@mapbard/renderer';

const defaultProject = fileURLToPath(new URL('../projects/first-slice/', import.meta.url));

function expect(label, result, diagnostics) {
  diagnostics.push(...result.diagnostics);
  if (result.ok) return result.value;
  throw new Error(
    `${label} failed:\n${result.diagnostics
      .map(
        (item) =>
          `${item.code} ${item.artifact}:${item.path.join('.')} ${item.message} Remedy: ${item.remedy}`,
      )
      .join('\n')}`,
  );
}

function digest(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

export async function buildFirstSlice(outDir, projectRoot = defaultProject) {
  const started = performance.now();
  const diagnostics = [];
  const loaded = expect('Load', await loadProject(projectRoot), diagnostics);
  const validated = expect('Validate', validateProject(loaded), diagnostics);
  const compiled = expect('Compile', compileProject(validated, STAGE1_CAPABILITIES), diagnostics);
  const fresh = expect('Reload', await loadProject(projectRoot), diagnostics);
  const current = expect('Revalidate', validateProject(fresh), diagnostics);
  const bundle = expect(
    'Render',
    renderCompiled(compiled, {
      currentInput: current.input,
      dataBytes: current.dataBytes,
      assets: current.resolvedAssets,
    }),
    diagnostics,
  );
  const published = expect('Publish', await writeCompiledBundle(bundle, outDir), diagnostics);
  const files = await Promise.all(
    published.written.sort().map(async (path) => ({
      path,
      sha256: digest(await readFile(join(outDir, path))),
    })),
  );
  const record = {
    recordVersion: 1,
    operation: 'load → validate → compile → reload → render → publish',
    result: 'pass',
    projectId: compiled.id,
    input: published.input,
    versions: {
      project: compiled.contractVersions.project,
      narrative: compiled.contractVersions.narrative,
      design: compiled.contractVersions.design,
      compiled: compiled.compiledVersion,
      compiler: compiled.compilerVersion,
      runtimeAssetSha256: files.find((file) => file.path === 'player.js')?.sha256,
    },
    compiledSha256: digest(Buffer.from(JSON.stringify(compiled))),
    diagnostics: diagnostics.map(({ code, severity, artifact, path, ids }) => ({
      code,
      severity,
      artifact,
      path,
      ids,
    })),
    output: files,
    requiredNetwork: bundle.requiredNetwork,
    limitations: [
      'Browser, relocation, accessibility and visual acceptance are recorded separately from generation.',
      'Two station-day snapshots do not establish a trend, cause or reach water balance.',
    ],
    model: 'not applicable',
  };
  const output = resolve(outDir);
  await writeFile(join(output, 'verification.json'), `${JSON.stringify(record, null, 2)}\n`);
  await writeFile(
    join(output, 'verification-environment.json'),
    `${JSON.stringify({ elapsedMs: Math.round(performance.now() - started), node: process.version, platform: process.platform, arch: process.arch }, null, 2)}\n`,
  );
  return { output, verification: join(output, 'verification.json'), record };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const outDir = process.argv[2];
  const projectRoot = process.argv[3] ?? defaultProject;
  if (!outDir) {
    console.error(
      'Usage: node examples/scripts/build-first-slice.mjs <new-output-dir> [project-dir]',
    );
    process.exitCode = 2;
  } else {
    try {
      const result = await buildFirstSlice(outDir, projectRoot);
      console.log(
        JSON.stringify(
          {
            output: result.output,
            verification: result.verification,
            requiredNetwork: result.record.requiredNetwork,
            files: result.record.output.length,
            diagnostics: result.record.diagnostics,
          },
          null,
          2,
        ),
      );
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  }
}
