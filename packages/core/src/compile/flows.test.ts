import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { STAGE1_CAPABILITIES } from '@mapbard/knowledge';
import type { Compiled, ValidatedProject } from '@mapbard/schema';
import { loadProject } from '../project/load.js';
import { compileProject } from './compile.js';
import { tripClock, utcClock } from './flows.js';

const fixtureRoot = resolve(process.cwd(), '../../fixtures/two-period');

type Geometry = { type: string; coordinates: unknown };

/**
 * The two-period fixture in format 0.2 with scene a's layer redrawn as a flow technique over
 * replaced geometry (and properties) for period-a's seven features, p1 to p7.
 */
async function flowFixture(
  technique: 'arc' | 'trip',
  geometry: (index: number) => Geometry,
  properties: (index: number) => Record<string, unknown> = () => ({}),
): Promise<ValidatedProject> {
  const loaded = await loadProject(fixtureRoot);
  if (!loaded.ok) throw new Error(JSON.stringify(loaded.diagnostics));
  const project = loaded.value;
  project.authoredFormat = '0.2.0';
  const data = project.dataMap['period-a'] as { features: Record<string, unknown>[] };
  data.features = data.features.map((feature, index) => ({
    ...feature,
    geometry: geometry(index),
    properties: { ...(feature.properties as object), ...properties(index) },
  }));
  // The compiler checks the data map against its fingerprinted bytes, so refresh both.
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  const sha256 = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
  project.dataBytes = project.dataBytes.map((entry) =>
    entry.id === 'period-a' ? { id: entry.id, bytes } : entry,
  );
  project.project.resources.data[0]!.sha256 = sha256;
  project.input.resources = project.input.resources.map((entry) =>
    entry.id === 'period-a' ? { ...entry, sha256 } : entry,
  );
  const scene = project.narrative.scenes[0]!;
  scene.controls = [];
  scene.layers[0]!.technique = technique;
  return project;
}

const arcLine = (index: number): Geometry => ({
  type: 'LineString',
  coordinates: [
    [-77.5 + index * 0.1, 39.2],
    [-90 + index, 35],
  ],
});

function compiled(project: ValidatedProject): Compiled {
  const result = compileProject(project, STAGE1_CAPABILITIES);
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics, null, 2));
  return result.value;
}

function errors(project: ValidatedProject) {
  return compileProject(project, STAGE1_CAPABILITIES).diagnostics.filter(
    (entry) => entry.severity === 'error',
  );
}

