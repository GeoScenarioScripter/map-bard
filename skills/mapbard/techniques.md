# Techniques

Choose for the claim and source geometry. Check `mapbard capabilities` before authoring; the schema accepts some techniques that the current compiler diagnoses as unsupported.

| Technique          | Use when                                                                               | Avoid when                                                            |
| ------------------ | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `point`            | Showing locations, or measured point color/size with a declared attribute              | Marker area could be mistaken for an unencoded magnitude              |
| `graduated-symbol` | Comparing nonnegative ratio quantities at points using `encode.visualVariable: "size"` | Zero and missing observations would be confused with absent features  |
| `line`             | Showing routes, rivers, or boundaries                                                  | Geometry alone would imply flow direction or rate                     |
| `fill`             | Showing polygon context with a constant color                                          | Color would seem to encode an unbound quantity                        |
| `categorical`      | Coloring distinct nominal or ordinal values on matching geometry                       | A continuous ramp would falsely imply magnitude                       |
| `choropleth`       | Coloring an already-normalized polygon ratio with a declared denominator               | Raw counts over unequal areas, or a denominator inferred from the map |

For numeric color, the current compiler supports `classification: {"method":"equal-interval","classes":3}`. Quantile and natural-breaks classifications, heatmaps, and data-driven opacity produce capability diagnostics. For a cross-scene numeric comparison, use a shared scale rather than independently rescaling each scene.
