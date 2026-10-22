// DOM overlay for annotation callouts: a label, a leader line and a halo around each target,
// positioned from the map projection on every rendered frame.
import {
  HALO_GAP,
  LEADER_RINGS,
  placeShownCallouts,
  type Box,
  type CalloutPlacement,
  type CalloutRequest,
  type Circle,
  type Point,
} from './callout-placement.js';
import type { CompiledScene, MapAdapter, MarkerHandle } from './types.js';

type Callout = CompiledScene['callouts'][number];
export type SymbolPoint = { at: readonly [number, number]; radius: number };
type Projector = Pick<MapAdapter, 'onFrame' | 'project'>;

export interface CalloutOverlayOptions {
  /** Screen UI the labels must avoid, as client rects: the card area, the rail, map controls. */
  panels?: () => Box[];
}

const SVG = 'http://www.w3.org/2000/svg';
export { HALO_GAP };
/** Radius of the dot drawn at a free anchor that has no symbol. */
export const ANCHOR_DOT = 3.5;
/** Symbols this far outside the screen cannot reach a label. */
const SYMBOL_MARGIN = 120;

/** A frame's inputs for placement: projected anchors, targets and nearby symbols. */
export function calloutRequests(
  callouts: readonly Callout[],
  project: (at: readonly [number, number]) => Point,
  sizes: readonly { width: number; height: number }[],
): CalloutRequest[] {
  return callouts.map((callout, index) => {
    const anchor = project(callout.anchor);
    const targets: Circle[] = callout.targets.map((target) => ({
      ...project(target.at),
      r: target.radius,
    }));
    // The leader starts outside the symbol drawn at the anchor, if there is one.
    const anchorRadius = targets.reduce(
      (largest, target) =>
        Math.hypot(target.x - anchor.x, target.y - anchor.y) <= target.r
          ? Math.max(largest, target.r)
          : largest,
      0,
    );
    const size = sizes[index] ?? { width: 0, height: 0 };
    return {
      id: callout.id,
      priority: callout.priority,
      anchor,
      anchorRadius,
      width: size.width,
      height: size.height,
      targets,
    };
  });
}

/** Farthest a label box can reach from its anchor: leader start, longest leader, label size. */
const reachOf = (request: CalloutRequest) =>
  request.anchorRadius + Math.max(...LEADER_RINGS) + 8 + request.width + request.height;

/**
 * Projected symbols a label could touch, minus the callout targets placement already avoids.
 * Placement scores label boxes against symbols, so a symbol beyond every callout's reach
 * cannot change the result; dropping it keeps dense point layers cheap on every frame.
 */
export function nearbySymbols(
  symbols: readonly SymbolPoint[],
  project: (at: readonly [number, number]) => Point,
  viewport: { width: number; height: number },
  requests: readonly CalloutRequest[],
): Circle[] {
  const targets = requests.flatMap((request) => request.targets);
  const reaches = requests.map((request) => ({ ...request.anchor, reach: reachOf(request) }));
  const result: Circle[] = [];
  for (const symbol of symbols) {
    const point = project(symbol.at);
    if (
      point.x < -SYMBOL_MARGIN ||
      point.y < -SYMBOL_MARGIN ||
      point.x > viewport.width + SYMBOL_MARGIN ||
      point.y > viewport.height + SYMBOL_MARGIN
    )
      continue;
    if (
      !reaches.some(
        (anchor) =>
          Math.abs(anchor.x - point.x) <= anchor.reach + symbol.radius &&
          Math.abs(anchor.y - point.y) <= anchor.reach + symbol.radius,
      )
    )
      continue;
    if (
      targets.some(
        (target) =>
          Math.hypot(target.x - point.x, target.y - point.y) < 0.5 && target.r >= symbol.radius,
      )
    )
      continue;
    result.push({ ...point, r: symbol.radius });
  }
  return result;
}

function svg<K extends keyof SVGElementTagNameMap>(
  name: K,
  className: string,
): SVGElementTagNameMap[K] {
  const element = document.createElementNS(SVG, name);
  element.setAttribute('class', className);
  return element;
}

function setLine(line: SVGLineElement, from: Point, to: Point): void {
  line.setAttribute('x1', from.x.toFixed(1));
  line.setAttribute('y1', from.y.toFixed(1));
  line.setAttribute('x2', to.x.toFixed(1));
  line.setAttribute('y2', to.y.toFixed(1));
}

function setCircle(circle: SVGCircleElement, at: Point, r: number): void {
  circle.setAttribute('cx', at.x.toFixed(1));
  circle.setAttribute('cy', at.y.toFixed(1));
  circle.setAttribute('r', r.toFixed(1));
}

/**
 * The overlay lives inside the map container, above the canvas and below the map controls,
 * story column and rail. Labels are plain list text, so screen readers read every callout;
 * leaders and halos are decorative SVG. The player owns each scene's handle.
 */
