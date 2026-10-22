import { describe, expect, it } from 'vitest';
import {
  CLEARANCE,
  LEADER_RINGS,
  candidates,
  circleTouchesBox,
  overlap,
  placeCallouts,
  segmentCrossesBox,
  type CalloutRequest,
  type PlacementField,
} from './callout-placement.js';

const viewport = { width: 1000, height: 700 };
const open: PlacementField = { viewport, panels: [], symbols: [] };

function request(
  id: string,
  x: number,
  y: number,
  extra: Partial<CalloutRequest> = {},
): CalloutRequest {
  return {
    id,
    priority: 0,
    anchor: { x, y },
    anchorRadius: 10,
    width: 160,
    height: 40,
    targets: [{ x, y, r: 10 }],
    ...extra,
  };
}

describe('callout placement geometry', () => {
  it('measures overlaps, circle contact and leader crossings', () => {
    const box = { left: 0, top: 0, right: 10, bottom: 10 };
    expect(overlap(box, { left: 5, top: 5, right: 20, bottom: 20 })).toBe(25);
    expect(overlap(box, { left: 10, top: 0, right: 20, bottom: 10 })).toBe(0);
    expect(circleTouchesBox({ x: 14, y: 5, r: 5 }, box)).toBe(true);
    expect(circleTouchesBox({ x: 14, y: 14, r: 5 }, box)).toBe(false);
    expect(segmentCrossesBox({ x: -5, y: 5 }, { x: 15, y: 5 }, box)).toBe(true);
    expect(segmentCrossesBox({ x: -5, y: -5 }, { x: 15, y: -1 }, box)).toBe(false);
    expect(segmentCrossesBox({ x: -5, y: 5 }, { x: 0, y: 5 }, box)).toBe(false);
  });

  it('offers every direction at each leader length, beyond the anchor symbol', () => {
    const all = candidates(request('a', 500, 300));
    expect(all).toHaveLength(8 * LEADER_RINGS.length);
    const right = all[0]!;
    expect(right.position).toBe('right-0');
    expect(right.box).toEqual({ left: 524, top: 280, right: 684, bottom: 320 });
    // The leader starts just outside the symbol and ends on the label edge.
    expect(right.leader).toEqual({ from: { x: 513, y: 300 }, to: { x: 524, y: 300 } });
    const above = all.find((item) => item.position === 'above-1')!;
    expect(above.box.bottom).toBe(300 - 10 - LEADER_RINGS[1]);
    expect(above.box.left).toBe(420);
  });
});

describe('placeCallouts', () => {
  it('puts a lone label beside its target', () => {
    const [placement] = placeCallouts([request('a', 500, 300)], open);
    expect(placement).toMatchObject({ id: 'a', position: 'right-0', collisions: 0, hidden: false });
  });

  it('keeps labels clear of the card, the rail and the screen edge', () => {
    const card = { left: 0, top: 0, right: 440, bottom: 700 };
    const rail = { left: 700, top: 24, right: 980, bottom: 300 };
    const field: PlacementField = { viewport, panels: [card, rail], symbols: [] };
    // Right of this anchor is the rail; left is clear.
    const [nearRail] = placeCallouts([request('rail', 650, 150)], field);
    expect(nearRail!.position).toBe('left-0');
    expect(overlap(nearRail!.box, rail)).toBe(0);
    // Left of this anchor is the card, right is open map.
    const [nearCard] = placeCallouts([request('card', 470, 500)], field);
    expect(nearCard!.position).toBe('right-0');
    // At the bottom-right corner only up-and-left stays on screen.
    const [corner] = placeCallouts([request('corner', 960, 680)], field);
    expect(corner!.position).toMatch(/^(upper-left|above)/);
    expect(corner!.box.right).toBeLessThanOrEqual(viewport.width - CLEARANCE.edge);
    expect(corner!.box.bottom).toBeLessThanOrEqual(viewport.height - CLEARANCE.edge);
    expect(corner!.collisions).toBe(0);
  });

  it('never covers another callout target or a small symbol when a clean spot exists', () => {
    // A small neighbouring symbol sits exactly where the preferred label would go.
    const small = { x: 560, y: 300, r: 3.5 };
    const [a, b] = placeCallouts(
      [
        request('a', 500, 300),
        request('b', 560, 300, { priority: 1, anchorRadius: 3.5, targets: [small] }),
      ],
      open,
    );
    for (const placement of [a!, b!]) expect(placement.collisions).toBe(0);
    expect(circleTouchesBox(small, a!.box)).toBe(false);
    expect(circleTouchesBox({ x: 500, y: 300, r: 10 }, b!.box)).toBe(false);
    expect(overlap(a!.box, b!.box)).toBe(0);
    // Unannotated symbols are avoided too.
    const [c] = placeCallouts([request('c', 500, 300)], { ...open, symbols: [small] });
    expect(c!.collisions).toBe(0);
    expect(circleTouchesBox(small, c!.box)).toBe(false);
  });

  it('places by priority, then ID, and reports in the caller order', () => {
    const low = request('low', 500, 300, { priority: 1 });
    const high = request('high', 505, 300, { priority: 0 });
    const result = placeCallouts([low, high], open);
    expect(result.map((item) => item.id)).toEqual(['low', 'high']);
    expect(result[1]!.position).toBe('right-0');
    expect(result[0]!.position).not.toBe('right-0');
    expect(overlap(result[0]!.box, result[1]!.box)).toBe(0);
    const tie = placeCallouts([request('b', 500, 300), request('a', 505, 300)], open);
    expect(tie[1]!.position).toBe('right-0');
    expect(placeCallouts([low, high], open)).toEqual(result);
  });

  it('keeps a clean previous position so labels do not flicker', () => {
    const previous = new Map([['a', 'left-0']]);
    expect(placeCallouts([request('a', 500, 300)], open, previous)[0]!.position).toBe('left-0');
    // A previous position that now collides is dropped.
    const blocked: PlacementField = {
      ...open,
      panels: [{ left: 300, top: 250, right: 480, bottom: 350 }],
    };
    expect(placeCallouts([request('a', 500, 300)], blocked, previous)[0]!.position).toBe('right-0');
  });

  it('hides callouts whose anchor is off screen without reserving space', () => {
    const [gone, kept] = placeCallouts(
      [request('gone', -40, 300), request('kept', 30, 300, { priority: 1 })],
      open,
    );
    expect(gone!.hidden).toBe(true);
    expect(kept).toMatchObject({ hidden: false, position: 'right-0', collisions: 0 });
  });

  it('returns the least-bad position, with its collision count, when nothing is clean', () => {
    const field: PlacementField = {
      viewport: { width: 200, height: 100 },
      panels: [],
      symbols: [],
    };
    const [placement] = placeCallouts([request('a', 100, 50, { width: 400 })], field);
    expect(placement!.collisions).toBeGreaterThan(0);
    expect(placement!.hidden).toBe(false);
  });
});
