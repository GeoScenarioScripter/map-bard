# Layout, theme and annotation

## Layout templates

Set `layout` in `mapbard.json`. Every template turns into a bottom sheet on phones (640 px wide or less), and the camera is padded so features sit in the free map area beside or above the story panels.

| Layout          | Desktop                                                         | Use when                                                            |
| --------------- | --------------------------------------------------------------- | ------------------------------------------------------------------- |
| `sidecar`       | A 440 px story column on the left; the map fills the rest       | The default; long narration, media, several scenes                  |
| `overlay-cards` | 400 px cards float over the map on the left                     | Short narration and a map that should feel continuous               |
| `full-bleed`    | A caption at the bottom (a third of the screen); map everywhere | Few words per scene and wide subjects; the map is most of the story |

Legends, media and map controls sit in a rail on the right (desktop) or top (phone). Keep phone narration short: `TEXT_OVERFLOW_LIKELY` warns when a scene's narration would scroll inside the phone sheet. Tighten the words or split the scene; never drop a value, date or qualification to fit.

## Themes

Set `theme.preset` to one of `editorial-light` (the default; Source Serif 4 headings, Inter body), `night` (dark, Inter), `atlas` (warm paper, Source Serif 4) or `newsroom` (white, Inter headings, Source Serif 4 body). Override single tokens with `theme.colors`, `theme.ramps`, `theme.palette`, `displayFont` and `bodyFont`. Inter and Source Serif 4 (OFL) are bundled with the build. Other font names are not bundled, so readers who don't have the font installed see the generic serif or sans-serif fallback.

Colours default from the theme. A data scale uses `theme.palette`, or else the preset's sequential ramp. A layer without a data-driven or authored colour gets a context colour: fills the land colour at low opacity with a boundary outline, lines the water colour, points the accent, adjusted to meet the critic's mark contrast. Set `constant.color` only when a layer needs a specific colour, and check `PALETTE_CONTRAST_LOW` after.

## Basemap appearance

In `basemap`: `tint` (`theme`, the default for provider styles, recolours known basemap layers from theme tokens; `none` keeps the provider's colours), `labels` (`full`, `minimal` or `off`), `terrain` (`provider` `mapterhorn` or `aws-terrarium`, `exaggeration`, and `hillshade`, on by default), `sky` (sky, horizon and fog, on by default and visible when the camera pitches) and `projection` (`mercator` or `globe`). Terrain, hillshade and sky need an online provider; an `--offline` build shows only local layers.

## Size scales

Graduated symbols size by area from zero to the largest value. `maxRadius` (4–48 CSS px, default 16) sets the largest symbol's radius, on a layer's `encode` or on a shared size scale. Raise it when small values shrink to dots; lower it when large symbols cover each other or their neighbours. Use one shared size scale for every scene that compares the same quantity.

## Annotations and callouts

Each annotation becomes a callout: a label with a leader line and halo. With a `features` target, the leader ends at the drawn symbol's edge. The player places callouts every frame clear of panels, map controls, other callouts and symbols. Earlier annotations in a scene have priority. A callout that cannot be placed clear is hidden rather than drawn over something, so keep labels short and annotate only what the narration discusses. Fade callouts with `callouts` tracks during camera moves (see [motion](motion.md)).
