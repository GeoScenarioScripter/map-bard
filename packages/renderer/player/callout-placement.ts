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

/**
 * Candidate directions in preference order: beside the target reads best, then diagonals,
 * then above and below; then the same sides with the label slid along the leader's end
 * (`align` -1 slides up or left, 1 down or right), for tight spaces.
 */
const DIRECTIONS = [
  { name: 'right', dx: 1, dy: 0, align: 0 },
  { name: 'left', dx: -1, dy: 0, align: 0 },
  { name: 'upper-right', dx: 1, dy: -1, align: 0 },
  { name: 'lower-right', dx: 1, dy: 1, align: 0 },
  { name: 'upper-left', dx: -1, dy: -1, align: 0 },
  { name: 'lower-left', dx: -1, dy: 1, align: 0 },
  { name: 'above', dx: 0, dy: -1, align: 0 },
  { name: 'below', dx: 0, dy: 1, align: 0 },
  { name: 'right-high', dx: 1, dy: 0, align: -1 },
  { name: 'right-low', dx: 1, dy: 0, align: 1 },
  { name: 'left-high', dx: -1, dy: 0, align: -1 },
  { name: 'left-low', dx: -1, dy: 0, align: 1 },
  { name: 'above-left', dx: 0, dy: -1, align: -1 },
  { name: 'above-right', dx: 0, dy: -1, align: 1 },
  { name: 'below-left', dx: 0, dy: 1, align: -1 },
  { name: 'below-right', dx: 0, dy: 1, align: 1 },
] as const;
/** Leader lengths beyond the anchor symbol, nearest first. */
export const LEADER_RINGS = [14, 40, 80] as const;
/** Clearances, in pixels, kept around each kind of obstacle. */
export const CLEARANCE = { edge: 8, panel: 8, label: 6, symbol: 3 } as const;
const HARD = 1000;
const SOFT = 400;
const PREVIOUS_BONUS = 6;
/** Where the leader starts, beyond the anchor symbol's edge. */
const LEADER_GAP = 3;
/** How far a slid label still reaches past its leader's end, so the leader meets it. */
const SLIDE_OVERLAP = 12;
/** Best-response rounds that try to clear collisions left by the greedy pass. */
const REFINE_ROUNDS = 4;

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

/** One edge coordinate of a label of `size` placed at `attach` along one axis. */
function edge(attach: number, direction: number, align: number, size: number): number {
  if (direction > 0) return attach;
  if (direction < 0) return attach - size;
  if (align < 0) return attach + SLIDE_OVERLAP - size;
  if (align > 0) return attach - SLIDE_OVERLAP;
  return attach - size / 2;
}

/** Label boxes around one anchor, in preference order. */
export function candidates(request: CalloutRequest): Candidate[] {
  const { anchor, anchorRadius, width, height } = request;
  const result: Candidate[] = [];
  LEADER_RINGS.forEach((ring, ringIndex) => {
    DIRECTIONS.forEach((direction, directionIndex) => {
      const length = Math.hypot(direction.dx, direction.dy);
      const reach = anchorRadius + ring;
      const attach = {
        x: anchor.x + (direction.dx / length) * reach,
        y: anchor.y + (direction.dy / length) * reach,
      };
      // A side label slides vertically; an above/below label slides horizontally.
      const left = edge(attach.x, direction.dx, direction.dy ? direction.align : 0, width);
      const top = edge(attach.y, direction.dy, direction.dx ? direction.align : 0, height);
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
        order: ringIndex * DIRECTIONS.length + directionIndex,
      });
    });
  });
  return result;
}

function isOnScreen(point: Point, viewport: PlacementField['viewport']): boolean {
  return point.x >= 0 && point.y >= 0 && point.x <= viewport.width && point.y <= viewport.height;
}

type Scored = CalloutPlacement & { cost: number };

/**
 * Place callouts by priority (then ID). Each candidate is scored against the screen edge, the
 * panels, other labels and leaders, every callout's targets, and other symbols; a collision
 * always costs more than any preference, so a clean position wins whenever one exists. A
 * greedy pass places each callout against those before it; if collisions remain, a few
 * best-response rounds re-place each one against all the others, moving only on a strict
 * improvement. Ties keep the earlier candidate, so the result is deterministic. `previous`
 * maps IDs to last positions; keeping a clean one is slightly favoured so labels do not
 * flicker while the camera moves.
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
  const options = new Map(visible.map((request) => [request.id, candidates(request)]));

  function score(request: CalloutRequest, candidate: Candidate, others: readonly Scored[]): Scored {
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
    for (const other of others) {
      hit(HARD, overlap(box, inflate(other.box, CLEARANCE.label)));
      hit(SOFT, segmentCrossesBox(leader.from, leader.to, other.box) ? 1 : 0);
      hit(SOFT, segmentCrossesBox(other.leader.from, other.leader.to, box) ? 1 : 0);
    }
    for (const circle of targets) hit(HARD, circleOverlap(circle, box));
    for (const circle of symbols) hit(SOFT, circleOverlap(circle, box));
    if (collisions === 0 && previous.get(request.id) === candidate.position) cost -= PREVIOUS_BONUS;
    const { position } = candidate;
    return { id: request.id, position, box, leader, collisions, hidden: false, cost };
  }

  function best(request: CalloutRequest, others: readonly Scored[]): Scored {
    let chosen: Scored | undefined;
    for (const candidate of options.get(request.id)!) {
      const scored = score(request, candidate, others);
      if (!chosen || scored.cost < chosen.cost) chosen = scored;
    }
    return chosen!;
  }

  const placed = new Map<string, Scored>();
  for (const request of visible) placed.set(request.id, best(request, [...placed.values()]));
  const othersOf = (id: string) => [...placed.values()].filter((item) => item.id !== id);
  const rescore = () => {
    for (const request of visible) {
      const current = placed.get(request.id)!;
      const candidate = options
        .get(request.id)!
        .find((item) => item.position === current.position)!;
      placed.set(request.id, score(request, candidate, othersOf(request.id)));
    }
  };
  rescore();
  for (let round = 0; round < REFINE_ROUNDS; round++) {
    if (![...placed.values()].some((item) => item.collisions > 0)) break;
    let changed = false;
    for (const request of visible) {
      const others = othersOf(request.id);
      const current = placed.get(request.id)!;
      const candidate = best(request, others);
      if (candidate.cost < current.cost - 1e-9) {
        placed.set(request.id, candidate);
        changed = true;
      }
    }
    rescore();
    if (!changed) break;
  }

  // Report in the caller's order; off-screen anchors hide their callout and reserve nothing.
  return requests.map((request) => {
    const scored = placed.get(request.id);
    if (scored) {
      const { id, position, box, leader, collisions } = scored;
      return { id, position, box, leader, collisions, hidden: false };
    }
    const { position, box, leader } = candidates(request)[0]!;
    return { id: request.id, position, box, leader, collisions: 0, hidden: true };
  });
}
