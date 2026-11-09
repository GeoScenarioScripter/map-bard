# Two October days on the Potomac (night)

The night variant of the [Potomac example](../potomac/README.md). It shares that project's data, photograph and `story.json`; its `mapbard.json` differs only in `theme` (`night`) and `basemap.style` (OpenFreeMap Dark). The encoding is the same: 3D columns for 2024 on one shared height scale, change columns for 2025 that shrink from their 2024 heights beside translucent 2024 ghosts, with compiled change labels, and rings and discs at the top-down end. The night theme supplies its own column, change and light colours. See the atlas README for the story, the encoding, the motion and the commands, with `--project examples/projects/potomac-night`.

### V2 review fixes (2026-11-08)

The shared height scale now maps 23,600 ft³/s to 60,000 m in all three
height scenes, with constant 2.6 km column footprints. This display height
is not water depth; values and proportions are unchanged. The comparison
view is closer (zoom 8.7). Before ghosts use the theme foreground at 45%
opacity. The river flight keeps a wider view (zoom 7.7, pitch 50°), then
returns to a wide north-up overview before closing in, keeping gauges clear
of the story panels at desktop and phone sizes. The closing pull-back starts
with all three gauges in view, including when the fallback notice is shown.
