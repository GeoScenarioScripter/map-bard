import { describe, expect, it } from 'vitest';
import { createNorthArrow, northArrowState } from './furniture.js';

describe('north arrow', () => {
  it('shows only while the map is rotated and turns the short way to north', () => {
    expect(northArrowState(0)).toEqual({ visible: false, rotation: 0 });
    expect(northArrowState(360)).toEqual({ visible: false, rotation: 0 });
    expect(northArrowState(0.05).visible).toBe(false);
    expect(northArrowState(30)).toEqual({ visible: true, rotation: -30 });
    expect(northArrowState(-45)).toEqual({ visible: true, rotation: 45 });
    expect(northArrowState(350).rotation).toBeCloseTo(10);
    expect(northArrowState(190).rotation).toBeCloseTo(170);
  });

  it('reads the bearing live on every frame and stops on dispose', () => {
    const listeners = new Set<() => void>();
    let bearing = 0;
    const needle = { style: { transform: '' } };
    const host = {
      innerHTML: '',
      hidden: false,
      attributes: {} as Record<string, string>,
      setAttribute(name: string, value: string) {
        this.attributes[name] = value;
      },
      firstElementChild: needle,
    };
    const stop = createNorthArrow(host as unknown as HTMLElement, {
      onFrame: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      bearing: () => bearing,
    });
    expect(host.innerHTML).toContain('>N</text>');
    expect(host.attributes).toEqual({ role: 'img', 'aria-label': 'North arrow' });
    expect(host.hidden).toBe(true);
    bearing = 24;
    listeners.forEach((listener) => listener());
    expect(host.hidden).toBe(false);
    expect(needle.style.transform).toBe('rotate(-24.0deg)');
    bearing = 0;
    listeners.forEach((listener) => listener());
    expect(host.hidden).toBe(true);
    stop();
    expect(listeners.size).toBe(0);
  });
});
