# Techniques

Choose for the claim and source geometry. Check `mapbard capabilities` before authoring; the schema accepts some techniques that the current compiler diagnoses as unsupported.

| Technique          | Use when                                                                                   | Avoid when                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `point`            | Showing locations, or measured point color/size with a declared attribute                  | Marker area could be mistaken for an unencoded magnitude                     |
| `graduated-symbol` | Comparing nonnegative ratio quantities at points using `encode.visualVariable: "size"`     | Zero and missing observations would be confused with absent features         |
| `line`             | Showing routes, rivers, or boundaries                                                      | Geometry alone would imply flow direction or rate                            |
| `fill`             | Showing polygon context with a constant color                                              | Color would seem to encode an unbound quantity                               |
| `categorical`      | Coloring distinct nominal or ordinal values on matching geometry                           | A continuous ramp would falsely imply magnitude                              |
| `choropleth`       | Coloring an already-normalized polygon ratio with a declared denominator                   | Raw counts over unequal areas, or a denominator inferred from the map        |
| `column`           | Comparing nonnegative ratio quantities at points by linear height; MapLibre                | A top-down camera hides height, or footprints imply measured areas           |
| `extrusion`        | Showing already-normalized polygon quantities with declared denominators; MapLibre         | Raw counts over unequal polygon areas, or height and area would imply volume |
| `change`           | Comparing matched feature IDs as before rings/after discs or ghost/solid columns; MapLibre | IDs, units or measurement levels differ, or the comparison implies a trend   |
| `hexbin`           | Aggregating points with a disclosed cell size and count, sum or mean; MapLibre             | Aggregation hides missingness, denominators or meaningful spatial boundaries |
| `arc`              | Showing origin–destination relationships with optional quantity widths; deck.gl            | A curve would imply an observed route; terrain or globe is required          |
| `trip`             | Showing timestamped LineString vertices with a trail and UTC clock; deck.gl                | Vertex times are absent or inferred, or terrain/globe is required            |

Arcs need a two-vertex LineString; `arc.greatCircle: true` follows the great-circle path. The default elevated arc is a relationship diagram, not a measured altitude. Trips need one strictly increasing ISO UTC timestamp per vertex in `trip.timeProperty`; `trip.trailHours` specifies the visible time window. Do not invent intermediate observation times.

Columns and extrusions use `encode.visualVariable: "height"`. Change symbols use `"size"` or `"height"` plus `compare.sourceId`; `compare.labels: true` compiles change callouts. Hexbins use `aggregate` and a colour classification, with optional `extrude`; cell values are computed at build time. Arcs can use `"width"`. See [format](format.md) for fields and [data honesty](data-honesty.md) for calculations.

Only stories with arcs or trips ship `vendor/tier-deck.js`. Other techniques use MapLibre. Deck layers currently require Mercator without terrain; remove incompatible authored basemap settings only if that still serves the story. Otherwise report the capability limit.

Numeric color needs a `classification` with 2–9 `classes` and one of these methods:

| Method           | Use when                                                                  | Watch for                                                                 |
| ---------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `equal-interval` | Values spread fairly evenly and readers compare magnitudes                | A few large values push most features into the lowest class               |
| `quantile`       | Ranking matters more than magnitude                                       | Equal-count classes can split near-identical values or merge distant ones |
| `natural-breaks` | Values form clusters, or an outlier needs its own class                   | Breaks change when the data changes; up to 5,000 distinct values          |
| `manual`         | The story has meaningful thresholds; list `breaks` (`classes - 1` values) | Breaks must increase and lie strictly inside the data range or `domain`   |

If ties leave fewer distinct quantile or natural-breaks classes than requested, `check` warns. Check that the classes separate the features the narration compares; if they don't, use graduated symbols or manual breaks.

For a cross-scene comparison, use a shared scale rather than rescaling each scene. A colour shared scale repeats the members' `method`, `classes` and `breaks`. A shared size scale (`"visualVariable": "size"`, members are `graduated-symbol` layers with no classification) sizes every member by area on one range from zero to the largest value, so a drop between periods shows as smaller circles. Heatmaps and data-driven opacity produce capability diagnostics.

Graduated symbols size by area, so a value four times larger draws twice the radius. Set `maxRadius` so the smallest compared value stays visible and the largest symbols don't hide their neighbours; a value close to zero still draws as a tiny dot, so say it in the narration or annotate it.

Motion is a technique too: each camera preset suits one kind of claim, and every preset has cases where it hurts. Read [motion](motion.md) before adding a `fly-along`, `orbit` or staggered reveal, and prefer `hold` when the data, not the movement, makes the point.
