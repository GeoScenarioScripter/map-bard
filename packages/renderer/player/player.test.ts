import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { anchorMarkup, mediaMarkup, sceneMediaMarkup } from './media.js';
import { createPlayer, type MotionStatus } from './player.js';
import type { CompiledStory, MapAdapter, SceneView } from './types.js';
import type { CameraState } from '@mapbard/schema';

const specimen = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../../../fixtures/two-period/compiled.expected.json', import.meta.url)),
    'utf8',
  ),
) as CompiledStory;

function harness(story: CompiledStory = specimen, reducedMotion = () => false) {
  const events: string[] = [];
  const cameras: CameraState[] = [];
  const statuses: MotionStatus[] = [];
  const clock = { now: 0, frames: [] as (() => void)[] };
  const markers: { remove: ReturnType<typeof vi.fn> }[] = [];
  let change: ((id: string, value: boolean | number) => void) | undefined;
  const map: MapAdapter = {
    setCamera: (camera, transition) => {
      events.push(`camera:${transition}`);
      cameras.push(camera as CameraState);
    },
    bindLayer: (layer) => {
      events.push(`bind:${layer.runtimeId}:${layer.sourceId}`);
    },
    unbindLayer: (id) => {
      events.push(`unbind:${id}`);
    },
    addMarker: () => {
      const marker = {
        remove: vi.fn(() => {
          events.push('marker:remove');
        }),
      };
      markers.push(marker);
      events.push('marker:add');
      return marker;
    },
    onFrame: () => () => {},
    project: ([lng, lat]) => ({ x: lng, y: lat }),
    setControl: (id, property, value) => {
      events.push(`control:${id}:${property}:${value}`);
    },
    showCallouts: (scene) => {
      const marker = { remove: vi.fn(() => events.push(`callouts:remove:${scene.id}`)) };
      markers.push(marker);
      events.push(`callouts:${scene.callouts.map((callout) => callout.id).join(',')}`);
      return marker;
    },
    bearing: () => 0,
    setLayerProperty: (id, property, value) => {
      events.push(`track:${id}:${property}:${Math.round(value * 1000) / 1000}`);
    },
    drawnSymbols: () => [],
    staggerCount: () => 3,
    setLayerFeatureValues: (id, property, _stagger, valueAt) => {
      const values = [0, 1, 2].map((rank) => Math.round(valueAt(rank) * 1000) / 1000);
      events.push(`stagger:${id}:${property}:${values.join(',')}`);
    },
    setCalloutOpacity: (id, value) => {
      events.push(`callout:${id}:${Math.round(value * 1000) / 1000}`);
    },
  };
  const view: SceneView = {
    showScene: (_scene, _media, onControl) => {
      change = onControl;
      events.push('view:show');
      return () => {
        change = undefined;
        events.push('view:dispose');
      };
    },
    clear: () => {
      events.push('view:clear');
    },
  };
  return {
    player: createPlayer(story, map, view, {
      reducedMotion,
      now: () => clock.now,
      requestFrame: (callback) => clock.frames.push(callback),
      cancelFrame: () => {
        clock.frames.length = 0;
      },
      onMotionChange: (status) => statuses.push(status),
    }),
    /** Advance the clock and run the frames the player asked for. */
    tick: (ms: number) => {
      clock.now += ms;
      const due = clock.frames.splice(0);
      for (const frame of due) frame();
      return due.length;
    },
    pending: () => clock.frames.length,
    cameras,
    statuses,
    events,
    markers,
    change: (id: string, value: boolean | number) => change?.(id, value),
  };
}

