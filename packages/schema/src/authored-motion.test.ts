import { describe, expect, it } from 'vitest';
import {
  AuthoredSceneMotionSchema,
  CameraMotionSchema,
  LayerMotionSchema,
  StoryMotionSchema,
  parseEasingText,
} from './authored-motion.js';
import { ProjectV2Schema, StorySceneSchema } from './format-v2.js';

describe('authored motion (format 0.2, optional)', () => {
  it('parses the CSS-like easing short forms and rejects out-of-range control points', () => {
    expect(parseEasingText('cubic-bezier(0.4, 0, 0.2, 1)')).toEqual({
      kind: 'cubic-bezier',
      points: [0.4, 0, 0.2, 1],
    });
    expect(parseEasingText('spring(170,26)')).toEqual({
      kind: 'spring',
      stiffness: 170,
      damping: 26,
    });
    expect(parseEasingText('cubic-bezier(1.4, 0, 0.2, 1)')).toBeUndefined();
    expect(parseEasingText('spring(0, 4)')).toBeUndefined();
    expect(CameraMotionSchema.safeParse({ easing: 'bounce' }).success).toBe(false);
    expect(CameraMotionSchema.safeParse({ easing: 'expo-out' }).success).toBe(true);
  });

  it('accepts the short camera form and rejects a preset mixed with keyframes', () => {
    expect(
      CameraMotionSchema.safeParse({
        preset: 'fly-along',
        feature: 'river/main',
        pitch: 60,
      }).success,
    ).toBe(true);
    expect(
      CameraMotionSchema.safeParse({ preset: 'orbit', keyframes: [{ at: 0, zoom: 3 }] }).success,
    ).toBe(false);
    expect(CameraMotionSchema.safeParse({ preset: 'spin' }).success).toBe(false);
    expect(CameraMotionSchema.safeParse({ preset: 'push-in', feature: 'no-slash' }).success).toBe(
      false,
    );
    expect(
      CameraMotionSchema.safeParse({
        keyframes: [
          { at: 0.5, zoom: 3 },
          { at: 0.2, zoom: 4 },
        ],
      }).success,
    ).toBe(false);
  });

  it('keeps layer tracks and story defaults strict', () => {
    expect(
      LayerMotionSchema.safeParse({ layerId: 'river', property: 'line-reveal', from: 0, to: 1 })
        .success,
    ).toBe(true);
    expect(
      LayerMotionSchema.safeParse({
        layerId: 'river',
        property: 'opacity',
        to: 1,
        keyframes: [{ at: 0, value: 0 }],
      }).success,
    ).toBe(false);
    expect(LayerMotionSchema.safeParse({ layerId: 'x', property: 'width' }).success).toBe(false);
    expect(StoryMotionSchema.safeParse({ trigger: 'center', data: { mode: 'play' } }).success).toBe(
      true,
    );
    expect(StoryMotionSchema.safeParse({ stagger: 40 }).success).toBe(false);
    expect(AuthoredSceneMotionSchema.safeParse({ scrollLength: 30 }).success).toBe(false);
  });

  it('adds optional motion fields to mapbard.json and story scenes', () => {
    const project = {
      formatVersion: '0.2.0',
      id: 'p',
      title: 'P',
      intent: 'I',
      basemap: { provider: 'none' },
      resources: { data: [], media: [] },
    };
    expect(ProjectV2Schema.safeParse(project).success).toBe(true);
    expect(
      ProjectV2Schema.safeParse({
        ...project,
        motion: { scrollLength: 1.5, reducedMotion: 'shorten' },
        motionPresets: { 'slow-reveal': { camera: { preset: 'reveal-from-overview' } } },
      }).success,
    ).toBe(true);
    expect(
      ProjectV2Schema.safeParse({ ...project, motionPresets: { 'bad name': {} } }).success,
    ).toBe(false);
    const scene = {
      id: 's',
      title: 'S',
      narration: '',
      layers: [],
      camera: { center: [0, 0], zoom: 2 },
      annotations: [],
    };
    expect(
      StorySceneSchema.safeParse({
        ...scene,
        motion: {
          preset: 'slow-reveal',
          camera: [{ preset: 'reveal-from-overview' }, { preset: 'orbit', degrees: 45 }],
        },
      }).success,
    ).toBe(true);
    expect(StorySceneSchema.safeParse({ ...scene, motion: { camera: [] } }).success).toBe(false);
  });
});
