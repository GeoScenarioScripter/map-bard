import type { LayerBackend } from '@mapbard/schema';
import type { Map as MapLibreMap } from 'maplibre-gl';
import type { CompiledStory, MapAdapter } from './types.js';

/** The layer half of the map adapter, which a renderer tier implements for its own layers. */
export type TierLayers = Pick<
  MapAdapter,
  | 'bindLayer'
  | 'unbindLayer'
  | 'setControl'
  | 'setLayerProperty'
  | 'staggerCount'
  | 'setLayerFeatureValues'
> & {
  /** Resolves once the tier's layers have drawn a frame, so captures never catch shaders compiling. */
  whenDrawn(): Promise<void>;
  dispose(): void;
};

export type TierContext = {
  story: CompiledStory;
  data: Record<string, unknown>;
  map: MapLibreMap;
};

export type TierFactory = (context: TierContext) => TierLayers;

/** Optional tiers; each is a separate IIFE (`vendor/tier-<name>.js`) loaded only when used. */
export type TierName = Exclude<LayerBackend, 'maplibre'>;

const factories = new Map<TierName, TierFactory>();

/** Called by a tier script, which loads after the player and before the compiled app. */
export function registerTier(name: TierName, factory: TierFactory): void {
  if (factories.has(name)) throw new Error(`Renderer tier ${name} is already registered`);
  factories.set(name, factory);
}

export function tierFactory(name: TierName): TierFactory {
  const factory = factories.get(name);
  if (!factory) throw new Error(`Renderer tier ${name} is not loaded`);
  return factory;
}

/** Test hook: forget registered tiers. */
export function resetTiers(): void {
  factories.clear();
}
