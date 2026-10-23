import { z } from 'zod';
import {
  CameraSchema,
  ContentDimensionsSchema,
  DiscourseDimensionsSchema,
  LngLatSchema,
  SceneMediaSchema,
} from './geo-narrative.js';
import { ResolvedLayoutSchema } from './layout.js';
import { HexColorSchema, ResolvedThemeSchema } from './theme.js';
import { SceneMotionSchema } from './motion.js';
import { SceneCalloutsSchema } from './callout.js';
import { AnnotationSchema, LayerConstantSchema, TypedFilterSchema } from './design.js';
import {
  COMPILED_VERSION,
  DESIGN_VERSION,
  DigestSchema,
  IdSchema,
  InputSnapshotSchema,
  JsonValueSchema,
  PROJECT_VERSION,
  RelativePathSchema,
} from './project.js';
import { V2_TECHNIQUES } from './techniques.js';

const CountsSchema = z
  .object({
    valid: z.number().int().nonnegative(),
    missing: z.number().int().nonnegative(),
    invalid: z.number().int().nonnegative(),
  })
  .strict();
export const BasemapTintSchema = z
  .object({
    land: HexColorSchema,
    water: HexColorSchema,
    landcover: HexColorSchema,
    road: HexColorSchema,
    boundary: HexColorSchema,
    building: HexColorSchema,
    label: HexColorSchema,
    labelHalo: HexColorSchema,
  })
  .strict();

// Projection and sky need no network, so offline builds keep them.
const requestFreeBasemap = {
  projection: z.enum(['mercator', 'globe']),
  sky: z
    .object({ sky: HexColorSchema, horizon: HexColorSchema, fog: HexColorSchema })
    .strict()
    .optional(),
};

const ScaleBaseSchema = z.object({
  id: IdSchema,
  memberKeys: z.array(
    z.object({ sceneId: IdSchema, layerId: IdSchema, sourceId: IdSchema }).strict(),
  ),
  unit: z.string().nullable(),
  /** Legend title and display unit are compiled so the player never shows IDs or carets. */
  title: z.string().min(1),
  unitLabel: z.string().min(1).nullable(),
  noDataLabel: z.string(),
  noDataColor: z.string(),
  counts: CountsSchema,
});

export const ResolvedScaleSchema = z.discriminatedUnion('kind', [
  ScaleBaseSchema.extend({
    kind: z.literal('numeric-color'),
    domain: z.tuple([z.number().finite(), z.number().finite()]),
    edges: z.array(z.number().finite()).min(1),
    colors: z.array(z.string()).min(1),
    labels: z.array(z.string()).min(1),
    effectiveClasses: z.number().int().positive(),
  }).strict(),
  ScaleBaseSchema.extend({
    kind: z.literal('category-color'),
    categories: z.array(
      z
        .object({
          value: z.union([z.boolean(), z.number().finite(), z.string()]),
          label: z.string(),
          color: z.string(),
        })
        .strict(),
    ),
  }).strict(),
  ScaleBaseSchema.extend({
    kind: z.literal('numeric-size'),
    domain: z.tuple([z.number().finite().nonnegative(), z.number().finite().nonnegative()]),
    mapping: z.literal('sqrt-area'),
    radiusRange: z.tuple([z.number().finite().nonnegative(), z.number().finite().nonnegative()]),
    noDataRadius: z.number().finite().nonnegative(),
    legend: z
      .array(
        z
          .object({
            value: z.number().finite().nonnegative(),
            radius: z.number().finite().nonnegative(),
            label: z.string(),
          })
          .strict(),
      )
      .min(1),
  }).strict(),
  // Bars: height is linear from zero. On-screen height changes with pitch and zoom, so the
  // legend draws no pixel scale; it names the attribute, unit, "from 0" and the tallest value.
  ScaleBaseSchema.extend({
    kind: z.literal('numeric-height'),
    domain: z.tuple([z.literal(0), z.number().finite().nonnegative()]),
    mapping: z.literal('linear'),
    /** Height of the domain's top value above its base, in metres. */
    maxHeightMeters: z.number().finite().positive(),
    tallest: z.object({ value: z.number().finite().nonnegative(), label: z.string() }).strict(),
  }).strict(),
  ScaleBaseSchema.extend({
    kind: z.literal('numeric-width'),
    domain: z.tuple([z.literal(0), z.number().finite().nonnegative()]),
    mapping: z.literal('linear'),
    /** Width of the domain's top value, in CSS pixels. */
    maxWidth: z.number().finite().positive(),
    noDataWidth: z.number().finite().nonnegative(),
    legend: z
      .array(
        z
          .object({
            value: z.number().finite().nonnegative(),
            width: z.number().finite().nonnegative(),
            label: z.string(),
          })
          .strict(),
      )
      .min(1),
  }).strict(),
]);

