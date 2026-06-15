import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ingestDataFile, ingestGeoJsonFile } from './index.js';

const EXAMPLES = new URL('../../../../examples/', import.meta.url);
const fixture = (rel: string): string => fileURLToPath(new URL(rel, EXAMPLES));

describe('GeoJSON ingest — polygons with a date attribute', () => {
  it('profiles neighborhoods.geojson exactly', async () => {
    const { dataSource, data } = await ingestGeoJsonFile(fixture('data/neighborhoods.geojson'));
    expect(dataSource.kind).toBe('geojson');
    expect(dataSource.id).toBe('neighborhoods');
    expect(dataSource.name).toBe('neighborhoods.geojson');

    const p = dataSource.profile;
    expect(p.geometryType).toBe('polygon');
    expect(p.featureCount).toBe(2);
    expect(p.crs).toBe('EPSG:4326');
    expect(p.extent).toEqual([-122.412, 37.793, -122.392, 37.807]);
    expect(p.temporalExtent).toEqual(['2019-03-15', '2021-06-01']);

    const byName = Object.fromEntries(p.attributes.map((a) => [a.name, a]));
    expect(byName.name).toMatchObject({ dataType: 'string', measurement: 'nominal' });
    expect(byName.median_income).toMatchObject({ dataType: 'number', measurement: 'ratio' });
    expect(byName.surveyed_on).toMatchObject({ dataType: 'date', measurement: 'interval' });

    expect(data.features).toHaveLength(2);
  });
});

describe('GeoJSON ingest — points', () => {
  it('profiles landmarks.geojson (via the extension dispatcher)', async () => {
    const { dataSource } = await ingestDataFile(fixture('data/landmarks.geojson'));
    const p = dataSource.profile;
    expect(p.geometryType).toBe('point');
    expect(p.featureCount).toBe(3);
    const visitors = p.attributes.find((a) => a.name === 'daily_visitors');
    expect(visitors).toMatchObject({ dataType: 'number', measurement: 'ratio' });
    expect(visitors?.sample).toContain(12000);
  });
});

describe('GeoJSON ingest — errors', () => {
  it('rejects non-FeatureCollection JSON', async () => {
    await expect(
      ingestDataFile(fixture('sf-waterfront.geonarrative.json')),
    ).rejects.toThrow(/FeatureCollection/);
  });
});
