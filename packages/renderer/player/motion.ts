import {
  ease,
  localProgress,
  mixCamera,
  sampleCameraKeyframes,
  sampleLayerKeyframes,
} from '@mapbard/schema/easing';
import type { CameraState, CameraTrack, LayerTrack, SceneMotion } from '@mapbard/schema';

export type Track = CameraTrack | LayerTrack;
export type ReducedMotionPolicy = SceneMotion['reducedMotion'];

/** Fast fades under `shorten`; long enough to read as a change, short enough not to move the page. */
export const SHORTEN_MS = 250;

/**
 * The track the reader gets. Under `prefers-reduced-motion`, `step` jumps every
 * track to its final state; `shorten` keeps only short data fades (no camera
 * movement and no loops); `keep` plays as authored.
 */
export function effectiveTrack<T extends Track>(
  track: T,
  policy: ReducedMotionPolicy,
  reduced: boolean,
): T {
  if (!reduced || policy === 'keep') return track;
  const isCamera = !('runtimeLayerId' in track);
  if (policy === 'shorten' && track.mode === 'play' && !isCamera)
    return {
      ...track,
      durationMs: Math.min(track.durationMs ?? SHORTEN_MS, SHORTEN_MS),
      delayMs: 0,
    };
  return { ...track, mode: 'step' };
}

/** Per-visit timing of a `play` or `loop` track. */
export type TrackClock = { start?: number; pausedAt?: number };

export type TrackFrame = {
  /** Local track progress for sampling keyframes, in [0, 1]. */
  t: number;
  /** The track still changes with time alone, so another frame is needed. */
  running: boolean;
};

/**
 * Where a track is. `armed` is false before the scene reaches its trigger line
 * (timed tracks wait); `settle` jumps timed tracks to their settled state for
 * deterministic captures; `paused` freezes loops (WCAG 2.2.2).
 */
export function trackFrame(
  track: Track,
  state: { p: number; armed: boolean; now: number; settle: boolean; paused: boolean },
  clock: TrackClock,
): TrackFrame {
  const { p, armed, now, settle, paused } = state;
  const [start, end] = track.range;
  const reached = p >= start && (armed || settle);
  switch (track.mode) {
    case 'scrub':
      return { t: localProgress(track.range, p), running: false };
    case 'step':
      return { t: reached ? 1 : 0, running: false };
    case 'play': {
      if (settle) return { t: reached ? 1 : 0, running: false };
      if (reached && clock.start === undefined) clock.start = now + (track.delayMs ?? 0);
      if (clock.start === undefined) return { t: 0, running: false };
      const duration = track.durationMs ?? 1;
      const t = Math.max(0, Math.min(1, (now - clock.start) / duration));
      return { t, running: t < 1 };
    }
    case 'loop': {
      if (settle || p > end) return { t: 1, running: false };
      if (!reached) return { t: 0, running: false };
      if (clock.start === undefined) clock.start = now + (track.delayMs ?? 0);
      const at = paused ? (clock.pausedAt ?? now) : now;
      const duration = track.durationMs ?? 1;
      const elapsed = Math.max(0, at - clock.start);
      return { t: (elapsed % duration) / duration, running: !paused };
    }
  }
}

/** Freeze or resume a loop clock without a jump. */
export function pauseClock(clock: TrackClock, paused: boolean, now: number): void {
  if (paused && clock.pausedAt === undefined) clock.pausedAt = now;
  if (!paused && clock.pausedAt !== undefined) {
    if (clock.start !== undefined) clock.start += now - clock.pausedAt;
    clock.pausedAt = undefined;
  }
}

export function cameraAt(track: CameraTrack, t: number): CameraState {
  return sampleCameraKeyframes(track.keyframes, t);
}

export function layerValueAt(track: LayerTrack, t: number): number {
  return Math.max(0, Math.min(1, sampleLayerKeyframes(track.keyframes, t)));
}

/** Durations of the camera hand-over between scenes, in ms. */
export const APPROACH_MS = { ease: 700, fly: 1300 } as const;

/**
 * Blend from the camera the reader saw towards the scene's live target. The
 * bearing takes the short way round; `fly` lifts the camera out and back in.
 */
export function approachCamera(
  from: CameraState,
  to: CameraState,
  tau: number,
  kind: 'ease' | 'fly',
): CameraState {
  let bearing = from.bearing;
  while (bearing - to.bearing > 180) bearing -= 360;
  while (bearing - to.bearing < -180) bearing += 360;
  const w = ease('ease-in-out', tau);
  const mixed = mixCamera({ ...from, bearing }, to, w);
  if (kind !== 'fly') return mixed;
  const moved = Math.hypot(to.center[0] - from.center[0], to.center[1] - from.center[1]);
  const lift = moved > 0.01 ? Math.min(1.5, 0.5 + moved) : 0;
  return { ...mixed, zoom: mixed.zoom - lift * Math.sin(Math.PI * Math.max(0, Math.min(1, tau))) };
}

export function sameCamera(a: CameraState | undefined, b: CameraState): boolean {
  return (
    !!a &&
    a.center[0] === b.center[0] &&
    a.center[1] === b.center[1] &&
    a.zoom === b.zoom &&
    a.pitch === b.pitch &&
    a.bearing === b.bearing
  );
}
