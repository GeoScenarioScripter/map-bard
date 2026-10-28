import type { Map as MapLibreMap, LayerSpecification } from 'maplibre-gl';
import type { Padding, Rect } from './layout.js';

export type CameraFrame = { padding: Padding; zoomOffset: number };
import { createAltitudeProjector } from './altitude.js';
import { createCalloutOverlay, type SymbolPoint } from './callouts.js';
import { columnFootprints } from './columns.js';
import {
  drawsHeight,
  heightMeters,
  layerStyles,
  matchesLayerFilter,
  pointRadius,
  stateKey,
  type StyleSpec,
} from './resolved-style.js';
import { tierFactory, type TierLayers, type TierName } from './tiers.js';
import type { Stagger } from '@mapbard/schema';
import type {
  CompiledLayer,
  CompiledScene,
  CompiledStory,
  MapAdapter,
  MarkerHandle,
} from './types.js';

type MapLibreConstructors = Pick<typeof import('maplibre-gl'), 'Marker' | 'Popup'> &
  Partial<Pick<typeof import('maplibre-gl'), 'MercatorCoordinate'>>;
type GeoData = Parameters<MapLibreMap['addSource']>[1];
type PaintName = Parameters<MapLibreMap['setPaintProperty']>[1];
type PaintValue = Parameters<MapLibreMap['setPaintProperty']>[2];
type Bound = {
  sourceId: string;
  type: StyleSpec['type'];
  paint: Record<string, unknown>;
  /** Every style layer of the compiled layer, main first (a change symbol has two). */
  specs: StyleSpec[];
  /** Footprint sources derived for this layer alone, removed with it. */
  ownSources: string[];
  /** Sources whose features carry this layer's grow and morph feature state. */
  stateSources: string[];
  /** Features of the layer's source; generated feature IDs run 0 to count − 1. */
  featureCount: number;
  /** Motion track values: opacity factor, highlight strength, height factor, morph blend. */
  motion: { opacity: number; highlight: number; grow: number; morph: number };
  /** Properties a staggered track drives per feature, through feature state. */
  staggered: Set<'opacity' | 'highlight'>;
  /** Per-feature grow and morph values a staggered track set, by generated feature ID. */
  perFeature: { grow: Map<number, number>; morph: Map<number, number> };
};

type Value = number | unknown[];
const isNumber = (value: Value): value is number => typeof value === 'number';
const times = (a: Value, b: Value): Value => (isNumber(a) && isNumber(b) ? a * b : ['*', a, b]);
const plus = (a: Value, b: Value): Value => (isNumber(a) && isNumber(b) ? a + b : ['+', a, b]);
const minus = (a: Value, b: Value): Value => (isNumber(a) && isNumber(b) ? a - b : ['-', a, b]);

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

/** Ground metres per CSS pixel of a MapLibre camera (512-pixel tiles) at a latitude. */
export function metresPerPixel(zoom: number, latitude: number): number {
  return (40075016.686 * Math.cos((latitude * Math.PI) / 180)) / (512 * 2 ** zoom);
}

/**
 * The theme light as a MapLibre style light anchored to the map: `azimuth` is the compass
 * direction it comes from, and the polar angle is measured from straight overhead.
 */
