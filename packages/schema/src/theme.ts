import { z } from 'zod';

/** Theme presets; each is a full token set in `@mapbard/knowledge`. */
export const THEME_PRESETS = ['editorial-light', 'night', 'atlas', 'newsroom'] as const;

/** Theme colours reach generated CSS and map paint, so only hex literals are accepted. */
export const HexColorSchema = z
  .string()
  .regex(
    /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/,
    'Use a hex colour such as #1f4e79.',
  );

/** CSS font family names; quoting is generated, so quotes and punctuation are rejected. */
export const FontFamilySchema = z
  .string()
  .regex(/^[A-Za-z0-9][A-Za-z0-9 ._-]*$/, 'Use a plain font family name such as Inter.');

const colorShape = {
  /** Page behind the map and story column. */
  page: HexColorSchema,
  ink: HexColorSchema,
  muted: HexColorSchema,
  accent: HexColorSchema,
  /** Card background; an alpha channel gives a translucent card. */
  card: HexColorSchema,
  /** Hairlines and dividers. */
  rule: HexColorSchema,
  // Basemap tint, applied to known provider layers.
  land: HexColorSchema,
  water: HexColorSchema,
  landcover: HexColorSchema,
  road: HexColorSchema,
  boundary: HexColorSchema,
  building: HexColorSchema,
  label: HexColorSchema,
  labelHalo: HexColorSchema,
  hillshadeShadow: HexColorSchema,
  hillshadeHighlight: HexColorSchema,
  sky: HexColorSchema,
  horizon: HexColorSchema,
  fog: HexColorSchema,
};
export const THEME_COLOR_KEYS = Object.keys(colorShape) as (keyof typeof colorShape)[];

export const ThemeColorsSchema = z.object(colorShape).strict();
export const ThemeRampsSchema = z
  .object({
    sequential: z.array(HexColorSchema).min(2).max(9),
    diverging: z.array(HexColorSchema).min(3).max(11),
  })
  .strict();

/** Authored theme: a preset plus optional overrides; omitted fields come from the preset. */
export const ThemeTokensSchema = z.object({
  preset: z.enum(THEME_PRESETS).optional(),
  /** Class colours for data scales; defaults to the preset's sequential ramp. */
  palette: z.array(z.string()).optional(),
  displayFont: z.string().optional(),
  bodyFont: z.string().optional(),
  colors: ThemeColorsSchema.partial().strict().optional(),
  ramps: ThemeRampsSchema.partial().strict().optional(),
});

const FontSchema = z
  .object({
    family: FontFamilySchema,
    fallback: z.enum(['serif', 'sans-serif']),
    /** True when the build copies this OFL family into `fonts/`. */
    bundled: z.boolean(),
  })
  .strict();

/** Every token resolved, so the renderer generates CSS without guessing defaults. */
export const ResolvedThemeSchema = z
  .object({
    preset: z.enum(THEME_PRESETS),
    colors: ThemeColorsSchema,
    palette: z.array(z.string()).min(1),
    ramps: ThemeRampsSchema,
    fonts: z.object({ display: FontSchema, body: FontSchema }).strict(),
    type: z
      .object({
        /** Body text size in CSS pixels. */
        basePx: z.number().min(12).max(24),
        /** Modular scale ratio between heading steps. */
        ratio: z.number().min(1).max(2),
        lineHeight: z.number().min(1).max(2),
        headingWeight: z.number().int().min(100).max(900),
      })
      .strict(),
    card: z
      .object({
        radius: z.number().min(0).max(32),
        blur: z.number().min(0).max(32),
        shadow: z.enum(['none', 'soft', 'strong']),
        /** Accent rule drawn on one card edge. */
        rule: z.enum(['left', 'top', 'none']),
      })
      .strict(),
  })
  .strict();

export type ThemePreset = (typeof THEME_PRESETS)[number];
export type ThemeTokens = z.infer<typeof ThemeTokensSchema>;
export type ThemeColors = z.infer<typeof ThemeColorsSchema>;
export type ResolvedTheme = z.infer<typeof ResolvedThemeSchema>;
