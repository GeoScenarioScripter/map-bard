import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { ResolvedScale } from '@mapbard/schema';
import { legendMarkup, nestedCircles } from './legend.js';
import type { CompiledStory } from './types.js';

const story = JSON.parse(
  readFileSync(
    new URL('../../../fixtures/two-period/compiled.expected.json', import.meta.url),
    'utf8',
  ),
) as CompiledStory;
const variants = JSON.parse(
  readFileSync(
    new URL('../../../fixtures/two-period/scale-variants.expected.json', import.meta.url),
    'utf8',
  ),
) as ResolvedScale[];
const variant = (id: string) => variants.find((item) => item.id === id)!;

function legendFor(scale: ResolvedScale, geometry: 'point' | 'line' | 'polygon' = 'point') {
  const scene = story.scenes[0]!;
  const layer = { ...scene.layers[0]!, geometry, scaleId: scale.id };
  return legendMarkup({ ...scene, layers: [layer] }, { ...story, scales: [scale] });
}

describe('legends per technique', () => {
  it('draws numeric colour as a class ramp of compiled labels, shaped like the layer', () => {
    const scale = story.scales[0]!;
    const points = legendFor(scale);
    expect(points).toContain('class="mb-legend mb-legend--classes"');
    expect(points).toContain('<ul class="mb-legend-ramp">');
    expect(points.match(/mb-legend-swatch--point/g)).toHaveLength(4);
    expect(points).toContain('<span>40–80</span>');
    expect(legendFor(scale, 'polygon')).toContain('mb-legend-swatch--polygon');
    expect(legendFor(scale, 'line')).toContain('mb-legend-swatch--line');
  });

  it('lists categories with their compiled labels and colours', () => {
    const markup = legendFor(variant('typed-categories'), 'polygon');
    expect(markup).toContain('mb-legend--categories');
    expect(markup).toContain(
      '<span class="mb-legend-swatch mb-legend-swatch--polygon" data-mb-color="#777777"></span><span>1 (number)</span>',
    );
  });

  it('nests graduated-size circles on one baseline with a readable name and unit', () => {
    const markup = legendFor(variant('area-size'));
    expect(markup).toContain('mb-legend--sizes');
    expect(markup).toContain('role="img" aria-label="Circle area for 25, 100 test units"');
    const circles = [...markup.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/g)].map(
      (match) => match.slice(1).map(Number),
    );
    // Largest first, both resting on the same bottom edge; the zero entry draws nothing.
    expect(circles).toEqual([
      [16.5, 17, 16],
      [16.5, 25, 8],
    ]);
    expect(markup).toMatch(/<text[^>]*>100<\/text>.*<text[^>]*>25<\/text>/);
    expect(nestedCircles([{ radius: 0, label: '0' }], '#000', null)).toBe('');
    // All-zero areas fall back to the compiled labels.
    expect(legendFor(variant('zero-size'))).toContain('<span>0 (zero area)</span>');
  });

  it('lists no data only when the scale has missing or invalid values', () => {
    const scale = story.scales[0]!;
    expect(scale.counts.missing).toBeGreaterThan(0);
    expect(legendFor(scale)).toContain('<ul class="mb-legend-nodata">');
    const complete = { ...scale, counts: { valid: 14, missing: 0, invalid: 0 } };
    expect(legendFor(complete)).not.toContain('No data');
    expect(legendFor({ ...complete, counts: { valid: 13, missing: 0, invalid: 1 } })).toContain(
      'No data',
    );
  });

  it('never shows a scale ID and escapes compiled text', () => {
    const scale = { ...story.scales[0]!, title: 'Value <b>', unitLabel: 'm³ & more' };
    const markup = legendFor(scale);
    expect(markup).not.toContain(scale.id);
    expect(markup).toContain('<h3>Value &lt;b&gt; <span class="mb-legend-unit">(m³ &amp; more)');
  });
});
