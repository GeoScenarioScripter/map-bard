import { z } from 'zod';
import { CameraSchema, LngLatSchema } from './geo-narrative.js';
import {
  EasingSchema,
  LAYER_TRACK_PROPERTIES,
  MotionModeSchema,
  ProgressSchema,
  RangeSchema,
  type Easing,
} from './motion.js';
import { IdSchema } from './project.js';

/**
 * Authored motion (format 0.2, all optional). Settings cascade from built-in
 * defaults to story-wide `motion` in mapbard.json, then a named entry of
 * `motionPresets`, then scene `motion` in story.json, then each track; the most
 * specific setting wins. The compiler turns the result into compiled tracks.
 */

const NUMBER = String.raw`\s*(-?(?:\d+(?:\.\d*)?|\.\d+))\s*`;
const CUBIC = new RegExp(`^cubic-bezier\\(${NUMBER},${NUMBER},${NUMBER},${NUMBER}\\)$`);
const SPRING = new RegExp(`^spring\\(${NUMBER},${NUMBER}\\)$`);

/** Parse the CSS-like short forms `cubic-bezier(x1, y1, x2, y2)` and `spring(stiffness, damping)`. */
export function parseEasingText(text: string): Easing | undefined {
  const cubic = CUBIC.exec(text);
  if (cubic) {
    const [x1, y1, x2, y2] = cubic.slice(1).map(Number) as [number, number, number, number];
    if (x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) return undefined;
    return { kind: 'cubic-bezier', points: [x1, y1, x2, y2] };
  }
  const spring = SPRING.exec(text);
  if (spring) {
    const [stiffness, damping] = spring.slice(1).map(Number) as [number, number];
    if (!(stiffness > 0) || !(damping > 0)) return undefined;
    return { kind: 'spring', stiffness, damping };
  }
  return undefined;
}

/** A named easing, an easing object, or the `cubic-bezier(…)` / `spring(…)` short form. */
export const AuthoredEasingSchema = z.union([
  EasingSchema,
  z
    .string()
    .refine(
      (text) => parseEasingText(text) !== undefined,
      'Use linear, ease-in, ease-out, ease-in-out, expo-out, cubic-bezier(x1, y1, x2, y2) with x in [0, 1], or spring(stiffness, damping).',
    ),
]);

/**
 * When a scene becomes active during the transit from the previous card: `top` (0) once its
 * card arrives at rest, `center` (0.5, the default) midway, or a viewport fraction from the top
 * that the scene's section top crosses.
 */
export const TriggerSchema = z.union([z.enum(['top', 'center']), ProgressSchema]);

const TrackSettings = {
  mode: MotionModeSchema.optional(),
  easing: AuthoredEasingSchema.optional(),
  durationMs: z.number().finite().positive().max(120000).optional(),
  delayMs: z.number().finite().nonnegative().max(60000).optional(),
};

/** Defaults for one kind of track; `range` is per track, so it is not a default. */
export const TrackDefaultsSchema = z.object(TrackSettings).strict();

/** A feature as `<sourceId>/<featureId>`, the same pair annotation targets use. */
export const FeatureRefSchema = z
  .string()
  .regex(/^[^/]+\/.+$/, 'Reference a feature as <sourceId>/<featureId>.');

export const CAMERA_PRESETS = [
  'hold',
  'reveal-from-overview',
  'push-in',
  'orbit',
  'fly-along',
] as const;

const AuthoredCameraKeyframeSchema = z
  .object({
    at: ProgressSchema,
    center: LngLatSchema.optional(),
    zoom: z.number().finite().optional(),
    pitch: z.number().finite().min(0).max(85).optional(),
    bearing: z.number().finite().optional(),
    easing: AuthoredEasingSchema.optional(),
  })
  .strict();

/**
 * One camera move. Short form: `{"preset": "fly-along", "feature": "river/main", "pitch": 60}`.
 * Explicit `keyframes` take precedence over a preset from a less specific level.
 */
