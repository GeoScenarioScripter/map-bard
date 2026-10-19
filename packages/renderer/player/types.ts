import type { Compiled } from '@mapbard/schema';

// Aliases derive from the public contract; no private consumer shape can drift.
export type CompiledStory = Compiled;
export type CompiledScene = Compiled['scenes'][number];
export type CompiledLayer = CompiledScene['layers'][number];
export type CompiledControl = CompiledScene['controls'][number];
export type CompiledResource = Compiled['resources'][number];
export type CompiledAnnotation = CompiledScene['annotations'][number];
export interface MarkerHandle {
  remove(): void;
}

/** The map owns physical layers and markers; the player owns their scene lifetime. */
export interface MapAdapter {
  setCamera(camera: CompiledScene['camera'], transition: 'cut' | 'ease' | 'fly'): void;
  bindLayer(layer: CompiledLayer): void;
  unbindLayer(runtimeId: string): void;
  addMarker(anchor: CompiledScene['mediaAnchors'][number], popupHtml: string): MarkerHandle;
  addAnnotation(annotation: CompiledAnnotation): MarkerHandle;
  setControl(
    runtimeLayerId: string,
    property: CompiledControl['property'],
    value: boolean | number,
  ): void;
}

export interface SceneView {
  showScene(
    scene: CompiledScene,
    mediaHtml: string,
    onControl: (controlId: string, value: boolean | number) => void,
    legendHtml?: string,
  ): () => void;
  clear(): void;
}
