/**
 * @mapbard/core — the MapBard pipeline.
 *
 * Stage 0 (ingest & profile) and Stage 1 (Plan) are implemented, along with the
 * single LLM adapter; Stage 2 (Design) lands in M5. Everything reads/writes the
 * validated `GeoNarrative` contract from `@mapbard/schema` (depend inward,
 * build-guide §10).
 */
import { parseGeoNarrative, type GeoNarrative } from '@mapbard/schema';

export * from './stage0/index.js';
export * from './llm/index.js';
export * from './stage1/index.js';

/** Parse + validate an external object into a `GeoNarrative`. */
export function loadNarrative(input: unknown): GeoNarrative {
  return parseGeoNarrative(input);
}
