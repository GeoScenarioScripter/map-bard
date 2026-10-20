# Techniques

- `point`: locations without a magnitude. Avoid using it when marker area must encode a value.
- `graduated-symbol`: ratio quantity at points, with a known unit. Avoid when zero or missing values would be confused with absent features.
- `line`: routes or boundaries. Avoid implying flow direction without directional evidence.
- `fill`: polygon context. Avoid implying numeric differences through a constant color.
- `categorical`: unordered types. Keep category colors distinct; avoid a continuous ramp.
- `choropleth`: normalized polygon quantity with a documented denominator. Avoid mapping raw counts across unequal areas.

Use `mapbard capabilities` for the current supported list. Unsupported techniques fail with diagnostics.
