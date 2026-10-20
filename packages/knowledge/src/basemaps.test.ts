import { describe, expect, it } from 'vitest';
import { resolveBasemap } from './basemaps.js';

describe('keyless basemap resolution', () => {
  it('resolves a primary, fallback and terrain without I/O', () => {
    expect(
      resolveBasemap({
        provider: 'openfreemap',
        style: 'positron',
        terrain: { provider: 'mapterhorn', exaggeration: 1.4 },
      }),
    ).toEqual({
      provider: 'openfreemap',
      labels: 'full',
      styles: [
        {
          provider: 'openfreemap',
          url: 'https://tiles.openfreemap.org/styles/positron',
          attribution: expect.stringContaining('OpenStreetMap'),
        },
        {
          provider: 'versatiles',
          url: 'https://tiles.versatiles.org/assets/styles/colorful/style.json',
          attribution: expect.stringContaining('OpenStreetMap'),
        },
      ],
      terrain: {
        tiles: 'https://tiles.mapterhorn.com/{z}/{x}/{y}.webp',
        attribution: expect.stringContaining('Mapterhorn'),
        exaggeration: 1.4,
        tileSize: 512,
      },
    });
  });
  it('drops all providers and terrain offline and diagnoses unknown styles', () => {
    expect(
      resolveBasemap(
        { provider: 'openfreemap', style: 'dark', terrain: { provider: 'mapterhorn' } },
        true,
      ),
    ).toEqual({ provider: 'none' });
    expect(() => resolveBasemap({ provider: 'versatiles', style: 'invalid' })).toThrow(
      'Unsupported versatiles style',
    );
  });
});
