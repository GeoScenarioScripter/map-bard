import type { TierFactory, registerTier } from '../../tiers.js';

/**
 * Stub deck.gl tier (step 5.1). It proves tier loading, the size report, `file://` and zero
 * offline requests before step N replaces it with deck.gl's `MapLibreOverlay`. It draws
 * nothing; `data-mb-tier-deck` on the root element counts its bound layers.
 */
const createDeckTier: TierFactory = () => {
  const bound = new Set<string>();
  const root = document.documentElement;
  const show = () => {
    root.dataset.mbTierDeck = String(bound.size);
  };
  show();
  return {
    bindLayer(layer) {
      bound.add(layer.runtimeId);
      show();
    },
    unbindLayer(runtimeId) {
      bound.delete(runtimeId);
      show();
    },
    setControl() {},
    setLayerProperty() {},
    staggerCount: () => 0,
    setLayerFeatureValues() {},
    whenDrawn: () => Promise.resolve(),
    dispose() {
      bound.clear();
      delete root.dataset.mbTierDeck;
    },
  };
};

const player = (globalThis as { MapBardCompiledPlayer?: { registerTier?: typeof registerTier } })
  .MapBardCompiledPlayer;
if (!player?.registerTier) throw new Error('Load player.js before vendor/tier-deck.js');
player.registerTier('deck', createDeckTier);
