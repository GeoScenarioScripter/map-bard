/** Shared types for Stage 0 ingest. */
import type { DataSource } from '@mapbard/schema';
import type { GeoJsonFeatureCollection } from './geojson-types.js';

/**
 * The result of ingesting one data file: the schema `DataSource` (with its
 * filled `profile`) plus the raw FeatureCollection the renderer will embed.
 */
export interface IngestedSource {
  dataSource: DataSource;
  data: GeoJsonFeatureCollection;
}

/** A 2-char-min slug derived from a file name, used for ids. */
export function slugify(input: string): string {
  const s = input
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || 'source';
}