describe('arcs (step 5.2, N)', () => {
  it('compiles to the deck backend with an origin-to-destination gradient', async () => {
    const result = compiled(await flowFixture('arc', arcLine));
    const layer = result.scenes[0]!.layers[0]!;
    expect(layer).toMatchObject({ technique: 'arc', backend: 'deck', geometry: 'line' });
    expect(layer.arc).toEqual({
      origin: expect.stringMatching(/^#[0-9a-f]{6}$/i),
      destination: expect.stringMatching(/^#[0-9a-f]{6}$/i),
      greatCircle: false,
      height: 0.25,
      width: 2,
    });
    expect(layer.arc!.origin).not.toBe(layer.arc!.destination);
    // Scene b still draws points with MapLibre.
    expect(result.scenes[1]!.layers[0]!.backend).toBe('maplibre');
  });

  it('takes the great-circle option and points callouts at the destination', async () => {
    const project = await flowFixture('arc', arcLine);
    project.narrative.scenes[0]!.layers[0]!.arc = { greatCircle: true };
    const result = compiled(project);
    expect(result.scenes[0]!.layers[0]!.arc!.greatCircle).toBe(true);
    // The fixture's callout names p1, whose arc ends at (-90, 35).
    const callout = result.scenes[0]!.callouts.find((item) => item.id === 'where-one')!;
    expect(callout.targets).toEqual([{ at: [-90, 35], radius: 3 }]);
  });

  it('rejects lines that are not exactly origin and destination, listing their IDs', async () => {
    const project = await flowFixture('arc', (index) =>
      index === 2
        ? {
            type: 'LineString',
            coordinates: [
              [-77, 39],
              [-78, 38],
              [-79, 37],
            ],
          }
        : index === 5
          ? {
              type: 'MultiLineString',
              coordinates: [
                [
                  [-77, 39],
                  [-78, 38],
                ],
              ],
            }
          : arcLine(index),
    );
    expect(errors(project)).toEqual([
      expect.objectContaining({
        code: 'VALUE_INVALID',
        artifact: 'data',
        path: ['resources', 'data', 'period-a', 'features'],
        ids: expect.objectContaining({ layerId: 'sites' }),
        message:
          'Arcs need LineStrings of exactly two positions, origin then destination; 2 feature(s) are not: p3, p6.',
      }),
    ]);
  });

  it('diagnoses arcs with terrain or on the globe as CAPABILITY_UNSUPPORTED', async () => {
    const project = await flowFixture('arc', arcLine);
    project.authoredBasemap = {
      provider: 'openfreemap',
      style: 'positron',
      terrain: { provider: 'mapterhorn' },
      projection: 'globe',
    };
    const found = errors(project);
    expect(found).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'CAPABILITY_UNSUPPORTED',
          path: ['basemap', 'terrain'],
          message: 'The deck.gl tier draws arc layers at sea level, under the terrain.',
          remedy: expect.stringContaining('Remove basemap.terrain'),
        }),
        expect.objectContaining({
          code: 'CAPABILITY_UNSUPPORTED',
          path: ['basemap', 'projection'],
          remedy: expect.stringContaining('Set basemap.projection to mercator'),
        }),
      ]),
    );
  });

  it('lets an encoded arc draw on with line-reveal', async () => {
    const project = await flowFixture('arc', arcLine);
    project.authoredMotion = {
      scenes: { a: { layers: [{ layerId: 'sites', property: 'line-reveal', mode: 'scrub' }] } },
    };
    const track = compiled(project).scenes[0]!.motion.layers[0]!;
    expect(track).toMatchObject({ property: 'line-reveal', mode: 'scrub' });
  });
});

const tripLine = (index: number): Geometry => ({
  type: 'LineString',
  coordinates: [
    [-80 + index, 25],
    [-81 + index, 27],
    [-82 + index, 30],
  ],
});
/** Three six-hourly fixes, a day apart per feature. */
const tripTimes = (index: number) => ({
  times: [0, 6, 12].map((hour) =>
    new Date(Date.UTC(2024, 8, 24 + index, hour)).toISOString().replace('.000', ''),
  ),
});

