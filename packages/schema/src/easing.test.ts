import { describe, expect, it } from 'vitest';
import { ease, localProgress, sampleCameraKeyframes, sampleLayerKeyframes } from './easing.js';
import type { Easing } from './motion.js';

const easings: Easing[] = [
  'linear',
  'ease-in',
  'ease-out',
  'ease-in-out',
  'expo-out',
  { kind: 'cubic-bezier', points: [0.2, 0, 0, 1] },
  { kind: 'spring', stiffness: 170, damping: 26 },
  { kind: 'spring', stiffness: 100, damping: 5 },
];

describe('shared motion math', () => {
  it('maps 0 to 0 and 1 to 1 for every easing and clamps outside', () => {
    for (const easing of easings) {
      expect(ease(easing, 0)).toBe(0);
      expect(ease(easing, 1)).toBe(1);
      expect(ease(easing, -2)).toBe(0);
      expect(ease(easing, 3)).toBe(1);
    }
  });

  it('matches the CSS curves and lets an underdamped spring overshoot', () => {
    expect(ease('linear', 0.3)).toBeCloseTo(0.3, 10);
    expect(ease('ease-in-out', 0.5)).toBeCloseTo(0.5, 5);
    expect(ease('ease-in', 0.25)).toBeLessThan(0.25);
    expect(ease('ease-out', 0.25)).toBeGreaterThan(0.25);
    // CSS `ease` is cubic-bezier(0.25, 0.1, 0.25, 1); at x = 0.5 it is about 0.8024.
    expect(ease({ kind: 'cubic-bezier', points: [0.25, 0.1, 0.25, 1] }, 0.5)).toBeCloseTo(
      0.8024,
      3,
    );
    let previous = 0;
    for (let t = 0.05; t < 1; t += 0.05) {
      const value = ease('ease-in-out', t);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
    const bouncy = { kind: 'spring', stiffness: 100, damping: 5 } as const;
    const peak = Math.max(...Array.from({ length: 99 }, (_, i) => ease(bouncy, (i + 1) / 100)));
    expect(peak).toBeGreaterThan(1);
  });

  it('maps scene progress into a track range', () => {
    expect(localProgress([0.2, 0.6], 0.4)).toBeCloseTo(0.5);
    expect(localProgress([0.2, 0.6], 0.1)).toBe(0);
    expect(localProgress([0.2, 0.6], 0.9)).toBe(1);
    expect(localProgress([0.5, 0.5], 0.49)).toBe(0);
    expect(localProgress([0.5, 0.5], 0.5)).toBe(1);
  });

  it('samples keyframes, holding the first before it and the last after it', () => {
    const frames = [
      {
        at: 0.2,
        center: [0, 0] as [number, number],
        zoom: 4,
        pitch: 0,
        bearing: 350,
        easing: 'linear' as const,
      },
      {
        at: 0.6,
        center: [10, 20] as [number, number],
        zoom: 8,
        pitch: 40,
        bearing: 370,
        easing: 'linear' as const,
      },
    ];
    expect(sampleCameraKeyframes(frames, 0)).toMatchObject({ zoom: 4, bearing: 350 });
    const middle = sampleCameraKeyframes(frames, 0.4);
    expect([...middle.center, middle.zoom, middle.pitch, middle.bearing].map(Math.round)).toEqual([
      5, 10, 6, 20, 360,
    ]);
    expect(sampleCameraKeyframes(frames, 1)).toMatchObject({ zoom: 8, bearing: 370 });
    const values = [
      { at: 0, value: 0, easing: 'linear' as const },
      { at: 0.5, value: 1, easing: 'ease-in' as const },
      { at: 1, value: 0, easing: 'linear' as const },
    ];
    expect(sampleLayerKeyframes(values, 0.5)).toBe(1);
    expect(sampleLayerKeyframes(values, 0.25)).toBeLessThan(0.5);
    expect(sampleLayerKeyframes(values, 0.75)).toBeCloseTo(0.5);
  });
});
