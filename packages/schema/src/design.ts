import { z } from 'zod';
import { ClassificationMethodSchema, LngLatSchema, MaxRadiusSchema } from './geo-narrative.js';
import { DESIGN_VERSION, ExtensionsSchema, IdSchema } from './project.js';

export const AnnotationSchema = z
  .object({
    id: IdSchema,
    text: z.string().min(1),
    at: LngLatSchema,
    target: z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('free') }).strict(),
      z
        .object({
          kind: z.literal('features'),
          sourceId: IdSchema,
          featureIds: z.array(IdSchema).min(1),
        })
        .strict(),
    ]),
  })
  .strict();

export const TypedFilterSchema = z
  .object({
    attribute: IdSchema,
    op: z.enum(['==', '!=', '<', '<=', '>', '>=']),
    value: z.union([z.string(), z.number().finite(), z.boolean()]),
  })
  .strict();

const sharedScaleBase = {
  id: IdSchema,
  /** Reader-facing legend title; defaults to the encoded attribute's label. */
  title: z.string().min(1).optional(),
  members: z
    .array(
      z
        .object({
          sceneId: IdSchema,
          layerId: IdSchema,
          sourceId: IdSchema,
          observationLabel: z.string().min(1),
        })
        .strict(),
    )
    .min(2),
};

/** One scale shared by layers that a story compares; format 0.1 design and 0.2 story agree. */
export const SharedScaleSchema = z.discriminatedUnion('visualVariable', [
  z
    .object({
      ...sharedScaleBase,
      visualVariable: z.literal('color'),
      method: ClassificationMethodSchema,
      classes: z.number().int().min(2).max(9),
      /** Manual interior class edges, strictly increasing; `classes - 1` of them. */
      breaks: z.array(z.number().finite()).min(1).optional(),
      palette: z.array(z.string()).min(2),
      domain: z.tuple([z.number().finite(), z.number().finite()]).optional(),
    })
    .strict(),
  // Graduated symbols: one sqrt-area mapping from zero to the largest value of every member.
  z
    .object({
      ...sharedScaleBase,
      visualVariable: z.literal('size'),
      /** Radius of the largest symbol, in CSS pixels (default 16). */
      maxRadius: MaxRadiusSchema.optional(),
    })
    .strict(),
]);

export const LayerConstantSchema = z
  .object({
    color: z.string().optional(),
    radius: z.number().positive().optional(),
    opacity: z.number().min(0).max(1).optional(),
  })
  .strict();

export const DesignSchema = z
  .object({
    designVersion: z.literal(DESIGN_VERSION),
    scenes: z.array(
      z
        .object({
          sceneId: IdSchema,
          layers: z.array(
            z
              .object({
                layerId: IdSchema,
                filter: TypedFilterSchema.optional(),
                constant: LayerConstantSchema.optional(),
              })
              .strict(),
          ),
          annotations: z.array(AnnotationSchema),
        })
        .strict(),
    ),
    sharedScales: z.array(SharedScaleSchema),
    extensions: ExtensionsSchema.optional(),
  })
  .strict();

export type Design = z.infer<typeof DesignSchema>;
export type Annotation = z.infer<typeof AnnotationSchema>;
