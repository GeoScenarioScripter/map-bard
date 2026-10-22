import { describe, expect, it } from 'vitest';
import { SceneMotionSchema, type AuthoredMotion, type Diagnostic } from '@mapbard/schema';
import { resolveLayout } from '@mapbard/knowledge';
import { resolveSceneMotion, type MotionInput } from './motion.js';

const geometries: Record<string, Record<string, { type: string; coordinates: unknown }>> = {
  river: {
    upper: {
      type: 'LineString',
      coordinates: [
        [-78, 39.5],
        [-77.6, 39.5],
      ],
    },
    // Stored against the direction of travel, and with a tiny side channel.
    lower: {
      type: 'MultiLineString',
      coordinates: [
        [
          [-77, 39.5],
          [-77.3, 39.5],
          [-77.59, 39.5],
        ],
        [
          [-77.2, 39.51],
          [-77.21, 39.51],
        ],
      ],
    },
  },
  gauges: {
    a: { type: 'Point', coordinates: [-77.5, 39.3] },
    b: { type: 'Point', coordinates: [-77.1, 39.0] },
  },
};

function input(authored?: AuthoredMotion, extra: Partial<MotionInput> = {}) {
  const diagnostics: Diagnostic[] = [];
  const value: MotionInput = {
    scene: { id: 's', camera: { center: [-77.5, 39.3], zoom: 8 } },
    sceneIndex: 0,
    ...(authored ? { authored } : {}),
    layers: [
      {
        authoredLayerId: 'river',
        runtimeId: 'mb:1:s:5:river',
        sourceId: 'river',
        geometry: 'line',
      },
      {
        authoredLayerId: 'gauges',
        runtimeId: 'mb:1:s:6:gauges',
        sourceId: 'gauges',
        geometry: 'point',
        scaleId: 'size',
      },
    ],
    controls: [],
    sourceIds: ['river', 'gauges'],
    feature: (sourceId, featureId) => geometries[sourceId]?.[featureId],
    sourceGeometries: (sourceId) => Object.values(geometries[sourceId] ?? {}),
    layout: resolveLayout('sidecar'),
    capability: () => true,
    diagnostics,
    ...extra,
  };
  return value;
}

function resolve(authored?: AuthoredMotion, extra: Partial<MotionInput> = {}) {
  const value = input(authored, extra);
  const motion = resolveSceneMotion(value);
  return { motion, diagnostics: value.diagnostics };
}

const scene = (motion: AuthoredMotion['scenes'][string], rest: Partial<AuthoredMotion> = {}) => ({
  scenes: { s: motion },
  ...rest,
});

