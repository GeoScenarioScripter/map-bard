/**
 * @mapbard/renderer — the deterministic schema → static bundle template.
 *
 * The model never emits HTML; it fills the `GeoNarrative` schema and this
 * package turns that schema into a self-contained, browsable storymap
 * (build-guide directive 3). Build & verify it against the hand-written example
 * before the LLM stages exist.
 */
export { render } from './render.js';
export { writeBundle } from './write.js';
export { buildIndexHtml } from './index-html.js';
export { buildBundleData } from './bundle-data.js';
export type { DataMap, MediaCopy, RenderedBundle, RenderOptions } from './types.js';
export type { WriteResult } from './write.js';
