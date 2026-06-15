/**
 * @mapbard/core — the MapBard pipeline (Stage 0 ingest, Stage 1 plan, Stage 2 design).
 * Real implementation lands in later milestones; see docs/phase-a-plan.md.
 *
 * For now this only proves the inward dependency on the schema contract: the
 * `GeoNarrative` type imports and type-checks across the package boundary.
 */
import { parseGeoNarrative, type GeoNarrative } from '@mapbard/schema';

export const packageName = '@mapbard/core';

/** Thin re-export so downstream packages get the validated parse via core too. */
export function loadNarrative(input: unknown): GeoNarrative {
  return parseGeoNarrative(input);
}
