import { describe, expect, it } from 'vitest';
import {
  categoryColorScale,
  numericColorScale,
  numericSizeScale,
  type ScaleInput,
} from './scales.js';

const common: ScaleInput = {
  id: 'test',
  title: 'Test value',
  memberKeys: [{ sceneId: 'synthetic', layerId: 'sites', sourceId: 'invented' }],
  unit: 'test units',
  values: [],
  palette: ['#111111', '#777777', '#eeeeee', '#ffffff'],
  classes: 4,
  path: ['features', 'properties', 'value'],
};

describe('resolved scale oracles', () => {
  it('preserves typed category order and reports all missing as a warning', () => {
    const typed = categoryColorScale({ ...common, values: ['1', true, 1, null], unit: null });
    expect(typed.diagnostics).toEqual([]);
    expect(typed.scale).toEqual(
      expect.objectContaining({
        kind: 'category-color',
        counts: { valid: 3, missing: 1, invalid: 0 },
        categories: [
          { value: true, label: 'true (boolean)', color: '#111111' },
          { value: 1, label: '1 (number)', color: '#777777' },
          { value: '1', label: '1 (string)', color: '#eeeeee' },
        ],
      }),
    );
    const plain = categoryColorScale({ ...common, values: ['b', 'a'] });
    expect(plain.scale.kind === 'category-color' && plain.scale.categories).toEqual([
      { value: 'a', label: 'a', color: '#111111' },
      { value: 'b', label: 'b', color: '#777777' },
    ]);
    const missing = categoryColorScale({ ...common, values: [null, '', undefined] });
    expect(missing.scale).toEqual(
      expect.objectContaining({ categories: [], counts: { valid: 0, missing: 3, invalid: 0 } }),
    );
    expect(missing.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'VALUE_INVALID', severity: 'warning' }),
    );
  });

  it('uses actual full categories and rejects a palette too short for them', () => {
    const values = ['f', 'a', 'b', 'c', 'd', 'e'];
    const result = categoryColorScale({ ...common, values, palette: ['#111111', '#777777'] });
    expect(result.scale.kind).toBe('category-color');
    if (result.scale.kind !== 'category-color') return;
    expect(result.scale.categories.map((entry) => entry.value)).toEqual([
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
    ]);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'VALUE_INVALID' }));
  });

  it('matches area, constant and zero size formulas', () => {
    const area = numericSizeScale({ ...common, values: [0, 25, 100, null] });
    expect(area.diagnostics).toEqual([]);
    expect(area.scale).toEqual(
      expect.objectContaining({
        kind: 'numeric-size',
        domain: [0, 100],
        radiusRange: [0, 16],
        legend: [
          { value: 0, radius: 0, label: '0' },
          { value: 25, radius: 8, label: '25' },
          { value: 100, radius: 16, label: '100' },
        ],
      }),
    );
    expect(numericSizeScale({ ...common, values: [7, 7, 7] }).scale).toEqual(
      expect.objectContaining({ domain: [7, 7], radiusRange: [8, 8] }),
    );
    expect(numericSizeScale({ ...common, values: [0, 0, 0] }).scale).toEqual(
      expect.objectContaining({
        domain: [0, 0],
        radiusRange: [0, 0],
        legend: [{ value: 0, radius: 0, label: '0 (zero area)' }],
      }),
    );
    const negative = numericSizeScale({ ...common, values: [-1, 4] });
    expect(negative.scale).toBeUndefined();
    expect(negative.diagnostics[0]).toEqual(
      expect.objectContaining({
        code: 'MEASUREMENT_INCOMPATIBLE',
        counts: expect.objectContaining({ invalid: 1, total: 2 }),
      }),
    );
  });

  it('preserves exact endpoints, collapses duplicate edges, and never invents a constant spread', () => {
    const next = 1.0000000000000002;
    const narrow = numericColorScale({ ...common, values: [1, next, next, null] });
    expect(narrow.scale).toEqual(
      expect.objectContaining({
        domain: [1, next],
        edges: [1, next],
        effectiveClasses: 1,
        colors: ['#111111'],
        labels: [`1–${next}`],
      }),
    );
    const constant = numericColorScale({ ...common, values: [7, 7, 7], classes: 3 });
    expect(constant.scale).toEqual(
      expect.objectContaining({
        domain: [7, 7],
        edges: [7],
        effectiveClasses: 1,
        labels: ['7'],
      }),
    );
    const outside = numericColorScale({ ...common, values: [0, 10], domain: [1, 10] });
    expect(outside.scale).toBeUndefined();
    expect(outside.diagnostics[0]?.code).toBe('VALUE_INVALID');
  });

  it('uses exact readable integer ranges when equal-interval edges are fractional', () => {
    const result = numericColorScale({
      ...common,
      values: [580, 1800, 2020, 5580, 17300, 23600],
      classes: 3,
      unit: 'ft^3/s',
    });
    expect(result.scale?.kind).toBe('numeric-color');
    if (result.scale?.kind !== 'numeric-color') return;
    expect(result.scale.edges[1]).toBeCloseTo(8253.333333);
    expect(result.scale.edges[2]).toBeCloseTo(15926.666667);
    const fractional = numericColorScale({ ...common, values: [0.5, 1.25, 2.75], classes: 3 });
    expect(fractional.scale?.kind === 'numeric-color' && fractional.scale.labels).toEqual([
      '0.5–1.25',
      '1.25–2',
      '2–2.75',
    ]);
    expect(result.scale).toEqual(
      expect.objectContaining({
        title: 'Test value',
        unit: 'ft^3/s',
        unitLabel: 'ft³/s',
        labels: ['580–8,253', '8,254–15,926', '15,927–23,600'],
      }),
    );
  });
});

