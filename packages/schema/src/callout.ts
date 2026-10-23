import { z } from 'zod';
import { LngLatSchema } from './geo-narrative.js';
import { IdSchema } from './project.js';

/**
 * A point symbol a callout points at. `radius` is the drawn symbol's outer radius in CSS
 * pixels (fill plus stroke) at the compiled defaults, so placement can keep the label off it.
 */
export const CalloutTargetSchema = z
  .object({
    at: LngLatSchema,
    radius: z.number().finite().nonnegative(),
  })
  .strict();

/**
 * One resolved annotation callout. The player positions the label, leader line and target
 * halo from the map projection every frame; it never derives text or targets itself.
 */
/**
 * A callout the compiler wrote, never the author: for example a change label. It lists the
 * values it was computed from, so the text can be traced to the data.
 */
export const GeneratedCalloutSchema = z
  .object({
    operation: z.literal('change'),
    inputs: z
      .array(
        z
          .object({
            sourceId: IdSchema,
            featureId: IdSchema,
            attribute: IdSchema,
            value: z.number().finite(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export const CalloutSchema = z
  .object({
    /** The authored annotation ID, or a compiler ID for a generated callout. */
    id: IdSchema,
    text: z.string().min(1),
    /** Where the leader line points. */
    anchor: LngLatSchema,
    /** Placement order: 0 is placed first and keeps the best position. */
    priority: z.number().int().nonnegative(),
    /** Drawn point symbols of the annotated features; empty for free, line or polygon targets. */
    targets: z.array(CalloutTargetSchema),
    generated: GeneratedCalloutSchema.optional(),
  })
  .strict();

export const SceneCalloutsSchema = z.array(CalloutSchema).superRefine((callouts, ctx) => {
  const ids = new Set<string>();
  const priorities = new Set<number>();
  callouts.forEach((callout, index) => {
    if (ids.has(callout.id))
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index, 'id'],
        message: `Duplicate callout ${callout.id}`,
      });
    if (priorities.has(callout.priority))
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index, 'priority'],
        message: `Duplicate callout priority ${callout.priority}`,
      });
    ids.add(callout.id);
    priorities.add(callout.priority);
  });
});

export type CalloutTarget = z.infer<typeof CalloutTargetSchema>;
export type Callout = z.infer<typeof CalloutSchema>;
export type GeneratedCallout = z.infer<typeof GeneratedCalloutSchema>;
