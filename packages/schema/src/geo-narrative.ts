/**
 * The MapBard schema — the single contract every pipeline stage reads and writes.
 *
 * Implemented as Zod so the shape is validated at runtime; the TypeScript types
 * are inferred from the schemas via {@link https://zod.dev | z.infer} so there is
 * one source of truth. See `docs/ROADMAP.md`; historical rationale in `docs/archive/`.
 *
 * Scene content fields are intentionally optional: a scene uses only the
 * dimensions it needs (build-guide directive 5).
 */
import { z } from 'zod';

/** Bumped when the schema shape changes in a breaking way. */
export const SCHEMA_VERSION = '0.1.0';

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/** A `[lon, lat]` position. */
export const LngLatSchema = z.tuple([z.number(), z.number()]);

/** A `[minX, minY, maxX, maxY]` bounding box. */
export const ExtentSchema = z.tuple([z.number(), z.number(), z.number(), z.number()]);

/** A `[start, end]` pair of ISO date strings. */
export const TemporalExtentSchema = z.tuple([z.string(), z.string()]);

// ---------------------------------------------------------------------------
// Data sources & profiling (filled by Stage 0)
// ---------------------------------------------------------------------------

export const AttributeSchema = z.object({
  name: z.string(),
  dataType: z.enum(['number', 'string', 'boolean', 'date']),
  measurement: z.enum(['nominal', 'ordinal', 'interval', 'ratio']),
  sample: z.array(z.union([z.string(), z.number()])).optional(),
});

export const DataProfileSchema = z.object({
  geometryType: z.enum(['point', 'line', 'polygon', 'mixed', 'none']).optional(),
  featureCount: z.number().int().nonnegative(),
  attributes: z.array(AttributeSchema),
  extent: ExtentSchema.optional(),
  temporalExtent: TemporalExtentSchema.optional(),
  /** Assumed EPSG:4326 if absent. */
  crs: z.string().optional(),
});

export const DataSourceSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  kind: z.enum(['geojson', 'csv']),
  /** Local path or URL. */
  path: z.string().min(1),
  profile: DataProfileSchema,
});

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

/** A photo or video the story can show. Profiled by Stage 0 like a data source. */
export const MediaAssetSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  kind: z.enum(['image', 'video']),
  /** Bundled local file vs remote reference. */
  source: z.enum(['local', 'url']),
  /** Local path or URL. */
  path: z.string().min(1),
  mimeType: z.string().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  /** Poster image for video — an asset id or path. */
  poster: z.string().optional(),
  /** Default caption / alt text. */
  caption: z.string().optional(),
  credit: z.string().optional(),
  /** `[lon, lat]` if the media is place-bound. */
  location: LngLatSchema.optional(),
});

/** Media shown inside a scene's narration panel. */
export const SceneMediaSchema = z.object({
  /** → {@link MediaAssetSchema}.id */
  assetId: z.string().min(1),
  placement: z.enum(['inline', 'figure', 'background']).optional(),
  /** Overrides the asset's caption. */
  caption: z.string().optional(),
});

/** Media pinned to a map location, surfaced by interaction. */
export const MediaAnchorSchema = z.object({
  /** → {@link MediaAssetSchema}.id */
  assetId: z.string().min(1),
  /** `[lon, lat]`; defaults to the asset's `location`. */
  at: LngLatSchema.optional(),
  trigger: z.enum(['marker', 'auto']).optional(),
  label: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Scene content & discourse
// ---------------------------------------------------------------------------

/** The geographic substrate — what the scene is *about*. All optional. */
export const ContentDimensionsSchema = z.object({
  /** What the scene means / the point. */
  semantics: z.string().optional(),
  /** Place + time framing in words. */
  location: z.string().optional(),
  /** Which features / shapes are in focus. */
  geometry: z.string().optional(),
  /** Which measured property matters here. */
  attribute: z.string().optional(),
  /** Links / comparisons between elements. */
  relationship: z.string().optional(),
  /** Change / evolution shown in this scene. */
  process: z.string().optional(),
});

/** How the scene is *told*. */
export const DiscourseDimensionsSchema = z.object({
  narrativeRole: z.enum(['establish', 'develop', 'compare', 'reveal', 'drill', 'resolve']),
  emphasis: z.enum(['low', 'medium', 'high']),
  readerAgency: z.enum(['none', 'guided', 'open']),
});

// ---------------------------------------------------------------------------
// Visual bindings, camera, controls
// ---------------------------------------------------------------------------

export const ClassificationMethodSchema = z.enum([
  'equal-interval',
  'quantile',
  'natural-breaks',
  'manual',
]);

export const LayerBindingSchema = z.object({
  id: z.string().min(1),
  dataSourceId: z.string().min(1),
  technique: z.enum([
    'choropleth',
    'graduated-symbol',
    'categorical',
    'heatmap',
    'line',
    'point',
    'fill',
  ]),
  encode: z
    .object({
      attribute: z.string(),
      visualVariable: z.enum(['color', 'size', 'opacity']),
    })
    .optional(),
  classification: z
    .object({
      method: ClassificationMethodSchema,
      classes: z.number().int().positive(),
      /** Manual interior class edges, strictly increasing; `classes - 1` of them. */
      breaks: z.array(z.number().finite()).min(1).optional(),
    })
    .optional(),
  /** Simple expression, e.g. "year == 2020". */
  filter: z.string().optional(),
});

export const CameraSchema = z.object({
  center: LngLatSchema,
  zoom: z.number(),
  bearing: z.number().optional(),
  pitch: z.number().optional(),
});

export const ControlSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['slider', 'toggle', 'select', 'colorpicker']),
  label: z.string(),
  /** A paint/filter property on a layer in the same scene. */
  bindsTo: z.object({ layerId: z.string().min(1), property: z.string().min(1) }),
  range: z.tuple([z.number(), z.number()]).optional(),
  options: z.array(z.string()).optional(),
  default: z.unknown().optional(),
});

