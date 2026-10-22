import { describe, expect, it } from 'vitest';
import type { CameraTrack } from '@mapbard/schema';
import { cameraMoves, phaseAt, samplePositions } from './phase.js';

const frame = (at: number, zoom: number) => ({
  at,
  center: [-77, 39] as [number, number],
  zoom,
  pitch: 0,
  bearing: 0,
  easing: 'linear' as const,
});
const track = (overrides: Partial<CameraTrack>): CameraTrack => ({
  mode: 'scrub',
  range: [0.1, 0.9],
  keyframes: [frame(0, 8), frame(1, 10)],
  final: { center: [-77, 39], zoom: 10, pitch: 0, bearing: 0 },
  ...overrides,
});

describe('flight phase', () => {
  it('tags positions inside a moving scrub range as flight, its ends as rest', () => {
    const pushIn = track({});
    expect(phaseAt(pushIn, 0)).toBe('rest');
    expect(phaseAt(pushIn, 0.1)).toBe('rest');
    expect(phaseAt(pushIn, 0.5)).toBe('flight');
    expect(phaseAt(pushIn, 0.9)).toBe('rest');
    expect(phaseAt(pushIn, 1)).toBe('rest');
  });

  it('treats held keyframe segments, held cameras and timed cameras as rest', () => {
    // Moves over the first half of the range, then holds.
    const holdsLate = track({
      range: [0, 1],
      keyframes: [frame(0, 8), frame(0.5, 10), frame(1, 10)],
    });
    expect(cameraMoves(holdsLate, 0.25)).toBe(true);
    expect(cameraMoves(holdsLate, 0.75)).toBe(false);
    const held = track({ range: [0, 1], keyframes: [frame(0, 8)] });
    expect(phaseAt(held, 0.5)).toBe('rest');
    const played = track({ mode: 'play', durationMs: 1000 });
    expect(phaseAt(played, 0.5)).toBe('rest');
  });

  it('samples the captures plus every 0.05 across a moving range', () => {
    const positions = samplePositions(track({}));
    expect(positions.filter((entry) => entry.capture).map((entry) => entry.p)).toEqual([0, 0.5, 1]);
    const swept = positions.filter((entry) => !entry.capture).map((entry) => entry.p);
    expect(swept[0]).toBe(0.1);
    expect(swept.at(-1)).toBe(0.9);
    expect(swept).toHaveLength(16);
    expect(swept).toContain(0.15);
    expect(positions.map((entry) => entry.p)).toEqual(
      [...positions.map((entry) => entry.p)].sort((a, b) => a - b),
    );
  });

  it('samples only the captures when the camera never moves under scroll', () => {
    expect(samplePositions(track({ keyframes: [frame(0, 8)] }))).toEqual([
      { p: 0, capture: true },
      { p: 0.5, capture: true },
      { p: 1, capture: true },
    ]);
    expect(samplePositions(track({ mode: 'step' }))).toHaveLength(3);
  });
});
