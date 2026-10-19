/**
 * `render()` — the deterministic core. Pure: given a validated narrative and a
 * data map, it produces the generated text files plus a manifest of local media
 * to copy. It performs no I/O; {@link writeBundle} does the disk work.
 */
import { resolve } from 'node:path';
import type { GeoNarrative } from '@mapbard/schema';
import { buildIndexHtml } from './index-html.js';
import { buildBundleData } from './bundle-data.js';
import type { DataMap, MediaCopy, RenderedBundle, RenderOptions } from './types.js';

const EMPTY_FC = { type: 'FeatureCollection', features: [] };

function isFeatureCollection(value: unknown): boolean {
  return (
    value !== null &&
    typeof value === 'object' &&
    'type' in value &&
    value.type === 'FeatureCollection' &&
    'features' in value &&
    Array.isArray(value.features)
  );
}

export function render(
  narrative: GeoNarrative,
  dataMap: DataMap = {},
  options: RenderOptions = {},
): RenderedBundle {
  const warnings: string[] = [];

  const proposedContext = options.localContextMap;
  const localContextMap =
    proposedContext &&
    isFeatureCollection(proposedContext.land) &&
    isFeatureCollection(proposedContext.streets) &&
    typeof proposedContext.attribution === 'string' &&
    proposedContext.attribution.trim()
      ? proposedContext
      : undefined;
  if (proposedContext && !localContextMap) {
    warnings.push(
      'local context map requires land and streets FeatureCollections plus attribution',
    );
  }
  if (narrative.basemap.style !== 'neutral') {
    warnings.push(
      localContextMap
        ? `basemap "${narrative.basemap.style}" is unsupported by the legacy player; using supplied local context instead`
        : `basemap "${narrative.basemap.style}" is unsupported by the legacy player; using a neutral background`,
    );
  }

  // Resolve data for every declared source; warn on (and fill) the gaps.
  const data: DataMap = {};
  for (const ds of narrative.dataSources) {
    if (ds.id in dataMap) {
      data[ds.id] = dataMap[ds.id];
    } else {
      warnings.push(`no data provided for source "${ds.id}"; using an empty collection`);
      data[ds.id] = EMPTY_FC;
    }
  }

  const files: Record<string, string> = {
    'index.html': buildIndexHtml(narrative),
    'bundle-data.js': buildBundleData(narrative, data, localContextMap),
  };

  // Local media gets copied into the bundle; URL media is referenced in place.
  const baseDir = options.assetBaseDir ?? '.';
  const mediaCopies: MediaCopy[] = [];
  for (const asset of narrative.mediaAssets) {
    if (asset.source === 'local') {
      mediaCopies.push({
        assetId: asset.id,
        from: resolve(baseDir, asset.path),
        to: asset.path.replace(/\\/g, '/'),
      });
    }
  }

  return { files, mediaCopies, warnings };
}