/**
 * Techniques the compiled contract carries; the authored schema also accepts `heatmap`, which
 * the compiler diagnoses. A V2 technique compiles once its core module is ready.
 */
export const COMPILED_TECHNIQUES = [
  'point',
  'graduated-symbol',
  'line',
  'fill',
  'categorical',
  'choropleth',
  ...V2_TECHNIQUES,
] as const;
export type CompiledTechnique = (typeof COMPILED_TECHNIQUES)[number];

/** `maplibre` draws in the base map; `deck` in the deck.gl tier, loaded only when used. */
export const LAYER_BACKENDS = ['maplibre', 'deck'] as const;
export type LayerBackend = (typeof LAYER_BACKENDS)[number];

/**
 * Each technique uses the cheapest backend that draws it correctly (m2-visual.md, 5.0 backend
 * table): MapLibre extrusions sit on terrain, so only arcs and trips need deck.gl.
 */
export const TECHNIQUE_BACKENDS: Record<CompiledTechnique, LayerBackend> = {
  point: 'maplibre',
  'graduated-symbol': 'maplibre',
  line: 'maplibre',
  fill: 'maplibre',
  categorical: 'maplibre',
  choropleth: 'maplibre',
  column: 'maplibre',
  extrusion: 'maplibre',
  change: 'maplibre',
  hexbin: 'maplibre',
  arc: 'deck',
  trip: 'deck',
};

/** A compiler-computed source: joined before-values (change, morph) or hexbin aggregates. */
export const DerivedSourceSchema = z
  .object({
    id: IdSchema,
    kind: z.enum(['change', 'morph', 'hexbin']),
    /** Every source it was computed from, with the hash compiled, so each value can be traced. */
    inputs: z.array(z.object({ sourceId: IdSchema, sha256: DigestSchema }).strict()).min(1),
    /** The operation's parameters, for example the cell size and aggregate. */
    parameters: z.record(JsonValueSchema),
    data: z
      .object({
        type: z.literal('FeatureCollection'),
        features: z.array(
          z
            .object({
              type: z.literal('Feature'),
              id: z.union([z.string(), z.number()]).optional(),
              geometry: z.unknown(),
              properties: z.record(z.unknown()).nullable(),
            })
            .strict(),
        ),
      })
      .strict(),
  })
  .strict();

const ResolvedLayerSchema = z
  .object({
    sceneId: IdSchema,
    authoredLayerId: IdSchema,
    runtimeId: IdSchema,
    /** A data resource or a derived source. */
    sourceId: IdSchema,
    geometry: z.enum(['point', 'line', 'polygon']),
    technique: z.enum(COMPILED_TECHNIQUES),
    backend: z.enum(LAYER_BACKENDS),
    attribute: IdSchema.optional(),
    scaleId: IdSchema.optional(),
    filter: TypedFilterSchema.optional(),
    /** Authored constants, with colour (and a fill's opacity) defaulted from the theme. */
    constant: LayerConstantSchema.optional(),
    /** Polygon outline colour; set when a fill takes its colour from the theme. */
    outline: z.string().optional(),
  })
  .strict()
  .refine((layer) => TECHNIQUE_BACKENDS[layer.technique] === layer.backend, {
    message: 'A layer is drawn by its technique backend.',
    path: ['backend'],
  });

