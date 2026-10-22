import { describe, expect, it } from 'vitest';
import { resolveLayout } from '@mapbard/knowledge';
import { cameraPadding, zoomOffset } from './layout.js';

const desktop = { width: 1440, height: 900 };
const phone = { width: 390, height: 844 };

describe('cameraPadding', () => {
  it('reserves the sidecar column on desktop and the rail when it shows', () => {
    const layout = resolveLayout('sidecar');
    expect(cameraPadding(layout, desktop)).toEqual({ top: 24, right: 24, bottom: 24, left: 440 });
    const rail = { left: 1136, top: 24, right: 1416, bottom: 400 };
    expect(cameraPadding(layout, desktop, rail)).toEqual({
      top: 24,
      right: 328,
      bottom: 24,
      left: 440,
    });
  });

  it('reserves the bottom sheet and the top rail on phones', () => {
    const layout = resolveLayout('overlay-cards');
    const rail = { left: 12, top: 12, right: 378, bottom: 200 };
    expect(cameraPadding(layout, phone, rail)).toEqual({
      top: 212,
      right: 12,
      bottom: 354,
      left: 12,
    });
  });

  it('reserves the caption band for full-bleed and ignores an empty rail', () => {
    const layout = resolveLayout('full-bleed');
    const empty = { left: 1416, top: 24, right: 1416, bottom: 24 };
    expect(cameraPadding(layout, desktop, empty)).toEqual({
      top: 24,
      right: 24,
      bottom: 288,
      left: 24,
    });
  });

  it('always leaves the camera a visible area', () => {
    const layout = resolveLayout('sidecar');
    const padding = cameraPadding(
      layout,
      { width: 700, height: 300 },
      {
        left: 300,
        top: 0,
        right: 700,
        bottom: 300,
      },
    );
    expect(700 - padding.left - padding.right).toBeGreaterThanOrEqual(119);
    expect(padding.left).toBeGreaterThan(padding.right);
  });
});

describe('zoomOffset', () => {
  it('keeps the authored zoom on the reference desktop and zooms out on phones', () => {
    const layout = resolveLayout('sidecar');
    const rail = { left: 1136, top: 24, right: 1416, bottom: 400 };
    expect(zoomOffset(layout, desktop, cameraPadding(layout, desktop, rail))).toBe(0);
    // A larger free area never zooms in.
    expect(zoomOffset(layout, desktop, cameraPadding(layout, desktop))).toBe(0);
    const phoneRail = { left: 12, top: 12, right: 378, bottom: 182 };
    const offset = zoomOffset(layout, phone, cameraPadding(layout, phone, phoneRail));
    // Free phone band 366 x 296 against the 672 x 852 reference: limited by height.
    expect(offset).toBeCloseTo(Math.log2(296 / 852), 2);
  });
});
