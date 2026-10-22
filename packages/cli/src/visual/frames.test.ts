import { describe, expect, it } from 'vitest';
import type { CameraTrack } from '@mapbard/schema';
import { cameraTrackFrames, frameStats } from './frames.js';

const keyframe = (at: number, zoom: number) => ({
  at,
  center: [-77, 39] as [number, number],
  zoom,
  pitch: 0,
  bearing: 0,
  easing: 'linear' as const,
});
const camera = (mode: CameraTrack['mode'], zooms: number[]): CameraTrack => ({
  mode,
  range: [0.2, 0.8],
  keyframes: zooms.map((zoom, index) => keyframe(index / Math.max(1, zooms.length - 1), zoom)),
  final: { center: [-77, 39], zoom: zooms.at(-1)!, pitch: 0, bearing: 0 },
});

describe('frame sample', () => {
  it('summarises frame intervals', () => {
    const stats = frameStats([...Array.from({ length: 98 }, () => 10), 40, 60]);
    expect(stats).toEqual({
      frames: 100,
      meanFps: 92.6,
      p50Ms: 10,
      p95Ms: 10,
      p99Ms: 60,
      over50Ms: 1,
    });
    expect(frameStats([]).frames).toBe(0);
  });

  it('counts only frames shown while a scrub camera track moves', () => {
    const scenes = [
      { id: 'flight', motion: { camera: camera('scrub', [8, 10]) } },
      { id: 'held', motion: { camera: camera('scrub', [8]) } },
      { id: 'timed', motion: { camera: camera('play', [8, 10]) } },
    ];
    const tracks = cameraTrackFrames(
      [
        { ms: 16, sceneId: 'flight', p: 0.1 },
        { ms: 20, sceneId: 'flight', p: 0.5 },
        { ms: 30, sceneId: 'flight', p: 0.6 },
        { ms: 99, sceneId: 'held', p: 0.5 },
        { ms: 99 },
      ],
      scenes,
    );
    expect(tracks).toEqual([expect.objectContaining({ sceneId: 'flight', frames: 2, p99Ms: 30 })]);
  });
});