const ResolvedControlSchema = z
  .object({
    sceneId: IdSchema,
    id: IdSchema,
    kind: z.enum(['toggle', 'slider']),
    label: z.string(),
    runtimeLayerId: IdSchema,
    property: z.enum(['visibility', 'opacity', 'radius']),
    default: z.union([z.boolean(), z.number().finite()]),
    range: z.tuple([z.number().finite(), z.number().finite()]).optional(),
  })
  .strict();

export const CompiledSchema = z
  .object({
    /** Regenerated on every build and never read back, so older versions need no migration. */
    compiledVersion: z.literal(COMPILED_VERSION),
    contractVersions: z
      .object({
        project: z.enum([PROJECT_VERSION, '0.2.0']),
        narrative: z.enum(['0.1.0', '0.2.0']),
        design: z.enum([DESIGN_VERSION, '0.2.0']),
      })
      .strict(),
    compilerVersion: z.string().min(1),
    input: InputSnapshotSchema,
    id: IdSchema,
    title: z.string(),
    intent: z.string(),
    theme: ResolvedThemeSchema,
    layout: ResolvedLayoutSchema,
    basemap: z.union([
      z.literal('neutral'),
      z.object({ provider: z.literal('none'), ...requestFreeBasemap }).strict(),
      z
        .object({
          provider: z.enum(['openfreemap', 'versatiles', 'custom']),
          ...requestFreeBasemap,
          /** Colours for known provider layers; absent leaves the provider style as published. */
          tint: BasemapTintSchema.optional(),
          labels: z.enum(['full', 'minimal', 'off']),
          styles: z
            .array(
              z
                .object({
                  provider: z.enum(['openfreemap', 'versatiles', 'custom']),
                  url: z.string().url(),
                  attribution: z.string().min(1),
                })
                .strict(),
            )
            .min(1),
          terrain: z
            .object({
              tiles: z.string().url(),
              attribution: z.string().min(1),
              /** Where the credit links, for providers whose source list is a page of its own. */
              attributionUrl: z.string().url().optional(),
              exaggeration: z.number().positive(),
              tileSize: z.union([z.literal(256), z.literal(512)]),
              /** Hillshade from the same tiles, drawn below roads and labels. */
              hillshade: z
                .object({ shadow: HexColorSchema, highlight: HexColorSchema })
                .strict()
                .optional(),
            })
            .strict()
            .optional(),
        })
        .strict(),
    ]),
    scenes: z.array(
      z
        .object({
          id: IdSchema,
          title: z.string(),
          narration: z.string(),
          content: ContentDimensionsSchema.strict(),
          discourse: DiscourseDimensionsSchema.strict(),
          camera: CameraSchema.strict(),
          transitionIn: z.enum(['fly', 'ease', 'cut']).optional(),
          media: z.array(SceneMediaSchema.strict()),
          mediaAnchors: z.array(
            z
              .object({
                assetId: IdSchema,
                at: LngLatSchema,
                trigger: z.enum(['marker', 'auto']),
                label: z.string().optional(),
              })
              .strict(),
          ),
          layers: z.array(ResolvedLayerSchema),
          annotations: z.array(AnnotationSchema.extend({ sceneId: IdSchema }).strict()),
          controls: z.array(ResolvedControlSchema),
          motion: SceneMotionSchema,
          callouts: SceneCalloutsSchema,
        })
        .strict(),
    ),
    scales: z.array(ResolvedScaleSchema),
    derived: z.array(DerivedSourceSchema),
    resources: z.array(
      z
        .object({
          id: IdSchema,
          kind: z.enum(['data', 'image', 'video']),
          bundlePath: RelativePathSchema.optional(),
          remoteUrl: z.string().url().optional(),
          name: z.string().optional(),
          mimeType: z.string().optional(),
          width: z.number().int().positive().optional(),
          height: z.number().int().positive().optional(),
          caption: z.string().optional(),
          credit: z.string().optional(),
          qualification: z.string().optional(),
          posterId: IdSchema.optional(),
        })
        .strict(),
    ),
    requiredNetwork: z.array(z.string().url()),
  })
  .strict()
  .superRefine((value, ctx) => {
    const { project, narrative, design } = value.contractVersions;
    const v2 = project === '0.2.0';
    if (
      narrative !== project ||
      design !== project ||
      (v2 ? typeof value.basemap === 'string' : typeof value.basemap !== 'string')
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['contractVersions'],
        message: 'Contract versions and basemap must agree.',
      });
    const data = new Set(
      value.resources.flatMap((item) => (item.kind === 'data' ? [item.id] : [])),
    );
    const derived = new Set<string>();
    value.derived.forEach((source, index) => {
      if (data.has(source.id) || derived.has(source.id))
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['derived', index, 'id'],
          message: `Derived source ${source.id} collides with another source.`,
        });
      derived.add(source.id);
    });
    value.scenes.forEach((scene, sceneIndex) =>
      scene.layers.forEach((layer, layerIndex) => {
        if (!data.has(layer.sourceId) && !derived.has(layer.sourceId))
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['scenes', sceneIndex, 'layers', layerIndex, 'sourceId'],
            message: `Layer source ${layer.sourceId} is neither a data resource nor a derived source.`,
          });
      }),
    );
  });