export const CameraMotionSchema = z
  .object({
    ...TrackSettings,
    range: RangeSchema.optional(),
    preset: z.enum(CAMERA_PRESETS).optional(),
    /** `push-in` and `fly-along` target; `fly-along` accepts an ordered list of line features. */
    feature: z.union([FeatureRefSchema, z.array(FeatureRefSchema).min(1)]).optional(),
    /** Preset view overrides; keyframes inherit missing fields from the previous keyframe. */
    zoom: z.number().finite().optional(),
    pitch: z.number().finite().min(0).max(85).optional(),
    bearing: z.number().finite().optional(),
    /** `orbit` turn in degrees (negative turns anticlockwise). */
    degrees: z.number().finite().min(-1440).max(1440).optional(),
    /** `reveal-from-overview` start; defaults to the extent of the scene's layers. */
    from: CameraSchema.strict().optional(),
    /** `fly-along` direction against the line's coordinate order. */
    reverse: z.boolean().optional(),
    keyframes: z.array(AuthoredCameraKeyframeSchema).min(1).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.preset && value.keyframes)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['keyframes'],
        message: 'Use either a preset or keyframes in one camera move.',
      });
    value.keyframes?.forEach((frame, index) => {
      if (index > 0 && frame.at < value.keyframes![index - 1]!.at)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['keyframes', index, 'at'],
          message: 'Keyframes must be in ascending progress order.',
        });
    });
  });

export const LayerMotionSchema = z
  .object({
    ...TrackSettings,
    range: RangeSchema.optional(),
    /** A layer of the same scene. */
    layerId: IdSchema,
    property: z.enum(LAYER_TRACK_PROPERTIES),
    /** `data` tracks play once by default; `ambient` tracks loop and get a pause control. */
    type: z.enum(['data', 'ambient']).optional(),
    from: z.number().finite().min(0).max(1).optional(),
    to: z.number().finite().min(0).max(1).optional(),
    keyframes: z
      .array(
        z
          .object({
            at: ProgressSchema,
            value: z.number().finite().min(0).max(1),
            easing: AuthoredEasingSchema.optional(),
          })
          .strict(),
      )
      .min(1)
      .optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.keyframes && (value.from !== undefined || value.to !== undefined))
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['keyframes'],
        message: 'Use either from/to or keyframes in one layer track.',
      });
    value.keyframes?.forEach((frame, index) => {
      if (index > 0 && frame.at < value.keyframes![index - 1]!.at)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['keyframes', index, 'at'],
          message: 'Keyframes must be in ascending progress order.',
        });
    });
  });

const sceneSettings = {
  /** Viewport heights the card rests while its tracks run, so long camera flights get more scroll. */
  scrollLength: z.number().finite().min(0.5).max(20).optional(),
  trigger: TriggerSchema.optional(),
  /** Under `prefers-reduced-motion`: `step` (default) jumps to final states, `shorten` keeps fast fades, `keep` plays as authored. */
  reducedMotion: z.enum(['step', 'shorten', 'keep']).optional(),
};

const sceneTracks = {
  /** One move, or moves sequenced by `range` (an even split when ranges are omitted). */
  camera: z.union([CameraMotionSchema, z.array(CameraMotionSchema).min(1).max(8)]).optional(),
  layers: z.array(LayerMotionSchema).optional(),
};

/** Story-wide defaults in mapbard.json. */
export const StoryMotionSchema = z
  .object({
    ...sceneSettings,
    camera: TrackDefaultsSchema.optional(),
    data: TrackDefaultsSchema.optional(),
    ambient: TrackDefaultsSchema.optional(),
  })
  .strict();

/** A reusable scene motion in `motionPresets`. */
export const MotionPresetSchema = z.object({ ...sceneSettings, ...sceneTracks }).strict();

/** Scene `motion` in story.json; `preset` names an entry of `motionPresets`. */
export const AuthoredSceneMotionSchema = z
  .object({ preset: IdSchema.optional(), ...sceneSettings, ...sceneTracks })
  .strict();

export const MotionPresetsSchema = z.record(
  z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, 'Name presets with letters, digits, _ or -.'),
  MotionPresetSchema,
);

/** Authored motion carried from format 0.2 into the compiler. */
export const AuthoredMotionSchema = z
  .object({
    story: StoryMotionSchema.optional(),
    presets: MotionPresetsSchema.optional(),
    /** Keyed by scene ID. */
    scenes: z.record(AuthoredSceneMotionSchema),
  })
  .strict();

export type AuthoredEasing = z.infer<typeof AuthoredEasingSchema>;
export type Trigger = z.infer<typeof TriggerSchema>;
export type TrackDefaults = z.infer<typeof TrackDefaultsSchema>;
export type CameraMotion = z.infer<typeof CameraMotionSchema>;
export type LayerMotion = z.infer<typeof LayerMotionSchema>;
export type StoryMotion = z.infer<typeof StoryMotionSchema>;
export type MotionPreset = z.infer<typeof MotionPresetSchema>;
export type AuthoredSceneMotion = z.infer<typeof AuthoredSceneMotionSchema>;
export type AuthoredMotion = z.infer<typeof AuthoredMotionSchema>;
