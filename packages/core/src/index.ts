/**
 * @mapbard/core — the MapBard pipeline.
 *
 * Project I/O and validation are model-free. Legacy ingestion and optional
 * provider-backed planning remain available; compilation is a later boundary.
 */
import { parseGeoNarrative, type GeoNarrative } from '@mapbard/schema';

export * from './stage0/index.js';
export * from './llm/index.js';
export * from './stage1/index.js';
export { loadProject } from './project/load.js';
export { importLegacyNarrative } from './project/import-legacy.js';
export { validateProject } from '@mapbard/schema';

/** Parse + validate an external object into a `GeoNarrative`. */
export function loadNarrative(input: unknown): GeoNarrative {
  return parseGeoNarrative(input);
}