export const ResolvedAssetsSchema = z.array(
  z
    .object({
      id: IdSchema,
      sourcePath: z.string(),
      projectRoot: z.string(),
      bundlePath: RelativePathSchema,
      sha256: DigestSchema,
    })
    .strict(),
);

export const CAPABILITY_IDS = [
  'basemap.neutral',
  'camera.cut',
  'camera.ease',
  'camera.fly',
  'camera.keyframes',
  'camera.reveal-from-overview',
  'camera.push-in',
  'camera.orbit',
  'camera.fly-along',
  'motion.layer-opacity',
  'motion.line-reveal',
  'motion.highlight',
  'motion.stagger',
  'motion.callout',
  'layer.constant',
  'color.categorical',
  'color.equal-interval',
  'color.quantile',
  'color.natural-breaks',
  'color.manual-breaks',
  'size.graduated-area',
  'filter.comparison',
  'media.panel',
  'media.anchor',
  'annotation.text',
  'control.visibility',
  'control.opacity',
  'control.radius',
  'height.column',
  'height.extrusion',
  'change.symbol',
  'aggregate.hexbin',
  'flow.arc',
  'flow.trip',
  'motion.grow',
  'motion.morph',
  'motion.trail',
] as const;
export const CapabilityCatalogSchema = z
  .object({
    version: z.literal('0.1.0'),
    ids: z.array(z.enum(CAPABILITY_IDS)),
  })
  .strict()
  .superRefine((value, ctx) => {
    const seen = new Set<string>();
    value.ids.forEach((id, index) => {
      if (seen.has(id))
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['ids', index],
          message: `Duplicate capability ${id}`,
        });
      seen.add(id);
    });
  });

export type Compiled = z.infer<typeof CompiledSchema>;
export type ResolvedScale = z.infer<typeof ResolvedScaleSchema>;
export type DerivedSource = z.infer<typeof DerivedSourceSchema>;
export type BasemapTint = z.infer<typeof BasemapTintSchema>;
export type ResolvedAssets = z.infer<typeof ResolvedAssetsSchema>;
export type CapabilityCatalog = z.infer<typeof CapabilityCatalogSchema>;
