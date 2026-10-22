/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
// Functions that run inside the captured page. Playwright serialises them, so each one is
// self-contained: no imports, no references to module scope.
import type { Callout, Named, SymbolCircle } from './occlusion.js';

type Story = {
  seek(sceneId: string, p: number): void;
  whenIdle(): Promise<void>;
  progress(): { sceneId: string; p: number } | undefined;
  symbols?(): { layerId: string; x: number; y: number; radius: number }[];
};

export type PageGeometry = {
  targets: Named[];
  panels: Named[];
  controls: Named[];
  callouts: Callout[];
  occluders: Named[];
  symbols: SymbolCircle[];
};

/** Collect overlay geometry in the page; only rendered, nonempty elements count. */
export function collectRects(): PageGeometry {
  const story = (window as unknown as { MapBardStory: Story }).MapBardStory;
  const visible = (element: Element | null) => {
    if (!element || element.closest('[hidden]')) return undefined;
    const box = element.getBoundingClientRect();
    return box.width > 0 && box.height > 0
      ? { x: box.x, y: box.y, width: box.width, height: box.height }
      : undefined;
  };
  const present = <T extends { rect?: unknown }>(item: T): item is T & { rect: Named['rect'] } =>
    item.rect !== undefined;
  // Callouts: the label's real rect and the halo rings around the symbols it points at.
  const marks = document.querySelectorAll('.mb-callout-mark');
  const callouts = [...document.querySelectorAll<HTMLElement>('.mb-callout')]
    .map((label, index) => {
      const id = label.dataset.calloutId || `callout-${index}`;
      const mark = marks[index];
      const halos = mark
        ? [...mark.querySelectorAll('.mb-callout-halo, .mb-callout-dot')]
            .map((circle) => circle.getBoundingClientRect())
            .filter((box) => box.width > 0)
            .map((box) => ({
              x: box.x + box.width / 2,
              y: box.y + box.height / 2,
              r: box.width / 2,
            }))
        : [];
      return { id, rect: label.hidden ? undefined : visible(label), halos };
    })
    .filter(present);
  const targets = [
    ...callouts.flatMap((callout) =>
      callout.halos.map((halo, index) => ({
        id: `${callout.id}#${index}`,
        rect: { x: halo.x - halo.r, y: halo.y - halo.r, width: 2 * halo.r, height: 2 * halo.r },
      })),
    ),
    ...[...document.querySelectorAll('.mb-marker')].map((element, index) => ({
      id: element.getAttribute('aria-label') || `marker-${index}`,
      rect: visible(element),
    })),
  ].filter(present);
  const media = document.querySelector('#media');
  const panels = (
    [
      ['scene-card', document.querySelector('.scene.is-active .scene-card')],
      ['legend', document.querySelector('#legends')],
      ['controls', document.querySelector('#controls')],
      ['media', media && media.childElementCount ? media : null],
      ['basemap-notice', document.querySelector('#mb-basemap-notice')],
    ] as const
  )
    .map(([id, element]) => ({ id, rect: visible(element) }))
    .filter(present);
  // Labels sit under the story and map controls, so those hide them too. The story only
  // counts when it paints a background (the sidecar column), not as a transparent scroller.
  const column = document.querySelector('#story');
  const opaque =
    column && !/rgba\(.*,\s*0\)|transparent/.test(getComputedStyle(column).backgroundColor);
  const controlName = (element: Element) =>
    element.id === 'mb-motion-toggle'
      ? 'motion-toggle'
      : element.classList.contains('maplibregl-ctrl-attrib')
        ? 'map-attribution'
        : element.classList.contains('maplibregl-ctrl-scale')
          ? 'scale-bar'
          : element.classList.contains('mb-north')
            ? 'north-arrow'
            : 'map-control';
  const controls = [...document.querySelectorAll('#map .maplibregl-ctrl, #mb-motion-toggle')]
    .map((element, index) => ({ id: `${controlName(element)}-${index}`, rect: visible(element) }))
    .filter(present);
  const occluders = [
    ...panels,
    ...(opaque ? [{ id: 'story-column', rect: visible(column) }] : []),
    ...controls,
  ].filter(present);
  // Shown point symbols that no callout points at (a callout's halo already rings the others).
  const halos = callouts.flatMap((callout) => callout.halos);
  const symbols = (story.symbols ? story.symbols() : [])
    .filter((symbol) => !halos.some((halo) => Math.hypot(halo.x - symbol.x, halo.y - symbol.y) < 2))
    .map((symbol, index) => ({
      id: `${symbol.layerId}#${index}`,
      x: symbol.x,
      y: symbol.y,
      r: symbol.radius,
    }));
  return { targets, panels, controls, callouts, occluders, symbols };
}

/** Capture only: jump to a scene position with timed tracks settled. */
export function seekStory([sceneId, p]: [string, number]): void {
  (window as unknown as { MapBardStory: Story }).MapBardStory.seek(sceneId, p);
}

/** True once MapLibre is idle, false when `timeout` ms pass first. */
export function waitIdle(timeout: number): Promise<boolean> {
  return Promise.race([
    (window as unknown as { MapBardStory: Story }).MapBardStory.whenIdle().then(() => true),
    new Promise<boolean>((done) => setTimeout(() => done(false), timeout)),
  ]);
}

export function shownProgress(): { sceneId: string; p: number } | undefined {
  return (window as unknown as { MapBardStory: Story }).MapBardStory.progress();
}

/** Opt in to the capture-only seek before the story starts. */
export function enableCapture(): void {
  (window as unknown as { MAPBARD_CAPTURE: boolean }).MAPBARD_CAPTURE = true;
}
