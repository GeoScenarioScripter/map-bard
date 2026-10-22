import { describe, expect, it } from 'vitest';
import { CameraTrackSchema, LayerTrackSchema, SceneMotionSchema } from './motion.js';

const camera = { center: [-77, 39] as [number, number], zoom: 8, pitch: 0, bearing: 0 };

describe('compiled motion tracks', () => {
  it('accepts a held camera and rejects out-of-order keyframes or reversed ranges', () => {
    const held = {
      mode: 'scrub',
      range: [0, 1],
      keyframes: [{ at: 0, ...camera, easing: 'linear' }],
      final: camera,
    };
    expect(CameraTrackSchema.safeParse(held).success).toBe(true);
    expect(
      CameraTrackSchema.safeParse({
        ...held,
        keyframes: [
          { at: 0.6, ...camera, easing: 'linear' },
          { at: 0.2, ...camera, easing: { kind: 'spring', stiffness: 100, damping: 10 } },
        ],
      }).success,
    ).toBe(false);
    expect(CameraTrackSchema.safeParse({ ...held, range: [0.8, 0.2] }).success).toBe(false);
  });

  it('requires a duration for play and loop tracks and keeps values in [0, 1]', () => {
    const fade = {
      mode: 'play',
      range: [0, 0.5],
      durationMs: 600,
      runtimeLayerId: 'mb:1:a:5:sites',
      property: 'opacity',
      keyframes: [
        { at: 0, value: 0, easing: 'ease-out' },
        { at: 1, value: 1, easing: 'ease-out' },
      ],
      final: 1,
    };
    expect(LayerTrackSchema.safeParse(fade).success).toBe(true);
    expect(LayerTrackSchema.safeParse({ ...fade, durationMs: undefined }).success).toBe(false);
    expect(LayerTrackSchema.safeParse({ ...fade, final: 2 }).success).toBe(false);
    // Every track ends in its declared final state: the last keyframe.
    expect(LayerTrackSchema.safeParse({ ...fade, final: 0.5 }).success).toBe(false);
  });

  it('allows one track per layer property in a scene', () => {
    const track = {
      mode: 'step',
      range: [0, 1],
      runtimeLayerId: 'mb:1:a:5:sites',
      property: 'highlight',
      keyframes: [{ at: 0, value: 1, easing: 'linear' }],
      final: 1,
    };
    const motion = {
      scrollLength: 1,
      trigger: 0.5,
      reducedMotion: 'step',
      camera: {
        mode: 'scrub',
        range: [0, 1],
        keyframes: [{ at: 0, ...camera, easing: 'linear' }],
        final: camera,
      },
      layers: [track],
    };
    expect(SceneMotionSchema.safeParse(motion).success).toBe(true);
    expect(SceneMotionSchema.safeParse({ ...motion, layers: [track, track] }).success).toBe(false);
  });
});
