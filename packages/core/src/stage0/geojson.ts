/**
 * GeoJSON ingest: parse → validate shape → profile → `IngestedSource`.
 * No LLM. The raw FeatureCollection is returned alongside the profile so the
 * renderer can embed it.
 */
import { basename } from 'node:path';
import { readFile } from 'node:fs/promises';
import type { DataSource } from '@mapbard/schema';
import type { GeoJsonFeatureCollection } from './geojson-types.js';
import { profileFeatureCollection } from './profile.js';
import { slugify, type IngestedSource } from './ingest-types.js';

export interface SourceMeta {
  /** DataSource id; defaults to a slug of the file name. */
  id?: string;
  /** Human name; defaults to the file name. */
  name?: string;
  /** Stored on the DataSource; defaults to the given file path. */
  path?: string;
}

function asFeatureCollection(parsed: unknown): GeoJsonFeatureCollection {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('GeoJSON: not an object');
  }
  const obj = parsed as { type?: unknown; features?: unknown };
  if (obj.type !== 'FeatureCollection' || !Array.isArray(obj.features)) {
    throw new Error('GeoJSON: expected a FeatureCollection with a features array');
  }
  return parsed as GeoJsonFeatureCollection;
}

/** Ingest GeoJSON from raw text (no fs). */
export function ingestGeoJsonText(text: string, meta: SourceMeta = {}): IngestedSource {
  const fc = asFeatureCollection(JSON.parse(text));
  const name = meta.name ?? (meta.path ? basename(meta.path) : 'data.geojson');
  const dataSource: DataSource = {
    id: meta.id ?? slugify(name),
    name,
    kind: 'geojson',
    path: meta.path ?? name,
    profile: profileFeatureCollection(fc),
  };
  return { dataSource, data: fc };
}

/** Ingest a GeoJSON file from disk. */
export async function ingestGeoJsonFile(path: string, meta: SourceMeta = {}): Promise<IngestedSource> {
  const text = await readFile(path, 'utf8');
  return ingestGeoJsonText(text, { name: basename(path), ...meta, path: meta.path ?? path });
}
