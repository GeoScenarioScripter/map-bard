import {
  CAPABILITY_IDS,
  CapabilityCatalogSchema,
  type CapabilityCatalog,
  type DataResource,
  type LayerBinding,
} from '@mapbard/schema';
export { formatNumber, formatUnit, humanizeId } from './display.js';
export { contrastRatio, parseHexColor, relativeLuminance } from './color.js';
export { BUNDLED_FONTS, THEME_PRESET_TOKENS, resolveTheme } from './themes.js';
export { LAYOUT_FRAMES, resolveLayout } from './layouts.js';
export {
  BASEMAP_PROVIDERS,
  TERRAIN_PROVIDERS,
  resolveBasemap,
  type ResolvedBasemap,
} from './basemaps.js';

export const STAGE1_CAPABILITIES: CapabilityCatalog = CapabilityCatalogSchema.parse({
  version: '0.1.0',
  ids: [...CAPABILITY_IDS],
});

export type CapabilityId = (typeof CAPABILITY_IDS)[number];

export function hasCapability(catalog: CapabilityCatalog, id: CapabilityId): boolean {
  return catalog.ids.includes(id);
}

export type Geometry = 'point' | 'line' | 'polygon';

export function techniqueGeometry(technique: LayerBinding['technique']): Geometry | undefined {
  switch (technique) {
    case 'point':
    case 'graduated-symbol':
      return 'point';
    case 'line':
      return 'line';
    case 'fill':
    case 'choropleth':
      return 'polygon';
    case 'categorical':
    case 'heatmap':
      return undefined;
  }
}

export function numericColorPrerequisite(
  declaration: DataResource['attributes'][number],
): { ok: true } | { ok: false; field: 'role' | 'observedType' | 'level' | 'unit'; reason: string } {
  if (declaration.role !== 'quantity')
    return { ok: false, field: 'role', reason: 'A numeric magnitude must be a quantity.' };
  if (declaration.observedType !== 'number')
    return { ok: false, field: 'observedType', reason: 'A numeric magnitude needs number values.' };
  if (declaration.level !== 'interval' && declaration.level !== 'ratio')
    return {
      ok: false,
      field: 'level',
      reason: 'A numeric color needs interval or ratio measurement.',
    };
  if (declaration.unit === null)
    return { ok: false, field: 'unit', reason: 'A numeric color needs a declared unit.' };
  return { ok: true };
}

export function graduatedSizePrerequisite(
  declaration: DataResource['attributes'][number],
): { ok: true } | { ok: false; field: 'role' | 'observedType' | 'level' | 'unit'; reason: string } {
  const color = numericColorPrerequisite(declaration);
  if (!color.ok) return color;
  if (declaration.level !== 'ratio')
    return {
      ok: false,
      field: 'level',
      reason: 'Area size needs a ratio quantity with a real zero.',
    };
  return { ok: true };
}
