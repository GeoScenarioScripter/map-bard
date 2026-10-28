import { TripsLayer } from '@deck.gl/geo-layers';
import { MapLibreOverlay } from '@deck.gl/maplibre';
import type { registerTier } from '../../tiers.js';
import { createDeckTier, type DeckLayer, type DeckOverlay } from './deck-tier.js';
import { RevealArcLayer } from './reveal-arc-layer.js';

/**
 * The deck.gl tier script (`vendor/tier-deck.js`): deck.gl 9.4 through `@deck.gl/maplibre`,
 * interleaved in MapLibre's context. It registers itself with the player, which loads first.
 */
const tier = createDeckTier({
  overlay: (props) =>
    new MapLibreOverlay(
      props as unknown as ConstructorParameters<typeof MapLibreOverlay>[0],
    ) as unknown as DeckOverlay,
  arcLayer: (props) => new RevealArcLayer(props) as unknown as DeckLayer,
  tripsLayer: (props) => new TripsLayer(props) as unknown as DeckLayer,
});

const player = (globalThis as { MapBardCompiledPlayer?: { registerTier?: typeof registerTier } })
  .MapBardCompiledPlayer;
if (!player?.registerTier) throw new Error('Load player.js before vendor/tier-deck.js');
player.registerTier('deck', tier);
