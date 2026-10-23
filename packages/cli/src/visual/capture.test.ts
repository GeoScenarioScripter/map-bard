import { describe, expect, it } from 'vitest';
import { PNG } from 'pngjs';
import { flatTerrainTile, tileUrlPattern } from './capture.js';

describe('stub terrain', () => {
  it('matches the tile URLs of a template and nothing else', () => {
    const pattern = tileUrlPattern('https://tiles.mapterhorn.com/{z}/{x}/{y}.webp');
    expect(pattern.test('https://tiles.mapterhorn.com/6/19/25.webp')).toBe(true);
    expect(pattern.test('https://tiles.mapterhorn.com/6/19/25.webp?v=2')).toBe(true);
    expect(pattern.test('https://tiles.mapterhorn.com/6/19/25.png')).toBe(false);
    expect(pattern.test('https://tiles.mapterhorn.com/a/19/25.webp')).toBe(false);
    expect(pattern.test('https://tiles.openfreemap.org/6/19/25.webp')).toBe(false);
  });

  it('draws a sea-level terrarium tile at the source tile size', () => {
    const tile = PNG.sync.read(flatTerrainTile(512));
    expect([tile.width, tile.height]).toEqual([512, 512]);
    const [r, g, b] = tile.data;
    // terrarium: height = r * 256 + g + b / 256 - 32768
    expect(r! * 256 + g! + b! / 256 - 32768).toBe(0);
    expect(new Set(tile.data).size).toBeLessThanOrEqual(3);
  });
});
