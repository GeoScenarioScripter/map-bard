import type { ResolvedScale } from '@mapbard/schema';
import { escapeHtml } from './media.js';
import type { CompiledLayer, CompiledScene, CompiledStory } from './types.js';

/**
 * Legends of the flow techniques (step 5.2, N). A width scale draws its example widths as
 * lines; an arc names its direction with its origin-to-destination gradient; a trip shows its
 * trail and a clock the deck tier updates (compiled labels only). Text is compiled; this module
 * only lays it out.
 */

const LINE_LENGTH = 36;

/** Example widths of a numeric-width scale, drawn as lines at their pixel width. */
export function widthLegendBody(
  scale: Extract<ResolvedScale, { kind: 'numeric-width' }>,
  color: string,
): string {
  const drawn = scale.legend.filter((entry) => entry.width > 0);
  if (!drawn.length)
    return `<ul>${scale.legend.map((entry) => `<li><span>${escapeHtml(entry.label)}</span></li>`).join('')}</ul>`;
  const colour = escapeHtml(color);
  const rows = drawn.map((entry) => {
    const height = Math.max(entry.width, 1) + 4;
    const y = height / 2;
    const svg = `<svg class="mb-legend-width" aria-hidden="true" width="${LINE_LENGTH}" height="${height}" viewBox="0 0 ${LINE_LENGTH} ${height}"><line x1="2" y1="${y}" x2="${LINE_LENGTH - 2}" y2="${y}" stroke="${colour}" stroke-width="${entry.width}" stroke-linecap="round"/></svg>`;
    return `<li>${svg}<span>${escapeHtml(entry.label)}</span></li>`;
  });
  return `<ul class="mb-legend-widths">${rows.join('')}</ul>`;
}

/** The arc's direction: a gradient line from the origin colour to the destination colour. */
function directionKey(layer: CompiledLayer): string {
  const arc = layer.arc!;
  const id = `mb-arc-${layer.runtimeId.replace(/[^A-Za-z0-9_-]/g, '_')}`;
  const svg =
    `<svg class="mb-legend-direction" aria-hidden="true" width="${LINE_LENGTH}" height="8" viewBox="0 0 ${LINE_LENGTH} 8">` +
    `<defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="2" y1="0" x2="${LINE_LENGTH - 2}" y2="0"><stop offset="0" stop-color="${escapeHtml(arc.origin)}"/><stop offset="1" stop-color="${escapeHtml(arc.destination)}"/></linearGradient></defs>` +
    `<line x1="2" y1="4" x2="${LINE_LENGTH - 2}" y2="4" stroke="url(#${id})" stroke-width="3" stroke-linecap="round"/></svg>`;
  return `<ul class="mb-legend-flow-direction"><li>${svg}<span>From origin to destination</span></li></ul>`;
}

function trailText(hours: number): string {
  if (hours % 24 === 0) {
    const days = hours / 24;
    return `Trail: the last ${days === 1 ? 'day' : `${days} days`}`;
  }
  return `Trail: the last ${hours === 1 ? 'hour' : `${hours} hours`}`;
}

/**
 * Flow keys for the scene's arcs and trips; scale legends come from legend.ts. Arc layers that
 * split one source (for example by a filter) share one direction key when their colours match.
 */
export function flowLegendMarkup(scene: CompiledScene, story: CompiledStory): string {
  const sourceName = (id: string) => story.resources.find((item) => item.id === id)?.name ?? id;
  const directions = new Set<string>();
  return scene.layers
    .map((layer) => {
      if (layer.technique === 'arc' && layer.arc) {
        // A colour scale replaces the gradient, so only uncoloured arcs show a direction key.
        const scale = story.scales.find((item) => item.id === layer.scaleId);
        if (scale && scale.kind !== 'numeric-width') return '';
        const key = [layer.sourceId, layer.arc.origin, layer.arc.destination].join('\n');
        if (directions.has(key)) return '';
        directions.add(key);
        const title = escapeHtml(sourceName(layer.sourceId));
        return `<section class="mb-legend mb-legend--direction" aria-label="${title} direction legend"><h3>${title}</h3>${directionKey(layer)}</section>`;
      }
      if (layer.technique === 'trip' && layer.trip) {
        const trip = layer.trip;
        const title = escapeHtml(sourceName(layer.sourceId));
        const colour = escapeHtml(layer.constant?.color ?? '#000000');
        const swatch = `<svg class="mb-legend-width" aria-hidden="true" width="${LINE_LENGTH}" height="8" viewBox="0 0 ${LINE_LENGTH} 8"><line x1="2" y1="4" x2="${LINE_LENGTH - 2}" y2="4" stroke="${colour}" stroke-width="${trip.width}" stroke-linecap="round"/></svg>`;
        const clock = `<p class="mb-legend-clock" data-mb-clock="${escapeHtml(layer.runtimeId)}">${escapeHtml(trip.rangeLabel)}</p>`;
        return `<section class="mb-legend mb-legend--trip" aria-label="${title} legend"><h3>${title}</h3><ul><li>${swatch}<span>${escapeHtml(trailText(trip.trailSeconds / 3600))}</span></li></ul>${clock}</section>`;
      }
      return '';
    })
    .join('');
}
