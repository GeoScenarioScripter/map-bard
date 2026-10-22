/** Scroll position in, active scene and progress out. Wheel, touch and keyboard all scroll the page, so they share this one path. */
export type SceneMetrics = {
  sceneId: string;
  /** Element top relative to the viewport, in CSS pixels. */
  top: number;
  height: number;
  /** Viewport fraction from the top where the scene starts. */
  trigger: number;
};

export type ScrollState = { sceneId: string; p: number; armed: boolean };

/**
 * The active scene is the last one whose top has crossed its trigger line;
 * `p` runs from 0 there to 1 when its bottom does (its height is
 * `scrollLength` viewports). Before the first scene starts, it is shown at
 * p = 0 and not yet armed, so timed tracks wait.
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
  const raw = (scene.trigger * viewportHeight - scene.top) / Math.max(1, scene.height);
  return { sceneId: scene.sceneId, p: Math.max(0, Math.min(1, raw)), armed: true };
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

  function measure(): void {
    if (pinned) return;
    const state = sceneProgress(
      tracked.map(({ element, sceneId, trigger }) => {
        const box = element.getBoundingClientRect();
        return { sceneId, top: box.top, height: box.height, trigger };
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
     * Capture only: scroll to where `sceneId` has progress `p` and stop
     * following scroll until `release`, so the caller can hold that state.
     */
    pin(sceneId: string, p: number): void {
      const entry = tracked.find((item) => item.sceneId === sceneId);
      if (!entry) throw new Error(`Unknown scene ${sceneId}`);
      pinned = true;
      const box = entry.element.getBoundingClientRect();
      // Stay a pixel inside the scene at p = 1, where the next scene would otherwise start.
      const offset = Math.min(Math.max(0, p) * box.height, Math.max(0, box.height - 1));
      const top = scope.scrollY + box.top - entry.trigger * scope.innerHeight + offset;
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
