import { afterEach, describe, expect, it, vi } from 'vitest';
import { circleTouchesBox, overlap } from './callout-placement.js';
import {
  ANCHOR_DOT,
  HALO_GAP,
  calloutRequests,
  createCalloutOverlay,
  nearbySymbols,
} from './callouts.js';
import { FakeElement, fakeContainer, fakeDocument } from './test-dom.js';
import type { CompiledScene } from './types.js';

type Callout = CompiledScene['callouts'][number];

afterEach(() => vi.unstubAllGlobals());

/** 100 px per degree, y down: enough projection to place labels. */
const project = (at: readonly [number, number]) => ({ x: at[0] * 100, y: 1000 - at[1] * 100 });

const gauge: Callout = {
  id: 'gauge',
  text: 'Point of Rocks: 2,020 ft³/s on 2025-10-01',
  anchor: [5, 6],
  priority: 0,
  targets: [{ at: [5, 6], radius: 5.7 }],
};
const free: Callout = {
  id: 'free',
  text: 'Upstream reach',
  anchor: [3, 8],
  priority: 1,
  targets: [],
};

describe('callout frame inputs', () => {
  it('projects anchors and targets and starts the leader outside the anchor symbol', () => {
    const sizes = [
      { width: 120, height: 30 },
      { width: 80, height: 20 },
    ];
    const [withTarget, withoutTarget] = calloutRequests([gauge, free], project, sizes);
    expect(withTarget).toEqual({
      id: 'gauge',
      priority: 0,
      anchor: { x: 500, y: 400 },
      anchorRadius: 5.7,
      width: 120,
      height: 30,
      targets: [{ x: 500, y: 400, r: 5.7 }],
    });
    expect(withoutTarget!.anchorRadius).toBe(0);
    // A target away from the anchor does not push the leader start.
    const [apart] = calloutRequests(
      [{ ...gauge, targets: [{ at: [6, 6], radius: 5 }] }],
      project,
      sizes,
    );
    expect(apart!.anchorRadius).toBe(0);
  });

  it('keeps nearby symbols that are not already callout targets', () => {
    const symbols = nearbySymbols(
      [
        { at: [5, 6], radius: 5.7 },
        { at: [5.5, 6], radius: 3.5 },
        { at: [40, 6], radius: 3.5 },
      ],
      project,
      { width: 1000, height: 800 },
      [{ x: 500, y: 400, r: 5.7 }],
    );
    expect(symbols).toEqual([{ x: 550, y: 400, r: 3.5 }]);
  });
});

describe('callout overlay', () => {
  function overlay(
    panels: () => { left: number; top: number; right: number; bottom: number }[] = () => [],
  ) {
    vi.stubGlobal('document', fakeDocument());
    const container = fakeContainer(1000, 800);
    const listeners = new Set<() => void>();
    const map = {
      onFrame: (listener: () => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      project,
    };
    const layer = createCalloutOverlay(container as unknown as HTMLElement, map, { panels });
    return {
      layer,
      container,
      listeners,
      frame: () => listeners.forEach((listener) => listener()),
    };
  }

  it('renders readable labels, decorative leaders and halos, and removes them', () => {
    const { layer, container, listeners } = overlay();
    const handle = layer.show([free, gauge], () => []);
    const [root] = container.children;
    expect(root!.className).toBe('mb-callouts');
    const [graphics, list] = root!.children as [FakeElement, FakeElement];
    expect(graphics.getAttribute('aria-hidden')).toBe('true');
    expect(list.tagName).toBe('ul');
    expect(list.getAttribute('aria-label')).toBe('Map callouts');
    // Reading order follows priority.
    expect(list.children.map((item) => item.textContent)).toEqual([gauge.text, free.text]);
    const halo = root!.byClass('mb-callout-halo')[0]!;
    expect(halo.getAttribute('cx')).toBe('500.0');
    expect(halo.getAttribute('r')).toBe((5.7 + HALO_GAP).toFixed(1));
    const dot = root!.byClass('mb-callout-dot')[0]!;
    expect(dot.getAttribute('r')).toBe(ANCHOR_DOT.toFixed(1));
    const label = list.children[0]!;
    expect(label.dataset.position).toBe('right-0');
    expect(label.dataset.collisions).toBe('0');
    expect(label.style.transform).toMatch(/^translate\(\d+px, \d+px\)$/);
    expect(listeners.size).toBe(1);
    handle.remove();
    expect(container.children).toEqual([]);
    expect(listeners.size).toBe(0);
  });

  it('re-places labels every frame against panels and nearby symbols', () => {
    let panels = [] as { left: number; top: number; right: number; bottom: number }[];
    const { layer, container, frame } = overlay(() => panels);
    let symbols = [] as { at: [number, number]; radius: number }[];
    layer.show([gauge], () => symbols);
    const label = container.byClass('mb-callout')[0]!;
    expect(label.dataset.position).toBe('right-0');
    // A rail appears to the right, and a small symbol sits to the left.
    panels = [{ left: 520, top: 0, right: 1000, bottom: 800 }];
    symbols = [{ at: [4.6, 6], radius: 3.5 }];
    frame();
    expect(label.dataset.collisions).toBe('0');
    const [, x, y] = /translate\((-?\d+)px, (-?\d+)px\)/.exec(label.style.transform)!;
    const box = {
      left: Number(x),
      top: Number(y),
      right: Number(x) + label.offsetWidth,
      bottom: Number(y) + label.offsetHeight,
    };
    expect(overlap(box, panels[0]!)).toBe(0);
    expect(circleTouchesBox({ x: 460, y: 400, r: 3.5 }, box)).toBe(false);
    expect(circleTouchesBox({ x: 500, y: 400, r: 5.7 }, box)).toBe(false);
  });

  it('hides a callout whose anchor leaves the screen, for readers and screen readers alike', () => {
    const { layer, container } = overlay();
    layer.show([{ ...gauge, anchor: [-2, 6], targets: [] }], () => []);
    const label = container.byClass('mb-callout')[0]!;
    expect(label.hidden).toBe(true);
    expect(container.byClass('mb-callout-mark')[0]!.style.display).toBe('none');
  });
});
