/** Scroll position in, active scene and progress out. Wheel, touch and keyboard all scroll the page, so they share this one path. */
export type SceneMetrics = {
  sceneId: string;
  /** Section top relative to the viewport, in CSS pixels. */
  top: number;
  /** Section height: the rest phase plus one sticky frame. */
  height: number;
  /** Height of the sticky frame that holds the card at rest (one viewport). */
  frame: number;
  /** Viewport fraction from the top that the section top crosses to make the scene active. */
  trigger: number;
};

export type ScrollState = { sceneId: string; p: number; armed: boolean };

/**
 * A scene section is `scrollLength + 1` viewports tall and holds its card in
 * a one-viewport sticky frame. The card rests (sidecar centred, phones and
 * full-bleed in the bottom band) while the section top runs from 0 to
 * -scrollLength viewports: that is p = 0 to p = 1, clamped outside. Between
 * two rests lies one viewport of transit, the outgoing card leaving and the
 * incoming one arriving; the active scene switches when the incoming section
 * top crosses its `trigger` line (0.5: midway), and the camera hand-over
 * starts there. Before the first scene is active it is shown at p = 0, not
 * yet armed, so timed tracks wait; after the last it stays at p = 1.
 */
export function sceneProgress(
  scenes: readonly SceneMetrics[],
  viewportHeight: number,
): ScrollState | undefined {
  if (!scenes.length) return undefined;
  let current = -1;
  scenes.forEach((scene, index) => {
    if (scene.top <= scene.trigger * viewportHeight) current = index;
  });
  if (current < 0) return { sceneId: scenes[0]!.sceneId, p: 0, armed: false };
  const scene = scenes[current]!;
  const rest = Math.max(1, scene.height - scene.frame);
  return { sceneId: scene.sceneId, p: Math.max(0, Math.min(1, -scene.top / rest)), armed: true };
}

type ScrollScope = {
  innerHeight: number;
  scrollY: number;
  addEventListener(type: string, listener: () => void, options?: AddEventListenerOptions): void;
  removeEventListener(type: string, listener: () => void): void;
  requestAnimationFrame?(callback: () => void): number;
  scrollTo?(options: { top: number; behavior?: 'instant' | 'auto' }): void;
};

export interface ScrollTarget {
  update(sceneId: string, p: number, armed: boolean): void;
}

/** Report the active scene and its progress to the player on every scroll frame. */
export function trackScenes(
  player: ScrollTarget,
  elements: readonly HTMLElement[],
  scenes: readonly { id: string; motion: { trigger: number } }[],
  scope: ScrollScope = globalThis as unknown as ScrollScope,
) {
  const triggers = new Map(scenes.map((scene) => [scene.id, scene.motion.trigger]));
  const tracked = elements.map((element) => {
    const sceneId = element.dataset.sceneId;
    if (!sceneId) throw new Error('Scene element is missing data-scene-id');
    const trigger = triggers.get(sceneId);
    if (trigger === undefined) throw new Error(`Scene element ${sceneId} has no compiled scene`);
    return { element, sceneId, trigger };
  });
  let last = '';
  let scheduled = false;
  let pinned = false;

  /** The sticky frame's height, measured so mobile viewport units and innerHeight cannot disagree. */
  function frameOf(element: HTMLElement): number {
    const frame = element.querySelector?.('.scene-sticky');
    const height = frame?.getBoundingClientRect().height;
    return height && height > 0 ? height : scope.innerHeight;
  }

  function measure(): void {
    if (pinned) return;
    const state = sceneProgress(
      tracked.map(({ element, sceneId, trigger }) => {
        const box = element.getBoundingClientRect();
        return { sceneId, top: box.top, height: box.height, frame: frameOf(element), trigger };
      }),
      scope.innerHeight,
    );
    if (!state) return;
    const key = `${state.sceneId}\u0000${state.p.toFixed(4)}\u0000${state.armed}`;
    if (key === last) return;
    last = key;
    player.update(state.sceneId, state.p, state.armed);
  }

  function onScroll(): void {
    if (!scope.requestAnimationFrame) return measure();
    if (scheduled) return;
    scheduled = true;
    scope.requestAnimationFrame(() => {
      scheduled = false;
      measure();
    });
  }

  scope.addEventListener('scroll', onScroll, { passive: true });
  scope.addEventListener('resize', onScroll);
  measure();

  return {
    /** Re-read the scroll position now. */
    measure,
    /**
     * Capture only: scroll to where `sceneId` rests at progress `p` and stop
     * following scroll until `release`, so the caller can hold that state.
     */
    pin(sceneId: string, p: number): void {
      const entry = tracked.find((item) => item.sceneId === sceneId);
      if (!entry) throw new Error(`Unknown scene ${sceneId}`);
      pinned = true;
      const box = entry.element.getBoundingClientRect();
      const rest = Math.max(0, box.height - frameOf(entry.element));
      const top = scope.scrollY + box.top + Math.max(0, Math.min(1, p)) * rest;
      scope.scrollTo?.({ top: Math.max(0, top), behavior: 'instant' });
    },
    release(): void {
      pinned = false;
      last = '';
      measure();
    },
    dispose(): void {
      scope.removeEventListener('scroll', onScroll);
      scope.removeEventListener('resize', onScroll);
    },
  };
}
