/** Deterministic planar helpers for camera presets; no projection library, no network. */
export type Position = [number, number];
export type Bounds = [number, number, number, number];

type Geometry = { type?: unknown; coordinates?: unknown };

function isPosition(value: unknown): value is Position {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number'
  );
}

/** Every position of a GeoJSON geometry, flattened. */
export function positions(geometry: Geometry | undefined): Position[] {
  const out: Position[] = [];
  const walk = (value: unknown): void => {
    if (isPosition(value)) out.push([value[0], value[1]]);
    else if (Array.isArray(value)) value.forEach(walk);
  };
  walk(geometry?.coordinates);
  return out;
}

export function bounds(points: readonly Position[]): Bounds | undefined {
  if (!points.length) return undefined;
  let [west, south, east, north] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [x, y] of points) {
    west = Math.min(west, x);
    south = Math.min(south, y);
    east = Math.max(east, x);
    north = Math.max(north, y);
  }
  return [west, south, east, north];
}

export function boundsCenter([west, south, east, north]: Bounds): Position {
  return [(west + east) / 2, (south + north) / 2];
}

function mercatorY(lat: number): number {
  const clamped = Math.max(-85.0511, Math.min(85.0511, lat));
  const phi = (clamped * Math.PI) / 180;
  return (1 - Math.log(Math.tan(Math.PI / 4 + phi / 2)) / Math.PI) / 2;
}

/**
 * Web Mercator zoom (512 px tiles, as MapLibre uses) that fits `box` in a
 * `width` × `height` CSS-pixel area with a margin; `undefined` for a point.
 */
export function fitZoom(box: Bounds, width: number, height: number, margin = 0.85) {
  const dx = (box[2] - box[0]) / 360;
  const dy = Math.abs(mercatorY(box[1]) - mercatorY(box[3]));
  if (dx <= 1e-9 && dy <= 1e-9) return undefined;
  const scale = Math.min(
    dx > 1e-9 ? (width * margin) / (dx * 512) : Infinity,
    dy > 1e-9 ? (height * margin) / (dy * 512) : Infinity,
  );
  return Math.max(0, Math.min(22, Math.log2(scale)));
}

/** Local metres per degree, good enough to measure and orient a regional path. */
function metres(origin: Position) {
  const k = Math.cos((origin[1] * Math.PI) / 180);
  return (a: Position, b: Position) => {
    const dx = (b[0] - a[0]) * 111320 * k;
    const dy = (b[1] - a[1]) * 110540;
    return { dx, dy, d: Math.hypot(dx, dy) };
  };
}

export function lineLength(line: readonly Position[]): number {
  if (line.length < 2) return 0;
  const measure = metres(line[0]!);
  let total = 0;
  for (let i = 1; i < line.length; i++) total += measure(line[i - 1]!, line[i]!).d;
  return total;
}

/** The line parts of a LineString or MultiLineString. */
export function lineParts(geometry: Geometry | undefined): Position[][] {
  const coordinates = geometry?.coordinates;
  if (!Array.isArray(coordinates)) return [];
  const part = (value: unknown): Position[] =>
    Array.isArray(value) ? value.filter(isPosition).map((p) => [p[0], p[1]] as Position) : [];
  if (geometry?.type === 'LineString') return [part(coordinates)].filter((l) => l.length >= 2);
  if (geometry?.type === 'MultiLineString')
    return coordinates.map(part).filter((line) => line.length >= 2);
  return [];
}

/** Line ends closer than this meet at one junction, in metres. */
const JOIN_METRES = 25;

type Edge = { from: number; to: number; points: Position[]; length: number };

/**
 * One travel path through line features listed in travel order. Every part of every
 * feature joins one network: part ends within 25 m are one junction, and a part is split
 * where another part ends on one of its vertices. The path is the shortest route from the
 * free end of the first feature (the end farthest from the second) to the far end of the
 * last, so it follows the channel past islands and split parts instead of cutting across
 * them. Only gaps the data really has are bridged, straight between the nearest ends.
 */
