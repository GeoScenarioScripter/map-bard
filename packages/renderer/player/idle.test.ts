import { afterEach, describe, expect, it, vi } from 'vitest';
import { whenMapIdle } from './idle.js';

function harness() {
  const listeners = new Map<string, Set<() => void>>();
  const map = {
    on(type: string, listener: () => void) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(listener);
    },
    off(type: string, listener: () => void) {
      listeners.get(type)?.delete(listener);
    },
    triggerRepaint: vi.fn(),
    loaded: vi.fn(() => false),
    isMoving: vi.fn(() => false),
  };
  return {
    map,
    emit: (type: string) => [...(listeners.get(type) ?? [])].forEach((listener) => listener()),
    count: () => [...listeners.values()].reduce((count, set) => count + set.size, 0),
  };
}

describe('MapLibre idle readiness', () => {
  afterEach(() => vi.useRealTimers());

  it('recovers a stalled render queue, but succeeds only on a real idle event', async () => {
    vi.useFakeTimers();
    const { map, emit, count } = harness();
    const settled = vi.fn();
    const pending = whenMapIdle(map).then(settled);
    expect(map.triggerRepaint).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(100);
    expect(map.triggerRepaint).toHaveBeenCalledTimes(1);
    // The last render did not reach idle; the map becomes loaded without another event.
    map.loaded.mockReturnValue(true);
    await vi.advanceTimersByTimeAsync(100);
    expect(map.triggerRepaint).toHaveBeenCalledTimes(2);
    await Promise.resolve();
    expect(settled).not.toHaveBeenCalled();
    emit('idle');
    await pending;
    expect(settled).toHaveBeenCalledOnce();
    expect(count()).toBe(0);
    await vi.advanceTimersByTimeAsync(1000);
    expect(map.triggerRepaint).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cleans up pending waits when the map is removed', async () => {
    vi.useFakeTimers();
    const { map, emit, count } = harness();
    const pending = whenMapIdle(map);
    emit('remove');
    await expect(pending).rejects.toThrow('Map removed before becoming idle');
    expect(count()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not keep repainting a moving camera', async () => {
    vi.useFakeTimers();
    const { map, emit } = harness();
    map.loaded.mockReturnValue(true);
    map.isMoving.mockReturnValue(true);
    const pending = whenMapIdle(map);
    await vi.advanceTimersByTimeAsync(1000);
    expect(map.triggerRepaint).toHaveBeenCalledTimes(1);
    emit('idle');
    await pending;
  });
});