export function styleLight(light: CompiledStory['theme']['light']) {
  return {
    anchor: 'map' as const,
    position: [1.15, light.azimuth, 90 - light.altitude] as [number, number, number],
    color: light.color,
    intensity: light.intensity,
  };
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

const finite = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

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
): MapAdapter & { refit(): void; whenDrawn(): Promise<void>; dispose(): void } {
  // Layers of another backend go to their tier, created once for the whole story.
  const tiers = new Map<TierName, TierLayers>();
  for (const scene of story.scenes)
    for (const layer of scene.layers)
      if (layer.backend !== 'maplibre' && !tiers.has(layer.backend))
        tiers.set(layer.backend, tierFactory(layer.backend)({ story, data, map }));
  const tierOf = new Map<string, TierLayers>();
  const altitude = libre.MercatorCoordinate
    ? createAltitudeProjector(map, libre.MercatorCoordinate)
    : undefined;
  const bound = new Map<string, Bound>();
  const sourceUsers = new Map<string, number>();
  const { accent, labelHalo, ink, muted } = story.theme.colors;
  // Columns and extrusions are shaded by the theme light; flat stories keep the style's own.
  if (story.scenes.some((scene) => scene.layers.some(drawsHeight)))
    map.setLight?.(styleLight(story.theme.light));
  // line-reveal draws with line-progress, which MapLibre only measures when the source asks for it.
  const metricSources = new Set<string>();
  for (const scene of story.scenes)
    for (const track of scene.motion.layers)
      if (track.property === 'line-reveal') {
        const layer = scene.layers.find((item) => item.runtimeId === track.runtimeLayerId);
        if (layer) metricSources.add(layer.sourceId);
      }
  let camera: CompiledScene['camera'] | undefined;
  // Derived sources (change, morph, hexbin) arrive in `data` beside the resources.
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
  const boundLayers = new Map<string, CompiledLayer>();

  /** Generated feature IDs (source order) of a layer's drawn features, in stagger order. */
  const rankCache = new Map<string, number[]>();
  function rankedIds(layer: CompiledLayer, stagger: Stagger): number[] {
    const key = `${layer.runtimeId}\u0000${stagger.order}\u0000${stagger.attribute ?? ''}`;
    let ids = rankCache.get(key);
    if (!ids) {
      const features = (data[layer.sourceId] as { features?: unknown[] } | undefined)?.features;
      const drawn = (features ?? []).flatMap((feature, index) => {
        const properties =
          ((feature ?? {}) as { properties?: Record<string, unknown> | null }).properties ?? {};
        return matchesLayerFilter(layer.filter, properties) ? [{ index, properties }] : [];
      });
      if (stagger.order !== 'data' && stagger.attribute) {
        const sign = stagger.order === 'ascending' ? 1 : -1;
        const value = (entry: (typeof drawn)[number]) =>
          finite(entry.properties[stagger.attribute!]);
        // Missing values start last; ties keep source order.
        drawn.sort((a, b) => {
          const left = value(a);
          const right = value(b);
          if (left === undefined || right === undefined)
            return left === right ? a.index - b.index : left === undefined ? 1 : -1;
          return sign * (left - right) || a.index - b.index;
        });
      }
      ids = drawn.map((entry) => entry.index);
      rankCache.set(key, ids);
    }
    return ids;
  }

  /** A motion value: the layer's number, or per-feature state falling back to it. */
  function motionValue(runtimeLayerId: string, binding: Bound, property: 'opacity' | 'highlight') {
    return binding.staggered.has(property)
      ? [
          'coalesce',
          ['feature-state', stateKey(runtimeLayerId, property)],
          binding.motion[property],
        ]
      : binding.motion[property];
  }

  /** A V1 layer: one circle, line or fill whose paint can read feature state. */
  const isFlatSingle = (binding: Bound) =>
    binding.specs.length === 1 && binding.type !== 'fill-extrusion';

  /** Write the paint a motion property drives, from the layer's current motion values. */
  function applyMotion(
    runtimeLayerId: string,
    binding: Bound,
    property: 'opacity' | 'highlight',
  ): void {
    if (!isFlatSingle(binding)) return applyLayeredMotion(binding, property);
    const paint = (name: string, next: unknown) =>
      map.setPaintProperty(runtimeLayerId, name as PaintName, next as PaintValue);
    const base = (name: string, fallback: number) => {
      const authored = binding.paint[name];
      return typeof authored === 'number' ? authored : fallback;
    };
    const { type } = binding;
    const fade = motionValue(runtimeLayerId, binding, 'opacity');
    const strength = motionValue(runtimeLayerId, binding, 'highlight');
    const mix = (value: Value) =>
      isNumber(value)
        ? mixColor(labelHalo, ink, value)
        : ['interpolate', ['linear'], value, 0, labelHalo, 1, ink];
    // Each property writes only its own paint, so reader controls on other properties keep working.
    const opacity = times(base(`${type}-opacity`, 1), fade);
    if (type === 'fill') {
      paint('fill-opacity', plus(opacity, times(times(minus(1, opacity), 0.5), strength)));
      if (property === 'highlight') paint('fill-outline-color', mix(strength));
    } else if (property === 'opacity') {
      paint(`${type}-opacity`, opacity);
      if (type === 'circle') paint('circle-stroke-opacity', fade);
    } else if (type === 'circle') {
      paint('circle-stroke-width', plus(base('circle-stroke-width', 1), times(3, strength)));
      paint('circle-stroke-color', mix(strength));
    } else paint('line-width', times(base('line-width', 2.5), plus(1, times(0.8, strength))));
  }

  /**
   * Extrusions and paired change layers: `fill-extrusion-opacity` cannot read feature state,
   * so opacity and highlight are whole-layer numbers here. Highlight raises the opacity of
   * extrusions and thickens the main circle's stroke.
   */
  function applyLayeredMotion(binding: Bound, property: 'opacity' | 'highlight'): void {
    const { opacity: fade, highlight: strength } = binding.motion;
    binding.specs.forEach((spec, index) => {
      const paint = (name: string, next: unknown) =>
        map.setPaintProperty(spec.id, name as PaintName, next as PaintValue);
      const base = (name: string, fallback: number) => {
        const authored = spec.paint[name];
        return typeof authored === 'number' ? authored : fallback;
      };
      if (spec.type === 'fill-extrusion') {
        const opacity = base('fill-extrusion-opacity', 1) * fade;
        paint('fill-extrusion-opacity', opacity + (1 - opacity) * 0.5 * strength);
      } else if (spec.type === 'circle') {
        if (property === 'opacity') {
          paint('circle-opacity', base('circle-opacity', 1) * fade);
          paint('circle-stroke-opacity', base('circle-stroke-opacity', 1) * fade);
        } else if (index === 0) {
          paint('circle-stroke-width', base('circle-stroke-width', 1) + 3 * strength);
          paint('circle-stroke-color', mixColor(labelHalo, ink, strength));
        }
      } else if (spec.type === 'fill') {
        const opacity = base('fill-opacity', 1) * fade;
        paint('fill-opacity', opacity + (1 - opacity) * 0.5 * strength);
      } else if (property === 'opacity') paint('line-opacity', base('line-opacity', 1) * fade);
    });
  }

  /** Write a grow or morph value to every source the layer's heights read it from. */
  function writeState(
    runtimeLayerId: string,
    binding: Bound,
    property: 'grow' | 'morph',
    ids: readonly number[],
    valueAt: (rank: number) => number,
  ): void {
    const key = stateKey(runtimeLayerId, property);
    ids.forEach((id, rank) => {
      const value = valueAt(rank);
      binding.perFeature[property].set(id, value);
      for (const source of binding.stateSources)
        map.setFeatureState({ source, id }, { [key]: value });
    });
  }

  type Drawn = {
    runtimeId: string;
    at: [number, number];
    radius: (size?: number) => number;
    /** A 3D symbol's current top in metres: its value's height, blended and grown by its tracks. */
    height?: () => number;
    /** A column's footprint radius in metres, so callouts can avoid its body. */
    footprint?: number;
  };
  function drawnPoints(layers: readonly CompiledLayer[]): Drawn[] {
    const drawn: Drawn[] = [];
    for (const layer of layers) {
      if (layer.geometry !== 'point' || layer.backend !== 'maplibre') continue;
      const scale = story.scales.find((item) => item.id === layer.scaleId);
      const heightScale = scale?.kind === 'numeric-height' ? scale : undefined;
      const change = layer.change;
      const source = data[layer.sourceId] as { features?: unknown[] } | undefined;
      (source?.features ?? []).forEach((feature, index) => {
        const { geometry, properties } = (feature ?? {}) as {
          geometry?: { type?: string; coordinates?: unknown };
          properties?: Record<string, unknown> | null;
        };
        const props = properties ?? {};
        if (!matchesLayerFilter(layer.filter, props)) return;
        const points =
          geometry?.type === 'Point'
            ? [geometry.coordinates]
            : geometry?.type === 'MultiPoint' && Array.isArray(geometry.coordinates)
              ? geometry.coordinates
              : [];
        const attribute = layer.attribute;
        const own = attribute ? props[attribute] : undefined;
        const before = change ? props[change.beforeAttribute] : undefined;
        // A change ring can be larger than its disc; the symbol is the larger of the two.
        const radius = (size?: number) =>
          change?.form === 'size' && attribute
            ? Math.max(
                pointRadius(layer, scale, props, size),
                pointRadius(layer, scale, { [attribute]: before }, size),
              )
            : pointRadius(layer, scale, props, size);
        const height =
          heightScale && attribute
            ? () => {
                const binding = bound.get(layer.runtimeId);
                const pick = (property: 'grow' | 'morph') =>
                  binding?.perFeature[property].get(index) ?? binding?.motion[property] ?? 1;
                const to = finite(own) ?? 0;
                const from = layer.morph ? (finite(props[layer.morph.fromAttribute]) ?? 0) : to;
                const value = from + (to - from) * pick('morph');
                const top = Math.max(
                  heightMeters(heightScale, value),
                  heightMeters(heightScale, before),
                );
                return top * pick('grow');
              }
            : undefined;
        for (const point of points) {
          if (!Array.isArray(point) || typeof point[0] !== 'number' || typeof point[1] !== 'number')
            continue;
          drawn.push({
            runtimeId: layer.runtimeId,
            at: [point[0], point[1]],
            radius,
            ...(height ? { height } : {}),
            ...(layer.column ? { footprint: layer.column.radiusMeters } : {}),
          });
        }
      });
    }
    return drawn;
  }

  /**
   * Every drawn point of the scene's point layers; placement keeps labels off them. A column
   * is its base, middle and top, each as wide as its projected footprint, so labels keep off
   * its body too.
   */
  function sceneSymbols(scene: CompiledScene): () => SymbolPoint[] {
    const drawn = drawnPoints(scene.layers);
    return () => {
      const zoom = map.getZoom?.() ?? 0;
      return drawn
        .filter((item) => !hiddenLayers.has(item.runtimeId))
        .flatMap((item) => {
          const radius = item.radius(radiusOverride.get(item.runtimeId));
          const height = item.height?.() ?? 0;
          if (!(height > 0)) return [{ at: item.at, radius }];
          const body = Math.max(radius, (item.footprint ?? 0) / metresPerPixel(zoom, item.at[1]));
          return [0, 0.5, 1].map((share) => ({
            at: item.at,
            radius: body,
            height: height * share,
          }));
        });
    };
  }

  /** The current top of a 3D symbol drawn at `at` in the shown scene, for callout anchors. */
  function heightAt(scene: CompiledScene): (at: readonly [number, number]) => number {
    const drawn = drawnPoints(scene.layers).filter((item) => item.height);
    return (at) => {
      let top = 0;
      for (const item of drawn)
        if (
          !hiddenLayers.has(item.runtimeId) &&
          Math.abs(item.at[0] - at[0]) < 1e-9 &&
          Math.abs(item.at[1] - at[1]) < 1e-9
        )
          top = Math.max(top, item.height!());
      return top;
    };
  }

  const adapter: MapAdapter & { refit(): void; whenDrawn(): Promise<void>; dispose(): void } = {
    setCamera(next, transition) {
      camera = next;
      const target = cameraTarget(next);
      if (transition === 'cut') map.jumpTo(target);
      else if (transition === 'fly') map.flyTo(target);
      else map.easeTo(target);
    },
    bindLayer(layer) {
      if (bound.has(layer.runtimeId) || tierOf.has(layer.runtimeId))
        throw new Error(`Layer already bound ${layer.runtimeId}`);
      if (layer.backend !== 'maplibre') {
        const tier = tiers.get(layer.backend)!;
        tier.bindLayer(layer);
        tierOf.set(layer.runtimeId, tier);
        return;
      }
      const scale = layer.scaleId
        ? story.scales.find((item) => item.id === layer.scaleId)
        : undefined;
      if (layer.scaleId && !scale) throw new Error(`Missing resolved scale ${layer.scaleId}`);
      if (map.getSource(layer.sourceId) && !sourceUsers.has(layer.sourceId)) {
        throw new Error(`Map source ID already in use ${layer.sourceId}`);
      }
      const sourceData = data[layer.sourceId];
      const isNewSource = !map.getSource(layer.sourceId);
      if (isNewSource) {
        if (!sourceData) throw new Error(`Missing GeoJSON source ${layer.sourceId}`);
        map.addSource(layer.sourceId, {
          type: 'geojson',
          data: sourceData,
          ...(metricSources.has(layer.sourceId) ? { lineMetrics: true } : {}),
          // Feature state (staggered tracks) needs IDs; the source order is a stable one.
          generateId: true,
        } as GeoData);
      }
      const { specs, footprints } = layerStyles(layer, story.scales, {
        accent,
        labelHalo,
        ink,
        muted,
      });
      const added: string[] = [];
      try {
        // Footprints are one per source feature, in source order, so feature IDs match.
        for (const footprint of footprints) {
          map.addSource(footprint.id, {
            type: 'geojson',
            data: columnFootprints(sourceData, footprint.radiusMeters),
            generateId: true,
          } as GeoData);
          added.push(footprint.id);
        }
        const label = map
          .getStyle()
          .layers?.find((item) => item.type === 'symbol' && /label|place/i.test(item.id));
        for (const spec of specs) map.addLayer(spec as LayerSpecification, label?.id);
      } catch (error) {
        for (const spec of specs) if (map.getLayer(spec.id)) map.removeLayer(spec.id);
        for (const id of added) if (map.getSource(id)) map.removeSource(id);
        if (isNewSource && map.getSource(layer.sourceId)) map.removeSource(layer.sourceId);
        throw error;
      }
      const main = specs[0]!;
      bound.set(layer.runtimeId, {
        sourceId: layer.sourceId,
        type: main.type,
        paint: main.paint,
        specs,
        ownSources: added,
        stateSources: [...new Set(specs.map((spec) => spec.source))],
        featureCount: ((sourceData as { features?: unknown[] }).features ?? []).length,
        motion: { opacity: 1, highlight: 0, grow: 1, morph: 1 },
        staggered: new Set(),
        perFeature: { grow: new Map(), morph: new Map() },
      });
      boundLayers.set(layer.runtimeId, layer);
      if (layer.geometry === 'point') pointLayers.set(layer.runtimeId, layer);
      sourceUsers.set(layer.sourceId, (sourceUsers.get(layer.sourceId) ?? 0) + 1);
    },
    unbindLayer(runtimeId) {
      const tier = tierOf.get(runtimeId);
      if (tier) {
        tier.unbindLayer(runtimeId);
        tierOf.delete(runtimeId);
        return;
      }
      const existing = bound.get(runtimeId);
      if (!existing) return;
      for (const spec of existing.specs) if (map.getLayer(spec.id)) map.removeLayer(spec.id);
      for (const id of existing.ownSources) if (map.getSource(id)) map.removeSource(id);
      bound.delete(runtimeId);
      pointLayers.delete(runtimeId);
      boundLayers.delete(runtimeId);
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
    projectAltitude(at, height) {
      return altitude ? altitude.project(at, height) : adapter.project(at);
    },
    async whenDrawn() {
      await Promise.all([...tiers.values()].map((tier) => tier.whenDrawn()));
    },
    dispose() {
      for (const tier of tiers.values()) tier.dispose();
      tiers.clear();
      tierOf.clear();
      altitude?.dispose();
    },
    /** Re-frame the active camera after the viewport or the rail changes size. */
    refit() {
      if (camera) map.jumpTo(cameraTarget(camera));
    },
    setControl(runtimeLayerId, property, value) {
      const tier = tierOf.get(runtimeLayerId);
      if (tier) return tier.setControl(runtimeLayerId, property, value);
      const binding = bound.get(runtimeLayerId);
      if (!binding) throw new Error(`Missing active layer ${runtimeLayerId}`);
      if (property === 'visibility') {
        if (value) hiddenLayers.delete(runtimeLayerId);
        else hiddenLayers.add(runtimeLayerId);
        for (const spec of binding.specs)
          map.setLayoutProperty(spec.id, 'visibility', value ? 'visible' : 'none');
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
      return overlay.show(scene.callouts, sceneSymbols(scene), heightAt(scene));
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
      return drawnPoints(shown).flatMap((item) => {
        const radius = item.radius(radiusOverride.get(item.runtimeId));
        const base = { layerId: item.runtimeId, ...adapter.project(item.at), radius };
        const height = item.height?.() ?? 0;
        // A column is its base and its top, so QA's 2D geometry sees where it stands.
        return height > 0
          ? [base, { layerId: item.runtimeId, ...adapter.projectAltitude(item.at, height), radius }]
          : [base];
      });
    },
    setLayerProperty(runtimeLayerId, property, value) {
      const tier = tierOf.get(runtimeLayerId);
      if (tier) return tier.setLayerProperty(runtimeLayerId, property, value);
      const binding = bound.get(runtimeLayerId);
      if (!binding) throw new Error(`Missing active layer ${runtimeLayerId}`);
      if (property === 'trail')
        throw new Error(`MapLibre layers do not draw trail tracks (${runtimeLayerId})`);
      const paint = (name: string, next: unknown) =>
        map.setPaintProperty(runtimeLayerId, name as PaintName, next as PaintValue);
      const { type, motion } = binding;
      if (property === 'grow' || property === 'morph') {
        // Feature state redraws heights every frame; paint or global-state changes re-layout
        // the source in the worker and drop frames (5.0 spike, item 3).
        motion[property] = value;
        binding.perFeature[property].clear();
        const ids = Array.from({ length: binding.featureCount }, (_, id) => id);
        writeState(runtimeLayerId, binding, property, ids, () => value);
        return;
      }
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
      applyMotion(runtimeLayerId, binding, property);
    },
    staggerCount(runtimeLayerId, stagger) {
      const tier = tierOf.get(runtimeLayerId);
      if (tier) return tier.staggerCount(runtimeLayerId, stagger);
      const layer = boundLayers.get(runtimeLayerId);
      if (!layer) throw new Error(`Missing active layer ${runtimeLayerId}`);
      return rankedIds(layer, stagger).length;
    },
    setLayerFeatureValues(runtimeLayerId, property, stagger, valueAt) {
      const tier = tierOf.get(runtimeLayerId);
      if (tier) return tier.setLayerFeatureValues(runtimeLayerId, property, stagger, valueAt);
      const binding = bound.get(runtimeLayerId);
      const layer = boundLayers.get(runtimeLayerId);
      if (!binding || !layer) throw new Error(`Missing active layer ${runtimeLayerId}`);
      const ids = rankedIds(layer, stagger);
      if (property === 'grow' || property === 'morph')
        return writeState(runtimeLayerId, binding, property, ids, valueAt);
      if (!isFlatSingle(binding)) {
        // Whole-layer paint only (see applyLayeredMotion): follow the features' mean.
        const values = ids.map((_, rank) => valueAt(rank));
        binding.motion[property] = values.length
          ? values.reduce((sum, value) => sum + value, 0) / values.length
          : 1;
        return applyMotion(runtimeLayerId, binding, property);
      }
      const key = stateKey(runtimeLayerId, property);
      ids.forEach((id, rank) =>
        map.setFeatureState({ source: binding.sourceId, id }, { [key]: valueAt(rank) }),
      );
      if (!binding.staggered.has(property)) {
        binding.staggered.add(property);
        applyMotion(runtimeLayerId, binding, property);
      }
    },
    setCalloutOpacity(calloutId, value) {
      overlay?.setOpacity(calloutId, value);
    },
  };
  return adapter;
}
