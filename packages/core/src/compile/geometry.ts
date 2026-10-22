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

/**
 * Chain lines into one path in the given order: each contributes its longest
 * part, oriented to continue from the previous end; gaps are bridged straight.
 */
export function chainPath(lines: readonly Position[][][]): Position[] {
  const longest = lines.map((parts) =>
    parts.reduce<Position[]>(
      (best, part) => (lineLength(part) > lineLength(best) ? part : best),
      [],
    ),
  );
  const pieces = longest.filter((part) => part.length >= 2);
  if (!pieces.length) return [];
  const distance = (a: Position, b: Position) => metres(a)(a, b).d;
  let path = [...pieces[0]!];
  if (pieces.length > 1) {
    const next = pieces[1]!;
    const end = Math.min(distance(path.at(-1)!, next[0]!), distance(path.at(-1)!, next.at(-1)!));
    const start = Math.min(distance(path[0]!, next[0]!), distance(path[0]!, next.at(-1)!));
    if (start < end) path.reverse();
  }
  for (const piece of pieces.slice(1)) {
    const tail = path.at(-1)!;
    const oriented =
      distance(tail, piece.at(-1)!) < distance(tail, piece[0]!) ? [...piece].reverse() : piece;
    path = [...path, ...oriented];
  }
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