export function chainPath(lines: readonly Position[][][]): Position[] {
  const features = lines
    .map((parts) => parts.filter((part) => part.length >= 2))
    .filter((parts) => parts.length > 0);
  if (!features.length) return [];
  const measure = metres(features[0]![0]![0]!);
  const distance = (a: Position, b: Position) => measure(a, b).d;

  const nodes: Position[] = [];
  const findNode = (point: Position) =>
    nodes.findIndex((node) => distance(node, point) <= JOIN_METRES);
  const nodeAt = (point: Position) => {
    const found = findNode(point);
    if (found >= 0) return found;
    nodes.push(point);
    return nodes.length - 1;
  };
  // Junctions first, so interior vertices can split at them.
  const featureNodes = features.map((parts) =>
    parts.flatMap((part) => [nodeAt(part[0]!), nodeAt(part.at(-1)!)]),
  );

  const edges: Edge[] = [];
  const addEdge = (points: Position[]) => {
    const from = findNode(points[0]!);
    const to = findNode(points.at(-1)!);
    if (from !== to || points.length > 2)
      edges.push({ from, to, points, length: lineLength(points) });
  };
  for (const part of features.flat()) {
    let piece: Position[] = [part[0]!];
    for (const point of part.slice(1, -1)) {
      piece.push(point);
      if (findNode(point) >= 0) {
        addEdge(piece);
        piece = [point];
      }
    }
    piece.push(part.at(-1)!);
    addEdge(piece);
  }

  // Bridge real gaps: join the closest ends of separate pieces until the network is one.
  const group = nodes.map((_, index) => index);
  const root = (index: number): number =>
    group[index] === index ? index : (group[index] = root(group[index]!));
  for (const edge of edges) group[root(edge.from)] = root(edge.to);
  for (;;) {
    let best: [number, number, number] | undefined;
    for (let a = 0; a < nodes.length; a++)
      for (let b = a + 1; b < nodes.length; b++) {
        if (root(a) === root(b)) continue;
        const gap = distance(nodes[a]!, nodes[b]!);
        if (!best || gap < best[2]) best = [a, b, gap];
      }
    if (!best) break;
    edges.push({
      from: best[0],
      to: best[1],
      points: [nodes[best[0]]!, nodes[best[1]]!],
      length: best[2],
    });
    group[root(best[0])] = root(best[1]);
  }

  // The free ends: farthest from the neighbouring feature, or, for one feature, its most
  // distant ends, starting from the end nearer the first coordinate of its longest part.
  const farthestFrom = (candidates: number[], others: number[]) =>
    candidates.reduce((best, node) => {
      const reach = (from: number) =>
        Math.min(...others.map((other) => distance(nodes[from]!, nodes[other]!)));
      return reach(node) > reach(best) ? node : best;
    });
  let start: number;
  let end: number;
  if (featureNodes.length > 1) {
    start = farthestFrom(featureNodes[0]!, featureNodes[1]!);
    end = farthestFrom(featureNodes.at(-1)!, featureNodes.at(-2)!);
  } else {
    const ends = featureNodes[0]!;
    [start, end] = [ends[0]!, ends[0]!];
    for (const a of ends)
      for (const b of ends)
        if (distance(nodes[a]!, nodes[b]!) > distance(nodes[start]!, nodes[end]!))
          [start, end] = [a, b];
    const longest = features[0]!.reduce((best, part) =>
      lineLength(part) > lineLength(best) ? part : best,
    );
    if (distance(nodes[end]!, longest[0]!) < distance(nodes[start]!, longest[0]!))
      [start, end] = [end, start];
  }

  // Shortest route (Dijkstra; the network is small: a few hundred junctions at most).
  const cost = nodes.map(() => Infinity);
  const via: ({ edge: Edge; forward: boolean } | undefined)[] = nodes.map(() => undefined);
  const done = nodes.map(() => false);
  cost[start] = 0;
  for (;;) {
    let current = -1;
    for (let index = 0; index < nodes.length; index++)
      if (!done[index] && cost[index]! < Infinity && (current < 0 || cost[index]! < cost[current]!))
        current = index;
    if (current < 0 || current === end) break;
    done[current] = true;
    for (const edge of edges) {
      const forward = edge.from === current;
      if (!forward && edge.to !== current) continue;
      const next = forward ? edge.to : edge.from;
      if (cost[current]! + edge.length < cost[next]!) {
        cost[next] = cost[current]! + edge.length;
        via[next] = { edge, forward };
      }
    }
  }
  const steps: Position[][] = [];
  for (let node = end; node !== start; ) {
    const step = via[node];
    if (!step) break;
    steps.unshift(step.forward ? step.edge.points : [...step.edge.points].reverse());
    node = step.forward ? step.edge.from : step.edge.to;
  }
  const path = steps.flat();
  return path.filter(
    (point, index) =>
      index === 0 || point[0] !== path[index - 1]![0] || point[1] !== path[index - 1]![1],
  );
}

/** Douglas–Peucker in local metres. */
export function simplify(line: readonly Position[], tolerance: number): Position[] {
  if (line.length <= 2) return [...line];
  const measure = metres(line[0]!);
  const keep = new Array<boolean>(line.length).fill(false);
  keep[0] = keep[line.length - 1] = true;
  const stack: [number, number][] = [[0, line.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop()!;
    const base = measure(line[first]!, line[last]!);
    let worst = -1;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const p = measure(line[first]!, line[i]!);
      const offset =
        base.d === 0 ? p.d : Math.abs(base.dx * p.dy - base.dy * p.dx) / Math.max(base.d, 1e-9);
      if (offset > worst) {
        worst = offset;
        index = i;
      }
    }
    if (worst > tolerance && index > 0) {
      keep[index] = true;
      stack.push([first, index], [index, last]);
    }
  }
  return line.filter((_, i) => keep[i]);
}

/** Walks a path by distance: position and travel azimuth (0 north, clockwise). */
export function pathWalker(line: readonly Position[]) {
  const measure = metres(line[0]!);
  const cumulative = [0];
  for (let i = 1; i < line.length; i++)
    cumulative.push(cumulative[i - 1]! + measure(line[i - 1]!, line[i]!).d);
  const total = cumulative.at(-1)!;
  const at = (distance: number): Position => {
    const d = Math.max(0, Math.min(total, distance));
    let i = 1;
    while (i < cumulative.length - 1 && cumulative[i]! < d) i++;
    const span = cumulative[i]! - cumulative[i - 1]!;
    const t = span > 0 ? (d - cumulative[i - 1]!) / span : 0;
    const a = line[i - 1]!;
    const b = line[i]!;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  };
  const azimuth = (from: number, to: number): number => {
    const { dx, dy } = measure(at(from), at(to));
    return (Math.atan2(dx, dy) * 180) / Math.PI;
  };
  return { total, at, azimuth };
}

/** Shift `angle` by whole turns so it is within 180° of `previous`. */
export function unwrap(angle: number, previous: number): number {
  let value = angle;
  while (value - previous > 180) value -= 360;
  while (value - previous < -180) value += 360;
  return value;
}
