import type { ResolvedScale } from '@mapbard/schema';
import { escapeHtml } from './media.js';
import type { CompiledLayer, CompiledScene, CompiledStory } from './types.js';

/** Space between the nested circles and their value labels, in CSS pixels. */
const LABEL_GAP = 10;

/**
 * One legend per scale the scene draws, shaped by its technique: a class ramp for numeric
 * colour, swatches for categories and nested circles for graduated size. Titles, units and
 * labels are compiled; this module only lays them out.
 */
export function legendMarkup(scene: CompiledScene, story: CompiledStory): string {
  const ids = [...new Set(scene.layers.map((layer) => layer.scaleId).filter(Boolean))];
  return ids
    .map((id) => {
      const scale = story.scales.find((item) => item.id === id);
      if (!scale) throw new Error(`Missing resolved scale ${id}`);
      const layer = scene.layers.find((item) => item.scaleId === id)!;
      // Unstyled symbols are painted in the theme accent, so their legend is too.
      return oneLegend(scale, layer, story.theme.colors.accent);
    })
    .join('');
}

function swatch(color: string, geometry: CompiledLayer['geometry'], extra = ''): string {
  return `<span class="mb-legend-swatch mb-legend-swatch--${geometry}"${extra} data-mb-color="${escapeHtml(color)}"></span>`;
}

function row(symbol: string, label: string): string {
  return `<li>${symbol}<span>${escapeHtml(label)}</span></li>`;
}

/** Concentric circles sharing one baseline, largest first, each with a tick to its label. */
export function nestedCircles(
  entries: readonly { radius: number; label: string }[],
  color: string,
  unitLabel: string | null,
): string {
  const drawn = entries.filter((entry) => entry.radius > 0).sort((a, b) => b.radius - a.radius);
  if (!drawn.length) return '';
  const largest = drawn[0]!.radius;
  const stroke = 1;
  const base = 2 * largest + stroke;
  const width = base + LABEL_GAP + 4;
  const height = base + 8;
  const labelX = width + 2;
  const colour = escapeHtml(color);
  const parts = drawn.map((entry) => {
    const cx = largest + stroke / 2;
    const cy = base - entry.radius;
    const top = base - 2 * entry.radius;
    return (
      `<circle cx="${cx}" cy="${cy}" r="${entry.radius}" fill="${colour}" fill-opacity="0.14" stroke="${colour}" stroke-width="${stroke}"/>` +
      `<line class="mb-legend-tick" x1="${cx}" y1="${top}" x2="${width}" y2="${top}"/>` +
      `<text x="${labelX}" y="${top}" dominant-baseline="middle">${escapeHtml(entry.label)}</text>`
    );
  });
  const values = drawn
    .map((entry) => entry.label)
    .reverse()
    .join(', ');
  const name = `Circle area for ${values}${unitLabel ? ` ${unitLabel}` : ''}`;
  // Room for the longest label; the SVG text itself is what readers see.
  const labelWidth = Math.max(...drawn.map((entry) => entry.label.length)) * 8;
  return `<svg class="mb-legend-nested" role="img" aria-label="${escapeHtml(name)}" width="${labelX + labelWidth}" height="${height}" viewBox="0 -6 ${labelX + labelWidth} ${height}">${parts.join('')}</svg>`;
}

function oneLegend(scale: ResolvedScale, layer: CompiledLayer, accent: string): string {
  const geometry = layer.geometry;
  const missing = scale.counts.missing + scale.counts.invalid > 0;
  let body: string;
  let kind: string;
  if (scale.kind === 'numeric-color') {
    kind = 'classes';
    body = `<ul class="mb-legend-ramp">${scale.colors
      .map((color, index) => row(swatch(color, geometry), scale.labels[index]!))
      .join('')}</ul>`;
  } else if (scale.kind === 'category-color') {
    kind = 'categories';
    body = `<ul>${scale.categories.map(({ label, color }) => row(swatch(color, geometry), label)).join('')}</ul>`;
  } else {
    kind = 'sizes';
    // Nothing to nest when every value maps to zero area: list the compiled labels instead.
    body =
      nestedCircles(scale.legend, layer.constant?.color ?? accent, scale.unitLabel) ||
      `<ul>${scale.legend.map((entry) => row('', entry.label)).join('')}</ul>`;
  }
  const noDataSize =
    scale.kind === 'numeric-size'
      ? ` style="width:${2 * scale.noDataRadius}px;height:${2 * scale.noDataRadius}px"`
      : '';
  // Only a scale with missing or invalid values draws the no-data symbol, so only it lists one.
  const noData = missing
    ? `<ul class="mb-legend-nodata">${row(swatch(scale.noDataColor, geometry, noDataSize), scale.noDataLabel)}</ul>`
    : '';
  const unit = scale.unitLabel
    ? ` <span class="mb-legend-unit">(${escapeHtml(scale.unitLabel)})</span>`
    : '';
  return `<section class="mb-legend mb-legend--${kind}" aria-label="${escapeHtml(scale.title)} legend"><h3>${escapeHtml(scale.title)}${unit}</h3>${body}${noData}</section>`;
}
