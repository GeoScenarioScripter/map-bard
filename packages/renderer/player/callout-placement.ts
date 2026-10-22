// Collision-aware callout placement. Pure screen geometry in CSS pixels, so it is unit
// tested without a browser; the overlay feeds it projected positions every frame.

export type Point = { x: number; y: number };
export type Box = { left: number; top: number; right: number; bottom: number };
export type Circle = { x: number; y: number; r: number };

export interface CalloutRequest {
  id: string;
  /** Lower places first and keeps the best position. */
  priority: number;
  anchor: Point;
  /** Radius of the symbol drawn at the anchor (0 for a free anchor); the leader starts outside it. */
  anchorRadius: number;
  width: number;
  height: number;
  /** Symbols this callout points at; its label must not cover them. */
  targets: readonly Circle[];
}

export interface PlacementField {
  viewport: { width: number; height: number };
  /** Screen UI the label must avoid: the layout's card area, the rail, map controls. */
  panels: readonly Box[];
  /** Every other drawn point symbol near the callouts. */
  symbols: readonly Circle[];
}

export interface CalloutPlacement {
  id: string;
  /** Candidate name, such as `right-1`; stable for hysteresis. */
  position: string;
  box: Box;
  leader: { from: Point; to: Point };
  /** Number of obstacles the chosen position still touches; 0 is a clean placement. */
  collisions: number;
  /** The anchor is off screen, so the callout is not drawn and reserves no space. */
  hidden: boolean;
}

/** Candidate directions in preference order: beside the target reads best, then diagonals. */
const DIRECTIONS = [
  { name: 'right', dx: 1, dy: 0 },
  { name: 'left', dx: -1, dy: 0 },
  { name: 'upper-right', dx: 1, dy: -1 },
  { name: 'lower-right', dx: 1, dy: 1 },
  { name: 'upper-left', dx: -1, dy: -1 },
  { name: 'lower-left', dx: -1, dy: 1 },
  { name: 'above', dx: 0, dy: -1 },
  { name: 'below', dx: 0, dy: 1 },
] as const;
/** Leader lengths beyond the anchor symbol, nearest first. */
export const LEADER_RINGS = [14, 40, 80] as const;
/** Clearances, in pixels, kept around each kind of obstacle. */
export const CLEARANCE = { edge: 8, panel: 8, label: 6, symbol: 3 } as const;
const HARD = 1000;
const SOFT = 400;
const RING_COST = 8;
const PREVIOUS_BONUS = 6;
/** Where the leader starts, beyond the anchor symbol's edge. */
const LEADER_GAP = 3;

const inflate = (box: Box, by: number): Box => ({
  left: box.left - by,
  top: box.top - by,
  right: box.right + by,
  bottom: box.bottom + by,
});
const boxArea = (box: Box) => Math.max(0, box.right - box.left) * Math.max(0, box.bottom - box.top);

export function overlap(a: Box, b: Box): number {
  const width = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return width > 0 && height > 0 ? width * height : 0;
}

/** Nearest point of a box to a point (the point itself when inside). */
export function nearestPoint(box: Box, point: Point): Point {
  return {
    x: Math.min(Math.max(point.x, box.left), box.right),
    y: Math.min(Math.max(point.y, box.top), box.bottom),
  };
}

export function circleTouchesBox(circle: Circle, box: Box): boolean {
  const near = nearestPoint(box, circle);
  return Math.hypot(near.x - circle.x, near.y - circle.y) < circle.r;
}

/** Covered area of a circle, approximated by the box overlap of an equal-area square. */
function circleOverlap(circle: Circle, box: Box): number {
  if (!circleTouchesBox(circle, box)) return 0;
  const half = (circle.r * Math.sqrt(Math.PI)) / 2;
  const square = {
    left: circle.x - half,
    top: circle.y - half,
    right: circle.x + half,
    bottom: circle.y + half,
  };
  // A grazing contact still counts: at least one square pixel.
  return Math.max(1, overlap(square, box));
}

/** Whether segment a-b passes through the box (Liang-Barsky clipping). */
export function segmentCrossesBox(a: Point, b: Point, box: Box): boolean {
  let low = 0;
  let high = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const edges: [number, number][] = [
    [-dx, a.x - box.left],
    [dx, box.right - a.x],
    [-dy, a.y - box.top],
    [dy, box.bottom - a.y],
  ];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const t = q / p;
    if (p < 0) low = Math.max(low, t);
    else high = Math.min(high, t);
    if (low > high) return false;
  }
  return high - low > 1e-6;
}

type Candidate = { position: string; box: Box; leader: { from: Point; to: Point }; order: number };

