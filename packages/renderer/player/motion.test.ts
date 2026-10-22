import { describe, expect, it } from 'vitest';
import type { CameraTrack, LayerTrack } from '@mapbard/schema';
import { approachCamera, effectiveTrack, trackFrame } from './motion.js';

const view = { center: [0, 0] as [number, number], zoom: 5, pitch: 0, bearing: 0 };
const cameraTrack: CameraTrack = {
  mode: 'scrub',
  range: [0, 1],
  keyframes: [{ at: 0, ...view, easing: 'linear' }],
  final: view,
};
const layerTrack: LayerTrack = {
  mode: 'play',
  range: [0, 1],
  durationMs: 900,
  delayMs: 300,
  runtimeLayerId: 'mb:1:a:1:l',
  property: 'opacity',
  keyframes: [
    { at: 0, value: 0, easing: 'linear' },
    { at: 1, value: 1, easing: 'linear' },
  ],
  final: 1,
};

describe('track policies', () => {
  it('maps reduced-motion policies onto track modes', () => {
    expect(effectiveTrack(cameraTrack, 'step', false).mode).toBe('scrub');
    expect(effectiveTrack(cameraTrack, 'step', true).mode).toBe('step');
    expect(effectiveTrack(cameraTrack, 'shorten', true).mode).toBe('step');
    expect(effectiveTrack(cameraTrack, 'keep', true).mode).toBe('scrub');
    expect(effectiveTrack(layerTrack, 'shorten', true)).toMatchObject({
      mode: 'play',
      durationMs: 250,
      delayMs: 0,
    });
    expect(effectiveTrack({ ...layerTrack, mode: 'loop' }, 'shorten', true).mode).toBe('step');
  });

  it('waits for the delay and the trigger before a play track starts', () => {
    const clock = {};
    const state = { p: 0.5, armed: false, now: 0, settle: false, paused: false };
    expect(trackFrame(layerTrack, state, clock)).toEqual({ t: 0, running: false });
    expect(trackFrame(layerTrack, { ...state, armed: true }, clock)).toEqual({
      t: 0,
      running: true,
    });
    expect(trackFrame(layerTrack, { ...state, armed: true, now: 750 }, clock).t).toBeCloseTo(0.5);
    expect(trackFrame(layerTrack, { ...state, armed: true, now: 5000 }, clock)).toEqual({
      t: 1,
      running: false,
    });
  });

  it('turns the short way round and lifts the camera on a fly hand-over', () => {
    const from = { ...view, bearing: 350 };
    const to = { ...view, center: [2, 0] as [number, number], bearing: 10 };
    expect(approachCamera(from, to, 0.5, 'ease').bearing).toBeCloseTo(0);
    expect(approachCamera(from, to, 0.5, 'fly').zoom).toBeLessThan(5);
    expect(approachCamera(from, to, 1, 'fly')).toEqual(to);
  });
});
