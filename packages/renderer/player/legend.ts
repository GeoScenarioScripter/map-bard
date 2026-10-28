import type { ChangeSign, CompiledChange, ResolvedScale } from '@mapbard/schema';
import { escapeHtml } from './media.js';
import { flowLegendMarkup, widthLegendBody } from './legend-flows.js';
import type { CompiledLayer, CompiledScene, CompiledStory } from './types.js';

/** Space between the nested circles and their value labels, in CSS pixels. */
const LABEL_GAP = 10;

/**
 * One legend per scale the scene draws, shaped by its technique: a class ramp for numeric
 * colour, swatches for categories and nested circles for graduated size. Titles, units and
 * labels are compiled; this module only lays them out.
 */
export function legendMarkup(scene: CompiledScene, story: CompiledStory): string {
  // A layer's own scale, then an extrusion's colour classes or an extruded hexbin's heights.
  const scaleIds = (layer: CompiledLayer) =>
    [layer.colorScaleId, layer.scaleId, layer.heightScaleId].filter((id): id is string => !!id);
  const ids = [...new Set(scene.layers.flatMap(scaleIds))];
  let previous = '';
  const scales = ids.map((id) => {
    const scale = story.scales.find((item) => item.id === id);
    if (!scale) throw new Error(`Missing resolved scale ${id}`);
    const layer = scene.layers.find((item) => scaleIds(item).includes(id))!;
    // An extrusion's height key follows its colour key under the same title, so says it once.
    const heading = `${scale.title}\u0000${scale.unitLabel ?? ''}`;
    const headed = heading !== previous;
    previous = heading;
    // Unstyled symbols are painted in the theme accent, so their legend is too.
    return oneLegend(scale, layer, story.theme.colors.accent, headed);
  });
  const changes = scene.layers.flatMap((layer) =>
    layer.change ? [changeLegend(layer.change, story.theme.colors)] : [],
  );
  return [...scales, ...changes].join('').concat(flowLegendMarkup(scene, story));
}

/** A small column, so the height key reads as heights; it draws no pixel scale. */
function columnGlyph(color: string, opacity = 1): string {
  return `<svg class="mb-legend-glyph" aria-hidden="true" width="14" height="18" viewBox="0 0 14 18"><rect x="3" y="2" width="8" height="15" rx="1" fill="${escapeHtml(color)}" fill-opacity="${opacity}"/></svg>`;
}

function circleGlyph(color: string, filled: boolean): string {
  const colour = escapeHtml(color);
  return `<svg class="mb-legend-glyph" aria-hidden="true" width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="7" fill="${filled ? colour : 'none'}" stroke="${colour}" stroke-width="1.5"/></svg>`;
}

const SIGN_LABELS: Record<ChangeSign, string> = {
  decrease: 'Decrease',
  increase: 'Increase',
  unchanged: 'No change',
};

/**
 * The change key: before and after named by their observation labels, drawn as the symbols
 * the map uses (ring and disc, or ghost and solid column), then a colour per sign that occurs.
 */
export function changeLegend(
  change: CompiledChange,
  colors: { ink: string; muted: string },
): string {
  const height = change.form === 'height';
  const glyph = (color: string, filled = true, opacity = 1) =>
    height ? columnGlyph(color, opacity) : circleGlyph(color, filled);
  const before = glyph(colors.muted, false, 0.35);
  const after = glyph(colors.ink);
  const signs = change.signs.map((sign) => row(glyph(change.colors[sign]), SIGN_LABELS[sign]));
  const title = `Change, ${change.before.label} to ${change.after.label}`;
  return `<section class="mb-legend mb-legend--change" aria-label="${escapeHtml(title)} legend"><h3>${escapeHtml(title)}</h3><ul>${row(before, `${change.before.label} (before)`)}${row(after, `${change.after.label} (after)`)}</ul><ul class="mb-legend-signs">${signs.join('')}</ul></section>`;
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

function oneLegend(
  scale: ResolvedScale,
  layer: CompiledLayer,
  accent: string,
  headed = true,
): string {
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
  } else if (scale.kind === 'numeric-height') {
    // On-screen height changes with pitch and zoom, so the key states the range in words.
    kind = 'heights';
    body = `<ul>${row(columnGlyph(accent), `Height from 0 to ${scale.tallest.label}`)}</ul>`;
  } else if (scale.kind === 'numeric-width') {
    kind = 'widths';
    body = widthLegendBody(scale, layer.arc?.destination ?? layer.constant?.color ?? accent);
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
  const heading = headed ? `<h3>${escapeHtml(scale.title)}${unit}</h3>` : '';
  return `<section class="mb-legend mb-legend--${kind}" aria-label="${escapeHtml(scale.title)} legend">${heading}${body}${noData}</section>`;
}
