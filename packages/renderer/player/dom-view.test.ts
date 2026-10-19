import { expect, it } from 'vitest';
import { sliderKeyValue } from './dom-view.js';

it('moves range controls by keyboard in bounded, readable increments', () => {
  expect(sliderKeyValue('ArrowRight', 0.8, [0, 1])).toBeCloseTo(0.81);
  expect(sliderKeyValue('ArrowLeft', 0, [0, 1])).toBe(0);
  expect(sliderKeyValue('PageDown', 0.8, [0, 1])).toBeCloseTo(0.7);
  expect(sliderKeyValue('Home', 0.8, [0, 1])).toBe(0);
  expect(sliderKeyValue('End', 0.8, [0, 1])).toBe(1);
  expect(sliderKeyValue('Tab', 0.8, [0, 1])).toBeUndefined();
});
