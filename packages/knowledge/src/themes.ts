import type { ResolvedTheme, ThemePreset, ThemeTokens } from '@mapbard/schema';

/** OFL families the renderer copies into `fonts/`, so offline builds keep their typography. */
export const BUNDLED_FONTS = {
  Inter: { license: 'OFL-1.1', package: '@fontsource-variable/inter' },
  'Source Serif 4': { license: 'OFL-1.1', package: '@fontsource-variable/source-serif-4' },
} as const;

const serif = (family: string) => ({
  family,
  fallback: 'serif' as const,
  bundled: family in BUNDLED_FONTS,
});
const sans = (family: string) => ({
  family,
  fallback: 'sans-serif' as const,
  bundled: family in BUNDLED_FONTS,
});

// RdBu, used by the light presets.
const RED_BLUE = [
  '#b2182b',
  '#d6604d',
  '#f4a582',
  '#fddbc7',
  '#f7f7f7',
  '#d1e5f0',
  '#92c5de',
  '#4393c3',
  '#2166ac',
];

/** Each preset is a complete token set; authored theme fields override single tokens. */
export const THEME_PRESET_TOKENS: Record<ThemePreset, Omit<ResolvedTheme, 'preset' | 'palette'>> = {
  'editorial-light': {
    colors: {
      page: '#e9e6df',
      ink: '#213631',
      muted: '#455a55',
      accent: '#0b3d91',
      card: '#fffffff0',
      rule: '#21363129',
      land: '#f2efe9',
      water: '#b8d4e3',
      landcover: '#e2e9d9',
      road: '#ffffff',
      boundary: '#9aa39f',
      building: '#e4dfd6',
      label: '#5c6a66',
      labelHalo: '#ffffff',
      hillshadeShadow: '#5b5145',
      hillshadeHighlight: '#ffffff',
      sky: '#c9dcea',
      horizon: '#eef2f3',
      fog: '#e9e6df',
    },
    ramps: {
      // The pre-theme default ramp, kept so existing stories keep their colours.
      sequential: [
        '#edf8fb',
        '#66c2a4',
        '#238b45',
        '#145a32',
        '#0b3d20',
        '#092913',
        '#071b0e',
        '#051109',
        '#030806',
      ],
      diverging: RED_BLUE,
    },
    fonts: { display: serif('Source Serif 4'), body: sans('Inter') },
    type: { basePx: 17, ratio: 1.25, lineHeight: 1.6, headingWeight: 600 },
    card: { radius: 12, blur: 6, shadow: 'soft', rule: 'left' },
  },
  night: {
    colors: {
      page: '#0e1420',
      ink: '#e6ebf2',
      muted: '#a7b3c3',
      accent: '#f2b84b',
      card: '#141c2bee',
      rule: '#ffffff24',
      land: '#18202e',
      water: '#0c1726',
      landcover: '#1b2632',
      road: '#2a3546',
      boundary: '#556479',
      building: '#212b3a',
      label: '#9aa8ba',
      labelHalo: '#0e1420',
      hillshadeShadow: '#000000',
      hillshadeHighlight: '#3b4a63',
      sky: '#0b1324',
      horizon: '#2a3c5c',
      fog: '#18202e',
    },
    ramps: {
      // Low values stay visible against dark land; lightness rises with value.
      sequential: [
        '#2c5f7c',
        '#2f7f8f',
        '#3a9e96',
        '#5bbb92',
        '#8bd38a',
        '#bde37f',
        '#e8ec7c',
        '#fde68a',
        '#fff3c4',
      ],
      diverging: ['#ef8a62', '#f4b183', '#f6d4b8', '#59606e', '#b3cde3', '#7fb2d8', '#4f93c8'],
    },
    fonts: { display: sans('Inter'), body: sans('Inter') },
    type: { basePx: 17, ratio: 1.25, lineHeight: 1.6, headingWeight: 650 },
    card: { radius: 10, blur: 10, shadow: 'strong', rule: 'top' },
  },
  atlas: {
    colors: {
      page: '#f3ead8',
      ink: '#3a2e21',
      muted: '#6a5843',
      accent: '#9a3b1c',
      card: '#fbf5e8f2',
      rule: '#3a2e2126',
      land: '#efe3c8',
      water: '#a7c3c4',
      landcover: '#dcdcb8',
      road: '#fbf6ea',
      boundary: '#9c8667',
      building: '#e2d3b5',
      label: '#5d4a33',
      labelHalo: '#f7efdd',
      hillshadeShadow: '#4a3b28',
      hillshadeHighlight: '#fffaf0',
      sky: '#e8d9b9',
      horizon: '#f6eedd',
      fog: '#efe3c8',
    },
    ramps: {
      sequential: [
        '#f3d9a4',
        '#ebbc78',
        '#e09f55',
        '#d0823b',
        '#bb6628',
        '#a14e1d',
        '#843a16',
        '#682a11',
        '#4d1e0c',
      ],
      diverging: [
        '#8c510a',
        '#bf812d',
        '#dfc27d',
        '#f6e8c3',
        '#f2ead6',
        '#c7eae5',
        '#80cdc1',
        '#35978f',
        '#01665e',
      ],
    },
    fonts: { display: serif('Source Serif 4'), body: serif('Source Serif 4') },
    type: { basePx: 17, ratio: 1.25, lineHeight: 1.62, headingWeight: 600 },
    card: { radius: 2, blur: 0, shadow: 'soft', rule: 'none' },
  },
  newsroom: {
    colors: {
      page: '#ffffff',
      ink: '#111111',
      muted: '#4a4a4a',
      accent: '#c8102e',
      card: '#ffffff',
      rule: '#11111126',
      land: '#f2f2f2',
      water: '#cddbe4',
      landcover: '#e9ebe6',
      road: '#ffffff',
      boundary: '#8c8c8c',
      building: '#e2e2e2',
      label: '#555555',
      labelHalo: '#ffffff',
      hillshadeShadow: '#3c3c3c',
      hillshadeHighlight: '#ffffff',
      sky: '#dfe7ee',
      horizon: '#f5f5f5',
      fog: '#f2f2f2',
    },
    ramps: {
      sequential: [
        '#c6dbef',
        '#9ecae1',
        '#6baed6',
        '#4292c6',
        '#2171b5',
        '#08519c',
        '#08306b',
        '#06234f',
        '#041b3d',
      ],
      diverging: RED_BLUE,
    },
    fonts: { display: sans('Inter'), body: serif('Source Serif 4') },
    type: { basePx: 18, ratio: 1.333, lineHeight: 1.55, headingWeight: 800 },
    card: { radius: 0, blur: 0, shadow: 'none', rule: 'top' },
  },
};

const HEX = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/**
 * Resolve an authored theme against its preset. Font names must already be validated.
 * Before presets, a palette's last colour was the accent; that still holds unless
 * `colors.accent` is set.
 */
export function resolveTheme(authored: ThemeTokens = {}): ResolvedTheme {
  const preset = authored.preset ?? 'editorial-light';
  const base = THEME_PRESET_TOKENS[preset];
  const legacyAccent = authored.palette?.at(-1);
  const colors = {
    ...base.colors,
    ...(legacyAccent && HEX.test(legacyAccent) ? { accent: legacyAccent } : {}),
    ...authored.colors,
  };
  const ramps = { ...base.ramps, ...authored.ramps };
  const font = (family: string | undefined, fallback: ResolvedTheme['fonts']['display']) =>
    family ? { ...fallback, family, bundled: family in BUNDLED_FONTS } : fallback;
  return {
    preset,
    colors,
    palette: authored.palette?.length ? [...authored.palette] : [...ramps.sequential],
    ramps,
    fonts: {
      display: font(authored.displayFont, base.fonts.display),
      body: font(authored.bodyFont, base.fonts.body),
    },
    type: { ...base.type },
    card: { ...base.card },
  };
}