/** Label boxes around one anchor, in preference order. */
export function candidates(request: CalloutRequest): Candidate[] {
  const { anchor, anchorRadius, width, height } = request;
  const result: Candidate[] = [];
  LEADER_RINGS.forEach((ring, ringIndex) => {
    DIRECTIONS.forEach((direction, directionIndex) => {
      const length = Math.hypot(direction.dx, direction.dy);
      const ux = direction.dx / length;
      const uy = direction.dy / length;
      const reach = anchorRadius + ring;
      const attach = { x: anchor.x + ux * reach, y: anchor.y + uy * reach };
      const left =
        direction.dx > 0 ? attach.x : direction.dx < 0 ? attach.x - width : attach.x - width / 2;
      const top =
        direction.dy > 0 ? attach.y : direction.dy < 0 ? attach.y - height : attach.y - height / 2;
      const box = { left, top, right: left + width, bottom: top + height };
      const to = nearestPoint(box, anchor);
      const distance = Math.hypot(to.x - anchor.x, to.y - anchor.y) || 1;
      const start = Math.min(anchorRadius + LEADER_GAP, distance);
      const from = {
        x: anchor.x + ((to.x - anchor.x) / distance) * start,
        y: anchor.y + ((to.y - anchor.y) / distance) * start,
      };
      result.push({
        position: `${direction.name}-${ringIndex}`,
        box,
        leader: { from, to },
        order: ringIndex * RING_COST + directionIndex,
      });
    });
  });
  return result;
}

function isOnScreen(point: Point, viewport: PlacementField['viewport']): boolean {
  return point.x >= 0 && point.y >= 0 && point.x <= viewport.width && point.y <= viewport.height;
}

/**
 * Place callouts greedily in priority order (then ID). Each candidate is scored against the
 * screen edge, the panels, labels and leaders already placed, every callout's targets, and
 * other symbols; a collision always costs more than any preference, so a clean position wins
 * whenever one exists. Ties keep the earlier candidate, so the result is deterministic.
 * `previous` maps callout IDs to their last position; keeping it is slightly favoured so
 * labels do not flicker between equal positions while the camera moves.
 */
export function placeCallouts(
  requests: readonly CalloutRequest[],
  field: PlacementField,
  previous: ReadonlyMap<string, string> = new Map(),
): CalloutPlacement[] {
  const ordered = [...requests].sort(
    (a, b) => a.priority - b.priority || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
  const screen = inflate(
    { left: 0, top: 0, right: field.viewport.width, bottom: field.viewport.height },
    -CLEARANCE.edge,
  );
  const panels = field.panels.map((panel) => inflate(panel, CLEARANCE.panel));
  const visible = ordered.filter((request) => isOnScreen(request.anchor, field.viewport));
  const targets = visible.flatMap((request) =>
    request.targets.map((circle) => ({ ...circle, r: circle.r + CLEARANCE.symbol })),
  );
  const symbols = field.symbols.map((circle) => ({ ...circle, r: circle.r + CLEARANCE.symbol }));
  const placed: CalloutPlacement[] = [];
  const result = new Map<string, CalloutPlacement>();
  for (const request of ordered) {
    if (!isOnScreen(request.anchor, field.viewport)) {
      const { position, box, leader } = candidates(request)[0]!;
      result.set(request.id, {
        id: request.id,
        position,
        box,
        leader,
        collisions: 0,
        hidden: true,
      });
      continue;
    }
    let best: CalloutPlacement | undefined;
    let bestCost = Infinity;
    for (const candidate of candidates(request)) {
      let collisions = 0;
      let cost = candidate.order;
      const hit = (weight: number, area: number) => {
        if (area <= 0) return;
        collisions++;
        cost += weight + area;
      };
      const { box, leader } = candidate;
      hit(HARD, boxArea(box) - overlap(box, screen));
      for (const panel of panels) {
        hit(HARD, overlap(box, panel));
        hit(SOFT, segmentCrossesBox(leader.from, leader.to, panel) ? 1 : 0);
      }
      for (const other of placed) {
        hit(HARD, overlap(box, inflate(other.box, CLEARANCE.label)));
        hit(SOFT, segmentCrossesBox(leader.from, leader.to, other.box) ? 1 : 0);
        hit(SOFT, segmentCrossesBox(other.leader.from, other.leader.to, box) ? 1 : 0);
      }
      for (const circle of targets) hit(HARD, circleOverlap(circle, box));
      for (const circle of symbols) hit(SOFT, circleOverlap(circle, box));
      if (collisions === 0 && previous.get(request.id) === candidate.position)
        cost -= PREVIOUS_BONUS;
      if (cost < bestCost) {
        bestCost = cost;
        best = {
          id: request.id,
          position: candidate.position,
          box,
          leader,
          collisions,
          hidden: false,
        };
      }
    }
    placed.push(best!);
    result.set(request.id, best!);
  }
  // Report in the caller's order.
  return requests.map((request) => result.get(request.id)!);
}
