/**
 * @mapbard/schema — the GeoNarrative contract.
 *
 * Everything in the MapBard pipeline flows through one validated object,
 * `GeoNarrative`. This package owns its Zod schemas, inferred types, and parse
 * helpers; every other package depends inward on it (build-guide §10).
 */
export * from './geo-narrative.js';
