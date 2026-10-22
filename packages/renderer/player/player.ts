import { anchorMarkup, sceneMediaMarkup } from './media.js';
import { legendMarkup } from './legend.js';
import type {
  CompiledControl,
  CompiledScene,
  CompiledStory,
  MapAdapter,
  MarkerHandle,
  SceneView,
} from './types.js';

export interface PlayerOptions {
  reducedMotion?: () => boolean;
}

export function createPlayer(
  story: CompiledStory,
  map: MapAdapter,
  view: SceneView,
  options: PlayerOptions = {},
) {
  if (story.compiledVersion !== '0.1.0' && story.compiledVersion !== '0.2.0')
    throw new Error(`Unsupported compiled version ${story.compiledVersion}`);
  const sceneById = new Map(story.scenes.map((scene) => [scene.id, scene]));
  let active: CompiledScene | undefined;
  let markers: MarkerHandle[] = [];
  let disposeView: (() => void) | undefined;

  function clearActive(): void {
    disposeView?.();
    disposeView = undefined;
    for (const marker of markers) marker.remove();
    markers = [];
    for (const layer of active?.layers ?? []) map.unbindLayer(layer.runtimeId);
    active = undefined;
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

  function enter(sceneId: string): void {
    const next = sceneById.get(sceneId);
    if (!next) throw new Error(`Unknown scene ${sceneId}`);
    // Resolve media and bindings before disturbing the currently visible scene.
    const mediaHtml = sceneMediaMarkup(next, story.resources);
    const anchorHtml = next.mediaAnchors.map((anchor) => anchorMarkup(anchor, story.resources));
    const legendHtml = legendMarkup(next, story);
    for (const control of next.controls) controlFor(next, control.id);
    const firstEntry = !active;
    clearActive();
    const transition =
      firstEntry || options.reducedMotion?.() ? 'cut' : (next.transitionIn ?? 'ease');
    active = next;
    try {
      // Panels first: the camera padding measures the legends and media they show.
      disposeView = view.showScene(next, mediaHtml, setControl, legendHtml);
      map.setCamera(next.camera, transition);
      for (const layer of next.layers) map.bindLayer(layer);
      for (const control of next.controls) setControl(control.id, control.default);
      for (const [index, anchor] of next.mediaAnchors.entries()) {
        markers.push(map.addMarker(anchor, anchorHtml[index]!));
      }
      for (const annotation of next.annotations) markers.push(map.addAnnotation(annotation));
    } catch (error) {
      clearActive();
      view.clear();
      throw error;
    }
  }

  function dispose(): void {
    clearActive();
    view.clear();
  }

  return { enter, setControl, dispose, activeSceneId: () => active?.id };
}
