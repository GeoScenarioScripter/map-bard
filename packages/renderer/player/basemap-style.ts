import type { CompiledStory } from './types.js';

type Basemap = Exclude<CompiledStory['basemap'], 'neutral'>;
type Online = Extract<Basemap, { styles: unknown }>;
type Tint = NonNullable<Online['tint']>;
type StyleLayer = { id: string; type: string; 'source-layer'?: string; layout?: object };

/** The subset of a MapLibre map that basemap styling touches. */
export interface StyleTarget {
  getStyle(): { layers?: StyleLayer[] };
  setPaintProperty(layer: string, name: string, value: unknown): void;
  setLayoutProperty(layer: string, name: string, value: unknown): void;
  addSource(id: string, source: object): void;
  addLayer(layer: object, before?: string): void;
  setTerrain(terrain: object): void;
  setSky(sky: object): void;
  setProjection(projection: { type: 'mercator' | 'globe' }): void;
}

// Source layers of the OpenMapTiles (OpenFreeMap) and Shortbread (VersaTiles) schemas.
const SURFACES: [RegExp, keyof Tint][] = [
  [/^(water|waterway|ocean|water_polygons|water_lines|dam_polygons|dam_lines)$/, 'water'],
  [/^(landcover|landuse|park|land|sites)$/, 'landcover'],
  [/^(transportation|streets|street_polygons|bridges|aeroway|aerialways)$/, 'road'],
  [/^(boundary|boundaries)$/, 'boundary'],
  [/^(building|buildings)$/, 'building'],
];
const PAINT: Record<string, string> = {
  background: 'background-color',
  fill: 'fill-color',
  line: 'line-color',
  'fill-extrusion': 'fill-extrusion-color',
};

/**
 * Paint changes that recolour a provider style from theme tokens. Layers outside the
 * two known schemas are left alone, so a provider's style drift degrades gracefully.
 */
export function tintOperations(
  layers: readonly StyleLayer[],
  tint: Tint,
): [layer: string, property: string, value: string][] {
  const operations: [string, string, string][] = [];
  for (const layer of layers) {
    if (layer.type === 'symbol') {
      if (layer.layout && 'text-field' in layer.layout) {
        operations.push([layer.id, 'text-color', tint.label]);
        operations.push([layer.id, 'text-halo-color', tint.labelHalo]);
      }
      continue;
    }
    const property = PAINT[layer.type];
    if (!property) continue;
    const surface =
      layer.type === 'background'
        ? 'land'
        : SURFACES.find(([pattern]) => pattern.test(layer['source-layer'] ?? ''))?.[1];
    if (surface) operations.push([layer.id, property, tint[surface]]);
  }
  return operations;
}

/** First layer that hillshade must sit below: roads, boundaries, buildings or labels. */
export function hillshadeBefore(layers: readonly StyleLayer[]): string | undefined {
  return layers.find(
    (layer) =>
      layer.type === 'symbol' ||
      /^(transportation|streets|bridges|boundary|boundaries|building|buildings)$/.test(
        layer['source-layer'] ?? '',
      ),
  )?.id;
}

/** Apply the compiled basemap to a freshly loaded style. `online` is false for the local fallback. */
export function styleBasemap(map: StyleTarget, basemap: CompiledStory['basemap'], online: boolean) {
  if (typeof basemap === 'string') return;
  map.setProjection({ type: basemap.projection });
  if (basemap.sky)
    map.setSky({
      'sky-color': basemap.sky.sky,
      'horizon-color': basemap.sky.horizon,
      'fog-color': basemap.sky.fog,
      'sky-horizon-blend': 0.5,
      'horizon-fog-blend': 0.6,
      'fog-ground-blend': 0.35,
      // Globe atmosphere fades out as the camera comes close to the ground.
      'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 6, 0.6, 9, 0],
    });
  if (!online || basemap.provider === 'none') return;
  const layers = map.getStyle().layers ?? [];
  if (basemap.labels !== 'full')
    for (const layer of layers)
      if (
        layer.type === 'symbol' &&
        (basemap.labels === 'off' || /poi|place|label/i.test(layer.id))
      )
        map.setLayoutProperty(layer.id, 'visibility', 'none');
  if (basemap.tint)
    for (const [layer, property, value] of tintOperations(layers, basemap.tint))
      map.setPaintProperty(layer, property, value);
  const terrain = basemap.terrain;
  if (!terrain) return;
  const dem = {
    type: 'raster-dem',
    tiles: [terrain.tiles],
    tileSize: terrain.tileSize,
    encoding: 'terrarium',
  };
  map.addSource('mb-terrain', { ...dem, attribution: terrain.attribution });
  map.setTerrain({ source: 'mb-terrain', exaggeration: terrain.exaggeration });
  if (terrain.hillshade) {
    // A separate source: MapLibre warns when terrain and hillshade share one.
    map.addSource('mb-hillshade', dem);
    map.addLayer(
      {
        id: 'mb-hillshade',
        type: 'hillshade',
        source: 'mb-hillshade',
        paint: {
          'hillshade-shadow-color': terrain.hillshade.shadow,
          'hillshade-highlight-color': terrain.hillshade.highlight,
          'hillshade-accent-color': terrain.hillshade.shadow,
          'hillshade-exaggeration': 0.35,
        },
      },
      hillshadeBefore(layers),
    );
  }
}
