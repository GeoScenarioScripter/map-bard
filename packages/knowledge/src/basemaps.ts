import type { Compiled, ProjectV2, ThemeColors } from '@mapbard/schema';
import { THEME_PRESET_TOKENS } from './themes.js';

type Authored = ProjectV2['basemap'];
export type ResolvedBasemap = Exclude<Compiled['basemap'], 'neutral'>;

export const BASEMAP_PROVIDERS = {
  openfreemap: {
    styles: ['positron', 'dark', 'liberty', 'bright', 'fiord'],
    attribution: '© OpenFreeMap © OpenMapTiles Data from OpenStreetMap contributors',
    notice: 'Public service; uptime is not guaranteed.',
  },
  versatiles: {
    styles: [
      'colorful',
      'natural',
      'muted',
      'gray',
      'toner',
      'colorful-dark',
      'natural-dark',
      'muted-dark',
      'gray-dark',
      'toner-dark',
    ],
    attribution: '© VersaTiles © OpenStreetMap contributors',
    notice: 'Public service; uptime is not guaranteed.',
  },
} as const;

export const TERRAIN_PROVIDERS = {
  mapterhorn: {
    // The credit links to Mapterhorn's list of elevation sources, which it requires.
    attribution: '© Mapterhorn',
    attributionUrl: 'https://mapterhorn.com/attribution/',
    notice: 'Public service; uptime is not guaranteed.',
  },
  'aws-terrarium': {
    attribution:
      'Mapzen Terrain Tiles: ArcticDEM/DigitalGlobe/NSF; Geoscience Australia; offene Daten Österreichs; Open Government Licence Canada; Copernicus EU-DEM; NOAA ETOPO1; INEGI Mexico; Land Information New Zealand; Kartverket Norway; Environment Agency UK; USGS 3DEP/GMTED2010/SRTM. https://github.com/tilezen/joerd/blob/master/docs/attribution.md',
    notice: 'Public dataset; uptime is not guaranteed.',
  },
} as const;

function style(provider: 'openfreemap' | 'versatiles', name?: string) {
  const catalog = BASEMAP_PROVIDERS[provider];
  const selected = name ?? (provider === 'openfreemap' ? 'positron' : 'colorful');
  if (!(catalog.styles as readonly string[]).includes(selected))
    throw new Error(`Unsupported ${provider} style ${selected}.`);
  return {
    provider,
    url:
      provider === 'openfreemap'
        ? `https://tiles.openfreemap.org/styles/${selected}`
        : `https://tiles.versatiles.org/assets/styles/${selected}/style.json`,
    attribution: catalog.attribution,
  };
}

/**
 * Resolve a declared provider without making network requests. Tint, hillshade and
 * sky colours come from the theme; offline builds keep only request-free settings.
 */
export function resolveBasemap(
  authored: Authored,
  offline = false,
  colors: ThemeColors = THEME_PRESET_TOKENS['editorial-light'].colors,
): ResolvedBasemap {
  const requestFree = {
    projection: authored.projection ?? ('mercator' as const),
    ...(authored.sky === false
      ? {}
      : { sky: { sky: colors.sky, horizon: colors.horizon, fog: colors.fog } }),
  };
  if (offline || authored.provider === 'none') return { provider: 'none', ...requestFree };
  const primary =
    authored.provider === 'custom'
      ? { provider: 'custom' as const, url: authored.styleUrl!, attribution: authored.attribution! }
      : style(authored.provider, authored.style);
  const fallbacks =
    authored.fallback ?? (authored.provider === 'openfreemap' ? ['versatiles'] : []);
  const styles: Extract<ResolvedBasemap, { styles: unknown }>['styles'] = [primary];
  for (const fallback of fallbacks) {
    if (fallback !== primary.provider && !styles.some((entry) => entry.provider === fallback))
      styles.push(style(fallback));
  }
  const terrain = authored.terrain && {
    tiles:
      authored.terrain.provider === 'mapterhorn'
        ? 'https://tiles.mapterhorn.com/{z}/{x}/{y}.webp'
        : 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
    attribution: TERRAIN_PROVIDERS[authored.terrain.provider].attribution,
    ...(authored.terrain.provider === 'mapterhorn'
      ? { attributionUrl: TERRAIN_PROVIDERS.mapterhorn.attributionUrl }
      : {}),
    exaggeration: authored.terrain.exaggeration ?? 1,
    tileSize: authored.terrain.provider === 'mapterhorn' ? (512 as const) : (256 as const),
    ...(authored.terrain.hillshade === false
      ? {}
      : { hillshade: { shadow: colors.hillshadeShadow, highlight: colors.hillshadeHighlight } }),
  };
  // Custom styles may not follow a known schema, so they are only tinted on request.
  const tint = (authored.tint ?? (authored.provider === 'custom' ? 'none' : 'theme')) === 'theme';
  return {
    provider: authored.provider,
    ...requestFree,
    labels: authored.labels ?? 'full',
    styles,
    ...(terrain ? { terrain } : {}),
    ...(tint
      ? {
          tint: {
            land: colors.land,
            water: colors.water,
            landcover: colors.landcover,
            road: colors.road,
            boundary: colors.boundary,
            building: colors.building,
            label: colors.label,
            labelHalo: colors.labelHalo,
          },
        }
      : {}),
  };
}
