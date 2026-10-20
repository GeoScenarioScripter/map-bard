import type { ProjectV2 } from '@mapbard/schema';

type Authored = ProjectV2['basemap'];
export type ResolvedBasemap =
  | { provider: 'none' }
  | {
      provider: 'openfreemap' | 'versatiles' | 'custom';
      labels: 'full' | 'minimal' | 'off';
      styles: {
        provider: 'openfreemap' | 'versatiles' | 'custom';
        url: string;
        attribution: string;
      }[];
      terrain?: { tiles: string; attribution: string; exaggeration: number; tileSize: 256 | 512 };
    };

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
    attribution: '© Mapterhorn; source credits: https://mapterhorn.com/attribution/',
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

/** Resolve a declared provider without making network requests. */
export function resolveBasemap(authored: Authored, offline = false): ResolvedBasemap {
  if (offline || authored.provider === 'none') return { provider: 'none' };
  const primary =
    authored.provider === 'custom'
      ? { provider: 'custom' as const, url: authored.styleUrl!, attribution: authored.attribution! }
      : style(authored.provider, authored.style);
  const fallbacks =
    authored.fallback ?? (authored.provider === 'openfreemap' ? ['versatiles'] : []);
  const styles: Exclude<ResolvedBasemap, { provider: 'none' }>['styles'] = [primary];
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
    exaggeration: authored.terrain.exaggeration ?? 1,
    tileSize: authored.terrain.provider === 'mapterhorn' ? (512 as const) : (256 as const),
  };
  return {
    provider: authored.provider,
    labels: authored.labels ?? 'full',
    styles,
    ...(terrain ? { terrain } : {}),
  };
}
