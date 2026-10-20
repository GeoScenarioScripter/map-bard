/** Build a compiled story from a portable project using only public package APIs. */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadProject, validateProject, compileProject } from '@mapbard/core';
import { STAGE1_CAPABILITIES } from '@mapbard/knowledge';
import { renderCompiled, writeCompiledBundle } from '@mapbard/renderer';

function expectResult(label, result) {
  if (result.ok) return result.value;
  const details = result.diagnostics
    .map((item) => `${item.code}: ${item.message} ${item.remedy}`)
    .join('\n');
  throw new Error(`${label} failed:\n${details}`);
}

export async function buildCompiledExample(projectRoot, outDir) {
  const loadResult = await loadProject(projectRoot);
  const loaded = expectResult('Load', loadResult);
  const validationResult = validateProject(loaded);
  const validated = expectResult('Validate', validationResult);
  const compileResult = compileProject(validated, STAGE1_CAPABILITIES);
  const compiled = expectResult('Compile', compileResult);

  // Publication gets a fresh snapshot instead of trusting the compile-time view.
  const fresh = expectResult('Reload', await loadProject(projectRoot));
  const current = expectResult('Revalidate', validateProject(fresh));
  const bundle = expectResult(
    'Render',
    renderCompiled(compiled, {
      currentInput: current.input,
      dataBytes: current.dataBytes,
      assets: current.resolvedAssets,
    }),
  );
  const written = expectResult('Publish', await writeCompiledBundle(bundle, outDir));
  return {
    output: resolve(outDir),
    projectId: current.project.id,
    compiledVersion: compiled.compiledVersion,
    compilerVersion: compiled.compilerVersion,
    input: written.input,
    written: written.written,
    requiredNetwork: bundle.requiredNetwork,
    diagnostics: [
      ...loadResult.diagnostics,
      ...validationResult.diagnostics,
      ...compileResult.diagnostics,
    ],
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [, , projectRoot, outDir] = process.argv;
  if (!projectRoot || !outDir) {
    console.error('Usage: node scripts/build-compiled-example.mjs <project-dir> <new-output-dir>');
    process.exitCode = 2;
  } else {
    try {
      console.log(JSON.stringify(await buildCompiledExample(projectRoot, outDir), null, 2));
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  }
}
