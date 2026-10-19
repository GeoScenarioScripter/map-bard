import { createDomView } from './dom-view.js';
import { createPlayer } from './player.js';

/** IIFE surface for W3-B's MapLibre adapter and W3-C's compiled HTML wiring. */
Object.assign(globalThis, { MapBardCompiledPlayer: { createPlayer, createDomView } });
