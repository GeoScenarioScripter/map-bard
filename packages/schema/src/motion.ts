import { z } from 'zod';
import { LngLatSchema } from './geo-narrative.js';
import { IdSchema } from './project.js';

/** Scene progress `p`: 0 when the scene's card arrives at rest, 1 when it starts to leave, `scrollLength` viewports later. */
export const ProgressSchema = z.number().finite().min(0).max(1);

export const NAMED_EASINGS = ['linear', 'ease-in', 'ease-out', 'ease-in-out', 'expo-out'] as const;

export const EasingSchema = z.union([
  z.enum(NAMED_EASINGS),
  z
    .object({
      kind: z.literal('cubic-bezier'),
      points: z.tuple([
        z.number().finite().min(0).max(1),
        z.number().finite(),
        z.number().finite().min(0).max(1),
        z.number().finite(),
      ]),
    })
    .strict(),
  z
    .object({
      kind: z.literal('spring'),
      stiffness: z.number().finite().positive(),
      damping: z.number().finite().positive(),
    })
    .strict(),
]);

/** `scrub` follows scroll, `play` runs once for `durationMs`, `loop` repeats, `step` jumps to `final`. */
export const MotionModeSchema = z.enum(['scrub', 'play', 'loop', 'step']);

export const RangeSchema = z
  .tuple([ProgressSchema, ProgressSchema])
  .refine(([start, end]) => start <= end, 'Range start must not exceed its end.');

/** Fully resolved camera: the player never fills in defaults. */
export const CameraStateSchema = z
  .object({
    center: LngLatSchema,
    zoom: z.number().finite(),
    pitch: z.number().finite(),
    bearing: z.number().finite(),
  })
  .strict();

const TrackBase = {
  mode: MotionModeSchema,
  /** The progress window the track occupies inside its scene. */
  range: RangeSchema,
  /** Required for `play` and `loop`. */
  durationMs: z.number().finite().positive().optional(),
  /** Wait after the trigger before a `play` or `loop` track starts. */
  delayMs: z.number().finite().nonnegative().optional(),
};

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function checkTrack<K extends { at: number }>(
  track: { keyframes: readonly K[]; mode: string; durationMs?: number; final: unknown },
  ctx: z.RefinementCtx,
  finalOf: (frame: K) => unknown,
): void {
  track.keyframes.forEach((frame, index) => {
    if (index > 0 && frame.at < track.keyframes[index - 1]!.at)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['keyframes', index, 'at'],
        message: 'Keyframes must be in ascending progress order.',
      });
  });
  if ((track.mode === 'play' || track.mode === 'loop') && track.durationMs === undefined)
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['durationMs'],
      message: `A ${track.mode} track needs durationMs.`,
    });
  // Interpolation stops at the last keyframe, so it must be the declared final state.
  const last = track.keyframes[track.keyframes.length - 1];
  if (last && !sameValue(finalOf(last), track.final))
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['final'],
      message: 'The final state must equal the last keyframe.',
    });
}

export const CameraKeyframeSchema = CameraStateSchema.extend({
  at: ProgressSchema,
  /** Shapes the segment that ends at this keyframe; the first keyframe's easing is unused. */
  easing: EasingSchema,
}).strict();

export const CameraTrackSchema = z
  .object({
    ...TrackBase,
    /** `at` is local to `range`: 0 at its start, 1 at its end. */
    keyframes: z.array(CameraKeyframeSchema).min(1),
    final: CameraStateSchema,
  })
  .strict()
  .superRefine((track, ctx) =>
    checkTrack(track, ctx, (frame: CameraKeyframe) => ({
      center: frame.center,
      zoom: frame.zoom,
      pitch: frame.pitch,
      bearing: frame.bearing,
    })),
  );

/** `opacity` scales the layer's own opacity, `line-reveal` draws a line on, `highlight` strengthens its outline. */
export const LAYER_TRACK_PROPERTIES = ['opacity', 'line-reveal', 'highlight'] as const;

const LayerKeyframeSchema = z
  .object({
    at: ProgressSchema,
    value: z.number().finite().min(0).max(1),
    easing: EasingSchema,
  })
  .strict();

