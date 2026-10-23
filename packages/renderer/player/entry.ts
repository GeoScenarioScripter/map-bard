import { providerCredit, styleBasemap } from './basemap-style.js';
import { createDomView } from './dom-view.js';
import { createNorthArrow } from './furniture.js';
import { cameraPadding, reservedArea, zoomOffset } from './layout.js';
import { createPlayer } from './player.js';
import { createMapLibreAdapter } from './maplibre-adapter.js';
import { trackScenes } from './scroll.js';
import { registerTier } from './tiers.js';

/** IIFE surface for W3-B's MapLibre adapter and W3-C's compiled HTML wiring. */
Object.assign(globalThis, {
  MapBardCompiledPlayer: {
    createPlayer,
    createDomView,
    createMapLibreAdapter,
    trackScenes,
    cameraPadding,
    reservedArea,
    zoomOffset,
    styleBasemap,
    providerCredit,
    createNorthArrow,
    // Tier scripts (vendor/tier-<name>.js) load after this one and register themselves.
    registerTier,
  },
});
