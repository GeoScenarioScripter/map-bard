import type { ResolvedScale } from '@mapbard/schema';
import { escapeHtml } from './media.js';
import type { CompiledScene, CompiledStory } from './types.js';

export function legendMarkup(scene: CompiledScene, story: CompiledStory): string {
  const ids = [...new Set(scene.layers.map((layer) => layer.scaleId).filter(Boolean))];
  return ids
    .map((id) => {
      const scale = story.scales.find((item) => item.id === id);
      if (!scale) throw new Error(`Missing resolved scale ${id}`);
      return oneLegend(scale);
    })
    .join('');
}

function oneLegend(scale: ResolvedScale): string {
  const items =
    scale.kind === 'numeric-color'
      ? scale.colors.map((color, index) => ({ label: scale.labels[index]!, color }))
      : scale.kind === 'category-color'
        ? scale.categories.map(({ label, color }) => ({ label, color }))
        : scale.legend.map(({ label, radius }) => ({ label, radius }));
  const rows = items
    .map((item) => {
      const swatch =
        'color' in item
          ? `<span class="mb-legend-swatch" data-mb-color="${escapeHtml(item.color)}"></span>`
          : `<span class="mb-legend-size" style="width:${2 * item.radius}px;height:${2 * item.radius}px"></span>`;
      return `<li>${swatch}<span>${escapeHtml(item.label)}</span></li>`;
    })
    .join('');
  const size =
    scale.kind === 'numeric-size'
      ? `width:${2 * scale.noDataRadius}px;height:${2 * scale.noDataRadius}px;`
      : '';
  const noData = `<li><span class="mb-legend-swatch" style="${size}" data-mb-color="${escapeHtml(scale.noDataColor)}"></span><span>${escapeHtml(scale.noDataLabel)}</span></li>`;
  return `<section class="mb-legend" aria-label="${escapeHtml(scale.id)} legend"><h3>${escapeHtml(scale.id)}</h3><ul>${rows}${noData}</ul></section>`;
}
