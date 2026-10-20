import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { classifyMedia, registerMedia, registerMediaInputs } from './index.js';

const FIXTURES = new URL('../../../../fixtures/ingest/', import.meta.url);
const fixture = (rel: string): string => fileURLToPath(new URL(rel, FIXTURES));

describe('classifyMedia (pure)', () => {
  it('classifies local images and remote videos by extension', () => {
    expect(classifyMedia('photos/skyline.PNG')).toEqual({
      kind: 'image',
      source: 'local',
      mimeType: 'image/png',
    });
    expect(classifyMedia('https://cdn.example.com/a/clip.mp4?v=2')).toEqual({
      kind: 'video',
      source: 'url',
      mimeType: 'video/mp4',
    });
  });

  it('throws on an unrecognized type', () => {
    expect(() => classifyMedia('notes.txt')).toThrow(/unrecognized/);
  });
});

describe('registerMedia', () => {
  it('reads intrinsic size for a local PNG', async () => {
    const asset = await registerMedia({ path: fixture('media/skyline.png') });
    expect(asset).toMatchObject({
      id: 'skyline',
      name: 'skyline.png',
      kind: 'image',
      source: 'local',
      mimeType: 'image/png',
      width: 800,
      height: 450,
    });
  });

  it('registers a URL asset without dimensions', async () => {
    const asset = await registerMedia({ path: 'https://cdn.example.com/clip.mp4', credit: 'ACME' });
    expect(asset).toMatchObject({
      kind: 'video',
      source: 'url',
      mimeType: 'video/mp4',
      credit: 'ACME',
    });
    expect(asset.width).toBeUndefined();
  });

  it('rejects a missing local file', async () => {
    await expect(registerMedia({ path: fixture('media/missing.png') })).rejects.toThrow(
      /not found/,
    );
  });

  it('rejects a malformed URL with an image extension', async () => {
    await expect(registerMedia({ path: 'http://[bad url].png' })).rejects.toThrow();
  });

  it('registers a batch of mixed inputs', async () => {
    const assets = await registerMediaInputs([
      fixture('media/skyline.png'),
      { path: fixture('media/ferry-building.png'), location: [-122.3933, 37.7955] },
    ]);
    expect(assets).toHaveLength(2);
    expect(assets[1]!.location).toEqual([-122.3933, 37.7955]);
    expect(assets[1]!.width).toBe(600);
  });
});
