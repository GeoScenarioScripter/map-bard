/** The event surface needed to wait for MapLibre's real idle event. */
type IdleMap = {
  on(type: 'idle' | 'remove', listener: () => void): unknown;
  off(type: 'idle' | 'remove', listener: () => void): unknown;
  loaded(): boolean;
  isMoving(): boolean;
  triggerRepaint(): void;
};

/**
 * A terrain map can become loaded after its final render without scheduling another frame
 * or emitting sourcedata. Nudge a loaded, stationary map while waiting so it can emit idle.
 * Neither loaded() nor a timer counts as success: placement and transitions must settle too.
 */
export function whenMapIdle(map: IdleMap): Promise<void> {
  return new Promise((resolve, reject) => {
    const repaint = () => map.triggerRepaint();
    const timer = setInterval(() => {
      if (map.loaded() && !map.isMoving()) repaint();
    }, 100);
    const cleanup = () => {
      clearInterval(timer);
      map.off('idle', idle);
      map.off('remove', removed);
    };
    const idle = () => {
      cleanup();
      resolve();
    };
    const removed = () => {
      cleanup();
      reject(new Error('Map removed before becoming idle'));
    };
    map.on('idle', idle);
    map.on('remove', removed);
    repaint();
  });
}
