import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
import { parseCompiled } from '@mapbard/schema';
import type { createPlayer } from './player.js';
import type { MapAdapter, SceneView } from './types.js';

const parsed = parseCompiled(
  JSON.parse(
    readFileSync(
      new URL('../../../fixtures/two-period/compiled.expected.json', import.meta.url),
      'utf8',
    ),
  ),
);
if (!parsed.ok) throw new Error(JSON.stringify(parsed.diagnostics));
const specimen = parsed.value;
// Resolve the package's published asset contract; never substitute TS source.
const script = readFileSync(
  createRequire(import.meta.url).resolve('@mapbard/renderer/player.js'),
  'utf8',
);

function harness(reducedMotion = false) {
  const sandbox: {
    MapBardCompiledPlayer?: {
      createPlayer: typeof createPlayer;
      createDomView: unknown;
      createMapLibreAdapter: unknown;
      observeScenes: unknown;
    };
  } = {};
  runInNewContext(script, sandbox, { timeout: 1000 });
  expect(typeof sandbox.MapBardCompiledPlayer?.createDomView).toBe('function');
  expect(typeof sandbox.MapBardCompiledPlayer?.createMapLibreAdapter).toBe('function');
  expect(typeof sandbox.MapBardCompiledPlayer?.observeScenes).toBe('function');
  if (!sandbox.MapBardCompiledPlayer) throw new Error('Built player global is missing');
  const map: MapAdapter = {
    setCamera: vi.fn(),
    bindLayer: vi.fn(),
    unbindLayer: vi.fn(),
    addMarker: vi.fn(() => ({ remove: vi.fn() })),
    addAnnotation: vi.fn(() => ({ remove: vi.fn() })),
    setControl: vi.fn(),
  };
  const disposeView = vi.fn();
  const view: SceneView = { showScene: vi.fn(() => disposeView), clear: vi.fn() };
  const story = structuredClone(specimen);
  const player = sandbox.MapBardCompiledPlayer.createPlayer(story, map, view, {
    reducedMotion: () => reducedMotion,
  });
  return { player, map, view, story, disposeView, api: sandbox.MapBardCompiledPlayer };
}

describe('G2 built classic-script IIFE (build first; not a browser check)', () => {
  it('consumes the validated frozen specimen with isolated bindings and reset on revisit', () => {
    const { player, map, view, story, disposeView } = harness();
    player.enter('a');
    expect(map.bindLayer).toHaveBeenLastCalledWith(specimen.scenes[0]!.layers[0]);
    expect(map.setCamera).toHaveBeenLastCalledWith(specimen.scenes[0]!.camera, 'cut');
    player.setControl('opacity', 0.2);
    expect(map.setControl).toHaveBeenLastCalledWith('mb:1:a:5:sites', 'opacity', 0.2);
    player.enter('b');
    expect(map.unbindLayer).toHaveBeenLastCalledWith('mb:1:a:5:sites');
    expect(map.bindLayer).toHaveBeenLastCalledWith(specimen.scenes[1]!.layers[0]);
    expect(() => player.setControl('opacity', 0.3)).toThrow(/not bound/);
    player.enter('a');
    expect(map.unbindLayer).toHaveBeenLastCalledWith('mb:1:b:5:sites');
    expect(map.setControl).toHaveBeenLastCalledWith('mb:1:a:5:sites', 'opacity', 0.8);
    expect(story).toEqual(specimen);
    player.dispose();
    expect(disposeView).toHaveBeenCalledTimes(3);
    expect(view.clear).toHaveBeenCalledOnce();
    expect(player.activeSceneId()).toBeUndefined();
  });

  it('honors reduced motion and rejects unsupported versions in the built artifact', () => {
    const { player, map, view, api } = harness(true);
    player.enter('a');
    player.enter('b');
    expect(map.setCamera).toHaveBeenLastCalledWith(specimen.scenes[1]!.camera, 'cut');
    expect(() =>
      api.createPlayer(
        // @ts-expect-error Intentional untrusted-input version mutation.
        { ...specimen, compiledVersion: '9.0.0' },
        map,
        view,
      ),
    ).toThrow(/Unsupported compiled version/);
  });
});
