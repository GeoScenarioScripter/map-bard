import { z } from 'zod';
import {
  CameraSchema,
  ContentDimensionsSchema,
  DiscourseDimensionsSchema,
  LngLatSchema,
  SceneMediaSchema,
  ThemeTokensSchema,
} from './geo-narrative.js';
import { AnnotationSchema, LayerConstantSchema, TypedFilterSchema } from './design.js';
import {
  COMPILED_VERSION,
  DESIGN_VERSION,
  DigestSchema,
  IdSchema,
  InputSnapshotSchema,
  PROJECT_VERSION,
  RelativePathSchema,
} from './project.js';

const CountsSchema = z
  .object({
    valid: z.number().int().nonnegative(),
    missing: z.number().int().nonnegative(),
    invalid: z.number().int().nonnegative(),
  })
  .strict();
const ScaleBaseSchema = z.object({
  id: IdSchema,
  memberKeys: z.array(
    z.object({ sceneId: IdSchema, layerId: IdSchema, sourceId: IdSchema }).strict(),
  ),
  unit: z.string().nullable(),
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
]);

const ResolvedLayerSchema = z
  .object({
    sceneId: IdSchema,
    authoredLayerId: IdSchema,
    runtimeId: IdSchema,
    sourceId: IdSchema,
    geometry: z.enum(['point', 'line', 'polygon']),
    technique: z.enum(['point', 'graduated-symbol', 'line', 'fill', 'categorical', 'choropleth']),
    attribute: IdSchema.optional(),
    scaleId: IdSchema.optional(),
    filter: TypedFilterSchema.optional(),
    constant: LayerConstantSchema.optional(),
  })
  .strict();

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
    compiledVersion: z.literal(COMPILED_VERSION),
    contractVersions: z
      .object({
        project: z.literal(PROJECT_VERSION),
        narrative: z.literal('0.1.0'),
        design: z.literal(DESIGN_VERSION),
      })
      .strict(),
    compilerVersion: z.string().min(1),
    input: InputSnapshotSchema,
    id: IdSchema,
    title: z.string(),
    intent: z.string(),
    theme: ThemeTokensSchema.strict().optional(),
    basemap: z.literal('neutral'),
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
        })
        .strict(),
    ),
    scales: z.array(ResolvedScaleSchema),
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
  .strict();

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
  'layer.constant',
  'color.categorical',
  'color.equal-interval',
  'size.graduated-area',
  'filter.comparison',
  'media.panel',
  'media.anchor',
  'annotation.text',
  'control.visibility',
  'control.opacity',
  'control.radius',
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
export type ResolvedAssets = z.infer<typeof ResolvedAssetsSchema>;
export type CapabilityCatalog = z.infer<typeof CapabilityCatalogSchema>;
