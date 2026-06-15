/**
 * Stage 0 — Ingest & profile (no LLM). Parses vector sources into a correct
 * `DataProfile` and registers media into `MediaAsset[]`. This grounds every
 * downstream stage, so it is tested thoroughly.
 */
import { extname } from 'node:path';
import { ingestGeoJsonFile, type SourceMeta } from './geojson.js';
import { ingestCsvFile } from './csv.js';
import type { IngestedSource } from './ingest-types.js';

/** Ingest a data file, dispatching on extension (.geojson/.json vs .csv). */
export async function ingestDataFile(path: string, meta: SourceMeta = {}): Promise<IngestedSource> {
  const ext = extname(path).toLowerCase();
  if (ext === '.geojson' || ext === '.json') return ingestGeoJsonFile(path, meta);
  if (ext === '.csv') return ingestCsvFile(path, meta);
  throw new Error(`unrecognized data file type "${ext || path}" (expected .geojson or .csv)`);
}

export { ingestGeoJsonFile, ingestGeoJsonText, type SourceMeta } from './geojson.js';
export { ingestCsvFile, ingestCsvText, parseCsv, coerceCell } from './csv.js';
export {
  profileFeatureCollection,
  profileAttributes,
  detectGeometryType,
  computeExtent,
  isDateLike,
} from './profile.js';
export { registerMedia, registerMediaInputs, classifyMedia, type MediaInput } from './media.js';
export { sniffImageSize, type ImageSize } from './image-size.js';
export { slugify, type IngestedSource } from './ingest-types.js';
export type {
  GeoJsonFeature,
  GeoJsonFeatureCollection,
  GeoJsonGeometry,
  Cell,
} from './geojson-types.js';