describe('compiled player foundation', () => {
  it('applies visibility and radius defaults and routes authored camera transitions', () => {
    const story = structuredClone(specimen);
    const layerId = story.scenes[0]!.layers[0]!.runtimeId;
    story.scenes[0]!.transitionIn = 'ease';
    story.scenes[1]!.transitionIn = 'fly';
    story.scenes[0]!.controls.push(
      {
        sceneId: 'a',
        id: 'visible',
        kind: 'toggle',
        label: 'Visible',
        runtimeLayerId: layerId,
        property: 'visibility',
        default: true,
      },
      {
        sceneId: 'a',
        id: 'radius',
        kind: 'slider',
        label: 'Radius',
        runtimeLayerId: layerId,
        property: 'radius',
        default: 6,
        range: [2, 10],
      },
    );
    const { player, events } = harness(story);
    player.enter('a');
    player.setControl('visible', false);
    player.setControl('radius', 8);
    player.enter('b');
    player.enter('a');
    // The player drives every camera frame itself; scenes hand over by blending, never by map tweens.
    expect(new Set(events.filter((event) => event.startsWith('camera:')))).toEqual(
      new Set(['camera:cut']),
    );
    expect(events.filter((event) => event === `control:${layerId}:visibility:true`)).toHaveLength(
      2,
    );
    expect(events.filter((event) => event === `control:${layerId}:radius:6`)).toHaveLength(2);
    expect(events).toContain(`control:${layerId}:visibility:false`);
    expect(events).toContain(`control:${layerId}:radius:8`);
  });

  it('consumes the frozen specimen and isolates same-authored-ID bindings by runtime ID', () => {
    const { player, events } = harness();
    player.enter('a');
    expect(events).toContain('bind:mb:1:a:5:sites:period-a');
    expect(events).toContain('control:mb:1:a:5:sites:opacity:0.8');
    player.enter('b');
    expect(events).toContain('unbind:mb:1:a:5:sites');
    expect(events).toContain('bind:mb:1:b:5:sites:period-b');
    expect(events.indexOf('unbind:mb:1:a:5:sites')).toBeLessThan(
      events.indexOf('bind:mb:1:b:5:sites:period-b'),
    );
    expect(() => player.setControl('opacity', 0.4)).toThrow(/not bound/);
  });

  it('restores authored defaults on revisit and rejects invalid control values', () => {
    const { player, events, change } = harness();
    player.enter('a');
    change('opacity', 0.2);
    player.enter('b');
    player.enter('a');
    expect(events.filter((event) => event === 'control:mb:1:a:5:sites:opacity:0.8')).toHaveLength(
      2,
    );
    expect(events).toContain('control:mb:1:a:5:sites:opacity:0.2');
    expect(() => player.setControl('opacity', 2)).toThrow(/out of range/);
    expect(() => player.setControl('opacity', true)).toThrow(/Invalid value/);
  });

  it('cleans markers and view callbacks when scenes change or player disposes', () => {
    const story = structuredClone(specimen);
    story.scenes[0]!.mediaAnchors = [{ assetId: 'photo', at: [-77, 39], trigger: 'marker' }];
    story.resources.push({ id: 'photo', kind: 'image', bundlePath: 'media/photo.jpg' });
    const { player, events, markers } = harness(story);
    player.enter('a');
    expect(markers).toHaveLength(2);
    player.enter('b');
    expect(markers[0]!.remove).toHaveBeenCalledOnce();
    expect(markers[1]!.remove).toHaveBeenCalledOnce();
    expect(events.indexOf('view:dispose')).toBeLessThan(
      events.indexOf('bind:mb:1:b:5:sites:period-b'),
    );
    player.dispose();
    expect(events.at(-1)).toBe('view:clear');
    expect(player.activeSceneId()).toBeUndefined();
  });

  it('shows each scene callouts once and removes them before the next scene', () => {
    const story = structuredClone(specimen);
    story.scenes[1]!.callouts = [];
    const { player, events } = harness(story);
    player.enter('a');
    player.enter('b');
    player.enter('a');
    player.dispose();
    expect(events.filter((event) => event.startsWith('callouts'))).toEqual([
      'callouts:where-one',
      'callouts:remove:a',
      'callouts:where-one',
      'callouts:remove:a',
    ]);
  });

  it('cuts all transitions when reduced motion is requested', () => {
    const { player, events } = harness(specimen, () => true);
    player.enter('a');
    player.enter('b');
    expect(events.filter((event) => event.startsWith('camera:'))).toEqual([
      'camera:cut',
      'camera:cut',
    ]);
  });

  it('escapes media metadata and rejects unsafe locations', () => {
    const resources: CompiledStory['resources'] = [
      {
        id: 'photo',
        kind: 'image',
        bundlePath: 'media/photo.jpg',
        name: '<name>',
        credit: '<script>x</script>',
        qualification: 'Context only <unverified>',
      },
      {
        id: 'video',
        kind: 'video',
        remoteUrl: 'https://example.com/video.mp4?a=1&b=2',
        posterId: 'photo',
      },
    ];
    expect(mediaMarkup(resources, 'photo', '"<caption>')).toContain('alt="&quot;&lt;caption&gt;"');
    expect(mediaMarkup(resources, 'photo')).toContain('&lt;script&gt;x&lt;/script&gt;');
    expect(mediaMarkup(resources, 'photo')).toContain('Context only &lt;unverified&gt;');
    expect(mediaMarkup(resources, 'video')).toContain('poster="media/photo.jpg"');
    expect(mediaMarkup(resources, 'video')).toContain('a=1&amp;b=2');
    expect(
      anchorMarkup({ assetId: 'photo', at: [0, 0], trigger: 'marker', label: '<pin>' }, resources),
    ).toContain('&lt;pin&gt;');
    expect(
      sceneMediaMarkup(
        {
          ...specimen.scenes[0]!,
          media: [{ assetId: 'photo', caption: '<test>', placement: 'background' }],
        },
        resources,
      ),
    ).toContain('class="mb-media mb-media--background"');
    expect(() =>
      mediaMarkup([{ id: 'bad', kind: 'image', bundlePath: '../secret' }], 'bad'),
    ).toThrow(/Unsafe/);
    expect(() =>
      mediaMarkup([{ id: 'bad', kind: 'image', remoteUrl: 'javascript:alert(1)' }], 'bad'),
    ).toThrow(/No safe/);
  });

  it('rejects unknown compiled versions and scene IDs', () => {
    const badVersion = { ...specimen, compiledVersion: '9.0.0' } as unknown as CompiledStory;
    expect(() => harness(badVersion)).toThrow(/Unsupported/);
    expect(() => harness().player.enter('missing')).toThrow(/Unknown scene/);
  });

  it('keeps the active scene when a later scene has unresolved media', () => {
    const story = structuredClone(specimen);
    story.scenes[1]!.media = [{ assetId: 'missing-photo' }];
    const { player, events } = harness(story);
    player.enter('a');
    expect(() => player.enter('b')).toThrow(/Missing media/);
    expect(player.activeSceneId()).toBe('a');
    expect(events).not.toContain('unbind:mb:1:a:5:sites');
  });
});

