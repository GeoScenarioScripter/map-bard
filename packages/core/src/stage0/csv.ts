/**
 * CSV-with-coordinates ingest: parse → detect lon/lat columns → build point
 * features → profile (same path as GeoJSON). No LLM, no deps.
 */
import { basename } from 'node:path';
import { readFile } from 'node:fs/promises';
import type { DataSource } from '@mapbard/schema';
import type { Cell, GeoJsonFeature, GeoJsonFeatureCollection } from './geojson-types.js';
import { profileFeatureCollection } from './profile.js';
import { slugify, type IngestedSource } from './ingest-types.js';
import type { SourceMeta } from './geojson.js';

const NUMERIC = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?$/;
const LON_NAMES = new Set(['lon', 'lng', 'long', 'longitude', 'x']);
const LAT_NAMES = new Set(['lat', 'latitude', 'y']);

/** Minimal RFC-4180-ish CSV parser: quotes, escaped quotes, CRLF/LF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  const endField = (): void => {
    row.push(field);
    field = '';
  };
  const endRow = (): void => {
    endField();
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
    } else if (ch === ',') {
      endField();
      i++;
    } else if (ch === '\r') {
      i++;
    } else if (ch === '\n') {
      endRow();
      i++;
    } else {
      field += ch;
      i++;
    }
  }
  if (field.length > 0 || row.length > 0) endRow();
  // drop fully-empty trailing rows
  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}

/** Coerce a raw CSV string into a typed cell (date-like strings stay strings). */
export function coerceCell(raw: string): Cell {
  const v = raw.trim();
  if (v === '') return null;
  if (NUMERIC.test(v)) return Number(v);
  const lower = v.toLowerCase();
  if (lower === 'true') return true;
  if (lower === 'false') return false;
  return v;
}

function findColumn(headers: string[], names: Set<string>): number {
  for (let i = 0; i < headers.length; i++) {
    if (names.has(headers[i]!.trim().toLowerCase())) return i;
  }
  return -1;
}

/** Ingest CSV-with-coordinates from raw text (no fs). */
export function ingestCsvText(text: string, meta: SourceMeta = {}): IngestedSource {
  const table = parseCsv(text);
  if (table.length < 1) throw new Error('CSV: empty file');
  const headers = table[0]!.map((h) => h.trim());
  const lonIdx = findColumn(headers, LON_NAMES);
  const latIdx = findColumn(headers, LAT_NAMES);
  if (lonIdx < 0 || latIdx < 0) {
    throw new Error('CSV: could not find longitude/latitude columns (lon/lng/x and lat/y)');
  }

  const features: GeoJsonFeature[] = [];
  for (let r = 1; r < table.length; r++) {
    const cells = table[r]!;
    const lon = Number(cells[lonIdx]);
    const lat = Number(cells[latIdx]);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue; // skip un-geocodable rows
    const properties: Record<string, Cell> = {};
    for (let c = 0; c < headers.length; c++) {
      if (c === lonIdx || c === latIdx) continue;
      properties[headers[c]!] = coerceCell(cells[c] ?? '');
    }
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lon, lat] },
      properties,
    });
  }

  const fc: GeoJsonFeatureCollection = { type: 'FeatureCollection', features };
  const name = meta.name ?? (meta.path ? basename(meta.path) : 'data.csv');
  const dataSource: DataSource = {
    id: meta.id ?? slugify(name),
    name,
    kind: 'csv',
    path: meta.path ?? name,
    profile: profileFeatureCollection(fc),
  };
  return { dataSource, data: fc };
}

/** Ingest a CSV file from disk. */
export async function ingestCsvFile(path: string, meta: SourceMeta = {}): Promise<IngestedSource> {
  const text = await readFile(path, 'utf8');
  return ingestCsvText(text, { name: basename(path), ...meta, path: meta.path ?? path });
}
