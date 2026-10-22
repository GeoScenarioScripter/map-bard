import { describe, expect, it } from 'vitest';
import { resolveBasemap } from './basemaps.js';
import { THEME_PRESET_TOKENS } from './themes.js';

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
      projection: 'mercator',
      sky: { sky: '#c9dcea', horizon: '#eef2f3', fog: '#e9e6df' },
      tint: expect.objectContaining({ land: '#f2efe9', water: '#b8d4e3', labelHalo: '#ffffff' }),
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
        hillshade: { shadow: '#5b5145', highlight: '#ffffff' },
      },
    });
  });
  it('takes colours from the theme and honours opt-outs', () => {
    const night = THEME_PRESET_TOKENS.night.colors;
    const resolved = resolveBasemap(
      {
        provider: 'versatiles',
        terrain: { provider: 'aws-terrarium', hillshade: false },
        sky: false,
        projection: 'globe',
      },
      false,
      night,
    );
    if (resolved.provider === 'none') throw new Error('expected an online basemap');
    expect(resolved.projection).toBe('globe');
    expect(resolved.sky).toBeUndefined();
    expect(resolved.terrain?.hillshade).toBeUndefined();
    expect(resolved.tint?.water).toBe(night.water);
    // Custom styles are tinted only on request.
    const custom = { provider: 'custom', styleUrl: 'https://example.org/s.json', attribution: 'x' };
    expect(resolveBasemap({ ...custom } as const)).not.toHaveProperty('tint');
    expect(resolveBasemap({ ...custom, tint: 'theme' } as const)).toHaveProperty('tint.road');
  });
  it('drops all providers and terrain offline and diagnoses unknown styles', () => {
    expect(
      resolveBasemap(
        { provider: 'openfreemap', style: 'dark', terrain: { provider: 'mapterhorn' } },
        true,
      ),
    ).toEqual({
      provider: 'none',
      projection: 'mercator',
      sky: { sky: '#c9dcea', horizon: '#eef2f3', fog: '#e9e6df' },
    });
    expect(() => resolveBasemap({ provider: 'versatiles', style: 'invalid' })).toThrow(
      'Unsupported versatiles style',
    );
  });
});