describe('motion compilation', () => {
  it('holds the authored camera with built-in defaults when nothing is authored', () => {
    const { motion, diagnostics } = resolve();
    expect(diagnostics).toEqual([]);
    const camera = { center: [-77.5, 39.3], zoom: 8, pitch: 0, bearing: 0 };
    expect(motion).toEqual({
      scrollLength: 1,
      trigger: 0.5,
      reducedMotion: 'step',
      camera: {
        mode: 'scrub',
        range: [0, 1],
        keyframes: [{ at: 0, ...camera, easing: 'linear' }],
        final: camera,
      },
      layers: [],
    });
  });

  it('cascades story defaults, a named preset, the scene and the track; most specific wins', () => {
    const { motion, diagnostics } = resolve(
      scene(
        { preset: 'reveal', trigger: 'top', camera: { easing: 'cubic-bezier(0.2, 0, 0, 1)' } },
        {
          story: { scrollLength: 2, reducedMotion: 'shorten', camera: { easing: 'expo-out' } },
          presets: {
            reveal: { scrollLength: 3, camera: { preset: 'reveal-from-overview' } },
          },
        },
      ),
    );
    expect(diagnostics).toEqual([]);
    expect(SceneMotionSchema.safeParse(motion).success).toBe(true);
    expect(motion).toMatchObject({ scrollLength: 3, trigger: 0, reducedMotion: 'shorten' });
    const [start, end] = motion.camera.keyframes;
    expect(end).toMatchObject({
      at: 1,
      center: [-77.5, 39.3],
      zoom: 8,
      easing: { kind: 'cubic-bezier', points: [0.2, 0, 0, 1] },
    });
    // The overview frames every layer feature and is wider than the scene view.
    expect(start!.zoom).toBeLessThan(8);
    expect(start!.center[0]).toBeCloseTo(-77.5, 1);
    expect(motion.camera.final).toEqual({ center: [-77.5, 39.3], zoom: 8, pitch: 0, bearing: 0 });

    const keyed = resolve(
      scene(
        {
          preset: 'reveal',
          camera: {
            keyframes: [
              { at: 0, zoom: 6 },
              { at: 1, zoom: 9 },
            ],
          },
        },
        { presets: { reveal: { camera: { preset: 'reveal-from-overview' } } } },
      ),
    ).motion;
    expect(keyed.camera.keyframes.map((frame) => frame.zoom)).toEqual([6, 9]);
  });

  it('frames a reveal-from-overview on named features instead of every layer', () => {
    // A close scene view, so neither overview is capped just outside it.
    const close = {
      scene: { id: 's', camera: { center: [-77.5, 39.3] as [number, number], zoom: 12 } },
    };
    const all = resolve(scene({ camera: { preset: 'reveal-from-overview' } }), close).motion;
    const { motion, diagnostics } = resolve(
      scene({ camera: { preset: 'reveal-from-overview', feature: ['gauges/a', 'gauges/b'] } }),
      close,
    );
    expect(diagnostics).toEqual([]);
    const [start] = motion.camera.keyframes;
    expect(start!.center[0]).toBeCloseTo(-77.3, 5);
    expect(start!.center[1]).toBeCloseTo(39.15, 1);
    // The gauges span less than the river, so their overview is closer.
    expect(start!.zoom).toBeGreaterThan(all.camera.keyframes[0]!.zoom);
    expect(start!.zoom).toBeLessThan(11.5);
  });

  it('reports unknown presets, sources and features with their paths', () => {
    expect(resolve(scene({ preset: 'missing' })).diagnostics).toEqual([
      expect.objectContaining({
        code: 'REFERENCE_MISSING',
        artifact: 'narrative',
        path: ['scenes', 0, 'motion', 'preset'],
        ids: { sceneId: 's' },
      }),
    ]);
    const bad = resolve(
      scene({ camera: { preset: 'fly-along', feature: ['river/upper', 'river/nope', 'lake/x'] } }),
    ).diagnostics;
    expect(bad).toEqual([
      expect.objectContaining({
        code: 'REFERENCE_MISSING',
        path: ['scenes', 0, 'motion', 'camera', 'feature', 1],
        ids: { sceneId: 's', sourceId: 'river', featureId: 'nope' },
      }),
      expect.objectContaining({
        code: 'REFERENCE_MISSING',
        path: ['scenes', 0, 'motion', 'camera', 'feature', 2],
        ids: { sceneId: 's', sourceId: 'lake' },
      }),
    ]);
    expect(
      resolve(scene({ camera: { preset: 'fly-along', feature: 'gauges/a' } })).diagnostics,
    ).toEqual([
      expect.objectContaining({
        code: 'VALUE_INVALID',
        path: ['scenes', 0, 'motion', 'camera', 'feature'],
        ids: { sceneId: 's', featureId: 'a' },
      }),
    ]);
    expect(resolve(scene({ camera: { preset: 'push-in' } })).diagnostics).toEqual([
      expect.objectContaining({
        code: 'VALUE_INVALID',
        path: ['scenes', 0, 'motion', 'camera', 'feature'],
      }),
    ]);
  });

  it('flies along chained line features with the bearing of travel', () => {
    const { motion, diagnostics } = resolve(
      scene({
        camera: { preset: 'fly-along', feature: ['river/upper', 'river/lower'], pitch: 60 },
      }),
    );
    expect(diagnostics).toEqual([]);
    expect(SceneMotionSchema.safeParse(motion).success).toBe(true);
    const frames = motion.camera.keyframes;
    expect(frames.length).toBeGreaterThan(10);
    expect(frames[0]!.center).toEqual([-78, 39.5]);
    expect(frames.at(-1)!.center).toEqual([-77, 39.5]);
    // Due east, the side channel ignored and the reversed segment reoriented.
    for (const frame of frames) {
      expect(frame.bearing).toBeCloseTo(90, 0);
      expect(frame.pitch).toBe(60);
      expect(frame.zoom).toBe(9);
    }
    const longitudes = frames.map((frame) => frame.center[0]);
    expect([...longitudes].sort((a, b) => a - b)).toEqual(longitudes);
    const reverse = resolve(
      scene({
        camera: { preset: 'fly-along', feature: ['river/upper', 'river/lower'], reverse: true },
      }),
    ).motion.camera;
    expect(reverse.final.center).toEqual([-78, 39.5]);
    expect(reverse.final.bearing).toBeCloseTo(-90, 0);
  });

  it('pushes in on features and orbits a full turn when looping', () => {
    const push = resolve(scene({ camera: { preset: 'push-in', feature: 'gauges/b', pitch: 30 } }))
      .motion.camera;
    expect(push.keyframes[0]).toMatchObject({ center: [-77.5, 39.3], zoom: 8, pitch: 0 });
    expect(push.final).toEqual({ center: [-77.1, 39], zoom: 10, pitch: 30, bearing: 0 });
    const both = resolve(
      scene({ camera: { preset: 'push-in', feature: ['gauges/a', 'gauges/b'] } }),
    ).motion.camera.final;
    expect(both.center).toEqual([-77.3, 39.15]);

    const orbit = resolve(scene({ camera: { preset: 'orbit', mode: 'loop' } })).motion.camera;
    expect(orbit).toMatchObject({ mode: 'loop', durationMs: 1600 });
    expect(orbit.final.bearing).toBe(360);
    expect(orbit.final.pitch).toBe(45);
    expect(orbit.keyframes.every((frame) => frame.easing === 'linear')).toBe(true);
    // Evenly turned: linear easing for an ambient loop unless authored.
    expect(orbit.keyframes[1]!.bearing).toBe(15);
  });

  it('sequences camera moves by range into one track', () => {
    const { motion, diagnostics } = resolve(
      scene({
        camera: [
          { preset: 'reveal-from-overview', range: [0, 0.4] },
          { preset: 'push-in', feature: 'gauges/b', range: [0.5, 1] },
        ],
      }),
    );
    expect(diagnostics).toEqual([]);
    expect(motion.camera.range).toEqual([0, 1]);
    expect(motion.camera.keyframes.map((frame) => frame.at)).toEqual([0, 0.4, 0.5, 1]);
    // The scene view holds between the moves, then the push-in starts from it.
    expect(motion.camera.keyframes[1]!.zoom).toBe(8);
    expect(motion.camera.keyframes[2]!.zoom).toBe(8);
    expect(motion.camera.final.zoom).toBe(10);

    expect(
      resolve(
        scene({
          camera: [
            { preset: 'hold', range: [0, 0.6] },
            { preset: 'orbit', range: [0.5, 1] },
          ],
        }),
      ).diagnostics,
    ).toEqual([
      expect.objectContaining({
        code: 'VALUE_INVALID',
        path: ['scenes', 0, 'motion', 'camera', 1, 'range'],
      }),
    ]);
    expect(
      resolve(
        scene({
          camera: [
            { preset: 'hold', mode: 'play' },
            { preset: 'orbit', mode: 'play' },
          ],
        }),
      ).diagnostics,
    ).toEqual([expect.objectContaining({ code: 'CAPABILITY_UNSUPPORTED' })]);
  });

  it('compiles layer tracks with data and ambient defaults and checks their layers', () => {
    const { motion, diagnostics } = resolve(
      scene(
        {
          preset: 'p',
          layers: [
            { layerId: 'river', property: 'line-reveal', range: [0, 0.5], mode: 'scrub' },
            { layerId: 'gauges', property: 'highlight', type: 'ambient' },
          ],
        },
        {
          story: { data: { durationMs: 500 } },
          presets: { p: { layers: [{ layerId: 'river', property: 'line-reveal', to: 0.8 }] } },
        },
      ),
    );
    expect(diagnostics).toEqual([]);
    expect(SceneMotionSchema.safeParse(motion).success).toBe(true);
    expect(motion.layers).toEqual([
      {
        mode: 'scrub',
        range: [0, 0.5],
        runtimeLayerId: 'mb:1:s:5:river',
        property: 'line-reveal',
        keyframes: [
          { at: 0, value: 0, easing: 'linear' },
          { at: 1, value: 0.8, easing: 'ease-out' },
        ],
        final: 0.8,
      },
      {
        mode: 'loop',
        range: [0, 1],
        durationMs: 2400,
        runtimeLayerId: 'mb:1:s:6:gauges',
        property: 'highlight',
        keyframes: [
          { at: 0, value: 0, easing: 'linear' },
          { at: 0.5, value: 1, easing: 'ease-in-out' },
          { at: 1, value: 0, easing: 'ease-in-out' },
        ],
        final: 0,
      },
    ]);
    const fade = resolve(scene({ layers: [{ layerId: 'gauges', property: 'opacity' }] }), {}).motion
      .layers[0];
    expect(fade).toMatchObject({ mode: 'play', durationMs: 900, final: 1 });

    const problems = resolve(
      scene({
        layers: [
          { layerId: 'gauges', property: 'line-reveal' },
          { layerId: 'nowhere', property: 'opacity' },
          { layerId: 'gauges', property: 'opacity' },
          { layerId: 'gauges', property: 'opacity', to: 0.5 },
        ],
      }),
      { controls: [{ runtimeLayerId: 'mb:1:s:6:gauges', property: 'opacity' }] },
    ).diagnostics.map((entry) => [entry.code, entry.path.join('.')]);
    expect(problems).toEqual([
      ['ID_DUPLICATE', 'scenes.0.motion.layers.3'],
      ['VALUE_INVALID', 'scenes.0.motion.layers.0.property'],
      ['REFERENCE_MISSING', 'scenes.0.motion.layers.1.layerId'],
      ['VALUE_INVALID', 'scenes.0.motion.layers.2.property'],
    ]);
  });

  it('asks the capability catalog for every preset and track property', () => {
    const asked: string[] = [];
    resolve(
      scene({
        camera: { preset: 'orbit' },
        layers: [{ layerId: 'river', property: 'line-reveal' }],
      }),
      {
        capability: (id) => {
          asked.push(id);
          return id !== 'motion.line-reveal';
        },
      },
    );
    expect(asked).toEqual(['camera.orbit', 'motion.line-reveal']);
  });
});