const camera = (zoom: number, lng = -77.2) => ({
  center: [lng, 39.2] as [number, number],
  zoom,
  pitch: 0,
  bearing: 0,
});

function withMotion(edit: (story: CompiledStory) => void): CompiledStory {
  const story = structuredClone(specimen);
  edit(story);
  return story;
}

const fade = (runtimeLayerId: string, mode: 'play' | 'loop' = 'play') => ({
  mode,
  range: [0.2, 1] as [number, number],
  durationMs: 1000,
  runtimeLayerId,
  property: 'opacity' as const,
  keyframes: [
    { at: 0, value: 0, easing: 'linear' as const },
    { at: 1, value: 1, easing: 'linear' as const },
  ],
  final: 1,
});

describe('motion playback', () => {
  const scrubbing = withMotion((story) => {
    story.scenes[0]!.motion.camera = {
      mode: 'scrub',
      range: [0, 1],
      keyframes: [
        { at: 0, ...camera(4), easing: 'linear' },
        { at: 1, ...camera(8), easing: 'linear' },
      ],
      final: camera(8),
    };
    story.scenes[0]!.motion.layers = [fade('mb:1:a:5:sites')];
    story.scenes[1]!.motion.camera.keyframes = [{ at: 0, ...camera(10, -76), easing: 'linear' }];
    story.scenes[1]!.motion.camera.final = camera(10, -76);
    story.scenes[1]!.transitionIn = 'ease';
  });

  it('scrubs the camera with progress and plays timed tracks once armed', () => {
    const { player, cameras, events, tick, pending } = harness(scrubbing);
    player.enter('a');
    expect(cameras.at(-1)).toEqual(camera(4));
    // Not armed yet (still above the trigger line): the fade waits at its first value.
    expect(events.at(-1)).toBe('track:mb:1:a:5:sites:opacity:0');
    expect(pending()).toBe(0);
    player.update('a', 0.5, true);
    expect(cameras.at(-1)).toEqual(camera(6));
    expect(pending()).toBe(1);
    tick(500);
    expect(events.at(-1)).toBe('track:mb:1:a:5:sites:opacity:0.5');
    tick(600);
    expect(events.at(-1)).toBe('track:mb:1:a:5:sites:opacity:1');
    expect(pending()).toBe(0);
    player.update('a', 1);
    expect(cameras.at(-1)).toEqual(camera(8));
  });

  it('staggers a play track feature by feature and fades callouts with their tracks', () => {
    const staggered = withMotion((story) => {
      story.scenes[0]!.motion.layers = [
        { ...fade('mb:1:a:5:sites'), stagger: { delayMs: 250, order: 'data' } },
      ];
      story.scenes[0]!.motion.callouts = [
        {
          mode: 'play',
          range: [0.2, 1],
          durationMs: 400,
          delayMs: 1100,
          calloutId: 'where-one',
          keyframes: [
            { at: 0, value: 0, easing: 'linear' },
            { at: 1, value: 1, easing: 'linear' },
          ],
          final: 1,
        },
      ];
    });
    const { player, events, tick, pending } = harness(staggered);
    player.enter('a');
    expect(events).toContain('stagger:mb:1:a:5:sites:opacity:0,0,0');
    expect(events).toContain('callout:where-one:0');
    player.update('a', 0.5, true);
    tick(500);
    // Three features, 250 ms apart, 1000 ms each: the clock spans 1500 ms.
    expect(events.filter((item) => item.startsWith('stagger:')).at(-1)).toBe(
      'stagger:mb:1:a:5:sites:opacity:0.5,0.25,0',
    );
    tick(1000);
    expect(events.filter((item) => item.startsWith('stagger:')).at(-1)).toBe(
      'stagger:mb:1:a:5:sites:opacity:1,1,1',
    );
    // The callout waited 1100 ms, then fades in over 400 ms.
    expect(events.filter((item) => item.startsWith('callout:')).at(-1)).toBe('callout:where-one:1');
    expect(pending()).toBe(0);
  });

  it('hands the camera over between scenes by the later scene transition in both directions', () => {
    const { player, cameras, tick, pending } = harness(scrubbing);
    player.update('a', 1);
    player.update('b', 0);
    // The blend starts from the camera the reader saw.
    expect(cameras.at(-1)).toEqual(camera(8));
    tick(350);
    expect(cameras.at(-1)!.zoom).toBeCloseTo(9, 1);
    tick(400);
    expect(cameras.at(-1)).toEqual(camera(10, -76));
    expect(pending()).toBe(0);
    // Scrolling back up uses scene b's transition too.
    player.update('a', 1);
    expect(cameras.at(-1)).toEqual(camera(10, -76));
    tick(800);
    expect(cameras.at(-1)).toEqual(camera(8));
  });

  it('jumps to final states under reduced motion and shortens fades on request', () => {
    const stepped = harness(scrubbing, () => true);
    stepped.player.enter('a');
    stepped.player.update('a', 0.3, true);
    expect(stepped.cameras.at(-1)).toEqual(camera(8));
    expect(stepped.events.at(-1)).toBe('track:mb:1:a:5:sites:opacity:1');
    expect(stepped.pending()).toBe(0);

    const shortened = harness(
      withMotion((story) => {
        story.scenes[0]!.motion = { ...scrubbing.scenes[0]!.motion, reducedMotion: 'shorten' };
      }),
      () => true,
    );
    shortened.player.update('a', 0.3, true);
    expect(shortened.cameras.at(-1)).toEqual(camera(8));
    shortened.tick(125);
    expect(shortened.events.at(-1)).toBe('track:mb:1:a:5:sites:opacity:0.5');
    shortened.tick(125);
    expect(shortened.events.at(-1)).toBe('track:mb:1:a:5:sites:opacity:1');

    const kept = harness(
      withMotion((story) => {
        story.scenes[0]!.motion = { ...scrubbing.scenes[0]!.motion, reducedMotion: 'keep' };
      }),
      () => true,
    );
    kept.player.update('a', 0.5, true);
    expect(kept.cameras.at(-1)).toEqual(camera(6));
  });

  it('pauses loops, reports them for the pause control, and ends them in their final state', () => {
    const looping = withMotion((story) => {
      story.scenes[0]!.motion.layers = [fade('mb:1:a:5:sites', 'loop')];
    });
    const { player, events, tick, pending, statuses } = harness(looping);
    player.update('a', 0.5, true);
    expect(statuses.at(-1)).toEqual({ loop: true, paused: false });
    tick(250);
    expect(events.at(-1)).toBe('track:mb:1:a:5:sites:opacity:0.25');
    tick(1000);
    expect(events.at(-1)).toBe('track:mb:1:a:5:sites:opacity:0.25');
    player.setPaused(true);
    expect(statuses.at(-1)).toEqual({ loop: true, paused: true });
    expect(pending()).toBe(0);
    tick(5000);
    player.setPaused(false);
    tick(250);
    expect(events.at(-1)).toBe('track:mb:1:a:5:sites:opacity:0.5');
    player.update('b', 0);
    expect(statuses.at(-1)).toEqual({ loop: false, paused: false });
  });

  it('seeks to a settled state for capture', () => {
    const { player, cameras, events, pending } = harness(scrubbing);
    player.seek('a', 0.5);
    expect(cameras.at(-1)).toEqual(camera(6));
    expect(events.at(-1)).toBe('track:mb:1:a:5:sites:opacity:1');
    player.seek('a', 0);
    // Before the fade's range starts it shows its first value.
    expect(events.at(-1)).toBe('track:mb:1:a:5:sites:opacity:0');
    player.seek('b', 1);
    expect(cameras.at(-1)).toEqual(camera(10, -76));
    expect(pending()).toBe(0);
    expect(player.progress()).toEqual({ sceneId: 'b', p: 1 });
  });
});