/** Feature order for a stagger: as stored, or by the layer's encoded attribute. */
export const STAGGER_ORDERS = ['data', 'ascending', 'descending'] as const;

/**
 * Per-feature offset of a `play` or `loop` layer track: the feature ranked `i` starts
 * `i * delayMs` after the first, so features rise one after another.
 */
export const StaggerSchema = z
  .object({
    delayMs: z.number().finite().positive().max(10000),
    order: z.enum(STAGGER_ORDERS),
    /** The encoded attribute that ranks features; required unless the order is `data`. */
    attribute: IdSchema.optional(),
  })
  .strict()
  .refine((value) => value.order === 'data' || value.attribute !== undefined, {
    message: 'An ascending or descending stagger needs the attribute it ranks by.',
    path: ['attribute'],
  });

export const LayerTrackSchema = z
  .object({
    ...TrackBase,
    runtimeLayerId: IdSchema,
    property: z.enum(LAYER_TRACK_PROPERTIES),
    keyframes: z.array(LayerKeyframeSchema).min(1),
    final: z.number().finite().min(0).max(1),
    stagger: StaggerSchema.optional(),
  })
  .strict()
  .superRefine((track, ctx) => {
    checkTrack(track, ctx, (frame: z.infer<typeof LayerKeyframeSchema>) => frame.value);
    if (track.stagger && track.mode !== 'play' && track.mode !== 'loop')
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['stagger'],
        message: 'Only play and loop tracks stagger; scrub and step follow scroll.',
      });
    if (track.stagger && track.property === 'line-reveal')
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['stagger'],
        message: 'line-reveal draws the whole layer at once and cannot stagger.',
      });
  });

/** Opacity of one callout (label, leader and halo); 0 hides it from readers and placement. */
export const CalloutTrackSchema = z
  .object({
    ...TrackBase,
    calloutId: IdSchema,
    keyframes: z.array(LayerKeyframeSchema).min(1),
    final: z.number().finite().min(0).max(1),
  })
  .strict()
  .superRefine((track, ctx) =>
    checkTrack(track, ctx, (frame: z.infer<typeof LayerKeyframeSchema>) => frame.value),
  );

export const SceneMotionSchema = z
  .object({
    /** Viewport heights of scroll the card rests while p runs 0 to 1; the section adds one viewport of transit. */
    scrollLength: z.number().finite().min(0.5).max(20),
    /**
     * Where in the one-viewport transit between two cards the scene becomes active: the
     * viewport fraction from the top that its section top crosses (0 when its card arrives
     * at rest, 0.5 midway). The camera hand-over starts there.
     */
    trigger: ProgressSchema,
    reducedMotion: z.enum(['step', 'shorten', 'keep']),
    camera: CameraTrackSchema,
    layers: z.array(LayerTrackSchema),
    callouts: z.array(CalloutTrackSchema),
  })
  .strict()
  .superRefine((motion, ctx) => {
    const callouts = new Set<string>();
    motion.callouts.forEach((track, index) => {
      if (callouts.has(track.calloutId))
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['callouts', index],
          message: 'A callout has at most one track per scene.',
        });
      callouts.add(track.calloutId);
    });
    const seen = new Set<string>();
    motion.layers.forEach((track, index) => {
      const key = `${track.runtimeLayerId}\u0000${track.property}`;
      if (seen.has(key))
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['layers', index],
          message: 'A layer property has at most one track per scene.',
        });
      seen.add(key);
    });
  });

export type Easing = z.infer<typeof EasingSchema>;
export type MotionMode = z.infer<typeof MotionModeSchema>;
export type CameraState = z.infer<typeof CameraStateSchema>;
export type CameraKeyframe = z.infer<typeof CameraKeyframeSchema>;
export type CameraTrack = z.infer<typeof CameraTrackSchema>;
export type LayerTrack = z.infer<typeof LayerTrackSchema>;
export type Stagger = z.infer<typeof StaggerSchema>;
export type CalloutTrack = z.infer<typeof CalloutTrackSchema>;
export type LayerTrackProperty = (typeof LAYER_TRACK_PROPERTIES)[number];
export type SceneMotion = z.infer<typeof SceneMotionSchema>;
