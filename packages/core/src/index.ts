/**
 * @mapbard/core — the MapBard pipeline.
 *
 * Project I/O, profiling, validation and compilation are model-free.
 */
import { parseGeoNarrative, type GeoNarrative } from '@mapbard/schema';

export * from './inspect/index.js';
export { loadProject } from './project/load.js';
export { validateProject } from '@mapbard/schema';
export { compileProject, COMPILER_VERSION } from './compile/compile.js';

/** Parse + validate an external object into a `GeoNarrative`. */
export function loadNarrative(input: unknown): GeoNarrative {
  return parseGeoNarrative(input);
}
