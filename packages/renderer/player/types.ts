import type { Compiled, LayerTrackProperty } from '@mapbard/schema';

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
  /** Runs after every rendered frame, including each frame of a camera move; returns an unsubscribe. */
  onFrame(listener: () => void): () => void;
  /** Screen position of a map coordinate, in CSS pixels from the map container's top left. */
  project(at: readonly [number, number]): { x: number; y: number };
  setControl(
    runtimeLayerId: string,
    property: CompiledControl['property'],
    value: boolean | number,
  ): void;
  /** Draw a scene's callouts (label, leader, halo) and keep them placed on every frame. */
  showCallouts(scene: CompiledScene): MarkerHandle;
  /** Current map bearing in degrees, read live because camera tracks animate it. */
  bearing(): number;
  /** Apply a motion track value in [0, 1] to an active layer (opacity factor, reveal fraction, highlight strength). */
  setLayerProperty(runtimeLayerId: string, property: LayerTrackProperty, value: number): void;
  /** Every shown point symbol as a screen circle (map container pixels), for visual QA. */
  drawnSymbols(): { layerId: string; x: number; y: number; radius: number }[];
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
