import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { coerceCell, ingestCsvFile, ingestCsvText, parseCsv } from './index.js';

const EXAMPLES = new URL('../../../../examples/', import.meta.url);
const fixture = (rel: string): string => fileURLToPath(new URL(rel, EXAMPLES));

describe('parseCsv', () => {
  it('handles quotes, escaped quotes, and CRLF', () => {
    const rows = parseCsv('a,b\r\n"x,y","he said ""hi"""\r\n');
    expect(rows).toEqual([
      ['a', 'b'],
      ['x,y', 'he said "hi"'],
    ]);
  });
});

describe('coerceCell', () => {
  it('coerces numbers and booleans but preserves zero-padded codes and blanks', () => {
    expect(coerceCell('42.5')).toBe(42.5);
    expect(coerceCell('-7')).toBe(-7);
    expect(coerceCell('07030')).toBe('07030'); // ZIP-like stays a string
    expect(coerceCell('true')).toBe(true);
    expect(coerceCell('False')).toBe(false);
    expect(coerceCell('  ')).toBeNull();
    expect(coerceCell('S1')).toBe('S1');
  });
});

describe('CSV-with-coordinates ingest', () => {
  it('profiles sensors.csv exactly and builds point features', async () => {
    const { dataSource, data } = await ingestCsvFile(fixture('data/sensors.csv'));
    expect(dataSource.kind).toBe('csv');

    const p = dataSource.profile;
    expect(p.geometryType).toBe('point');
    expect(p.featureCount).toBe(3);
    expect(p.temporalExtent).toEqual(['2019-11-20', '2021-07-02']);

    const byName = Object.fromEntries(p.attributes.map((a) => [a.name, a]));
    // lon/lat became geometry, not attributes
    expect(byName.lon).toBeUndefined();
    expect(byName.lat).toBeUndefined();
    expect(byName.id).toMatchObject({ dataType: 'string', measurement: 'nominal' });
    expect(byName.reading).toMatchObject({ dataType: 'number', measurement: 'ratio' });
    expect(byName.installed_on).toMatchObject({ dataType: 'date', measurement: 'interval' });

    expect(data.features[0]!.geometry).toEqual({ type: 'Point', coordinates: [-122.3933, 37.7955] });
    expect(data.features[0]!.properties).toMatchObject({ id: 'S1', reading: 42.5 });
  });

  it('rejects a CSV with no coordinate columns', () => {
    expect(() => ingestCsvText('name,value\nfoo,1\n')).toThrow(/longitude\/latitude/);
  });
});
