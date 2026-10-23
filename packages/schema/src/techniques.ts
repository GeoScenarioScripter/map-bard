import { z } from 'zod';
import { IdSchema } from './project.js';

/**
 * Authored options of the V2 techniques (format 0.2.0, all optional): 3D columns and
 * extrusions, change symbols, hexbins, arcs and trips. See docs/m2-visual.md, V2.
 */

/** Techniques V2 adds to the authored and compiled enums. */
export const V2_TECHNIQUES = ['column', 'extrusion', 'change', 'hexbin', 'arc', 'trip'] as const;

/** Height of the tallest column or extrusion above its base, in metres. */
export const MaxHeightMetersSchema = z.number().finite().positive().max(1_000_000);

/** Widest line of a width encoding (arcs), in CSS pixels. */
export const DEFAULT_MAX_WIDTH = 8;
export const MaxWidthSchema = z.number().finite().min(1).max(32);

/** A column's round footprint; the player tessellates it around each point. */
export const ColumnOptionsSchema = z
  .object({ radiusMeters: z.number().finite().positive().max(100_000) })
  .strict();

/** The observation a change symbol compares with, matched by feature ID. */
export const CompareSchema = z
  .object({
    sourceId: IdSchema,
    /** One compiled callout per feature naming its change, for example "−21,580 ft³/s (−91%)". */
    labels: z.boolean().optional(),
  })
  .strict();

/** Morph this layer's values from a layer of another scene (`layerId` defaults to this one's). */
export const LayerTransitionSchema = z
  .object({
    from: z.object({ sceneId: IdSchema, layerId: IdSchema.optional() }).strict(),
  })
  .strict();

export const AGGREGATE_OPS = ['count', 'sum', 'mean'] as const;

/** Hexbin aggregation: `cellKm` is the cell's ground width at the data's centre latitude. */
export const AggregateSchema = z
  .object({
    cellKm: z.number().finite().positive().max(1000),
    op: z.enum(AGGREGATE_OPS),
    /** The quantity `sum` and `mean` aggregate; `count` takes none. */
    attribute: IdSchema.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.op === 'count' && value.attribute !== undefined)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['attribute'],
        message: 'A count aggregates no attribute.',
      });
    if (value.op !== 'count' && value.attribute === undefined)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['attribute'],
        message: `A ${value.op} needs the quantity attribute it aggregates.`,
      });
  });

/** Extruded hexbins: the tallest cell's height. */
export const ExtrudeSchema = z.object({ maxHeightMeters: MaxHeightMetersSchema }).strict();

export const ArcOptionsSchema = z.object({ greatCircle: z.boolean().optional() }).strict();

/** `timeProperty` holds one ISO 8601 UTC time per vertex, in ascending order. */
export const TripOptionsSchema = z
  .object({
    timeProperty: IdSchema,
    trailHours: z.number().finite().positive().max(8760),
  })
  .strict();

/** The optional V2 layer fields, shared by format 0.2 story layers and the compiler's input. */
export const layerV2Fields = {
  column: ColumnOptionsSchema.optional(),
  compare: CompareSchema.optional(),
  transition: LayerTransitionSchema.optional(),
  aggregate: AggregateSchema.optional(),
  extrude: ExtrudeSchema.optional(),
  arc: ArcOptionsSchema.optional(),
  trip: TripOptionsSchema.optional(),
};
export const LAYER_V2_FIELDS = Object.keys(layerV2Fields) as (keyof typeof layerV2Fields)[];

/** Encoding fields for heights and widths, linear from zero. */
export const encodeV2Fields = {
  /** Height encodings only: the tallest value's height in metres. */
  maxHeightMeters: MaxHeightMetersSchema.optional(),
  /** Width encodings only: the widest value's width in CSS pixels (default 8). */
  maxWidth: MaxWidthSchema.optional(),
};

export type V2Technique = (typeof V2_TECHNIQUES)[number];
export type ColumnOptions = z.infer<typeof ColumnOptionsSchema>;
export type Compare = z.infer<typeof CompareSchema>;
export type LayerTransition = z.infer<typeof LayerTransitionSchema>;
export type Aggregate = z.infer<typeof AggregateSchema>;
export type ArcOptions = z.infer<typeof ArcOptionsSchema>;
export type TripOptions = z.infer<typeof TripOptionsSchema>;
