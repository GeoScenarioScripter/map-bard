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
    expect(all).toHaveLength(24 * LEADER_RINGS.length);
    const right = all[0]!;
    expect(right.position).toBe('right-0');
    expect(right.box).toEqual({ left: 524, top: 280, right: 684, bottom: 320 });
    // The leader starts just outside the symbol and ends on the label edge.
    expect(right.leader).toEqual({ from: { x: 513, y: 300 }, to: { x: 524, y: 300 } });
    const above = all.find((item) => item.position === 'above-1')!;
    expect(above.box.bottom).toBe(300 - 10 - LEADER_RINGS[1]);
    expect(above.box.left).toBe(420);
    // Slid labels still reach past the leader's end, so the leader meets them.
    const high = all.find((item) => item.position === 'right-high-0')!;
    expect(high.box).toEqual({ left: 524, top: 272, right: 684, bottom: 312 });
    expect(high.leader.to).toEqual({ x: 524, y: 300 });
    const aboveLeft = all.find((item) => item.position === 'above-left-0')!;
    expect(aboveLeft.box.right).toBe(512);
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

  it('moves an earlier label when that is the only way to clear a later one', () => {
    // In a short strip, the later callout near the right edge fits only to its left, where
    // the first callout's preferred label sits; the refinement moves the first one aside.
    const strip: PlacementField = {
      viewport: { width: 400, height: 120 },
      panels: [],
      symbols: [],
    };
    const size = { anchorRadius: 0, targets: [], width: 100, height: 30 };
    const [first, second] = placeCallouts(
      [request('first', 200, 60, size), request('second', 330, 60, { ...size, priority: 1 })],
      strip,
    );
    expect(first!.collisions).toBe(0);
    expect(second!.collisions).toBe(0);
    expect(first!.position).toBe('left-0');
    expect(overlap(first!.box, second!.box)).toBe(0);
  });

  it('slides a label back inside the screen edge while it still meets its leader', () => {
    const near = request('near', 950, 300, { anchorRadius: 4, targets: [] });
    const bounds = { left: 8, top: 8, right: 992, bottom: 692 };
    const fit = candidates(near, bounds).find((item) => item.position === 'above-fit-0')!;
    expect(fit.box.right).toBe(992);
    expect(fit.box.left).toBeLessThan(950);
    // Without bounds there is nothing to fit to.
    expect(candidates(near).some((item) => item.position.includes('-fit-'))).toBe(false);
  });

  it('clears the phone band when two labels must move together (Potomac 2024, p = 1)', () => {
    // Projected Potomac gauges at 390x844 under a pitched, rotated camera: the free band
    // between the rail and the attribution fits all three labels only if Hancock moves up
    // and Little Falls takes a longer leader at the same time.
    const phone = (id: string, priority: number, x: number, y: number, r: number) =>
      request(id, x, y, { priority, anchorRadius: r, width: 168, height: 46.3 });
    const field: PlacementField = {
      viewport: { width: 390, height: 844 },
      panels: [
        { left: 0, top: 489.5, right: 390, bottom: 844 },
        { left: 12, top: 12, right: 378, bottom: 181.9 },
        { left: 10, top: 431, right: 81, bottom: 449 },
        { left: 10, top: 461, right: 83, bottom: 480 },
        { left: 138, top: 416, right: 380, bottom: 480 },
      ],
      symbols: [],
    };
    const gauges = [
      phone('hancock', 0, 128.2, 281.7, 8.8),
      phone('point-of-rocks', 1, 208.5, 351.2, 17),
      phone('little-falls', 2, 261.1, 404, 14.7),
    ];
    const result = placeCallouts(gauges, field);
    expect(result.map((item) => item.collisions)).toEqual([0, 0, 0]);
    for (const placement of result) {
      expect(placement.box.left).toBeGreaterThanOrEqual(8);
      expect(placement.box.right).toBeLessThanOrEqual(382);
    }
    // Deterministic, and stable when fed its own positions back as the previous frame.
    expect(placeCallouts(gauges, field)).toEqual(result);
    const previous = new Map(result.map((item) => [item.id, item.position]));
    expect(placeCallouts(gauges, field, previous)).toEqual(result);
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
