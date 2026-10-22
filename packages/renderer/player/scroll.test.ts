import { describe, expect, it, vi } from 'vitest';
import { sceneProgress, trackScenes } from './scroll.js';

// 1000 px viewport and sticky frame; scene 0 rests for two viewports, scene 1 for one.
const metrics = (tops: number[], trigger = 0.5) =>
  tops.map((top, index) => ({
    sceneId: `s${index}`,
    top,
    height: index === 0 ? 3000 : 2000,
    frame: 1000,
    trigger,
  }));

describe('scroll progress', () => {
  it('runs p over the card rest phase and switches scenes midway through the transit', () => {
    // Scene 0 still arriving (below its trigger line): first scene, not armed.
    expect(sceneProgress(metrics([900, 3900]), 1000)).toEqual({
      sceneId: 's0',
      p: 0,
      armed: false,
    });
    // Past the trigger but still arriving: active, clamped to p = 0.
    expect(sceneProgress(metrics([400, 3400]), 1000)).toEqual({ sceneId: 's0', p: 0, armed: true });
    // The card rests from top 0 to top -2000.
    expect(sceneProgress(metrics([0, 3000]), 1000)).toEqual({ sceneId: 's0', p: 0, armed: true });
    expect(sceneProgress(metrics([-1000, 2000]), 1000)).toEqual({
      sceneId: 's0',
      p: 0.5,
      armed: true,
    });
    expect(sceneProgress(metrics([-2000, 1000]), 1000)).toEqual({
      sceneId: 's0',
      p: 1,
      armed: true,
    });
    // Transit: scene 0 leaves at p = 1 until scene 1 crosses the middle, then scene 1 arrives at p = 0.
    expect(sceneProgress(metrics([-2400, 600]), 1000)).toEqual({
      sceneId: 's0',
      p: 1,
      armed: true,
    });
    expect(sceneProgress(metrics([-2600, 400]), 1000)).toEqual({
      sceneId: 's1',
      p: 0,
      armed: true,
    });
    expect(sceneProgress(metrics([-3500, -500]), 1000)).toEqual({
      sceneId: 's1',
      p: 0.5,
      armed: true,
    });
    // Past the last scene it stays at its end.
    expect(sceneProgress(metrics([-6000, -3000]), 1000)).toEqual({
      sceneId: 's1',
      p: 1,
      armed: true,
    });
    // A top trigger switches only once the incoming card is at rest.
    expect(sceneProgress(metrics([-2900, 100], 0), 1000)?.sceneId).toBe('s0');
    expect(sceneProgress(metrics([-3000, 0], 0), 1000)?.sceneId).toBe('s1');
    expect(sceneProgress([], 1000)).toBeUndefined();
  });

  it('follows scroll and resize through one frame-throttled path and pins rest positions', () => {
    const tops: Record<string, number> = { a: 900, b: 2900 };
    const element = (id: string) =>
      ({
        dataset: { sceneId: id },
        getBoundingClientRect: () => ({ top: tops[id]!, height: 2000 }),
        querySelector: () => ({ getBoundingClientRect: () => ({ height: 1000 }) }),
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
    tops.a = -500;
    tops.b = 1500;
    listeners.get('scroll')!();
    listeners.get('scroll')!();
    expect(frames).toHaveLength(1);
    frames.shift()!();
    expect(update).toHaveBeenLastCalledWith('a', 0.5, true);
    tops.a = -1600;
    tops.b = 400;
    listeners.get('resize')!();
    frames.shift()!();
    expect(update).toHaveBeenLastCalledWith('b', 0, true);
    expect(update).toHaveBeenCalledTimes(3);

    scope.scrollY = 3000;
    tracker.pin('a', 1);
    // Scene a's section top is 1600 px above the viewport: the end of its 1000 px rest.
    expect(scope.scrollTo).toHaveBeenCalledWith({ top: 3000 - 1600 + 1000, behavior: 'instant' });
    tops.a = -1000;
    tops.b = 1000;
    listeners.get('scroll')!();
    frames.shift()!();
    expect(update).toHaveBeenCalledTimes(3);
    tracker.release();
    expect(update).toHaveBeenLastCalledWith('a', 1, true);

    tracker.dispose();
    expect(listeners.size).toBe(0);
    expect(() =>
      trackScenes({ update }, [element('c')], [{ id: 'a', motion: { trigger: 0.5 } }], scope),
    ).toThrow(/no compiled scene/);
  });
});
