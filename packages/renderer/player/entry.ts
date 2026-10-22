import { styleBasemap } from './basemap-style.js';
import { createDomView } from './dom-view.js';
import { createNorthArrow } from './furniture.js';
import { cameraPadding, reservedArea, zoomOffset } from './layout.js';
import { createPlayer } from './player.js';
import { createMapLibreAdapter } from './maplibre-adapter.js';
import { observeScenes } from './scroll.js';

/** IIFE surface for W3-B's MapLibre adapter and W3-C's compiled HTML wiring. */
Object.assign(globalThis, {
  MapBardCompiledPlayer: {
    createPlayer,
    createDomView,
    createMapLibreAdapter,
    observeScenes,
    cameraPadding,
    reservedArea,
    zoomOffset,
    styleBasemap,
    createNorthArrow,
  },
});
