import { afterEach, expect, it, vi } from 'vitest';
import { observeScenes } from './scroll.js';

afterEach(() => vi.unstubAllGlobals());

it('switches to the most visible scene and disconnects on cleanup', () => {
  const a = { dataset: { sceneId: 'a' } } as unknown as HTMLElement;
  const b = { dataset: { sceneId: 'b' } } as unknown as HTMLElement;
  let callback: IntersectionObserverCallback | undefined;
  const observe = vi.fn();
  const disconnect = vi.fn();
  class Observer {
    constructor(next: IntersectionObserverCallback) {
      callback = next;
    }
    observe = observe;
    disconnect = disconnect;
  }
  vi.stubGlobal('IntersectionObserver', Observer);
  let active: string | undefined;
  const enter = vi.fn((id: string) => {
    active = id;
  });
  const dispose = observeScenes({ enter, activeSceneId: () => active }, [a, b]);
  expect(observe).toHaveBeenCalledTimes(2);
  callback!(
    [
      { target: a, isIntersecting: true, intersectionRatio: 0.6 },
    ] as unknown as IntersectionObserverEntry[],
    {} as IntersectionObserver,
  );
  callback!(
    [
      { target: b, isIntersecting: true, intersectionRatio: 0.8 },
    ] as unknown as IntersectionObserverEntry[],
    {} as IntersectionObserver,
  );
  callback!(
    [
      { target: b, isIntersecting: true, intersectionRatio: 0.8 },
    ] as unknown as IntersectionObserverEntry[],
    {} as IntersectionObserver,
  );
  expect(enter.mock.calls.map(([id]) => id)).toEqual(['a', 'b']);
  dispose();
  expect(disconnect).toHaveBeenCalledOnce();
});
