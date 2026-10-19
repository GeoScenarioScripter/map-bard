import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { anchorMarkup, mediaMarkup, sceneMediaMarkup } from './media.js';
import { createPlayer } from './player.js';
import type { CompiledStory, MapAdapter, SceneView } from './types.js';

const specimen = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL('../../../docs/stage-1/specimens/compiled.expected.json', import.meta.url),
    ),
    'utf8',
  ),
) as CompiledStory;

function harness(story: CompiledStory = specimen, reducedMotion = () => false) {
  const events: string[] = [];
  const markers: { remove: ReturnType<typeof vi.fn> }[] = [];
  let change: ((id: string, value: boolean | number) => void) | undefined;
  const map: MapAdapter = {
    setCamera: (_camera, transition) => {
      events.push(`camera:${transition}`);
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
    addAnnotation: () => {
      const marker = { remove: vi.fn(() => events.push('annotation:remove')) };
      markers.push(marker);
      events.push('annotation:add');
      return marker;
    },
    setControl: (id, property, value) => {
      events.push(`control:${id}:${property}:${value}`);
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
    player: createPlayer(story, map, view, { reducedMotion }),
    events,
    markers,
    change: (id: string, value: boolean | number) => change?.(id, value),
  };
}

describe('compiled player foundation', () => {
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
    expect(() => harness({ ...specimen, compiledVersion: '9.0.0' })).toThrow(/Unsupported/);
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
