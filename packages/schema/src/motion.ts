import { z } from 'zod';
import { LngLatSchema } from './geo-narrative.js';
import { IdSchema } from './project.js';

/** Scene progress `p`: 0 when a scene reaches its trigger line, 1 after `scrollLength` viewports. */
export const ProgressSchema = z.number().finite().min(0).max(1);

export const EasingSchema = z.union([
  z.enum(['linear', 'ease-in', 'ease-out', 'ease-in-out', 'expo-out']),
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

const RangeSchema = z
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
};

function keyframesAscending(
  track: { keyframes: readonly { at: number }[]; mode: string; durationMs?: number },
  ctx: z.RefinementCtx,
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
}

export const CameraTrackSchema = z
  .object({
    ...TrackBase,
    /** `at` is local to `range`: 0 at its start, 1 at its end. */
    keyframes: z
      .array(CameraStateSchema.extend({ at: ProgressSchema, easing: EasingSchema }).strict())
      .min(1),
    final: CameraStateSchema,
  })
  .strict()
  .superRefine(keyframesAscending);

export const LayerTrackSchema = z
  .object({
    ...TrackBase,
    runtimeLayerId: IdSchema,
    property: z.enum(['opacity', 'line-reveal', 'highlight']),
    keyframes: z
      .array(
        z
          .object({
            at: ProgressSchema,
            value: z.number().finite().min(0).max(1),
            easing: EasingSchema,
          })
          .strict(),
      )
      .min(1),
    final: z.number().finite().min(0).max(1),
  })
  .strict()
  .superRefine(keyframesAscending);

export const SceneMotionSchema = z
  .object({
    /** Scene length in viewport heights. */
    scrollLength: z.number().finite().min(0.5).max(20),
    /** Viewport fraction from the top where the scene starts (0 top, 0.5 centre). */
    trigger: ProgressSchema,
    reducedMotion: z.enum(['step', 'shorten', 'keep']),
    camera: CameraTrackSchema,
    layers: z.array(LayerTrackSchema),
  })
  .strict();

export type Easing = z.infer<typeof EasingSchema>;
export type MotionMode = z.infer<typeof MotionModeSchema>;
export type CameraState = z.infer<typeof CameraStateSchema>;
export type CameraTrack = z.infer<typeof CameraTrackSchema>;
export type LayerTrack = z.infer<typeof LayerTrackSchema>;
export type SceneMotion = z.infer<typeof SceneMotionSchema>;