// ---------------------------------------------------------------------------
// Scene & story
// ---------------------------------------------------------------------------

export const SceneSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  /** The prose shown for this scene. */
  narration: z.string(),
  media: z.array(SceneMediaSchema).optional(),
  mediaAnchors: z.array(MediaAnchorSchema).optional(),
  content: ContentDimensionsSchema,
  discourse: DiscourseDimensionsSchema,
  layers: z.array(LayerBindingSchema),
  camera: CameraSchema,
  transitionIn: z.enum(['fly', 'ease', 'cut']).optional(),
  controls: z.array(ControlSchema).optional(),
});

export const ThemeTokensSchema = z.object({
  palette: z.array(z.string()).optional(),
  displayFont: z.string().optional(),
  bodyFont: z.string().optional(),
});

export const BasemapSchema = z.object({
  style: z.string(),
  pmtilesUrl: z.string().optional(),
});

/**
 * A whole story. Beyond per-field validation, referential integrity is enforced:
 * every `assetId`, layer `dataSourceId`, and control `layerId` must resolve.
 */
export const GeoNarrativeSchema = z
  .object({
    id: z.string().min(1),
    title: z.string(),
    /** The user's original goal — kept for traceability. */
    intent: z.string(),
    dataSources: z.array(DataSourceSchema),
    /** Images/video the story can use (may be empty). */
    mediaAssets: z.array(MediaAssetSchema),
    /** Ordered; index = narrative order. */
    scenes: z.array(SceneSchema),
    basemap: BasemapSchema,
    theme: ThemeTokensSchema.optional(),
    schemaVersion: z.string(),
  })
  .superRefine((story, ctx) => {
    const assetIds = new Set(story.mediaAssets.map((a) => a.id));
    const dataSourceIds = new Set(story.dataSources.map((d) => d.id));

    story.scenes.forEach((scene, si) => {
      const layerIds = new Set(scene.layers.map((l) => l.id));

      scene.media?.forEach((m, mi) => {
        if (!assetIds.has(m.assetId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `media references unknown assetId "${m.assetId}"`,
            path: ['scenes', si, 'media', mi, 'assetId'],
          });
        }
      });

      scene.mediaAnchors?.forEach((a, ai) => {
        if (!assetIds.has(a.assetId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `mediaAnchor references unknown assetId "${a.assetId}"`,
            path: ['scenes', si, 'mediaAnchors', ai, 'assetId'],
          });
        }
      });

      scene.layers.forEach((layer, li) => {
        if (!dataSourceIds.has(layer.dataSourceId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `layer references unknown dataSourceId "${layer.dataSourceId}"`,
            path: ['scenes', si, 'layers', li, 'dataSourceId'],
          });
        }
      });

      scene.controls?.forEach((control, ci) => {
        if (!layerIds.has(control.bindsTo.layerId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `control binds to unknown layerId "${control.bindsTo.layerId}" (not in this scene)`,
            path: ['scenes', si, 'controls', ci, 'bindsTo', 'layerId'],
          });
        }
      });
    });
  });

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type LngLat = z.infer<typeof LngLatSchema>;
export type Extent = z.infer<typeof ExtentSchema>;
export type TemporalExtent = z.infer<typeof TemporalExtentSchema>;
export type Attribute = z.infer<typeof AttributeSchema>;
export type DataProfile = z.infer<typeof DataProfileSchema>;
export type DataSource = z.infer<typeof DataSourceSchema>;
export type MediaAsset = z.infer<typeof MediaAssetSchema>;
export type SceneMedia = z.infer<typeof SceneMediaSchema>;
export type MediaAnchor = z.infer<typeof MediaAnchorSchema>;
export type ContentDimensions = z.infer<typeof ContentDimensionsSchema>;
export type DiscourseDimensions = z.infer<typeof DiscourseDimensionsSchema>;
export type LayerBinding = z.infer<typeof LayerBindingSchema>;
export type Camera = z.infer<typeof CameraSchema>;
export type Control = z.infer<typeof ControlSchema>;
export type Scene = z.infer<typeof SceneSchema>;
export type ThemeTokens = z.infer<typeof ThemeTokensSchema>;
export type Basemap = z.infer<typeof BasemapSchema>;
export type GeoNarrative = z.infer<typeof GeoNarrativeSchema>;

// ---------------------------------------------------------------------------
// Parse helpers
// ---------------------------------------------------------------------------

/** Parse and validate, throwing a `ZodError` on any failure. */
export function parseGeoNarrative(input: unknown): GeoNarrative {
  return GeoNarrativeSchema.parse(input);
}

/** Non-throwing parse — returns a discriminated `{ success, data | error }`. */
export function safeParseGeoNarrative(
  input: unknown,
): z.SafeParseReturnType<unknown, GeoNarrative> {
  return GeoNarrativeSchema.safeParse(input);
}
