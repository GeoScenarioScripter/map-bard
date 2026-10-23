---
'mapbard': minor
'@mapbard/core': minor
'@mapbard/schema': minor
'@mapbard/knowledge': minor
'@mapbard/renderer': minor
---

M2 visual engine V1. Compiled publications move to spec 0.3.0, and format
0.2.0 gains optional design fields: theme presets and token overrides,
layouts with a phone bottom sheet, basemap tint, terrain hillshade, sky and
globe projection, story and scene motion (camera presets, keyframes, layer
and callout tracks, stagger, reduced motion), and `maxRadius` on size
encodings and shared size scales. New classification methods (quantile,
natural breaks, manual) and shared size scales. The player places callouts
clear of panels and controls, draws legends, scale bars and a north arrow,
and credits each basemap provider once. `check` and `build` report critic
warnings. The CLI adds `check --visual` (occlusion, flight sweep, goldens,
tiles-unavailable run, frame timing, size budgets) and `capabilities` lists
themes, layouts, motion options and whether visual checks can run. The
authoring skill pack is 0.2.0, with new motion and layout references.
`capabilities` now returns capability IDs as `capabilities` and the compiled
techniques as `techniques`.

Fixes: `preview` no longer rebuilds in a loop on its own staging output,
and `lock` and `build` write the lockfile in the same key order.
