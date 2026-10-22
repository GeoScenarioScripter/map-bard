import type { CameraState } from '@mapbard/schema';
import { anchorMarkup, sceneMediaMarkup } from './media.js';
import { legendMarkup } from './legend.js';
import {
  APPROACH_MS,
  approachCamera,
  cameraAt,
  effectiveTrack,
  layerValueAt,
  pauseClock,
  sameCamera,
  staggerSpan,
  staggerT,
  trackFrame,
  type Track,
  type TrackClock,
} from './motion.js';
import type {
  CompiledControl,
  CompiledScene,
  CompiledStory,
  MapAdapter,
  MarkerHandle,
  SceneView,
} from './types.js';

export interface MotionStatus {
  /** The active scene has a looping track the reader can pause. */
  loop: boolean;
  paused: boolean;
}

export interface PlayerOptions {
  reducedMotion?: () => boolean;
  /** Clock and frame scheduler; the browser defaults are used when omitted. */
  now?: () => number;
  requestFrame?: (callback: () => void) => unknown;
  cancelFrame?: (handle: unknown) => void;
  /** Called when the active scene gains or loses a loop, or the reader pauses one. */
  onMotionChange?: (status: MotionStatus) => void;
}

type Approach = { from: CameraState; start: number; kind: 'ease' | 'fly' };

function defaultScheduler(): Pick<PlayerOptions, 'now' | 'requestFrame' | 'cancelFrame'> {
  const scope = globalThis as {
    performance?: { now(): number };
    requestAnimationFrame?: (callback: () => void) => number;
    cancelAnimationFrame?: (handle: number) => void;
    setTimeout?: (callback: () => void, ms: number) => unknown;
    clearTimeout?: (handle: unknown) => void;
  };
  const now = scope.performance ? () => scope.performance!.now() : () => Date.now();
  if (scope.requestAnimationFrame)
    return {
      now,
      requestFrame: (callback) => scope.requestAnimationFrame!(callback),
      cancelFrame: (handle) => scope.cancelAnimationFrame?.(handle as number),
    };
  if (scope.setTimeout)
    return {
      now,
      requestFrame: (callback) => scope.setTimeout!(callback, 16),
      cancelFrame: (handle) => scope.clearTimeout?.(handle),
    };
  return { now };
}

