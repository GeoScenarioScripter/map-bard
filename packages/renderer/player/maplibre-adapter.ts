import type { Map as MapLibreMap, LayerSpecification } from 'maplibre-gl';
import { escapeHtml } from './media.js';
import { layerStyle } from './resolved-style.js';
import type { CompiledAnnotation, CompiledStory, MapAdapter, MarkerHandle } from './types.js';

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
): MapAdapter {
  const bound = new Map<string, { sourceId: string; type: 'circle' | 'line' | 'fill' }>();
  const sourceUsers = new Map<string, number>();
  const { accent, labelHalo } = story.theme.colors;
  for (const scene of story.scenes) {
    for (const layer of scene.layers) {
      if (!data[layer.sourceId]) throw new Error(`Missing GeoJSON source ${layer.sourceId}`);
    }
  }

  function addAnnotation(annotation: CompiledAnnotation): MarkerHandle {
    const text = escapeHtml(annotation.text);
    return popupMarker(
      map,
      libre,
      annotation.at,
      `Annotation: ${annotation.text}`,
      `<p class="mb-annotation-text">${text}</p>`,
      'mb-annotation-marker',
    );
  }

  return {
    setCamera(camera, transition) {
      const target = {
        center: camera.center,
        zoom: camera.zoom,
        bearing: camera.bearing ?? 0,
        pitch: camera.pitch ?? 0,
      };
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
    addAnnotation,
    setControl(runtimeLayerId, property, value) {
      const binding = bound.get(runtimeLayerId);
      if (!binding) throw new Error(`Missing active layer ${runtimeLayerId}`);
      if (property === 'visibility') {
        map.setLayoutProperty(runtimeLayerId, 'visibility', value ? 'visible' : 'none');
      } else {
        const paintName = `${binding.type}-${property}`;
        map.setPaintProperty(
          runtimeLayerId,
          paintName as Parameters<MapLibreMap['setPaintProperty']>[1],
          value,
        );
      }
    },
  };
}
