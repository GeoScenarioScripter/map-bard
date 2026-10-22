/**
 * @mapbard/core — the MapBard pipeline.
 *
 * Project I/O, profiling, validation and compilation are model-free.
 */
import { parseGeoNarrative, type GeoNarrative } from '@mapbard/schema';

export * from './inspect/index.js';
export { loadProject } from './project/load.js';
export {
  loadProjectV2,
  refreshProjectLock,
  recordProjectCompilation,
} from './project/format-v2.js';
export { migrateProject } from './project/migrate.js';
export { validateProject } from '@mapbard/schema';
export { compileProject, COMPILER_VERSION } from './compile/compile.js';
export { critiqueProject } from './compile/critique.js';
export { POINT_SYMBOL_RADIUS, POINT_SYMBOL_STROKE, pointSymbolRadius } from './compile/callouts.js';

/** Parse + validate an external object into a `GeoNarrative`. */
export function loadNarrative(input: unknown): GeoNarrative {
  return parseGeoNarrative(input);
}
