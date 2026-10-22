import type { Map as MapLibreMap, LayerSpecification } from 'maplibre-gl';
import type { Padding, Rect } from './layout.js';

export type CameraFrame = { padding: Padding; zoomOffset: number };
import { createCalloutOverlay, type SymbolPoint } from './callouts.js';
import { layerStyle, matchesLayerFilter, pointRadius } from './resolved-style.js';
import type { CompiledScene, CompiledStory, MapAdapter, MarkerHandle } from './types.js';

type MapLibreConstructors = Pick<typeof import('maplibre-gl'), 'Marker' | 'Popup'>;
type GeoData = Parameters<MapLibreMap['addSource']>[1];

function popupMarker(
  map: MapLibreMap,
  libre: MapLibreConstructors,
  at: readonly [number, number],
  label: string,
  html: string,
  className: string,
  open = false,
): MarkerHandle {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.setAttribute('aria-label', label);
  const popup = new libre.Popup({ className: 'mb-popup', closeButton: true }).setHTML(html);
  const marker = new libre.Marker({ element: button })
    .setLngLat([at[0], at[1]])
    .setPopup(popup)
    .addTo(map);
  if (open) marker.togglePopup();
  return {
    remove() {
      popup.remove();
      marker.remove();
    },
  };
}

/** MapLibre ownership stays here; the scene player controls all active lifetimes. */
export function createMapLibreAdapter(
  story: CompiledStory,
  data: Record<string, unknown>,
  map: MapLibreMap,
  libre: MapLibreConstructors,
  options: {
    frame?: () => CameraFrame;
    /** Client rects of screen UI callout labels must avoid: card area, rail, map controls. */
    obstacles?: () => Rect[];
  } = {},
): MapAdapter & { refit(): void } {
  const bound = new Map<string, { sourceId: string; type: 'circle' | 'line' | 'fill' }>();
  const sourceUsers = new Map<string, number>();
  const { accent, labelHalo } = story.theme.colors;
  let camera: CompiledScene['camera'] | undefined;
  for (const scene of story.scenes) {
    for (const layer of scene.layers) {
      if (!data[layer.sourceId]) throw new Error(`Missing GeoJSON source ${layer.sourceId}`);
    }
  }

  /** Authored camera adjusted to the layout: padded clear of panels, zoomed out on small screens. */
  function cameraTarget(authored: CompiledScene['camera']) {
    const frame = options.frame?.();
    return {
      center: authored.center,
      zoom: authored.zoom + (frame?.zoomOffset ?? 0),
      bearing: authored.bearing ?? 0,
      pitch: authored.pitch ?? 0,
      ...(frame ? { padding: frame.padding } : {}),
    };
  }

  // Live control state, so callouts avoid symbols at their current size and visibility.
  const radiusOverride = new Map<string, number>();
  const hiddenLayers = new Set<string>();
  let overlay: ReturnType<typeof createCalloutOverlay> | undefined;

  /** Every drawn point of the scene's point layers; placement keeps labels off them. */
  function sceneSymbols(scene: CompiledScene): () => SymbolPoint[] {
    const drawn: { runtimeId: string; at: [number, number]; radius: (size?: number) => number }[] =
      [];
    for (const layer of scene.layers) {
      if (layer.geometry !== 'point') continue;
      const scale = story.scales.find((item) => item.id === layer.scaleId);
      const source = data[layer.sourceId] as { features?: unknown[] } | undefined;
      for (const feature of source?.features ?? []) {
        const { geometry, properties } = (feature ?? {}) as {
          geometry?: { type?: string; coordinates?: unknown };
          properties?: Record<string, unknown> | null;
        };
        const props = properties ?? {};
        if (!matchesLayerFilter(layer.filter, props)) continue;
        const points =
          geometry?.type === 'Point'
            ? [geometry.coordinates]
            : geometry?.type === 'MultiPoint' && Array.isArray(geometry.coordinates)
              ? geometry.coordinates
              : [];
        for (const point of points) {
          if (!Array.isArray(point) || typeof point[0] !== 'number' || typeof point[1] !== 'number')
            continue;
          drawn.push({
            runtimeId: layer.runtimeId,
            at: [point[0], point[1]],
            radius: (size) => pointRadius(layer, scale, props, size),
          });
        }
      }
    }
    return () =>
      drawn
        .filter((item) => !hiddenLayers.has(item.runtimeId))
        .map((item) => ({ at: item.at, radius: item.radius(radiusOverride.get(item.runtimeId)) }));
  }

  const adapter: MapAdapter & { refit(): void } = {
    setCamera(next, transition) {
      camera = next;
      const target = cameraTarget(next);
      if (transition === 'cut') map.jumpTo(target);
      else if (transition === 'fly') map.flyTo(target);
      else map.easeTo(target);
    },
    bindLayer(layer) {
      if (bound.has(layer.runtimeId)) throw new Error(`Layer already bound ${layer.runtimeId}`);
      const scale = layer.scaleId
        ? story.scales.find((item) => item.id === layer.scaleId)
        : undefined;
      if (layer.scaleId && !scale) throw new Error(`Missing resolved scale ${layer.scaleId}`);
      if (map.getSource(layer.sourceId) && !sourceUsers.has(layer.sourceId)) {
        throw new Error(`Map source ID already in use ${layer.sourceId}`);
      }
      const isNewSource = !map.getSource(layer.sourceId);
      if (isNewSource) {
        const sourceData = data[layer.sourceId];
        if (!sourceData) throw new Error(`Missing GeoJSON source ${layer.sourceId}`);
        map.addSource(layer.sourceId, { type: 'geojson', data: sourceData } as GeoData);
      }
      const specification = layerStyle(layer, scale, accent, labelHalo);
      try {
        const label = map
          .getStyle()
          .layers?.find((item) => item.type === 'symbol' && /label|place/i.test(item.id));
        map.addLayer(specification as LayerSpecification, label?.id);
      } catch (error) {
        if (isNewSource && map.getSource(layer.sourceId)) map.removeSource(layer.sourceId);
        throw error;
      }
      bound.set(layer.runtimeId, { sourceId: layer.sourceId, type: specification.type });
      sourceUsers.set(layer.sourceId, (sourceUsers.get(layer.sourceId) ?? 0) + 1);
    },
    unbindLayer(runtimeId) {
      const existing = bound.get(runtimeId);
      if (!existing) return;
      if (map.getLayer(runtimeId)) map.removeLayer(runtimeId);
      bound.delete(runtimeId);
      radiusOverride.delete(runtimeId);
      hiddenLayers.delete(runtimeId);
      const remaining = (sourceUsers.get(existing.sourceId) ?? 1) - 1;
      if (remaining === 0) {
        sourceUsers.delete(existing.sourceId);
        if (map.getSource(existing.sourceId)) map.removeSource(existing.sourceId);
      } else sourceUsers.set(existing.sourceId, remaining);
    },
    addMarker(anchor, html) {
      return popupMarker(
        map,
        libre,
        anchor.at,
        anchor.label ?? 'Open media',
        html,
        'mb-marker',
        anchor.trigger === 'auto',
      );
    },
    onFrame(listener) {
      map.on('render', listener);
      return () => {
        map.off('render', listener);
      };
    },
    project(at) {
      const point = map.project([at[0], at[1]]);
      return { x: point.x, y: point.y };
    },
    /** Re-frame the active camera after the viewport or the rail changes size. */
    refit() {
      if (camera) map.jumpTo(cameraTarget(camera));
    },
    setControl(runtimeLayerId, property, value) {
      const binding = bound.get(runtimeLayerId);
      if (!binding) throw new Error(`Missing active layer ${runtimeLayerId}`);
      if (property === 'visibility') {
        if (value) hiddenLayers.delete(runtimeLayerId);
        else hiddenLayers.add(runtimeLayerId);
        map.setLayoutProperty(runtimeLayerId, 'visibility', value ? 'visible' : 'none');
      } else {
        if (property === 'radius' && typeof value === 'number')
          radiusOverride.set(runtimeLayerId, value);
        const paintName = `${binding.type}-${property}`;
        map.setPaintProperty(
          runtimeLayerId,
          paintName as Parameters<MapLibreMap['setPaintProperty']>[1],
          value,
        );
      }
    },
    showCallouts(scene) {
      overlay ??= createCalloutOverlay(map.getContainer(), adapter, {
        panels: options.obstacles,
      });
      return overlay.show(scene.callouts, sceneSymbols(scene));
    },
    bearing() {
      return map.getBearing();
    },
  };
  return adapter;
}
