import type { createPlayer } from './player.js';

type PlayerNavigation = Pick<ReturnType<typeof createPlayer>, 'enter' | 'activeSceneId'>;

/** Observe authored scene cards; normal wheel, touch and keyboard scrolling share one path. */
export function observeScenes(
  player: PlayerNavigation,
  scenes: readonly HTMLElement[],
): () => void {
  const ratios = new Map<HTMLElement, number>();
  for (const scene of scenes) {
    if (!scene.dataset.sceneId) throw new Error('Scene element is missing data-scene-id');
    ratios.set(scene, 0);
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const element = entry.target as HTMLElement;
        ratios.set(element, entry.isIntersecting ? entry.intersectionRatio : 0);
      }
      const winner = [...ratios].sort((left, right) => right[1] - left[1])[0];
      if (winner && winner[1] > 0) {
        const id = winner[0].dataset.sceneId!;
        if (id !== player.activeSceneId()) player.enter(id);
      }
    },
    { threshold: [0, 0.25, 0.5, 0.75, 1], rootMargin: '-20% 0px -20% 0px' },
  );
  for (const scene of scenes) observer.observe(scene);
  return () => observer.disconnect();
}
