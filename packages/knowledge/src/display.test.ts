import { describe, expect, it } from 'vitest';
import { formatNumber, formatUnit, humanizeId } from './display.js';

describe('display text', () => {
  it('writes caret exponents as superscripts and leaves other units alone', () => {
    expect(formatUnit('ft^3/s')).toBe('ft³/s');
    expect(formatUnit('km^2')).toBe('km²');
    expect(formatUnit('m^-1')).toBe('m⁻¹');
    expect(formatUnit('people per km^2')).toBe('people per km²');
    expect(formatUnit('index points')).toBe('index points');
  });

  it('turns identifiers into sentence-case titles', () => {
    expect(humanizeId('daily_mean_discharge')).toBe('Daily mean discharge');
    expect(humanizeId('median-income')).toBe('Median income');
    expect(humanizeId('populationDensity')).toBe('Population density');
    expect(humanizeId('___')).toBe('___');
  });

  it('formats legend numbers without float noise', () => {
    expect(formatNumber(23600)).toBe('23,600');
    expect(formatNumber(8253.333333)).toBe('8,253');
    expect(formatNumber(12.345)).toBe('12.35');
    expect(formatNumber(0.012345)).toBe('0.0123');
    expect(formatNumber(-1500.5)).toBe('-1,501');
    expect(formatNumber(0)).toBe('0');
  });
});
