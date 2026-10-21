import { describe, expect, it } from 'vitest';
import { occlusionFindings, overlapArea } from '../scripts/lib/occlusion.mjs';

const rect = (x, y, width, height) => ({ x, y, width, height });
const viewport = { width: 1000, height: 800 };

describe('visual QA occlusion geometry', () => {
  it('measures overlap and ignores touching edges', () => {
    expect(overlapArea(rect(0, 0, 10, 10), rect(5, 5, 10, 10))).toBe(25);
    expect(overlapArea(rect(0, 0, 10, 10), rect(10, 0, 10, 10))).toBe(0);
  });

  it('reports covered and offscreen targets and overlapping panels', () => {
    const findings = occlusionFindings({
      viewport,
      targets: [
        { id: 'hancock', rect: rect(100, 100, 20, 20) },
        { id: 'grazed', rect: rect(497, 100, 20, 20) },
        { id: 'away', rect: rect(1200, 100, 20, 20) },
      ],
      panels: [
        { id: 'card', rect: rect(50, 50, 450, 400) },
        { id: 'legend', rect: rect(400, 400, 200, 100) },
      ],
    });
    expect(findings).toEqual([
      { kind: 'target-occluded', target: 'hancock', by: 'card', covered: 1 },
      { kind: 'target-offscreen', target: 'away' },
      { kind: 'panel-overlap', panels: ['card', 'legend'], area: 5000 },
    ]);
  });
});