export function createPlayer(
  story: CompiledStory,
  map: MapAdapter,
  view: SceneView,
  options: PlayerOptions = {},
) {
  // A literal, not the schema constant: the IIFE player must not bundle Zod.
  if (story.compiledVersion !== '0.3.0')
    throw new Error(`Unsupported compiled version ${story.compiledVersion}`);
  const scheduler = { ...defaultScheduler(), ...options };
  const now = scheduler.now ?? (() => Date.now());
  const sceneById = new Map(story.scenes.map((scene) => [scene.id, scene]));
  const sceneIndex = new Map(story.scenes.map((scene, index) => [scene.id, index]));
  let active: CompiledScene | undefined;
  let markers: MarkerHandle[] = [];
  let disposeView: (() => void) | undefined;
  // Motion state of the active scene.
  let progress = 0;
  let armed = false;
  let settle = false;
  let paused = false;
  let clocks = new Map<Track, TrackClock>();
  let layerValues = new Map<string, number>();
  let approach: Approach | undefined;
  let shownCamera: CameraState | undefined;
  let frameHandle: unknown;
  let lastStatus = '';

  function reduced(): boolean {
    return options.reducedMotion?.() ?? false;
  }

  function tracks(scene: CompiledScene) {
    const policy = scene.motion.reducedMotion;
    const isReduced = reduced();
    return {
      camera: effectiveTrack(scene.motion.camera, policy, isReduced),
      layers: scene.motion.layers.map((track) => effectiveTrack(track, policy, isReduced)),
      callouts: scene.motion.callouts.map((track) => effectiveTrack(track, policy, isReduced)),
    };
  }

  function clockFor(track: Track): TrackClock {
    let clock = clocks.get(track);
    if (!clock) {
      clock = {};
      clocks.set(track, clock);
    }
    return clock;
  }

  function notify(scene: CompiledScene | undefined): void {
    const loop = scene
      ? Object.values(tracks(scene))
          .flat()
          .some((track) => track.mode === 'loop')
      : false;
    const status = { loop, paused };
    const key = JSON.stringify(status);
    if (key === lastStatus) return;
    lastStatus = key;
    options.onMotionChange?.(status);
  }

  /** Evaluate every track of the active scene and apply what changed. */
  function render(): void {
    frameHandle = undefined;
    const scene = active;
    if (!scene) return;
    const time = now();
    const state = { p: progress, armed, now: time, settle, paused };
    const { camera, layers, callouts } = tracks(scene);
    let running = false;
    // Effective tracks are rebuilt when reduced motion changes, so clocks key on the source track.
    const cameraFrame = trackFrame(camera, state, clockFor(scene.motion.camera));
    running ||= cameraFrame.running;
    let target = cameraAt(camera, cameraFrame.t);
    if (approach) {
      const tau = (time - approach.start) / APPROACH_MS[approach.kind];
      if (tau >= 1 || settle || reduced()) approach = undefined;
      else {
        target = approachCamera(approach.from, target, tau, approach.kind);
        running = true;
      }
    }
    if (!sameCamera(shownCamera, target)) {
      map.setCamera(target, 'cut');
      shownCamera = target;
    }
    layers.forEach((track, index) => {
      const clock = clockFor(scene.motion.layers[index]!);
      const stagger = track.stagger;
      if (
        stagger &&
        track.property !== 'line-reveal' &&
        (track.mode === 'play' || track.mode === 'loop')
      ) {
        // Each feature runs the track, offset by its rank; the clock spans all of them.
        const count = map.staggerCount(track.runtimeLayerId, stagger);
        const frame = trackFrame({ ...track, durationMs: staggerSpan(track, count) }, state, clock);
        running ||= frame.running;
        const key = `${track.runtimeLayerId}\u0000${track.property}`;
        if (layerValues.get(key) !== frame.t) {
          map.setLayerFeatureValues(track.runtimeLayerId, track.property, stagger, (rank) =>
            layerValueAt(track, staggerT(track, count, frame.t, rank)),
          );
          layerValues.set(key, frame.t);
        }
        return;
      }
      const frame = trackFrame(track, state, clock);
      running ||= frame.running;
      const value = layerValueAt(track, frame.t);
      const key = `${track.runtimeLayerId}\u0000${track.property}`;
      if (layerValues.get(key) !== value) {
        map.setLayerProperty(track.runtimeLayerId, track.property, value);
        layerValues.set(key, value);
      }
    });
    callouts.forEach((track, index) => {
      const frame = trackFrame(track, state, clockFor(scene.motion.callouts[index]!));
      running ||= frame.running;
      const value = layerValueAt(track, frame.t);
      const key = `callout\u0000${track.calloutId}`;
      if (layerValues.get(key) !== value) {
        map.setCalloutOpacity(track.calloutId, value);
        layerValues.set(key, value);
      }
    });
    if (running && scheduler.requestFrame) frameHandle = scheduler.requestFrame(render);
  }

  function requestRender(): void {
    if (frameHandle !== undefined) scheduler.cancelFrame?.(frameHandle);
    render();
  }

  function clearActive(): void {
    if (frameHandle !== undefined) scheduler.cancelFrame?.(frameHandle);
    frameHandle = undefined;
    disposeView?.();
    disposeView = undefined;
    for (const marker of markers) marker.remove();
    markers = [];
    for (const layer of active?.layers ?? []) map.unbindLayer(layer.runtimeId);
    active = undefined;
    clocks = new Map();
    layerValues = new Map();
    approach = undefined;
  }

  function controlFor(scene: CompiledScene, id: string): CompiledControl {
    const control = scene.controls.find((item) => item.id === id);
    if (
      !control ||
      control.sceneId !== scene.id ||
      !scene.layers.some((layer) => layer.runtimeId === control.runtimeLayerId)
    ) {
      throw new Error(`Control ${id} is not bound in active scene ${scene.id}`);
    }
    return control;
  }

  function setControl(id: string, value: boolean | number): void {
    if (!active) throw new Error('No active scene');
    const control = controlFor(active, id);
    if (
      control.kind === 'toggle'
        ? typeof value !== 'boolean'
        : typeof value !== 'number' || !Number.isFinite(value)
    ) {
      throw new Error(`Invalid value for control ${id}`);
    }
    if (
      typeof value === 'number' &&
      control.range &&
      (value < control.range[0] || value > control.range[1])
    ) {
      throw new Error(`Value out of range for control ${id}`);
    }
    map.setControl(control.runtimeLayerId, control.property, value);
  }

  /** The hand-over between two scenes belongs to the later one, in either scroll direction. */
  function transitionBetween(previous: CompiledScene | undefined, next: CompiledScene) {
    if (!previous || reduced()) return 'cut';
    const later =
      (sceneIndex.get(next.id) ?? 0) >= (sceneIndex.get(previous.id) ?? 0) ? next : previous;
    return later.transitionIn ?? 'ease';
  }

  function show(sceneId: string, p: number, isArmed: boolean): void {
    const next = sceneById.get(sceneId);
    if (!next) throw new Error(`Unknown scene ${sceneId}`);
    // Resolve media and bindings before disturbing the currently visible scene.
    const mediaHtml = sceneMediaMarkup(next, story.resources);
    const anchorHtml = next.mediaAnchors.map((anchor) => anchorMarkup(anchor, story.resources));
    const legendHtml = legendMarkup(next, story);
    for (const control of next.controls) controlFor(next, control.id);
    const previous = active;
    const transition = settle ? 'cut' : transitionBetween(previous, next);
    const from = shownCamera;
    clearActive();
    active = next;
    progress = p;
    armed = isArmed;
    try {
      // Panels first: the camera padding measures the legends and media they show.
      disposeView = view.showScene(next, mediaHtml, setControl, legendHtml);
      for (const layer of next.layers) map.bindLayer(layer);
      for (const control of next.controls) setControl(control.id, control.default);
      for (const [index, anchor] of next.mediaAnchors.entries()) {
        markers.push(map.addMarker(anchor, anchorHtml[index]!));
      }
      if (next.callouts.length) markers.push(map.showCallouts(next));
      if (transition !== 'cut' && from) approach = { from, start: now(), kind: transition };
      // Fresh layers are drawn with their authored style; apply track values at once.
      shownCamera = undefined;
      render();
    } catch (error) {
      clearActive();
      view.clear();
      throw error;
    }
    notify(next);
  }

  /** Enter a scene at its start, before its trigger: timed tracks wait. */
  function enter(sceneId: string): void {
    settle = false;
    show(sceneId, 0, false);
  }

  /** Scroll position: scene `p` in [0, 1]; `isArmed` once the scene reached its trigger line. */
  function update(sceneId: string, p: number, isArmed = true): void {
    settle = false;
    const value = Math.max(0, Math.min(1, Number.isFinite(p) ? p : 0));
    if (active?.id !== sceneId) return show(sceneId, value, isArmed);
    progress = value;
    armed = armed || isArmed;
    requestRender();
  }

  /** Capture only: jump to `p` with timed tracks settled, so screenshots do not depend on timing. */
  function seek(sceneId: string, p: number): void {
    settle = true;
    const value = Math.max(0, Math.min(1, Number.isFinite(p) ? p : 0));
    if (active?.id !== sceneId) show(sceneId, value, true);
    else {
      progress = value;
      armed = true;
      approach = undefined;
      requestRender();
    }
  }

  function setPaused(value: boolean): void {
    if (value === paused) return;
    paused = value;
    const time = now();
    for (const clock of clocks.values()) pauseClock(clock, paused, time);
    notify(active);
    requestRender();
  }

  function dispose(): void {
    clearActive();
    view.clear();
    notify(undefined);
  }

  return {
    enter,
    update,
    seek,
    setControl,
    setPaused,
    dispose,
    isPaused: () => paused,
    activeSceneId: () => active?.id,
    progress: () => (active ? { sceneId: active.id, p: progress } : undefined),
  };
}
