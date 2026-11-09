---
'mapbard': minor
'@mapbard/core': minor
'@mapbard/schema': minor
'@mapbard/knowledge': minor
'@mapbard/renderer': minor
---

Add columns, normalized polygon extrusions, before/after change symbols, hexbins,
origin–destination arcs and timestamped trips. Authored format remains 0.2.0 with
optional height, width, comparison, aggregation and transition fields; compiled
spec is 0.4.0 with explicit backends, traceable derived sources and grow, morph
and trail tracks. The pinned MIT deck.gl 9.4.0 tier ships only for arcs and trips.

Improve Potomac comparison contrast and phone column legibility, reframe its
river flight to avoid panel collisions, and skip callout projection while no
callouts are visible. Add a reproducible synthetic 1,000-feature morph probe.

Recover idle waits when a loaded terrain map stops scheduling frames; readiness
still requires MapLibre's idle event. Include the actual WebGL renderer and
browser version in performance reports so software and hardware runs are distinct.

Update the 0.3.0 authoring pack and package documentation; expose technique
backends through capabilities. Owner V2 scores are 86/100 for both Potomac
variants; hardware frame probes meet the 16.7 ms target on the reference laptop.