export function createCalloutOverlay(
  container: HTMLElement,
  map: Projector,
  options: CalloutOverlayOptions = {},
) {
  /** Opacity of each callout of the shown scene, set by callout tracks; 1 when untracked. */
  let setOpacity: ((id: string, value: number) => void) | undefined;

  function show(callouts: readonly Callout[], symbols: () => readonly SymbolPoint[]): MarkerHandle {
    const ordered = [...callouts].sort((a, b) => a.priority - b.priority);
    const root = document.createElement('div');
    root.className = 'mb-callouts';
    const graphics = svg('svg', 'mb-callout-graphics');
    graphics.setAttribute('aria-hidden', 'true');
    const list = document.createElement('ul');
    list.className = 'mb-callout-list';
    list.setAttribute('aria-label', 'Map callouts');
    const parts = ordered.map((callout) => {
      const group = svg('g', 'mb-callout-mark');
      const casing = svg('line', 'mb-callout-leader-casing');
      const leader = svg('line', 'mb-callout-leader');
      const halos = (callout.targets.length ? callout.targets : [undefined]).map(() => {
        const ringCasing = svg('circle', 'mb-callout-halo-casing');
        const ring = svg('circle', callout.targets.length ? 'mb-callout-halo' : 'mb-callout-dot');
        group.append(ringCasing, ring);
        return { ringCasing, ring };
      });
      group.append(casing, leader);
      graphics.appendChild(group);
      const label = document.createElement('li');
      label.className = 'mb-callout';
      label.dataset.calloutId = callout.id;
      label.textContent = callout.text;
      list.appendChild(label);
      return { callout, group, casing, leader, halos, label };
    });
    root.append(graphics, list);
    container.appendChild(root);
    let previous = new Map<string, string>();
    const opacity = new Map<string, number>();
    const measured = new Map<string, { width: number; height: number }>();
    // A faded-out callout is hidden from readers and leaves its space to the others.
    const shown = () => parts.filter((part) => (opacity.get(part.callout.id) ?? 1) > 0);

    function update(): void {
      const live = shown();
      for (const part of parts)
        if (!live.includes(part)) {
          part.label.hidden = true;
          part.group.style.display = 'none';
        }
      // Read every size first, then write, so a frame lays out once.
      const frame = container.getBoundingClientRect();
      const viewport = { width: frame.width, height: frame.height };
      // Fractional sizes: rounding down would let a label graze its neighbours. A label hidden
      // for lack of room keeps the size it had, so it can be placed again without showing.
      const sizes = live.map(({ callout, label }) => {
        let cached = measured.get(callout.id);
        if (!label.hidden || !cached) {
          const hidden = label.hidden;
          label.hidden = false;
          const box = label.getBoundingClientRect();
          label.hidden = hidden;
          cached = { width: box.width, height: box.height };
          measured.set(callout.id, cached);
        }
        return cached;
      });
      const panels = (options.panels?.() ?? []).map((box) => ({
        left: box.left - frame.left,
        top: box.top - frame.top,
        right: box.right - frame.left,
        bottom: box.bottom - frame.top,
      }));
      const requests = calloutRequests(
        live.map((part) => part.callout),
        map.project,
        sizes,
      );
      const placements = placeShownCallouts(
        requests,
        { viewport, panels, symbols: nearbySymbols(symbols(), map.project, viewport, requests) },
        previous,
      );
      previous = new Map(placements.map((item) => [item.id, item.position]));
      placements.forEach((placement, index) => draw(live[index]!, requests[index]!, placement));
    }

    setOpacity = (id, value) => {
      const part = parts.find((item) => item.callout.id === id);
      if (!part) return;
      const was = opacity.get(id) ?? 1;
      opacity.set(id, value);
      const fade = value < 1 ? String(value) : '';
      part.label.style.opacity = fade;
      part.group.style.opacity = fade;
      if (was > 0 && value > 0) return;
      // Shown or hidden: unhide before measuring, then let every callout re-place.
      if (value > 0) part.label.hidden = false;
      update();
    };

    function draw(
      part: (typeof parts)[number],
      request: CalloutRequest,
      placement: CalloutPlacement,
    ): void {
      // A callout that comes back fades in (CSS), instead of popping into place.
      const returning = part.label.hidden && !placement.hidden;
      part.label.hidden = placement.hidden;
      part.group.style.display = placement.hidden ? 'none' : '';
      if (placement.hidden) return;
      if (returning) {
        part.label.classList.remove('is-entering');
        part.group.classList.remove('is-entering');
        void part.label.getBoundingClientRect();
        part.label.classList.add('is-entering');
        part.group.classList.add('is-entering');
      }
      part.label.dataset.position = placement.position;
      part.label.dataset.collisions = String(placement.collisions);
      part.label.style.transform = `translate(${Math.round(placement.box.left)}px, ${Math.round(placement.box.top)}px)`;
      setLine(part.casing, placement.leader.from, placement.leader.to);
      setLine(part.leader, placement.leader.from, placement.leader.to);
      part.halos.forEach(({ ringCasing, ring }, index) => {
        const target = request.targets[index];
        const at = target ?? request.anchor;
        const r = target ? target.r + HALO_GAP : ANCHOR_DOT;
        setCircle(ringCasing, at, r);
        setCircle(ring, at, r);
      });
    }

    const stop = map.onFrame(update);
    update();
    // Web fonts and viewport changes resize labels without a map frame.
    const resized =
      typeof ResizeObserver === 'function'
        ? new ResizeObserver(() => {
            if (root.isConnected) update();
          })
        : undefined;
    for (const { label } of parts) resized?.observe(label);
    return {
      remove() {
        stop();
        resized?.disconnect();
        root.remove();
        setOpacity = undefined;
      },
    };
  }
  return {
    show,
    /** Fade a shown callout; 0 hides it. Ignored when its scene is not shown. */
    setOpacity(id: string, value: number) {
      setOpacity?.(id, Math.max(0, Math.min(1, value)));
    },
  };
}
