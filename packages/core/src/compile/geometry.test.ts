import { describe, expect, it } from 'vitest';
import { chainPath, lineLength, type Position } from './geometry.js';

/** The longest straight step of a path, in metres. */
const longestStep = (path: Position[]) =>
  Math.max(...path.slice(1).map((point, index) => lineLength([path[index]!, point])));

describe('chainPath', () => {
  it('follows every part of a split channel and takes the shorter side of an island', () => {
    // One feature, parts out of order and against travel, with a channel each side of an island.
    const north: Position[] = [
      [0.01, 39],
      [0.015, 39.002],
      [0.02, 39],
    ];
    const south: Position[] = [
      [0.01, 39],
      [0.015, 38.996],
      [0.02, 39],
    ];
    const path = chainPath([
      [
        south,
        [
          [0.03, 39],
          [0.02, 39],
        ],
        north,
        [
          [0, 39],
          [0.01, 39],
        ],
      ],
    ]);
    // The longest part is the south channel; travel starts at the end nearer its start.
    expect(path[0]).toEqual([0, 39]);
    expect(path.at(-1)).toEqual([0.03, 39]);
    expect(path).toContainEqual([0.015, 39.002]);
    expect(path).not.toContainEqual([0.015, 38.996]);
    expect(longestStep(path)).toBeLessThan(900);
  });

  it('runs from the free end of the first feature and bridges only real gaps', () => {
    const upstream: Position[][] = [
      [
        [-77.01, 39],
        [-77, 39],
      ],
    ];
    // About 300 m downstream, stored against the direction of travel.
    const downstream: Position[][] = [
      [
        [-77.03, 39],
        [-77.0135, 39],
      ],
    ];
    const path = chainPath([upstream, downstream]);
    expect(path).toEqual([
      [-77, 39],
      [-77.01, 39],
      [-77.0135, 39],
      [-77.03, 39],
    ]);
    expect(longestStep(path)).toBeGreaterThan(250);
  });

  it('joins a line that starts on a vertex inside another line', () => {
    const main: Position[][] = [
      [
        [0, 39],
        [0.01, 39],
        [0.02, 39],
      ],
    ];
    const branch: Position[][] = [
      [
        [0.01, 39],
        [0.01, 39.01],
      ],
    ];
    expect(chainPath([main, branch])).toEqual([
      [0, 39],
      [0.01, 39],
      [0.01, 39.01],
    ]);
  });

  it('returns no path without line parts', () => {
    expect(chainPath([])).toEqual([]);
    expect(chainPath([[[[0, 39]]]])).toEqual([]);
  });
});
