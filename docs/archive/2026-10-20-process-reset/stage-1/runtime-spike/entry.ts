import { createPlayer, type MapAdapter, type Scene } from './player.js';

declare global {
  interface Window {
    MapBardSpike?: { createPlayer: typeof createPlayer };
  }
}

// Classic-script global: no module loader, CDN, or fetch required.
window.MapBardSpike = { createPlayer };
export type { MapAdapter, Scene };
