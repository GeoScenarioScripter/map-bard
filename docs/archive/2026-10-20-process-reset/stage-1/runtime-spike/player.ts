/* Disposable S1-W1-C spike. No production package imports. */
export interface Scene {
  id: string;
  camera: { center: [number, number]; zoom: number };
  layers: { id: string; sourceId: string; radius: number }[];
  markers?: string[];
}

export interface MapAdapter {
  addLayer(runtimeId: string, sourceId: string, radius: number): void;
  removeLayer(runtimeId: string): void;
  setCamera(camera: Scene['camera']): void;
  addMarker(id: string): void;
  clearMarkers(): void;
  setRadius(runtimeId: string, radius: number): void;
}

export function runtimeLayerId(sceneId: string, layerId: string): string {
  return `scene:${sceneId.length}:${sceneId}:layer:${layerId.length}:${layerId}`;
}

export function createPlayer(scenes: Scene[], map: MapAdapter) {
  let active: Scene | undefined;

  function enter(sceneId: string): void {
    const next = scenes.find((scene) => scene.id === sceneId);
    if (!next) throw new Error(`Unknown scene: ${sceneId}`);

    map.clearMarkers();
    for (const layer of active?.layers ?? []) {
      map.removeLayer(runtimeLayerId(active!.id, layer.id));
    }

    map.setCamera(next.camera);
    for (const layer of next.layers) {
      map.addLayer(runtimeLayerId(next.id, layer.id), layer.sourceId, layer.radius);
    }
    for (const marker of next.markers ?? []) map.addMarker(marker);
    active = next;
  }

  function setRadius(layerId: string, radius: number): void {
    if (!active?.layers.some((layer) => layer.id === layerId)) {
      throw new Error(`Inactive layer: ${layerId}`);
    }
    map.setRadius(runtimeLayerId(active.id, layerId), radius);
  }

  return { enter, setRadius };
}