describe('classification methods', () => {
  const color = (values: number[], extra: Partial<ScaleInput>) => {
    const result = numericColorScale({ ...common, values, classes: 3, ...extra });
    const scale = result.scale?.kind === 'numeric-color' ? result.scale : undefined;
    return { scale, diagnostics: result.diagnostics };
  };

  it('splits quantiles between classes and keeps tied values together', () => {
    const even = color([9, 1, 2, 3, 4, 5, 6, 7, 8], { method: 'quantile' });
    expect(even.diagnostics).toEqual([]);
    expect(even.scale?.edges).toEqual([1, 3.5, 6.5, 9]);
    expect(even.scale?.labels).toEqual(['1–3', '4–6', '7–9']);
    const tied = color([1, 1, 1, 1, 2, 3], { method: 'quantile' });
    expect(tied.scale?.edges).toEqual([1, 1.5, 3]);
    expect(tied.scale?.labels).toEqual(['1', '2–3']);
    expect(tied.diagnostics).toEqual([
      expect.objectContaining({
        severity: 'warning',
        message: 'Only 2 of 3 quantile classes are distinct for these values.',
      }),
    ]);
  });

  it('finds natural breaks deterministically and gives an outlier its own class', () => {
    const groups = color([30, 1, 2, 3, 10, 11, 12], { method: 'natural-breaks' });
    expect(groups.diagnostics).toEqual([]);
    expect(groups.scale?.edges).toEqual([1, 6.5, 21, 30]);
    expect(groups.scale?.labels).toEqual(['1–6', '7–20', '21–30']);
    const outlier = color([1, 2, 3, 4, 100], { method: 'natural-breaks', classes: 2 });
    expect(outlier.scale?.edges).toEqual([1, 52, 100]);
    expect(color([30, 1, 2, 3, 10, 11, 12], { method: 'natural-breaks' })).toEqual(groups);
    const single = color([5, 5, 5], { method: 'natural-breaks' });
    expect(single.scale).toEqual(expect.objectContaining({ edges: [5], labels: ['5'] }));
    expect(single.diagnostics[0]?.severity).toBe('warning');
  });

  it('uses manual breaks as authored and rejects unusable ones', () => {
    const manual = color([0, 10, 50, 90, 100], { method: 'manual', breaks: [20, 60] });
    expect(manual.diagnostics).toEqual([]);
    expect(manual.scale?.edges).toEqual([0, 20, 60, 100]);
    const message = (extra: Partial<ScaleInput>) =>
      color([0, 10, 50, 90, 100], extra).diagnostics.map((item) => item.message);
    expect(message({ method: 'manual', breaks: [20] })).toEqual([
      'Manual classification with 3 classes needs 2 breaks.',
    ]);
    expect(message({ method: 'manual', breaks: [60, 20] })).toEqual([
      'Manual breaks must be strictly increasing.',
    ]);
    expect(message({ method: 'manual', breaks: [20, 100] })).toEqual([
      'Manual breaks must lie strictly inside the scale domain.',
    ]);
    expect(message({ method: 'manual', breaks: [20, 100], domain: [0, 120] })).toEqual([]);
    expect(message({ method: 'quantile', breaks: [20, 60] })).toEqual([
      'Breaks are only used by manual classification.',
    ]);
  });
});
