/**
 * @mapbard/core — the MapBard pipeline.
 *
 * Stage 0 (ingest & profile) is implemented; Stages 1–2 (plan, design) land in
 * later milestones. Everything reads/writes the validated `GeoNarrative`
 * contract from `@mapbard/schema` (depend inward, build-guide §10).
 */
import { parseGeoNarrative, type GeoNarrative } from '@mapbard/schema';

export * from './stage0/index.js';

/** Parse + validate an external object into a `GeoNarrative`. */
export function loadNarrative(input: unknown): GeoNarrative {
  return parseGeoNarrative(input);
}
