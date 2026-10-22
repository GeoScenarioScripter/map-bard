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
 * then above and below; then the same sides with the label slid along the leader's end, for
 * tight spaces. `slide` runs from -1 (the label extends up or left of the leader's end) to 1
 * (down or right); 0 centres it.
 */
const DIRECTIONS = [
  { name: 'right', dx: 1, dy: 0, slide: 0 },
  { name: 'left', dx: -1, dy: 0, slide: 0 },
  { name: 'upper-right', dx: 1, dy: -1, slide: 0 },
  { name: 'lower-right', dx: 1, dy: 1, slide: 0 },
  { name: 'upper-left', dx: -1, dy: -1, slide: 0 },
  { name: 'lower-left', dx: -1, dy: 1, slide: 0 },
  { name: 'above', dx: 0, dy: -1, slide: 0 },
  { name: 'below', dx: 0, dy: 1, slide: 0 },
  { name: 'right-high', dx: 1, dy: 0, slide: -1 },
  { name: 'right-low', dx: 1, dy: 0, slide: 1 },
  { name: 'left-high', dx: -1, dy: 0, slide: -1 },
  { name: 'left-low', dx: -1, dy: 0, slide: 1 },
  { name: 'above-left', dx: 0, dy: -1, slide: -1 },
  { name: 'above-right', dx: 0, dy: -1, slide: 1 },
  { name: 'below-left', dx: 0, dy: 1, slide: -1 },
  { name: 'below-right', dx: 0, dy: 1, slide: 1 },
  { name: 'right-high-half', dx: 1, dy: 0, slide: -0.5 },
  { name: 'right-low-half', dx: 1, dy: 0, slide: 0.5 },
  { name: 'left-high-half', dx: -1, dy: 0, slide: -0.5 },
  { name: 'left-low-half', dx: -1, dy: 0, slide: 0.5 },
  { name: 'above-left-half', dx: 0, dy: -1, slide: -0.5 },
  { name: 'above-right-half', dx: 0, dy: -1, slide: 0.5 },
  { name: 'below-left-half', dx: 0, dy: 1, slide: -0.5 },
  { name: 'below-right-half', dx: 0, dy: 1, slide: 0.5 },
] as const;
/** Leader lengths beyond the anchor symbol, nearest first. */
export const LEADER_RINGS = [14, 40, 80] as const;
/** Clearances, in pixels, kept around each kind of obstacle. */
// Symbols keep their halo ring (3 px out, 2 px stroke) clear, with a pixel to spare for rounding.
export const CLEARANCE = { edge: 8, panel: 8, label: 6, symbol: 6 } as const;
const HARD = 1000;
const SOFT = 400;
const PREVIOUS_BONUS = 6;
/** Where the leader starts, beyond the anchor symbol's edge. */
const LEADER_GAP = 3;
/** How far a slid label still reaches past its leader's end, so the leader meets it. */
const SLIDE_OVERLAP = 12;
/** Best-response rounds that try to clear collisions left by the greedy pass. */
const REFINE_ROUNDS = 4;
/** Candidate combinations the joint search may try when collisions remain. */
const SEARCH_BUDGET = 4096;

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
/** Grid cell size for the symbol index, in CSS pixels. */
const CELL = 64;
const cellKey = (column: number, row: number) => (column + 1e5) * 2e5 + (row + 1e5);

/**
 * Circles bucketed on a coarse grid, so a candidate box visits only the symbols near it
 * instead of every symbol on screen. Hits come back in input order, so costs add up in the
 * same order as a full scan and placement stays identical.
 */
function circleIndex(circles: readonly Circle[]): (box: Box) => readonly Circle[] {
  const cells = new Map<number, number[]>();
  circles.forEach((circle, index) => {
    for (
      let column = Math.floor((circle.x - circle.r) / CELL);
      column <= Math.floor((circle.x + circle.r) / CELL);
      column++
    )
      for (
        let row = Math.floor((circle.y - circle.r) / CELL);
        row <= Math.floor((circle.y + circle.r) / CELL);
        row++
      ) {
        const key = cellKey(column, row);
        const cell = cells.get(key);
        if (cell) cell.push(index);
        else cells.set(key, [index]);
      }
  });
  return (box) => {
    const hits = new Set<number>();
    for (let column = Math.floor(box.left / CELL); column <= Math.floor(box.right / CELL); column++)
      for (let row = Math.floor(box.top / CELL); row <= Math.floor(box.bottom / CELL); row++)
        for (const index of cells.get(cellKey(column, row)) ?? []) hits.add(index);
    return [...hits].sort((a, b) => a - b).map((index) => circles[index]!);
  };
}

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
function edge(attach: number, direction: number, slide: number, size: number): number {
  if (direction > 0) return attach;
  if (direction < 0) return attach - size;
  return attach - size / 2 + slide * (size / 2 - SLIDE_OVERLAP);
}

/** Candidates per leader length: every direction, then their screen-fitted versions. */
const PER_RING = DIRECTIONS.length * 2;

function leaderTo(box: Box, anchor: Point, anchorRadius: number) {
  const to = nearestPoint(box, anchor);
  const distance = Math.hypot(to.x - anchor.x, to.y - anchor.y) || 1;
  const start = Math.min(anchorRadius + LEADER_GAP, distance);
  const from = {
    x: anchor.x + ((to.x - anchor.x) / distance) * start,
    y: anchor.y + ((to.y - anchor.y) / distance) * start,
  };
  return { from, to };
}

const clamp = (value: number, low: number, high: number) =>
  Math.min(Math.max(value, low), Math.max(low, high));

/**
 * Label boxes around one anchor, in preference order. With `bounds` (the usable screen),
 * a side, above or below label that would cross the screen edge is also offered slid back
 * inside it, as long as it still spans its leader's end, so labels near an edge stay whole.
 */
export function candidates(request: CalloutRequest, bounds?: Box): Candidate[] {
  const { anchor, anchorRadius, width, height } = request;
  const result: Candidate[] = [];
  LEADER_RINGS.forEach((ring, ringIndex) => {
    const fitted: Candidate[] = [];
    DIRECTIONS.forEach((direction, directionIndex) => {
      const length = Math.hypot(direction.dx, direction.dy);
      const reach = anchorRadius + ring;
      const attach = {
        x: anchor.x + (direction.dx / length) * reach,
        y: anchor.y + (direction.dy / length) * reach,
      };
      // A side label slides vertically; an above/below label slides horizontally.
      const left = edge(attach.x, direction.dx, direction.dy ? direction.slide : 0, width);
      const top = edge(attach.y, direction.dy, direction.dx ? direction.slide : 0, height);
      const box = { left, top, right: left + width, bottom: top + height };
      result.push({
        position: `${direction.name}-${ringIndex}`,
        box,
        leader: leaderTo(box, anchor, anchorRadius),
        order: ringIndex * PER_RING + directionIndex,
      });
      if (!bounds || (direction.dx !== 0 && direction.dy !== 0)) return;
      // Slide along the edge the leader meets back inside the screen.
      const fitLeft = direction.dx ? left : clamp(left, bounds.left, bounds.right - width);
      const fitTop = direction.dy ? top : clamp(top, bounds.top, bounds.bottom - height);
      if (fitLeft === left && fitTop === top) return;
      const fit = { left: fitLeft, top: fitTop, right: fitLeft + width, bottom: fitTop + height };
      // The fitted label must still meet the leader's end, away from its rounded corners.
      const spans = direction.dx
        ? fit.top + 4 <= attach.y && attach.y <= fit.bottom - 4
        : fit.left + 4 <= attach.x && attach.x <= fit.right - 4;
      if (!spans) return;
      fitted.push({
        position: `${direction.name}-fit-${ringIndex}`,
        box: fit,
        leader: leaderTo(fit, anchor, anchorRadius),
        order: ringIndex * PER_RING + DIRECTIONS.length + directionIndex,
      });
    });
    result.push(...fitted);
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
 * improvement; if collisions still remain, a bounded joint search tries combinations of each
 * callout's best stand-alone positions, for labels that can only clear by moving together.
 * Ties keep the earlier candidate, so the result is deterministic. `previous`
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
  const symbolsNear = circleIndex(
    field.symbols.map((circle) => ({ ...circle, r: circle.r + CLEARANCE.symbol })),
  );
  const options = new Map(visible.map((request) => [request.id, candidates(request, screen)]));
  type Cost = { cost: number; collisions: number };
  const charge = (total: Cost, weight: number, area: number) => {
    if (area <= 0) return;
    total.collisions++;
    total.cost += weight + area;
  };

  /** Cost of a candidate against everything but the other callouts. */
  function alone(candidate: Candidate): Cost {
    const total = { cost: candidate.order, collisions: 0 };
    const { box, leader } = candidate;
    charge(total, HARD, boxArea(box) - overlap(box, screen));
    for (const panel of panels) {
      charge(total, HARD, overlap(box, panel));
      charge(total, SOFT, segmentCrossesBox(leader.from, leader.to, panel) ? 1 : 0);
    }
    for (const circle of targets) charge(total, HARD, circleOverlap(circle, box));
    for (const circle of symbolsNear(box)) charge(total, SOFT, circleOverlap(circle, box));
    return total;
  }

  /** Cost two callouts add to each other: overlapping labels and crossing leaders. */
  function between(a: Candidate | Scored, b: Candidate | Scored): Cost {
    const total = { cost: 0, collisions: 0 };
    charge(total, HARD, overlap(a.box, inflate(b.box, CLEARANCE.label)));
    charge(total, SOFT, segmentCrossesBox(a.leader.from, a.leader.to, b.box) ? 1 : 0);
    charge(total, SOFT, segmentCrossesBox(b.leader.from, b.leader.to, a.box) ? 1 : 0);
    return total;
  }

  const statics = new Map<Candidate, Cost>();
  function staticCost(request: CalloutRequest, candidate: Candidate): Cost {
    let cost = statics.get(candidate);
    if (!cost) {
      cost = alone(candidate);
      if (cost.collisions === 0 && previous.get(request.id) === candidate.position)
        cost = { ...cost, cost: cost.cost - PREVIOUS_BONUS };
      statics.set(candidate, cost);
    }
    return cost;
  }

  function score(request: CalloutRequest, candidate: Candidate, others: readonly Scored[]): Scored {
    const own = staticCost(request, candidate);
    let { cost, collisions } = own;
    for (const other of others) {
      const pair = between(candidate, other);
      cost += pair.cost;
      collisions += pair.collisions;
    }
    const { position, box, leader } = candidate;
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
  const candidateOf = (request: CalloutRequest) =>
    options.get(request.id)!.find((item) => item.position === placed.get(request.id)!.position)!;
  const rescore = () => {
    for (const request of visible)
      placed.set(request.id, score(request, candidateOf(request), othersOf(request.id)));
  };
  const colliding = () => [...placed.values()].some((item) => item.collisions > 0);
  rescore();
  for (let round = 0; round < REFINE_ROUNDS && colliding(); round++) {
    let changed = false;
    for (const request of visible) {
      const candidate = best(request, othersOf(request.id));
      if (candidate.cost < placed.get(request.id)!.cost - 1e-9) {
        placed.set(request.id, candidate);
        changed = true;
      }
    }
    rescore();
    if (!changed) break;
  }

  // Still colliding: some callouts must move together. Search combinations of each one's
  // best stand-alone candidates (bounded, branch and bound), keeping any strictly cheaper set.
  if (colliding() && visible.length > 1) {
    const width = Math.max(2, Math.min(16, Math.floor(SEARCH_BUDGET ** (1 / visible.length))));
    const lists = visible.map((request) =>
      options
        .get(request.id)!
        .map((candidate) => ({ candidate, own: staticCost(request, candidate).cost }))
        .sort((a, b) => a.own - b.own || a.candidate.order - b.candidate.order)
        .slice(0, width),
    );
    // Lower bound for the callouts not yet chosen: their cheapest stand-alone cost.
    const floor = lists.map((list) => list[0]!.own);
    const rest = floor.map((_, index) => floor.slice(index).reduce((sum, value) => sum + value, 0));
    const current = visible.map(candidateOf);
    let bestTotal = current.reduce(
      (sum, candidate, index) =>
        sum +
        staticCost(visible[index]!, candidate).cost +
        current.slice(0, index).reduce((pairs, other) => pairs + between(candidate, other).cost, 0),
      0,
    );
    let bestSet: Candidate[] | undefined;
    const chosen: Candidate[] = [];
    const search = (index: number, partial: number) => {
      if (index === visible.length) {
        if (partial < bestTotal - 1e-9) {
          bestTotal = partial;
          bestSet = [...chosen];
        }
        return;
      }
      for (const { candidate, own } of lists[index]!) {
        let cost = partial + own;
        for (const other of chosen) cost += between(candidate, other).cost;
        if (cost + (rest[index + 1] ?? 0) >= bestTotal - 1e-9) continue;
        chosen.push(candidate);
        search(index + 1, cost);
        chosen.pop();
      }
    };
    search(0, 0);
    if (bestSet) {
      bestSet.forEach((candidate, index) => {
        const request = visible[index]!;
        placed.set(request.id, score(request, candidate, []));
      });
      rescore();
    }
  }

  // Report in the caller's order; off-screen anchors hide their callout and reserve nothing.
  return requests.map((request) => {
    const scored = placed.get(request.id);
    if (scored) {
      const { id, position, box, leader, collisions } = scored;
      return { id, position, box, leader, collisions, hidden: false };
    }
    return hiddenPlacement(request);
  });
}

function hiddenPlacement(request: CalloutRequest): CalloutPlacement {
  const { position, box, leader } = candidates(request)[0]!;
  return { id: request.id, position, box, leader, collisions: 0, hidden: true };
}

/** Gap between a target symbol and its halo ring, in CSS pixels; the halo is what readers see. */
export const HALO_GAP = 3;
/** A callout steps aside once this share of a target's halo is under a panel or off screen. */
export const TARGET_COVER_LIMIT = 0.2;

/** The largest share of a target's halo box that one panel covers, or that lies off screen. */
export function targetCover(target: Circle, field: PlacementField): number {
  const r = target.r + HALO_GAP;
  const box = { left: target.x - r, top: target.y - r, right: target.x + r, bottom: target.y + r };
  const area = boxArea(box);
  if (!area) return 0;
  const screen = { left: 0, top: 0, right: field.viewport.width, bottom: field.viewport.height };
  return Math.max(
    1 - overlap(box, screen) / area,
    ...field.panels.map((panel) => overlap(box, panel) / area),
  );
}

/**
 * Placement for the callouts a reader can trust: a callout whose target is a fifth or more
 * under a panel or off screen is hidden, and while any placed callout still collides with
 * something, the least important colliding one (highest priority value, then last ID) is
 * hidden and the rest placed again. A label is never drawn covered or covering; it comes
 * back as soon as the camera gives it room.
 */
export function placeShownCallouts(
  requests: readonly CalloutRequest[],
  field: PlacementField,
  previous: ReadonlyMap<string, string> = new Map(),
): CalloutPlacement[] {
  let shown = requests.filter((request) =>
    request.targets.every((target) => targetCover(target, field) < TARGET_COVER_LIMIT),
  );
  for (;;) {
    // A hidden callout's targets stay drawn, so the shown labels must keep off them too.
    const symbols = [
      ...field.symbols,
      ...requests
        .filter((request) => !shown.includes(request))
        .flatMap((request) => request.targets),
    ];
    const placements = placeCallouts(shown, { ...field, symbols }, previous);
    const colliding = placements
      .map((placement, index) => ({ placement, request: shown[index]! }))
      .filter(({ placement }) => !placement.hidden && placement.collisions > 0)
      .map(({ request }) => request);
    if (!colliding.length) {
      const byId = new Map(placements.map((placement) => [placement.id, placement]));
      return requests.map((request) => byId.get(request.id) ?? hiddenPlacement(request));
    }
    const drop = colliding.reduce((last, request) =>
      request.priority > last.priority ||
      (request.priority === last.priority && request.id > last.id)
        ? request
        : last,
    );
    shown = shown.filter((request) => request !== drop);
  }
}
