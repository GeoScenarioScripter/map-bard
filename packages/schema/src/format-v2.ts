import { z } from 'zod';
import {
  AnnotationSchema,
  LayerConstantSchema,
  SharedScaleSchema,
  TypedFilterSchema,
} from './design.js';
import {
  CameraSchema,
  ClassificationMethodSchema,
  ContentDimensionsSchema,
  ControlSchema,
  DiscourseDimensionsSchema,
  LayerBindingSchema,
  LngLatSchema,
  MediaAnchorSchema,
  SceneMediaSchema,
} from './geo-narrative.js';
import { ThemeTokensSchema } from './theme.js';
import {
  AttributionSchema,
  AttributeDeclarationSchema,
  DigestSchema,
  ExtensionsSchema,
  IdSchema,
  RelativePathSchema,
} from './project.js';

export const FORMAT_VERSION = '0.2.0' as const;
export const LOCK_VERSION = '0.2.0' as const;

export const DataResourceV2Schema = z
  .object({
    id: IdSchema,
    kind: z.enum(['geojson', 'csv']),
    path: RelativePathSchema,
    crs: z.literal('EPSG:4326'),
    featureId: z.discriminatedUnion('method', [
      z.object({ method: z.literal('geojson-id'), scope: z.literal('source') }).strict(),
      z
        .object({ method: z.literal('property'), property: IdSchema, scope: z.literal('source') })
        .strict(),
    ]),
    attributes: z.array(AttributeDeclarationSchema),
    attribution: AttributionSchema,
    observationLabel: z.string().optional(),
    name: z.string().min(1).optional(),
  })
  .strict();

export const MediaResourceV2Schema = z
  .object({
    id: IdSchema,
    kind: z.enum(['image', 'video']),
    location: z.discriminatedUnion('type', [
      z.object({ type: z.literal('local'), path: RelativePathSchema }).strict(),
      z.object({ type: z.literal('url'), url: z.string().url() }).strict(),
    ]),
    posterId: IdSchema.optional(),
    attribution: AttributionSchema,
    name: z.string().min(1).optional(),
    mimeType: z.string().optional(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    caption: z.string().optional(),
    credit: z.string().optional(),
    at: LngLatSchema.optional(),
  })
  .strict();

export const BasemapV2Schema = z
  .object({
    provider: z.enum(['none', 'openfreemap', 'versatiles', 'custom']),
    style: z.string().min(1).optional(),
    styleUrl: z.string().url().optional(),
    attribution: z.string().optional(),
    labels: z.enum(['full', 'minimal', 'off']).optional(),
    terrain: z
      .object({
        provider: z.enum(['mapterhorn', 'aws-terrarium']),
        exaggeration: z.number().positive().optional(),
      })
      .strict()
      .optional(),
    fallback: z.array(z.enum(['openfreemap', 'versatiles'])).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.provider === 'custom' && (!value.styleUrl || !value.attribution))
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['styleUrl'],
        message: 'Custom basemaps need styleUrl and attribution.',
      });
    if (value.provider === 'custom' && value.styleUrl && !/^https?:\/\//i.test(value.styleUrl))
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['styleUrl'],
        message: 'Custom styleUrl must use HTTP(S).',
      });
    if (
      value.provider === 'none' &&
      (value.style || value.styleUrl || value.terrain || value.fallback?.length)
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['provider'],
        message: 'A none basemap cannot have a style, terrain or fallback.',
      });
  });

export const ProjectV2Schema = z
  .object({
    formatVersion: z.literal(FORMAT_VERSION),
    id: IdSchema,
    title: z.string(),
    intent: z.string(),
    theme: ThemeTokensSchema.strict().optional(),
    basemap: BasemapV2Schema,
    resources: z
      .object({ data: z.array(DataResourceV2Schema), media: z.array(MediaResourceV2Schema) })
      .strict(),
    extensions: ExtensionsSchema.optional(),
  })
  .strict();

export const StoryLayerSchema = LayerBindingSchema.omit({ dataSourceId: true, filter: true })
  .extend({
    sourceId: IdSchema,
    encode: z
      .object({ attribute: IdSchema, visualVariable: z.enum(['color', 'size', 'opacity']) })
      .strict()
      .optional(),
    classification: z
      .object({
        method: ClassificationMethodSchema,
        classes: z.number().int().positive(),
        breaks: z.array(z.number().finite()).min(1).optional(),
      })
      .strict()
      .optional(),
    filter: TypedFilterSchema.optional(),
    constant: LayerConstantSchema.optional(),
  })
  .strict();

export const StorySceneSchema = z
  .object({
    id: IdSchema,
    title: z.string(),
    narration: z.string(),
    media: z.array(SceneMediaSchema.strict()).optional(),
    mediaAnchors: z.array(MediaAnchorSchema.strict()).optional(),
    content: ContentDimensionsSchema.strict().optional(),
    discourse: DiscourseDimensionsSchema.strict().optional(),
    layers: z.array(StoryLayerSchema),
    camera: CameraSchema.strict(),
    transitionIn: z.enum(['fly', 'ease', 'cut']).optional(),
    annotations: z.array(AnnotationSchema),
    controls: z
      .array(
        ControlSchema.extend({
          bindsTo: z.object({ layerId: IdSchema, property: IdSchema }).strict(),
        }).strict(),
      )
      .optional(),
  })
  .strict();

export const SharedScaleV2Schema = SharedScaleSchema;

export const StoryV2Schema = z
  .object({
    formatVersion: z.literal(FORMAT_VERSION),
    scenes: z.array(StorySceneSchema),
    sharedScales: z.array(SharedScaleV2Schema),
    extensions: ExtensionsSchema.optional(),
  })
  .strict();

export const LockV2Schema = z
  .object({
    lockVersion: z.literal(LOCK_VERSION),
    projectId: IdSchema,
    revision: z.number().int().nonnegative(),
    inputs: z
      .object({
        manifestSha256: DigestSchema,
        storySha256: DigestSchema,
        resources: z.array(z.object({ id: IdSchema, sha256: DigestSchema }).strict()),
      })
      .strict(),
    profiles: z.record(
      z
        .object({
          geometryType: z.enum(['point', 'line', 'polygon', 'mixed', 'none']).optional(),
          featureCount: z.number().int().nonnegative(),
          attributes: z.array(
            z
              .object({
                name: IdSchema,
                dataType: z.enum(['number', 'string', 'boolean', 'date']),
                measurement: z.enum(['nominal', 'ordinal', 'interval', 'ratio']),
                sample: z.array(z.union([z.string(), z.number()])).optional(),
              })
              .strict(),
          ),
          extent: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
          temporalExtent: z.tuple([z.string(), z.string()]).optional(),
          crs: z.string().optional(),
          attributeStats: z.record(
            z
              .object({
                present: z.number().int().nonnegative(),
                missing: z.number().int().nonnegative(),
                min: z.number().finite().optional(),
                max: z.number().finite().optional(),
              })
              .strict(),
          ),
        })
        .strict(),
    ),
    lastCompileInputs: z
      .object({
        manifestSha256: DigestSchema,
        storySha256: DigestSchema,
        resources: z.array(z.object({ id: IdSchema, sha256: DigestSchema }).strict()),
      })
      .strict()
      .optional(),
  })
  .strict();

export type ProjectV2 = z.infer<typeof ProjectV2Schema>;
export type StoryV2 = z.infer<typeof StoryV2Schema>;
export type LockV2 = z.infer<typeof LockV2Schema>;
