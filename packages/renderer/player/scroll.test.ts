import { describe, expect, it, vi } from 'vitest';
import { sceneProgress, trackScenes } from './scroll.js';

const metrics = (tops: number[], heights: number[], trigger = 0.5) =>
  tops.map((top, index) => ({ sceneId: `s${index}`, top, height: heights[index]!, trigger }));

describe('scroll progress', () => {
  it('reports the scene whose top crossed its trigger and its progress through its height', () => {
    // 1000 px viewport, trigger at 500 px; scene 0 is two viewports tall.
    expect(sceneProgress(metrics([900, 2900], [2000, 1000]), 1000)).toEqual({
      sceneId: 's0',
      p: 0,
      armed: false,
    });
    expect(sceneProgress(metrics([500, 2500], [2000, 1000]), 1000)).toEqual({
      sceneId: 's0',
      p: 0,
      armed: true,
    });
    expect(sceneProgress(metrics([-500, 1500], [2000, 1000]), 1000)).toEqual({
      sceneId: 's0',
      p: 0.5,
      armed: true,
    });
    expect(sceneProgress(metrics([-1500, 500], [2000, 1000]), 1000)).toEqual({
      sceneId: 's1',
      p: 0,
      armed: true,
    });
    // Past the last scene it stays at its end.
    expect(sceneProgress(metrics([-4000, -2000], [2000, 1000]), 1000)).toEqual({
      sceneId: 's1',
      p: 1,
      armed: true,
    });
    // A top trigger starts the scene at the viewport top.
    expect(sceneProgress(metrics([300], [1000], 0), 1000)?.armed).toBe(false);
    expect(sceneProgress(metrics([-250], [1000], 0), 1000)?.p).toBe(0.25);
    expect(sceneProgress([], 1000)).toBeUndefined();
  });

  it('follows scroll and resize through one frame-throttled path and pins for capture', () => {
    const tops: Record<string, number> = { a: 900, b: 1900 };
    const element = (id: string) =>
      ({
        dataset: { sceneId: id },
        getBoundingClientRect: () => ({ top: tops[id]!, height: 1000 }),
      }) as unknown as HTMLElement;
    const listeners = new Map<string, () => void>();
    const frames: (() => void)[] = [];
    const scope = {
      innerHeight: 1000,
      scrollY: 0,
      addEventListener: vi.fn((type: string, listener: () => void) =>
        listeners.set(type, listener),
      ),
      removeEventListener: vi.fn((type: string) => listeners.delete(type)),
      requestAnimationFrame: (callback: () => void) => frames.push(callback),
      scrollTo: vi.fn(),
    };
    const update = vi.fn();
    const tracker = trackScenes(
      { update },
      [element('a'), element('b')],
      [
        { id: 'a', motion: { trigger: 0.5 } },
        { id: 'b', motion: { trigger: 0.5 } },
      ],
      scope,
    );
    expect(update).toHaveBeenLastCalledWith('a', 0, false);
    tops.a = 0;
    tops.b = 1000;
    listeners.get('scroll')!();
    listeners.get('scroll')!();
    expect(frames).toHaveLength(1);
    frames.shift()!();
    expect(update).toHaveBeenLastCalledWith('a', 0.5, true);
    tops.a = -600;
    tops.b = 400;
    listeners.get('resize')!();
    frames.shift()!();
    expect(update).toHaveBeenLastCalledWith('b', 0.1, true);
    expect(update).toHaveBeenCalledTimes(3);

    scope.scrollY = 3000;
    tracker.pin('a', 1);
    // Scene a's top is 600 px above the viewport: its trigger plus 999 px into it, never the next scene.
    expect(scope.scrollTo).toHaveBeenCalledWith({
      top: 3000 - 600 - 500 + 999,
      behavior: 'instant',
    });
    tops.a = -2000;
    tops.b = -600;
    listeners.get('scroll')!();
    frames.shift()!();
    expect(update).toHaveBeenCalledTimes(3);
    tracker.release();
    expect(update).toHaveBeenLastCalledWith('b', 1, true);

    tracker.dispose();
    expect(listeners.size).toBe(0);
    expect(() =>
      trackScenes({ update }, [element('c')], [{ id: 'a', motion: { trigger: 0.5 } }], scope),
    ).toThrow(/no compiled scene/);
  });
});
