import { readFileSync } from 'node:fs';
import type { Compiled } from '@mapbard/schema';
import { describe, expect, it } from 'vitest';
import {
  caretUnitRule,
  critique,
  hiddenContrastRule,
  inconsistentScaleRule,
  paletteContrastRule,
  rawIdentifierRule,
  type CriticFeature,
} from './critic.js';

// The frozen two-period compilation: scenes a and b share the period-color scale
// (edges 0, 40, 80, 120) over sources period-a and period-b.
const fixture = JSON.parse(
  readFileSync(
    new URL('../../core/src/compile/fixtures/compiled.g1-r1.json', import.meta.url),
    'utf8',
  ),
) as Compiled;
const sites = (values: (number | null)[]): CriticFeature[] =>
  values.map((value, index) => ({ id: `p${index + 1}`, properties: { value } }));
const clean = { a: [0, 10, 20, 30, 40, 50, null], b: [60, 70, 80, 90, 100, 110, 120] };
const features = (a = clean.a, b = clean.b) => ({ 'period-a': sites(a), 'period-b': sites(b) });
const story = () => structuredClone(fixture);

describe('critic', () => {
  it('passes the frozen fixture except for its pale first class', () => {
    expect(critique({ compiled: fixture, features: features() }).map((d) => d.code)).toEqual([
      'PALETTE_CONTRAST_LOW',
      'PALETTE_CONTRAST_LOW',
    ]);
  });

  it('flags snake_case and internal IDs in reader text, but not ordinary hyphenated words', () => {
    const compiled = story();
    compiled.scenes[0]!.title = 'Values for period-a';
    compiled.scenes[1]!.narration = 'The daily_mean column, a long-term view.';
    compiled.scales[0]!.title = 'Value';
    const findings = rawIdentifierRule(compiled);
    expect(findings.map((d) => [d.path.join('.'), d.message])).toEqual([
      ['scenes.0.title', 'Reader-facing text shows the internal identifier "period-a".'],
      ['scenes.1.narration', 'Reader-facing text shows the internal identifier "daily_mean".'],
    ]);
    expect(findings.every((d) => d.severity === 'warning')).toBe(true);
  });

  it('flags caret units and suggests the formatted unit', () => {
    const compiled = story();
    compiled.scenes[0]!.annotations[0]!.text = 'Flow was 12 ft^3/s here.';
    expect(caretUnitRule(compiled)).toEqual([
      expect.objectContaining({
        code: 'TEXT_UNIT_UNFORMATTED',
        path: ['scenes', 0, 'annotations', 0, 'text'],
        remedy: 'Write "ft³/s" instead.',
      }),
    ]);
  });

  it('flags annotated features that differ but share a class', () => {
    const compiled = story();
    const target = compiled.scenes[0]!.annotations[0]!.target;
    if (target.kind !== 'features') throw new Error('fixture annotation lost its target');
    target.featureIds = ['p1', 'p4'];
    expect(hiddenContrastRule({ compiled, features: features() })).toEqual([
      expect.objectContaining({
        code: 'ENCODING_CONTRAST_HIDDEN',
        ids: { sceneId: 'a', layerId: 'sites', scaleId: 'period-color' },
      }),
    ]);
    target.featureIds = ['p1', 'p5'];
    expect(hiddenContrastRule({ compiled, features: features() })).toEqual([]);
  });

  it('flags a feature whose change across a shared scale stays in one class', () => {
    const changed = features(clean.a, [20, 70, 80, 90, 100, 110, 120]);
    expect(hiddenContrastRule({ compiled: fixture, features: changed })).toEqual([
      expect.objectContaining({
        path: ['sharedScales', 'period-color'],
        ids: { scaleId: 'period-color', featureId: 'p1' },
        message: '1 feature changes value between compared scenes but keeps the same colour class.',
      }),
    ]);
  });

  it('flags the same attribute on different scales across scenes', () => {
    expect(inconsistentScaleRule(fixture)).toEqual([]);
    const compiled = story();
    const local = { ...compiled.scales[0]!, id: 'mb-scale:b' };
    compiled.scales.push(local);
    compiled.scenes[1]!.layers[0]!.scaleId = local.id;
    expect(inconsistentScaleRule(compiled)).toEqual([
      expect.objectContaining({
        code: 'SCALE_INCONSISTENT',
        ids: { sceneId: 'a', layerId: 'sites' },
      }),
    ]);
  });

  it('measures point and line colours against theme land and water', () => {
    const compiled = story();
    const scale = compiled.scales[0]!;
    if (scale.kind !== 'numeric-color') throw new Error('expected a colour scale');
    scale.colors = ['#66c2a4', '#238b45', '#145a32'];
    // #66c2a4 is 1.9:1 against editorial-light land.
    expect(paletteContrastRule(compiled)[0]?.message).toMatch(/^#66c2a4 has 1\.\d\d:1/);
    scale.colors = ['#145a32', '#0b3d20', '#092913'];
    expect(paletteContrastRule(compiled)).toEqual([]);
  });
});
