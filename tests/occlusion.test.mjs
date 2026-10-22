import { describe, expect, it } from 'vitest';
import {
  calloutFindings,
  circleDepth,
  occlusionFindings,
  overlapArea,
} from '../scripts/lib/occlusion.mjs';

const rect = (x, y, width, height) => ({ x, y, width, height });
const viewport = { width: 1000, height: 800 };

describe('visual QA occlusion geometry', () => {
  it('measures overlap and ignores touching edges', () => {
    expect(overlapArea(rect(0, 0, 10, 10), rect(5, 5, 10, 10))).toBe(25);
    expect(overlapArea(rect(0, 0, 10, 10), rect(10, 0, 10, 10))).toBe(0);
  });

  it('reports covered, offscreen and edge-clipped targets and overlapping panels', () => {
    const findings = occlusionFindings({
      viewport,
      targets: [
        { id: 'hancock', rect: rect(100, 100, 20, 20) },
        { id: 'grazed', rect: rect(497, 100, 20, 20) },
        { id: 'away', rect: rect(1200, 100, 20, 20) },
        { id: 'edge', rect: rect(-10, 600, 20, 20) },
        { id: 'inside-edge', rect: rect(982, 600, 20, 20) },
      ],
      panels: [
        { id: 'card', rect: rect(50, 50, 450, 400) },
        { id: 'legend', rect: rect(400, 400, 200, 100) },
      ],
    });
    expect(findings).toEqual([
      { kind: 'target-occluded', target: 'hancock', by: 'card', covered: 1 },
      { kind: 'target-offscreen', target: 'away', outside: 1 },
      { kind: 'target-offscreen', target: 'edge', outside: 0.5 },
      { kind: 'panel-overlap', panels: ['card', 'legend'], area: 5000 },
    ]);
  });

  it('measures how far a circle reaches into a rect', () => {
    expect(circleDepth({ x: 15, y: 5, r: 8 }, rect(0, 0, 10, 10))).toBe(3);
    expect(circleDepth({ x: 30, y: 5, r: 8 }, rect(0, 0, 10, 10))).toBe(-12);
  });

  it('reports callout labels that are clipped, covered, overlapping or over a target', () => {
    const halo = (x, y, r = 10) => ({ x, y, r });
    const findings = calloutFindings({
      viewport,
      callouts: [
        { id: 'clean', rect: rect(520, 100, 150, 30), halos: [halo(500, 115)] },
        { id: 'edge', rect: rect(900, 300, 150, 30), halos: [halo(880, 315)] },
        { id: 'under-card', rect: rect(420, 600, 150, 30), halos: [halo(600, 615)] },
        { id: 'stacked', rect: rect(560, 120, 150, 30), halos: [halo(740, 135)] },
        { id: 'on-own-symbol', rect: rect(200, 500, 150, 30), halos: [halo(205, 515, 6)] },
      ],
      occluders: [{ id: 'scene-card', rect: rect(0, 560, 450, 240) }],
    });
    expect(findings).toEqual([
      { kind: 'callout-overlap', callouts: ['clean', 'stacked'], area: 1100 },
      { kind: 'callout-offscreen', callout: 'edge', area: 1500 },
      { kind: 'callout-occluded', callout: 'under-card', by: 'scene-card', area: 900 },
      {
        kind: 'callout-covers-target',
        callout: 'on-own-symbol',
        target: 'on-own-symbol#0',
        depth: 6,
      },
    ]);
  });
});
