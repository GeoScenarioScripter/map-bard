import type { Map as MapLibreMap, LayerSpecification } from 'maplibre-gl';
import type { Padding, Rect } from './layout.js';

export type CameraFrame = { padding: Padding; zoomOffset: number };
import { createCalloutOverlay, type SymbolPoint } from './callouts.js';
import { layerStyle, matchesLayerFilter, pointRadius } from './resolved-style.js';
import type {
  CompiledLayer,
  CompiledScene,
  CompiledStory,
  MapAdapter,
  MarkerHandle,
} from './types.js';

type MapLibreConstructors = Pick<typeof import('maplibre-gl'), 'Marker' | 'Popup'>;
type GeoData = Parameters<MapLibreMap['addSource']>[1];
type PaintName = Parameters<MapLibreMap['setPaintProperty']>[1];
type PaintValue = Parameters<MapLibreMap['setPaintProperty']>[2];
type Bound = {
  sourceId: string;
  type: 'circle' | 'line' | 'fill';
  paint: Record<string, unknown>;
  /** Motion track values: opacity factor, highlight strength, reveal fraction. */
  motion: { opacity: number; highlight: number };
};

function hexChannels(color: string): [number, number, number] | undefined {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color);
  if (!match) return undefined;
  const hex = match[1]!.length === 3 ? [...match[1]!].map((c) => c + c).join('') : match[1]!;
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

/** Blend two hex colours; `w` = 1 gives `to`. Non-hex input falls back to the nearer end. */
export function mixColor(from: string, to: string, w: number): string {
  const a = hexChannels(from);
  const b = hexChannels(to);
  if (!a || !b) return w < 0.5 ? from : to;
  return `#${a
    .map((channel, i) =>
      Math.round(channel + (b[i]! - channel) * w)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

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
  const bound = new Map<string, Bound>();
  const sourceUsers = new Map<string, number>();
  const { accent, labelHalo, ink } = story.theme.colors;
  // line-reveal draws with line-progress, which MapLibre only measures when the source asks for it.
  const metricSources = new Set<string>();
  for (const scene of story.scenes)
    for (const track of scene.motion.layers)
      if (track.property === 'line-reveal') {
        const layer = scene.layers.find((item) => item.runtimeId === track.runtimeLayerId);
        if (layer) metricSources.add(layer.sourceId);
      }
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
  const pointLayers = new Map<string, CompiledLayer>();

  type Drawn = { runtimeId: string; at: [number, number]; radius: (size?: number) => number };
  function drawnPoints(layers: readonly CompiledLayer[]): Drawn[] {
    const drawn: Drawn[] = [];
    for (const layer of layers) {
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
    return drawn;
  }

  /** Every drawn point of the scene's point layers; placement keeps labels off them. */
  function sceneSymbols(scene: CompiledScene): () => SymbolPoint[] {
    const drawn = drawnPoints(scene.layers);
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
        map.addSource(layer.sourceId, {
          type: 'geojson',
          data: sourceData,
          ...(metricSources.has(layer.sourceId) ? { lineMetrics: true } : {}),
        } as GeoData);
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
      bound.set(layer.runtimeId, {
        sourceId: layer.sourceId,
        type: specification.type,
        paint: specification.paint,
        motion: { opacity: 1, highlight: 0 },
      });
      if (layer.geometry === 'point') pointLayers.set(layer.runtimeId, layer);
      sourceUsers.set(layer.sourceId, (sourceUsers.get(layer.sourceId) ?? 0) + 1);
    },
    unbindLayer(runtimeId) {
      const existing = bound.get(runtimeId);
      if (!existing) return;
      if (map.getLayer(runtimeId)) map.removeLayer(runtimeId);
      bound.delete(runtimeId);
      pointLayers.delete(runtimeId);
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
        map.setPaintProperty(runtimeLayerId, paintName as PaintName, value);
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
    drawnSymbols() {
      // Shown layers only: hidden by a control, or faded out by a motion track, draws nothing.
      const shown = [...pointLayers.values()].filter(
        (layer) =>
          !hiddenLayers.has(layer.runtimeId) &&
          (bound.get(layer.runtimeId)?.motion.opacity ?? 1) > 0.05,
      );
      return drawnPoints(shown).map((item) => {
        const { x, y } = adapter.project(item.at);
        return {
          layerId: item.runtimeId,
          x,
          y,
          radius: item.radius(radiusOverride.get(item.runtimeId)),
        };
      });
    },
    setLayerProperty(runtimeLayerId, property, value) {
      const binding = bound.get(runtimeLayerId);
      if (!binding) throw new Error(`Missing active layer ${runtimeLayerId}`);
      const paint = (name: string, next: unknown) =>
        map.setPaintProperty(runtimeLayerId, name as PaintName, next as PaintValue);
      const { type, motion } = binding;
      const base = (name: string, fallback: number) => {
        const authored = binding.paint[name];
        return typeof authored === 'number' ? authored : fallback;
      };
      if (property === 'line-reveal') {
        if (type !== 'line') throw new Error(`line-reveal needs a line layer ${runtimeLayerId}`);
        const color = binding.paint['line-color'];
        paint('line-gradient', [
          'step',
          ['line-progress'],
          typeof color === 'string' ? color : accent,
          Math.max(0, Math.min(1, value)),
          'rgba(0, 0, 0, 0)',
        ]);
        return;
      }
      motion[property] = value;
      // Each property writes only its own paint, so reader controls on other properties keep working.
      const opacity = base(`${type}-opacity`, 1) * motion.opacity;
      if (type === 'fill') {
        paint('fill-opacity', opacity + (1 - opacity) * 0.5 * motion.highlight);
        if (property === 'highlight')
          paint('fill-outline-color', mixColor(labelHalo, ink, motion.highlight));
      } else if (property === 'opacity') {
        paint(`${type}-opacity`, opacity);
        if (type === 'circle') paint('circle-stroke-opacity', motion.opacity);
      } else if (type === 'circle') {
        paint('circle-stroke-width', base('circle-stroke-width', 1) + 3 * motion.highlight);
        paint('circle-stroke-color', mixColor(labelHalo, ink, motion.highlight));
      } else paint('line-width', base('line-width', 2.5) * (1 + 0.8 * motion.highlight));
    },
  };
  return adapter;
}