describe('trips (step 5.2, N)', () => {
  it('compiles the time domain, trail and en-US UTC clock labels', async () => {
    const project = await flowFixture('trip', tripLine, tripTimes);
    project.narrative.scenes[0]!.layers[0]!.trip = { timeProperty: 'times', trailHours: 12 };
    const layer = compiled(project).scenes[0]!.layers[0]!;
    expect(layer.backend).toBe('deck');
    expect(layer.trip).toMatchObject({
      timeProperty: 'times',
      start: '2024-09-24T00:00:00.000Z',
      end: '2024-09-30T12:00:00.000Z',
      durationSeconds: 6.5 * 86400,
      trailSeconds: 12 * 3600,
      width: 3,
      rangeLabel: 'Sep 24 to Sep 30, 2024 (UTC)',
    });
    // 156 hours: hourly labels.
    expect(layer.trip!.clock[0]).toEqual({ at: 0, label: 'Sep 24, 2024, 00:00 UTC' });
    expect(layer.trip!.clock.at(-1)).toEqual({
      at: 6.5 * 86400,
      label: 'Sep 30, 2024, 12:00 UTC',
    });
  });

  it('defaults a trail track to a linear scrub of the clock', async () => {
    const project = await flowFixture('trip', tripLine, tripTimes);
    project.narrative.scenes[0]!.layers[0]!.trip = { timeProperty: 'times', trailHours: 12 };
    project.authoredMotion = {
      scenes: { a: { layers: [{ layerId: 'sites', property: 'trail' }] } },
    };
    const track = compiled(project).scenes[0]!.motion.layers[0]!;
    expect(track).toMatchObject({ property: 'trail', mode: 'scrub', final: 1 });
    expect(track.keyframes.at(-1)!.easing).toBe('linear');
  });

  it('rejects times that are missing, not UTC, out of order or not one per vertex', async () => {
    const project = await flowFixture('trip', tripLine, (index) => {
      const { times } = tripTimes(index);
      if (index === 1) return { times: [times[1], times[0], times[2]] };
      if (index === 3) return { times: times.map((time) => time.replace('Z', '')) };
      if (index === 4) return { times: times.slice(0, 2) };
      if (index === 6) return {};
      return { times };
    });
    project.narrative.scenes[0]!.layers[0]!.trip = { timeProperty: 'times', trailHours: 12 };
    expect(errors(project)).toEqual([
      expect.objectContaining({
        code: 'VALUE_INVALID',
        path: ['resources', 'data', 'period-a', 'features', 'properties', 'times'],
        message:
          'times must hold one ISO 8601 UTC time per vertex, in ascending order; 4 feature(s) do not: p2, p4, p5, p7.',
      }),
    ]);
  });

  it('needs its trip options and LineString tracks', async () => {
    const project = await flowFixture('trip', (index) =>
      index === 0
        ? {
            type: 'MultiLineString',
            coordinates: [(tripLine(0).coordinates as number[][]).slice(0, 2)],
          }
        : tripLine(index),
    );
    expect(errors(project)).toEqual([
      expect.objectContaining({
        code: 'VALUE_INVALID',
        path: ['scenes', 0, 'layers', 0, 'trip'],
      }),
    ]);
    project.narrative.scenes[0]!.layers[0]!.trip = { timeProperty: 'times', trailHours: 12 };
    expect(errors(project)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'Trips need LineStrings; 1 feature(s) are not: p1.',
        }),
      ]),
    );
  });

  it('diagnoses trips on terrain', async () => {
    const project = await flowFixture('trip', tripLine, tripTimes);
    project.narrative.scenes[0]!.layers[0]!.trip = { timeProperty: 'times', trailHours: 12 };
    project.authoredBasemap = {
      provider: 'openfreemap',
      style: 'positron',
      terrain: { provider: 'mapterhorn' },
    };
    expect(errors(project)).toEqual([
      expect.objectContaining({ code: 'CAPABILITY_UNSUPPORTED', path: ['basemap', 'terrain'] }),
    ]);
  });
});

describe('trip clock labels', () => {
  const at = (iso: string) => Date.parse(iso) / 1000;

  it('formats en-US dates and 24-hour UTC times', () => {
    expect(utcClock(at('2024-07-08T09:30:00Z'), true)).toBe('Jul 8, 2024, 09:30 UTC');
    expect(utcClock(at('2024-07-08T09:30:00Z'), false)).toBe('Jul 8, 2024 (UTC)');
  });

  it('picks the smallest step that keeps the clock short, aligned to UTC', () => {
    const season = tripClock(at('2024-06-19T12:00:00Z'), at('2024-11-08T00:00:00Z'));
    // 142 days: up to six-hourly would be too many labels; twelve-hourly fits.
    expect(season[1]!.at - season[0]!.at).toBe(12 * 3600);
    expect(season[0]).toEqual({ at: 0, label: 'Jun 19, 2024, 12:00 UTC' });
    const short = tripClock(at('2024-09-26T10:20:00Z'), at('2024-09-26T13:00:00Z'));
    // The first tick is clamped to the start; later ticks fall on the hour.
    expect(short.map((tick) => tick.label)).toEqual([
      'Sep 26, 2024, 10:20 UTC',
      'Sep 26, 2024, 11:00 UTC',
      'Sep 26, 2024, 12:00 UTC',
      'Sep 26, 2024, 13:00 UTC',
    ]);
    expect(short[1]!.at).toBe(40 * 60);
  });
});
